from io import StringIO
from unittest.mock import MagicMock, patch

import requests
from django.core.management import call_command
from django.test import TestCase

from core.models import Cubeur

MODULE = "core.management.commands.scrape_missing_data"


def api_response(status=200, gender=None, payload=None):
    r = MagicMock()
    r.status_code = status
    if payload is None:
        payload = {"person": {"wca_id": "x", "gender": gender}}
    r.json.return_value = payload
    return r


class ScrapeGendersTests(TestCase):

    def make(self, wca_id, gender="?"):
        return Cubeur.objects.create(
            wca_id=wca_id, first_name="A", last_name="B", wca_year=int(wca_id[:4]), gender=gender,
        )

    def run_cmd(self, responses, *args):
        """responses : dict wca_id -> réponse (ou liste de réponses successives / exception)."""
        def fake_get(url, timeout=None):
            wca_id = url.rsplit("/", 1)[-1]
            r = responses[wca_id]
            if isinstance(r, list):
                r = r.pop(0)
            if isinstance(r, Exception):
                raise r
            return r

        with patch(f"{MODULE}.requests.get", side_effect=fake_get) as get, \
             patch(f"{MODULE}.RETRY_DELAY", 0):
            call_command("scrape_missing_data", *args, stdout=StringIO())
        return get

    def gender(self, wca_id):
        return Cubeur.objects.get(wca_id=wca_id).gender

    def test_sets_gender_from_api(self):
        for wid in ("2020AAAA01", "2020BBBB01", "2020CCCC01"):
            self.make(wid)
        self.run_cmd({
            "2020AAAA01": api_response(gender="m"),
            "2020BBBB01": api_response(gender="f"),
            "2020CCCC01": api_response(gender="o"),
        })
        self.assertEqual(self.gender("2020AAAA01"), "m")
        self.assertEqual(self.gender("2020BBBB01"), "f")
        self.assertEqual(self.gender("2020CCCC01"), "o")

    def test_failures_leave_unknown(self):
        for wid in ("2020AAAA01", "2020BBBB01", "2020CCCC01", "2020DDDD01"):
            self.make(wid)
        self.run_cmd({
            "2020AAAA01": api_response(status=404),
            "2020BBBB01": api_response(payload={"error": "nope"}),
            "2020CCCC01": api_response(gender=None),
            "2020DDDD01": [requests.ConnectionError(), requests.ConnectionError()],
        })
        for wid in ("2020AAAA01", "2020BBBB01", "2020CCCC01", "2020DDDD01"):
            self.assertEqual(self.gender(wid), "?")

    def test_retries_once_on_429(self):
        self.make("2020AAAA01")
        get = self.run_cmd({"2020AAAA01": [api_response(status=429), api_response(gender="f")]})
        self.assertEqual(self.gender("2020AAAA01"), "f")
        self.assertEqual(get.call_count, 2)

    def test_other_not_rechecked_by_default(self):
        self.make("2020AAAA01", gender="o")
        get = self.run_cmd({})
        self.assertEqual(get.call_count, 0)
        self.assertEqual(self.gender("2020AAAA01"), "o")

    def test_recheck_other_fixes_wrong_other(self):
        self.make("2020AAAA01", gender="o")
        self.make("2020BBBB01", gender="m")
        self.run_cmd({"2020AAAA01": api_response(gender="m")}, "--recheck-other")
        self.assertEqual(self.gender("2020AAAA01"), "m")
        self.assertEqual(self.gender("2020BBBB01"), "m")
