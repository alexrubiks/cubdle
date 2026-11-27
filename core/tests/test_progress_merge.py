"""
Fusion de la progression envoyée par le navigateur (POST /api/progress/).
Simule plusieurs appareils et des envois qui arrivent dans le désordre.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models import DailyProgress, User
from core.progress import MAX_CLIENT_GUESSES
from core.tests.test_dates import at_paris

URL = "/api/progress/"


def g(i, **extra):
    return {"id": i, "name": f"P{i}", "correct": False, **extra}


class ProgressMergeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create(wca_id="2022TREM02", pseudo="Alexis")

    def client_for(self):
        client = APIClient()
        token = AccessToken(); token["user_id"] = self.user.id
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

    def push(self, data, day=(2026, 12, 1)):
        with at_paris(*day):
            r = self.client_for().post(URL, data, format="json")
        self.assertEqual(r.status_code, 200)
        return r.data

    def stored(self):
        return DailyProgress.objects.get(user=self.user)

    def ids(self, guesses, key="id"):
        return [x[key] for x in guesses]

    def test_two_devices_union_without_duplicates(self):
        # PC : 2 essais ; téléphone (qui n'a pas vu ceux du PC) : 1 essai + 1 commun
        self.push({"cubeur_guesses": [g(2), g(1)]})
        data = self.push({"cubeur_guesses": [g(3), g(1)]})
        self.assertEqual(self.ids(data["cubeur_guesses"]), [3, 1, 2])

    def test_out_of_order_push_does_not_regress(self):
        recent = {"compet_guesses": [g(3), g(2), g(1)], "compet_done": True}
        old = {"compet_guesses": [g(1)], "compet_done": False}
        self.push(recent)
        self.push(old)  # l'ancien envoi arrive en dernier
        p = self.stored()
        self.assertEqual(sorted(self.ids(p.compet_guesses)), [1, 2, 3])
        self.assertTrue(p.compet_done)

    def test_done_never_goes_back(self):
        self.push({"podium_done": True})
        self.push({"podium_done": False})
        self.push({})
        self.assertTrue(self.stored().podium_done)

    def test_nr_dedup_by_wca_id_case_insensitive(self):
        self.push({"nr_guesses": [{"wca_id": "2008MART01", "name": "A"}]})
        data = self.push({"nr_guesses": [{"wca_id": "2008mart01", "name": "A"}, {"wca_id": "2009DURA01"}]})
        self.assertEqual(len(data["nr_guesses"]), 2)

    def test_location_first_guess_kept(self):
        self.push({"location_guess": {"latitude": 48.8, "longitude": 2.3}})
        self.push({"location_guess": {"latitude": 43.3, "longitude": 5.4}})
        self.push({"location_guess": {}})
        self.assertEqual(self.stored().location_guess, {"latitude": 48.8, "longitude": 2.3})

    def test_ranking_single_guess_first_kept_after_launch(self):
        self.push({"ranking_guesses": [{"rank": 12, "distance": 3}]})
        data = self.push({"ranking_guesses": [{"rank": 40, "distance": 25}]})
        self.assertEqual(self.ids(data["ranking_guesses"], "rank"), [12])

    def test_ranking_legacy_union_before_launch(self):
        day = (2026, 11, 28)
        self.push({"ranking_guesses": [{"rank": 12}]}, day)
        data = self.push({"ranking_guesses": [{"rank": 40}, {"rank": 12}]}, day)
        self.assertEqual(self.ids(data["ranking_guesses"], "rank"), [40, 12])

    def test_empty_hint_does_not_erase(self):
        self.push({"cubeur_latest_hint": "A____", "podium_latest_hint": {"1": "B__"}})
        self.push({"cubeur_latest_hint": None, "podium_latest_hint": {}})
        p = self.stored()
        self.assertEqual(p.cubeur_latest_hint, "A____")
        self.assertEqual(p.podium_latest_hint, {"1": "B__"})
        self.push({"cubeur_latest_hint": "AB___"})
        self.assertEqual(self.stored().cubeur_latest_hint, "AB___")

    def test_malformed_entries_ignored_and_capped(self):
        data = self.push({"cubeur_guesses": ["x", None, 5, {"name": "sans id"}, g(1), {"id": {"a": 1}}]})
        self.assertEqual(self.ids(data["cubeur_guesses"]), [1])
        data = self.push({"cubeur_guesses": [g(i) for i in range(MAX_CLIENT_GUESSES + 50)]})
        self.assertEqual(len(data["cubeur_guesses"]), MAX_CLIENT_GUESSES)
        data = self.push({"cubeur_guesses": "pas une liste"})
        self.assertEqual(len(data["cubeur_guesses"]), MAX_CLIENT_GUESSES)

    def test_get_unchanged_and_anonymous_refused(self):
        self.push({"nr_done": True})
        with at_paris(2026, 12, 1):
            r = self.client_for().get(URL)
            self.assertTrue(r.data["nr_done"])
            self.assertEqual(APIClient().post(URL, {"nr_done": True}, format="json").status_code, 401)
