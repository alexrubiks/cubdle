from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.leaderboards import crowned_user_ids, streak_for_user
from core.models import Game, Score, User
from core.tests.test_dates import at_paris

ALL = ["cubeur", "compet", "ranking", "podium", "nr", "location"]
BEFORE_LAUNCH = ["cubeur", "compet", "ranking", "podium", "location"]


class CrownStreakTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.games = {s: Game.objects.get_or_create(slug=s, defaults={"name": s})[0] for s in ALL}
        cls.alice = User.objects.create(wca_id="2008MART01", pseudo="Alice")
        cls.bob = User.objects.create(wca_id="2009DURA01", pseudo="Bob")

    def play(self, user, day, games=ALL, score=2, late=False):
        for g in games:
            Score.objects.create(user=user, game=self.games[g], date=day, score=score, is_late=late)

    # ── Couronne ──
    def test_crown_goes_to_last_week_winner(self):
        # semaine du 23 au 29 novembre : Alice gagne
        self.play(self.alice, date(2026, 11, 24), BEFORE_LAUNCH, score=1)
        self.play(self.bob, date(2026, 11, 24), BEFORE_LAUNCH, score=5)
        # pendant toute la semaine suivante (30/11 -> 6/12)
        self.assertEqual(crowned_user_ids(date(2026, 11, 30)), {self.alice.id})
        self.assertEqual(crowned_user_ids(date(2026, 12, 6)), {self.alice.id})
        # pas pendant la semaine où elle a gagné, ni deux semaines après
        self.assertEqual(crowned_user_ids(date(2026, 11, 26)), set())
        self.assertEqual(crowned_user_ids(date(2026, 12, 7)), set())

    def test_tied_winners_all_crowned(self):
        self.play(self.alice, date(2026, 11, 24), ["cubeur"], score=2)
        self.play(self.bob, date(2026, 11, 24), ["cubeur"], score=2)
        self.assertEqual(crowned_user_ids(date(2026, 12, 1)), {self.alice.id, self.bob.id})

    def test_crown_in_leaderboards_is_fixed(self):
        # Alice gagne la semaine du 23/11, Bob celle du 30/11
        self.play(self.alice, date(2026, 11, 24), ["cubeur"], score=1)
        self.play(self.bob, date(2026, 11, 24), ["cubeur"], score=5)
        self.play(self.bob, date(2026, 12, 1), ["cubeur"], score=1)
        self.play(self.alice, date(2026, 12, 1), ["cubeur"], score=5)
        with at_paris(2026, 12, 3):  # tenante actuelle : Alice
            for url in ("/api/leaderboard/?game=cubeur&date=2026-12-01",
                        "/api/leaderboard/?game=cubeur&date=2026-11-24"):
                r = APIClient().get(url)
                self.assertEqual({x["pseudo"]: x["crowned"] for x in r.data}, {"Bob": False, "Alice": True})
            r = APIClient().get("/api/leaderboard/general/?period=day&date=2026-12-01")
            self.assertEqual({x["pseudo"]: x["crowned"] for x in r.data["rows"]}, {"Bob": False, "Alice": True})
        with at_paris(2026, 12, 8):  # la semaine suivante, c'est Bob, même sur les anciens jours
            r = APIClient().get("/api/leaderboard/?game=cubeur&date=2026-11-24")
            self.assertEqual({x["pseudo"]: x["crowned"] for x in r.data}, {"Bob": True, "Alice": False})

    # ── Série ──
    def test_streak_counts_complete_days(self):
        for d in range(1, 5):  # 1er -> 4 décembre : tout fait
            self.play(self.alice, date(2026, 12, d))
        s = streak_for_user(self.alice, today=date(2026, 12, 4))
        self.assertEqual(s, {"current": 4, "best": 4, "today_done": True})

    def test_today_not_done_keeps_yesterday_streak(self):
        for d in range(1, 4):
            self.play(self.alice, date(2026, 12, d))
        self.play(self.alice, date(2026, 12, 4), ["cubeur"])  # aujourd'hui commencé
        s = streak_for_user(self.alice, today=date(2026, 12, 4))
        self.assertEqual(s, {"current": 3, "best": 3, "today_done": False})

    def test_missing_one_game_breaks_streak(self):
        self.play(self.alice, date(2026, 12, 1))
        self.play(self.alice, date(2026, 12, 2), ALL[:-1])  # pas la localisation
        self.play(self.alice, date(2026, 12, 3))
        s = streak_for_user(self.alice, today=date(2026, 12, 3))
        self.assertEqual((s["current"], s["best"]), (1, 1))

    def test_nr_not_required_before_launch(self):
        self.play(self.alice, date(2026, 11, 29), BEFORE_LAUNCH)
        self.play(self.alice, date(2026, 11, 30), BEFORE_LAUNCH)
        self.play(self.alice, date(2026, 12, 1))  # NR requis à partir du 1er
        s = streak_for_user(self.alice, today=date(2026, 12, 1))
        self.assertEqual(s["current"], 3)

    def test_late_games_dont_repair_streak(self):
        self.play(self.alice, date(2026, 11, 1), BEFORE_LAUNCH)
        self.play(self.alice, date(2026, 11, 2), BEFORE_LAUNCH, late=True)  # rejoué en archive
        self.play(self.alice, date(2026, 11, 3), BEFORE_LAUNCH)
        s = streak_for_user(self.alice, today=date(2026, 11, 3))
        self.assertEqual((s["current"], s["best"]), (1, 1))

    def test_best_streak_kept(self):
        for d in range(1, 8):
            self.play(self.alice, date(2026, 12, d))
        self.play(self.alice, date(2026, 12, 10))
        s = streak_for_user(self.alice, today=date(2026, 12, 10))
        self.assertEqual((s["current"], s["best"]), (1, 7))

    def test_streak_endpoint(self):
        self.play(self.alice, date(2026, 12, 1))
        client = APIClient()
        token = AccessToken(); token["user_id"] = self.alice.id
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        with at_paris(2026, 12, 1):
            self.assertEqual(client.get("/api/progress/streak/").data["current"], 1)
            self.assertEqual(APIClient().get("/api/progress/streak/").status_code, 401)
