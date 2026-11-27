import io
import os
import tempfile
import zipfile
from datetime import date

from django.core.management import call_command
from django.test import TestCase

from core.models import NationalRecord
from core.tests.test_dates import at_paris

RESULTS_V2 = [
    # id, competition_id, event_id, round_type_id, pos, best, average, person_name, person_id, person_country_id, format_id, regional_single_record, regional_average_record
    ("1", "Comp2008", "333", "f", "1", "1200", "1450", "Alice Martin", "2008MART01", "France", "a", "NR", "NR"),
    ("2", "Comp2008", "333", "f", "2", "1300", "1500", "Bob Durand", "2008DURA01", "France", "a", "", ""),
    ("3", "Euro2010", "333", "f", "1", "900", "1100", "Alice Martin", "2008MART01", "France", "a", "ER", ""),  # ER = aussi NR
    ("4", "Euro2010", "333", "f", "2", "850", "", "Hans Muller", "2009MULL01", "Germany", "a", "WR", ""),     # pas français
    ("5", "Comp2008", "333mbo", "f", "1", "1100360000", "0", "Bob Durand", "2008DURA01", "France", "1", "NR", ""),  # ancien format MBLD : exclu
    ("6", "Comp2008", "magic", "f", "1", "101", "120", "Bob Durand", "2008DURA01", "France", "a", "NR", "NR"),  # épreuve disparue : gardée
    ("7", "Comp2024", "333fm", "f", "1", "22", "2433", "Chloé Roux", "2019ROUX01", "France", "m", "NR", "NR"),
]
RESULTS_HEADER = ["id", "competition_id", "event_id", "round_type_id", "pos", "best", "average", "person_name",
                  "person_id", "person_country_id", "format_id", "regional_single_record", "regional_average_record"]
COMPETITIONS_V2 = [("id", "name", "start_date"), ("Comp2008", "Open de Paris 2008", "2008-03-15"),
                   ("Euro2010", "European Championship 2010", "2010-07-16"), ("Comp2024", "Lyon Open 2024", "2024-05-04")]
EVENTS = [("id", "name", "rank", "format"), ("333", "3x3x3 Cube", "10", "time"), ("333fm", "3x3x3 Fewest Moves", "70", "number"),
          ("magic", "Magic", "991", "time"), ("333mbo", "3x3x3 Multi-Blind Old Style", "999", "multi")]
PERSONS_V2 = [("wca_id", "sub_id", "name", "country_id"), ("2008MART01", "1", "Alice Martin-Leroy", "France"),
              ("2008MART01", "2", "Alice Martin", "France"), ("2008DURA01", "1", "Bob Durand", "France"),
              ("2019ROUX01", "1", "Chloé Roux", "France")]


def tsv(rows):
    return "\n".join("\t".join(r) for r in rows) + "\n"


def make_export(path, v1=False):
    if v1:  # anciens noms de fichiers / colonnes (camelCase, year/month/day)
        results_header = ["competitionId", "eventId", "roundTypeId", "pos", "best", "average", "personName", "personId",
                          "personCountryId", "formatId", "regionalSingleRecord", "regionalAverageRecord"]
        results = [r[1:] for r in RESULTS_V2]
        comps = [("id", "name", "year", "month", "day"), ("Comp2008", "Open de Paris 2008", "2008", "3", "15"),
                 ("Euro2010", "European Championship 2010", "2010", "7", "16"), ("Comp2024", "Lyon Open 2024", "2024", "5", "4")]
        persons = [("id", "subid", "name", "countryId")] + [p for p in PERSONS_V2[1:]]
        names = {"results": "WCA_export_Results.tsv", "competitions": "WCA_export_Competitions.tsv",
                 "events": "WCA_export_Events.tsv", "persons": "WCA_export_Persons.tsv"}
    else:
        results_header, results, comps, persons = RESULTS_HEADER, RESULTS_V2, COMPETITIONS_V2, PERSONS_V2
        names = {"results": "WCA_export_results.tsv", "competitions": "WCA_export_competitions.tsv",
                 "events": "WCA_export_events.tsv", "persons": "WCA_export_persons.tsv"}
    with zipfile.ZipFile(path, "w") as z:
        z.writestr(names["results"], tsv([results_header] + list(results)))
        z.writestr(names["competitions"], tsv(comps))
        z.writestr(names["events"], tsv(EVENTS))
        z.writestr(names["persons"], tsv(persons))
        z.writestr("WCA_export_result_attempts.tsv", tsv([("value", "attempt_number", "result_id")]))
        z.writestr("README.md", "export de test")


