from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.leaderboards import game_points, period_bounds
from core.models import Game, Score, User
from core.tests.test_dates import at_paris


class GamePointsTests(TestCase):
    def test_spread_from_10_to_100(self):
        pts = game_points([("a", 1), ("b", 2), ("c", 3)], "asc")
        self.assertEqual(pts, {"a": (1, 100), "b": (2, 55), "c": (3, 10)})

    def test_desc_order(self):  # localisation : plus grand = meilleur
        pts = game_points([("a", 5000), ("b", 1200)], "desc")
        self.assertEqual(pts["a"], (1, 100))
        self.assertEqual(pts["b"], (2, 10))

    def test_alone_gets_100(self):
        self.assertEqual(game_points([("a", 7)], "asc"), {"a": (1, 100)})

    def test_ties_counted_like_wca_ranks(self):
        # 1 meilleur, 3 ex æquo, 1 moins bon (N = 5)
        pts = game_points([("a", 2), ("b", 4), ("c", 4), ("d", 4), ("e", 9)], "asc")
        self.assertEqual(pts["a"], (1, 100))
        self.assertEqual({pts[k] for k in "bcd"}, {(2, 78)})  # 1 meilleur sur 4 autres : 10 + 90 × 3/4
        self.assertEqual(pts["e"], (5, 10))

    def test_tied_first_all_get_100(self):
        pts = game_points([("a", 2), ("b", 2), ("c", 5)], "asc")
        self.assertEqual((pts["a"], pts["b"]), ((1, 100), (1, 100)))

    def test_everyone_tied(self):
        pts = game_points([(k, 3) for k in "abcd"], "asc")
        self.assertEqual(set(pts.values()), {(1, 100)})

    def test_lucky_shot_equals_perfect(self):
        from core.leaderboards import effective_score
        entries = [(k, effective_score("cubeur", v)) for k, v in [("bol", 1), ("perfect", 2), ("c", 3)]]
        pts = game_points(entries, "asc")
        self.assertEqual((pts["bol"], pts["perfect"]), ((1, 100), (1, 100)))
        self.assertEqual(effective_score("podium", 0), 0)  # pas de plancher hors Cubeur/Compét

    def test_period_bounds(self):
        d = date(2026, 12, 3)  # jeudi
        self.assertEqual(period_bounds("week", d), (date(2026, 11, 30), date(2026, 12, 6)))
        self.assertEqual(period_bounds("month", d), (date(2026, 12, 1), date(2026, 12, 31)))
        self.assertEqual(period_bounds("month", date(2027, 2, 10))[1], date(2027, 2, 28))


class LeaderboardApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.games = {slug: Game.objects.get_or_create(slug=slug, defaults={"name": slug})[0] for slug in ("cubeur", "location", "nr")}
        cls.alice = User.objects.create(wca_id="2008MART01", pseudo="Alice")
        cls.bob = User.objects.create(wca_id="2009DURA01", pseudo="Bob")
        cls.chloe = User.objects.create(wca_id="2014ROUX01", pseudo="Chloé")
        cls.late = User.objects.create(wca_id="2020LATE01", pseudo="Retard")

        def score(user, slug, value, d, late=False):
            Score.objects.create(user=user, game=cls.games[slug], score=value, date=d, is_late=late)

        d1, d2 = date(2026, 12, 1), date(2026, 12, 2)
        # 1er décembre : cubeur (asc) et location (desc)
        score(cls.alice, "cubeur", 2, d1); score(cls.bob, "cubeur", 5, d1); score(cls.chloe, "cubeur", 5, d1)
        score(cls.alice, "location", 3000, d1); score(cls.bob, "location", 4800, d1)
        score(cls.late, "cubeur", 1, d1, late=True)  # en décalé : hors classement
        # 2 décembre : seule Chloé joue
        score(cls.chloe, "nr", 3, d2)

    def get(self, url, user=None):
        client = APIClient()
        if user:
            token = AccessToken(); token["user_id"] = user.id
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        with at_paris(2026, 12, 3):
            return client.get(url)

    def test_game_leaderboard_has_rank_points_and_is_me(self):
        r = self.get("/api/leaderboard/?game=cubeur&date=2026-12-01", user=self.bob)
        self.assertEqual([(x["pseudo"], x["rank"], x["points"], x["is_me"]) for x in r.data],
                         [("Alice", 1, 100, False), ("Bob", 2, 55, True), ("Chloé", 2, 55, False)])

    def test_late_players_interleaved_without_rank(self):
        r = self.get("/api/leaderboard/?game=cubeur&date=2026-12-01&include_late=1")
        # Le joueur en décalé (1 essai) est intercalé à sa place, sans rang ni points
        self.assertEqual([x["pseudo"] for x in r.data], ["Retard", "Alice", "Bob", "Chloé"])
        late = r.data[0]
        self.assertEqual((late["rank"], late["points"], late["is_late"]), (None, None, True))
        self.assertEqual((r.data[1]["rank"], r.data[1]["points"]), (1, 100))  # Alice reste 1re

    def test_general_day(self):
        r = self.get("/api/leaderboard/general/?period=day&date=2026-12-01")
        rows = {x["pseudo"]: x for x in r.data["rows"]}
        # Alice 100 + 10, Bob 55 + 100, Chloé 55 (n'a pas joué location)
        self.assertEqual(rows["Alice"]["points"], 110)
        self.assertEqual(rows["Bob"]["points"], 155)
        self.assertEqual(rows["Chloé"]["points"], 55)
        self.assertEqual(rows["Bob"]["games"], {"cubeur": 55, "location": 100})
        self.assertEqual([x["pseudo"] for x in r.data["rows"]], ["Bob", "Alice", "Chloé"])
        self.assertNotIn("Retard", rows)
        self.assertFalse(r.data["provisional"])

    def test_general_week_sums_days(self):
        r = self.get("/api/leaderboard/general/?period=week&date=2026-12-02")
        rows = {x["pseudo"]: x for x in r.data["rows"]}
        self.assertEqual(rows["Chloé"]["points"], 55 + 100)  # seule joueuse le 2 : 100
        self.assertEqual(rows["Chloé"]["days_played"], 2)
        self.assertEqual((r.data["start"], r.data["end"]), ("2026-11-30", "2026-12-06"))
        self.assertTrue(r.data["provisional"])
        self.assertNotIn("games", rows["Chloé"])

    def test_week_for_one_game(self):
        r = self.get("/api/leaderboard/general/?period=week&date=2026-12-02&game=cubeur")
        rows = {x["pseudo"]: x["points"] for x in r.data["rows"]}
        self.assertEqual(rows, {"Alice": 100, "Bob": 55, "Chloé": 55})  # seulement le Cubeur
        self.assertEqual(r.data["game"], "cubeur")
        self.assertEqual(self.get("/api/leaderboard/general/?period=week&game=nope").status_code, 400)

    def test_general_rejects_future_and_bad_period(self):
        self.assertEqual(self.get("/api/leaderboard/general/?period=day&date=2026-12-10").status_code, 403)
        self.assertEqual(self.get("/api/leaderboard/general/?period=year").status_code, 400)
