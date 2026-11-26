from datetime import date, datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models import (
    Competition, Cubeur, CubeurRanking, DailyChallenge, Event, Game, Score, User,
)

PARIS = ZoneInfo("Europe/Paris")


def at_paris(y, m, d, hh=12, mm=0):
    """Patch timezone.now() pour simuler une heure donnée à Paris."""
    return patch("django.utils.timezone.now",
                 return_value=datetime(y, m, d, hh, mm, tzinfo=PARIS).astimezone(ZoneInfo("UTC")))


class DateFoundationsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.event = Event.objects.create(slug="333", name="3x3x3")
        cls.cubeur = Cubeur.objects.create(wca_id="2020TEST01", first_name="A", last_name="B", wca_year=2020)
        CubeurRanking.objects.create(cubeur=cls.cubeur, event=cls.event, result_type="average", score=700, national_rank=3)
        cls.comp = Competition.objects.create(wca_id="C1", name="Comp", month="1", year="2020",
                                              day_count=1, latitude=48.8, longitude=2.3, date_from=date(2020, 1, 1))
        for d in [date(2026, 11, 13), date(2026, 11, 14), date(2026, 11, 30), date(2026, 12, 1)]:
            DailyChallenge.objects.create(
                date=d, cubeur=cls.cubeur, competition=cls.comp,
                ranking_cubeur=cls.cubeur, ranking_event=cls.event,
                podium_competition=cls.comp, podium_event=cls.event, location_competition=cls.comp,
            )
        cls.game = Game.objects.create(slug="cubeur", name="Cubeur")
        cls.user = User.objects.create(wca_id="2022TREM02", pseudo="Alexis")

    def setUp(self):
        self.client = APIClient()

    def auth(self):
        token = AccessToken()
        token["user_id"] = self.user.id
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_midnight_uses_paris_date(self):
        # 00h10 à Paris le 1er décembre = 23h10 UTC le 30/11
        with at_paris(2026, 12, 1, 0, 10):
            r = self.client.get("/api/daily/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["date"], "2026-12-01")

    def test_archive_window(self):
        with at_paris(2026, 11, 23):
            self.assertEqual(self.client.get("/api/daily/?date=2026-11-13").status_code, 200)
            self.assertEqual(self.client.get("/api/daily/?date=2026-11-14").status_code, 403)
            self.assertEqual(self.client.get("/api/daily/?date=2026-12-01").status_code, 403)
            self.assertEqual(self.client.get("/api/daily/?date=nope").status_code, 403)

    def test_guess_on_archive_date(self):
        with at_paris(2026, 11, 23):
            r = self.client.post("/api/guess/cubeur/?date=2026-11-13", {"cubeur_id": self.cubeur.id}, format="json")
            self.assertEqual(r.status_code, 200, r.data)
            r = self.client.post("/api/guess/cubeur/?date=2026-11-20", {"cubeur_id": self.cubeur.id}, format="json")
            self.assertEqual(r.status_code, 403)

    def test_score_today_late_and_grace(self):
        self.auth()
        with at_paris(2026, 12, 1, 0, 30):
            # partie de la veille terminée juste après minuit : dans les temps
            r = self.client.post("/api/scores/submit/", {"game": "cubeur", "score": 4, "date": "2026-11-30"}, format="json")
            self.assertEqual(r.status_code, 201, r.data)
            self.assertFalse(r.data["is_late"])
            # jour du jour
            r = self.client.post("/api/scores/submit/", {"game": "cubeur", "score": 3}, format="json")
            self.assertEqual(r.status_code, 201)
            # archive : en décalé
            r = self.client.post("/api/scores/submit/", {"game": "cubeur", "score": 2, "date": "2026-11-13"}, format="json")
            self.assertTrue(r.data["is_late"])
            # jour non accessible
            r = self.client.post("/api/scores/submit/", {"game": "cubeur", "score": 2, "date": "2026-11-25"}, format="json")
            self.assertEqual(r.status_code, 403)
        self.assertEqual(Score.objects.get(date=date(2026, 12, 1)).score, 3)

    def test_leaderboard_hides_late_by_default(self):
        self.auth()
        other = User.objects.create(wca_id="2020XXXX01", pseudo="Late")
        Score.objects.create(user=self.user, game=self.game, date=date(2026, 11, 13), score=5)
        Score.objects.create(user=other, game=self.game, date=date(2026, 11, 13), score=1, is_late=True)
        with at_paris(2026, 11, 30):
            r = self.client.get("/api/leaderboard/?game=cubeur&date=2026-11-13")
            self.assertEqual([x["pseudo"] for x in r.data], ["Alexis"])
            r = self.client.get("/api/leaderboard/?game=cubeur&date=2026-11-13&include_late=1")
            self.assertEqual([(x["pseudo"], x["is_late"]) for x in r.data], [("Alexis", False), ("Late", True)])

    def test_progress_per_date(self):
        self.auth()
        with at_paris(2026, 11, 23):
            self.client.post("/api/progress/?date=2026-11-13", {"cubeur_done": True}, format="json")
            r = self.client.get("/api/progress/")
            self.assertFalse(r.data["cubeur_done"])
            r = self.client.get("/api/progress/?date=2026-11-13")
            self.assertTrue(r.data["cubeur_done"])