class ImportNRTests(TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.tmp.name, "export.zip")

    def tearDown(self):
        self.tmp.cleanup()

    def run_import(self, *args, v1=False):
        make_export(self.path, v1=v1)
        out = io.StringIO()
        call_command("import_nr_history", "--file", self.path, *args, stdout=out)
        return out.getvalue()

    def summary(self):
        return sorted(NationalRecord.objects.values_list("event_id", "record_type", "value", "wca_id", "record_tag"))

    def test_imports_french_records_only(self):
        self.run_import()
        self.assertEqual(self.summary(), [
            ("333", "average", 1450, "2008MART01", "NR"),
            ("333", "single", 900, "2008MART01", "ER"),
            ("333", "single", 1200, "2008MART01", "NR"),
            ("333fm", "average", 2433, "2019ROUX01", "NR"),
            ("333fm", "single", 22, "2019ROUX01", "NR"),
            ("magic", "average", 120, "2008DURA01", "NR"),
            ("magic", "single", 101, "2008DURA01", "NR"),
        ])

    def test_metadata(self):
        self.run_import()
        nr = NationalRecord.objects.get(event_id="333", record_type="single", value=900)
        self.assertEqual(nr.name, "Alice Martin-Leroy")  # nom actuel (sub_id 1)
        self.assertEqual((nr.event_name, nr.competition_name, nr.date),
                         ("3x3x3 Cube", "European Championship 2010", date(2010, 7, 16)))
        self.assertTrue(nr.is_current)
        self.assertFalse(NationalRecord.objects.get(event_id="333", value=1200).is_current)

    def test_v1_export_format(self):
        self.run_import(v1=True)
        self.assertEqual(len(self.summary()), 7)
        self.assertEqual(NationalRecord.objects.get(event_id="333fm", record_type="single").date, date(2024, 5, 4))
        self.assertEqual(NationalRecord.objects.get(event_id="333", value=900).name, "Alice Martin-Leroy")

    def test_idempotent_and_keeps_manual_fixes(self):
        self.run_import()
        NationalRecord.objects.filter(event_id="magic", record_type="single").update(name="Corrigé à la main")
        out = self.run_import()
        self.assertIn("0 records ajoutés", out)
        self.assertEqual(NationalRecord.objects.count(), 7)
        self.assertEqual(NationalRecord.objects.get(event_id="magic", record_type="single").name, "Corrigé à la main")

    def test_dry_run_writes_nothing(self):
        self.run_import("--dry-run")
        self.assertEqual(NationalRecord.objects.count(), 0)

    def test_weekly_runs_when_table_empty(self):
        with at_paris(2026, 12, 3):  # jeudi
            self.run_import("--weekly")
        self.assertEqual(NationalRecord.objects.count(), 7)

    def test_weekly_skips_other_days(self):
        self.run_import()
        NationalRecord.objects.filter(event_id="magic").delete()
        with at_paris(2026, 12, 3):  # jeudi : rien
            self.assertIn("pas mercredi", self.run_import("--weekly"))
        self.assertEqual(NationalRecord.objects.count(), 5)
        with at_paris(2026, 12, 2):  # mercredi : import
            self.run_import("--weekly")
        self.assertEqual(NationalRecord.objects.count(), 7)


class DownloadRetryTests(TestCase):
    """L'hébergeur de l'export coupe parfois la connexion : on réessaie."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.zip_path = os.path.join(self.tmp.name, "export.zip")
        make_export(self.zip_path)
        with open(self.zip_path, "rb") as f:
            self.zip_bytes = f.read()

    def tearDown(self):
        self.tmp.cleanup()

    def fake_get(self, failures):
        import requests
        from unittest.mock import MagicMock
        calls = {"download": 0}
        zip_bytes = self.zip_bytes

        def get(url, **kwargs):
            if "api/v0/export" in url:
                return MagicMock(json=lambda: {"tsv_url": "https://example.org/export.zip", "export_date": "x", "export_version": "v2"})
            calls["download"] += 1
            if calls["download"] <= failures:
                raise requests.exceptions.ConnectionError("Connection aborted.")
            response = MagicMock()
            response.__enter__.return_value = response
            response.iter_content.return_value = [zip_bytes]
            return response

        return get, calls

    def test_retries_then_succeeds(self):
        from unittest.mock import patch
        get, calls = self.fake_get(failures=2)
        out = io.StringIO()
        with patch("core.management.commands.import_nr_history.requests.get", side_effect=get), \
             patch("core.management.commands.import_nr_history.time.sleep") as sleep:
            call_command("import_nr_history", stdout=out)
        self.assertEqual(calls["download"], 3)
        self.assertEqual(sleep.call_count, 2)
        self.assertEqual(NationalRecord.objects.count(), 7)
        self.assertIn("essai 1/3", out.getvalue())

    def test_clean_error_after_all_attempts(self):
        from unittest.mock import patch
        from django.core.management.base import CommandError
        get, calls = self.fake_get(failures=99)
        with patch("core.management.commands.import_nr_history.requests.get", side_effect=get), \
             patch("core.management.commands.import_nr_history.time.sleep"):
            with self.assertRaisesMessage(CommandError, "impossible après 3 essais"):
                call_command("import_nr_history", stdout=io.StringIO())
        self.assertEqual(calls["download"], 3)
        self.assertEqual(NationalRecord.objects.count(), 0)
