from datetime import date

from django.core.management.base import OutputWrapper
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.management.commands.generate_daily_challenge import Command as Generate
from core.models import Competition, Cubeur, DailyChallenge, Event, Game, NationalRecord, Score, User
from core.tests.test_dates import at_paris


def nr(wca_id, name, event="333", rtype="single", value=900, comp="Comp", d=date(2010, 1, 1)):
    return NationalRecord.objects.create(
        wca_id=wca_id, name=name, event_id=event, event_name=event, record_type=rtype,
        value=value, competition_id=comp, competition_name=f"{comp} Open", date=d,
    )


class NRGameTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        e = Event.objects.create(slug="333", name="3x3x3")
        c = Cubeur.objects.create(wca_id="2020TEST01", first_name="A", last_name="B", wca_year=2020)
        comp = Competition.objects.create(wca_id="C1", name="Comp", month="1", year="2020", day_count=1,
                                          latitude=48.8, longitude=2.3, date_from=date(2020, 1, 1))
        cls.target = nr("2008MART01", "Alice Martin", value=900)
        nr("2009DURA01", "Bob Durand", value=1000, d=date(2009, 1, 1))
        nr("2015ELOI01", "Éloïse Petit", event="333fm", value=22, comp="FMC2015")
        cls.tied = nr("2015ROUX01", "Chloé Roux", event="333fm", value=22, comp="FMC2015")  # NR égalé, même compét
        for d, rec in [(date(2026, 11, 30), cls.target), (date(2026, 12, 1), cls.target), (date(2026, 12, 2), cls.tied)]:
            DailyChallenge.objects.create(date=d, cubeur=c, competition=comp, ranking_cubeur=c, ranking_event=e,
                                          podium_competition=comp, podium_event=e, location_competition=comp, nr_record=rec)

    def guess(self, client, wca_id, day=(2026, 12, 1), url="/api/guess/nr/"):
        with at_paris(*day):
            return client.post(url, {"wca_id": wca_id}, format="json")

    def test_hidden_before_launch(self):
        with at_paris(2026, 11, 30):
            self.assertNotIn("nr", APIClient().get("/api/daily/").data)
            self.assertEqual(APIClient().get("/api/nr/search/?q=alice").data, [])
        self.assertEqual(self.guess(APIClient(), "2008MART01", (2026, 11, 30)).status_code, 404)

    def test_daily_does_not_spoil(self):
        with at_paris(2026, 12, 1):
            data = APIClient().get("/api/daily/").data["nr"]
        self.assertEqual(data, {"event_id": "333", "event_name": "333", "record_type": "single", "value": 900, "date": "2010-01-01"})

    def test_search_all_holders_without_accents(self):
        with at_paris(2026, 12, 1):
            r = APIClient().get("/api/nr/search/?q=eloise")
            self.assertEqual(r.data, [{"wca_id": "2015ELOI01", "name": "Éloïse Petit"}])
            r = APIClient().get("/api/nr/search/?q=ma&exclude_ids=2008MART01")
            self.assertEqual(r.data, [])

    def test_wrong_then_right(self):
        client = APIClient()
        r = self.guess(client, "2009DURA01")
        self.assertEqual((r.data["correct"], r.data["hint"]), (False, ""))
        self.assertNotIn("answer", r.data)
        self.assertEqual(self.guess(client, "2009DURA01").status_code, 400)  # déjà proposé
        r = self.guess(client, "2008MART01")
        self.assertTrue(r.data["correct"])
        self.assertEqual(r.data["answer"]["competition_name"], "Comp Open")
        self.assertEqual(self.guess(client, "2015ROUX01").status_code, 409)  # déjà trouvé

    def test_hint_one_letter_every_five_mistakes(self):
        # 5 erreurs avec des personnes fictives ajoutées à la volée
        client = APIClient()
        for i in range(10):
            nr(f"2000FAKE{i:02d}", f"Fake {i}", value=5000 + i)
        hints = [self.guess(client, f"2000FAKE{i:02d}").data["hint"] for i in range(10)]
        self.assertEqual(hints[3], "")
        self.assertEqual(hints[4], "A")
        self.assertEqual(hints[8], "A")
        self.assertEqual(hints[9], "Al")

    def test_tied_record_accepts_both_holders(self):
        self.assertTrue(self.guess(APIClient(), "2015ELOI01", (2026, 12, 2)).data["correct"])
        self.assertTrue(self.guess(APIClient(), "2015ROUX01", (2026, 12, 2)).data["correct"])

    def test_archive_and_late_score(self):
        user = User.objects.create(wca_id="2022TREM02", pseudo="Alexis")
        Game.objects.get_or_create(slug="nr", defaults={"name": "NR"})
        client = APIClient()
        with at_paris(2026, 12, 12):
            self.assertTrue(self.guess(client, "2008MART01", (2026, 12, 12), "/api/guess/nr/?date=2026-12-01").data["correct"])
            token = AccessToken(); token["user_id"] = user.id
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
            r = client.post("/api/scores/submit/", {"game": "nr", "score": 1, "date": "2026-12-01"}, format="json")
        self.assertTrue(r.data["is_late"])


class NRPickTests(TestCase):
    def test_weight_has_floor_and_decreases(self):
        cmd = Generate()
        ref = date(2026, 12, 1)
        recent = NationalRecord(date=date(2026, 11, 1))
        old = NationalRecord(date=date(2005, 1, 1))
        self.assertEqual(cmd._nr_weight(old, ref), 365)
        self.assertGreater(cmd._nr_weight(recent, ref), 3600)

    def test_pick_avoids_recent(self):
        e = Event.objects.create(slug="333", name="3x3x3")
        c = Cubeur.objects.create(wca_id="2020TEST01", first_name="A", last_name="B", wca_year=2020)
        comp = Competition.objects.create(wca_id="C1", name="Comp", month="1", year="2020", day_count=1,
                                          latitude=48.8, longitude=2.3, date_from=date(2020, 1, 1))
        a = nr("2008MART01", "Alice", value=900, d=date(2026, 11, 1))
        b = nr("2009DURA01", "Bob", value=1000, d=date(2005, 1, 1))
        DailyChallenge.objects.create(date=date(2026, 11, 20), cubeur=c, competition=comp, ranking_cubeur=c, ranking_event=e,
                                      podium_competition=comp, podium_event=e, location_competition=comp, nr_record=a)
        cmd = Generate()
        picks = {cmd._pick_nr(date(2026, 12, 1)).id for _ in range(20)}
        self.assertEqual(picks, {b.id})

    def test_complete_fills_existing_challenge(self):
        e = Event.objects.create(slug="333", name="3x3x3")
        c = Cubeur.objects.create(wca_id="2020TEST01", first_name="A", last_name="B", wca_year=2020)
        comp = Competition.objects.create(wca_id="C1", name="Comp", month="1", year="2020", day_count=1,
                                          latitude=48.8, longitude=2.3, date_from=date(2020, 1, 1))
        a = nr("2008MART01", "Alice")
        ch = DailyChallenge.objects.create(date=date(2026, 12, 1), cubeur=c, competition=comp, ranking_cubeur=c, ranking_event=e,
                                           podium_competition=comp, podium_event=e, location_competition=comp)
        cmd = Generate()
        cmd.stdout = OutputWrapper(open("/dev/null", "w"))
        cmd._complete(ch)
        ch.refresh_from_db()
        self.assertEqual(ch.nr_record_id, a.id)
