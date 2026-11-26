from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models import Competition, Cubeur, CubeurRanking, DailyChallenge, Event, Game, User
from core.tests.test_dates import at_paris
from core.views import ranking_distance


class RankingDistanceTests(TestCase):
    """Règle des groupes d'ex æquo : N personnes classées R occupent les places R..R+N-1."""

    def test_no_tie(self):
        self.assertEqual(ranking_distance(15, 12, 1), 3)
        self.assertEqual(ranking_distance(9, 12, 1), 3)
        self.assertEqual(ranking_distance(12, 12, 1), 0)

    def test_inside_tie_group_is_exact(self):
        # 5 personnes 20e ex æquo -> places 20 à 24
        for guess in range(20, 25):
            self.assertEqual(ranking_distance(guess, 20, 5), 0)

    def test_distance_to_nearest_edge_of_group(self):
        self.assertEqual(ranking_distance(26, 20, 5), 2)
        self.assertEqual(ranking_distance(17, 20, 5), 3)

    def test_guess_inside_another_group(self):
        # Vrai rang 25, guess 22 (dans le groupe des 20e) : on compte la place, pas le rang du groupe
        self.assertEqual(ranking_distance(22, 25, 1), 3)


class RankingSingleGuessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        comp = Competition.objects.create(wca_id="C1", name="Comp", month="1", year="2020", day_count=1,
                                          latitude=48.8, longitude=2.3, date_from=date(2020, 1, 1))
        cls.e333 = Event.objects.create(slug="333", name="3x3x3")
        cls.fmc = Event.objects.create(slug="333fm", name="FMC")

        def make(event, ranks, prefix):
            people = []
            for i, rank in enumerate(ranks):
                c = Cubeur.objects.create(wca_id=f"2020{prefix}{i:02d}", first_name=f"{prefix}{i}", last_name="X", wca_year=2020)
                CubeurRanking.objects.create(cubeur=c, event=event, result_type="average", score=700 + i, national_rank=rank)
                people.append(c)
            return people

        cls.p333 = make(cls.e333, [10, 12, 12, 14], "AAAA")
        # FMC : un gros groupe d'ex æquo (5 personnes 20e)
        cls.pfm = make(cls.fmc, [18, 20, 20, 20, 20, 20, 25, 26], "FMCX")

        def challenge(d, target, event, frozen=True):
            rk = CubeurRanking.objects.get(cubeur=target, event=event)
            ties = CubeurRanking.objects.filter(event=event, national_rank=rk.national_rank).count()
            DailyChallenge.objects.create(
                date=d, cubeur=target, competition=comp, ranking_cubeur=target, ranking_event=event,
                ranking_answer_rank=rk.national_rank if frozen else None,
                ranking_answer_score=rk.score if frozen else None,
                ranking_answer_tie_count=ties if frozen else None,
                podium_competition=comp, podium_event=event, location_competition=comp,
            )

        challenge(date(2026, 11, 30), cls.p333[1], cls.e333, frozen=False)
        challenge(date(2026, 12, 1), cls.p333[1], cls.e333)          # 12e ex æquo (2 personnes)
        challenge(date(2026, 12, 2), cls.pfm[3], cls.fmc)            # FMC : 20e ex æquo (5 personnes)
        challenge(date(2026, 12, 3), cls.pfm[6], cls.fmc)            # FMC : 25e, juste après le groupe
        Game.objects.create(slug="ranking", name="Classement")
        cls.user = User.objects.create(wca_id="2022TREM02", pseudo="Alexis")

    def guess(self, rank, day=(2026, 12, 1), url="/api/guess/ranking/"):
        with at_paris(*day):
            return APIClient().post(url, {"rank": rank}, format="json")

    def test_old_mode_before_launch(self):
        r = self.guess(20, day=(2026, 11, 30))
        self.assertIn("direction", r.data)
        self.assertNotIn("distance", r.data)

    def test_only_one_guess(self):
        client = APIClient()
        with at_paris(2026, 12, 1):
            self.assertEqual(client.post("/api/guess/ranking/", {"rank": 20}, format="json").status_code, 200)
            self.assertEqual(client.post("/api/guess/ranking/", {"rank": 12}, format="json").status_code, 409)

    def test_tie_gap_is_exact(self):
        self.assertEqual(self.guess(13).data["distance"], 0)

    def test_beyond_last_known_rank(self):
        self.assertEqual(self.guess(20).data["distance"], 7)  # groupe 12-13 -> 20 : 7

    def test_fmc_big_tie_group(self):
        day = (2026, 12, 2)
        for guess, expected in [(20, 0), (22, 0), (24, 0), (25, 1), (26, 2), (18, 2), (17, 3)]:
            self.assertEqual(self.guess(guess, day).data["distance"], expected, f"guess {guess}")

    def test_fmc_target_right_after_group(self):
        r = self.guess(22, (2026, 12, 3))
        self.assertEqual((r.data["rank"], r.data["distance"]), (25, 3))

    def test_persons_between_guess_and_answer(self):
        # Vrai rang 25, guess 18 : on affiche 18, les cinq 20e, et le 25e
        r = self.guess(18, (2026, 12, 3))
        self.assertEqual([p["rank"] for p in r.data["persons"]], [18, 20, 20, 20, 20, 20, 25])
        self.assertEqual([p["is_answer_group"] for p in r.data["persons"]], [False] * 6 + [True])
        # Guess 22 (dans le groupe des 20e) : le groupe visé est affiché en entier
        r = self.guess(22, (2026, 12, 3))
        self.assertEqual([p["rank"] for p in r.data["persons"]], [20, 20, 20, 20, 20, 25])
        # Guess au-dessus de la réponse
        r = self.guess(26, (2026, 12, 2))
        self.assertEqual([p["rank"] for p in r.data["persons"]], [20] * 5 + [25, 26])
        self.assertEqual(sum(p["is_answer"] for p in r.data["persons"]), 1)

    def test_frozen_answer_wins_over_live_ranking(self):
        CubeurRanking.objects.filter(cubeur=self.p333[1]).update(national_rank=30)
        r = self.guess(10)
        self.assertEqual((r.data["rank"], r.data["distance"]), (12, 2))

    def test_unfrozen_challenge_falls_back_to_live(self):
        # défi antérieur au gel : rang et taille du groupe lus en direct
        from core.views import _ranking_answer
        self.assertEqual(_ranking_answer(DailyChallenge.objects.get(date=date(2026, 11, 30)))[0::2], (12, 2))

    def test_no_archive_for_ranking(self):
        r = self.guess(10, (2026, 12, 12), "/api/guess/ranking/?date=2026-12-01")
        self.assertEqual(r.status_code, 403)

    def test_no_late_score_for_ranking(self):
        client = APIClient()
        token = AccessToken(); token["user_id"] = self.user.id
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        with at_paris(2026, 12, 12):
            r = client.post("/api/scores/submit/", {"game": "ranking", "score": 0, "date": "2026-12-01"}, format="json")
            self.assertEqual(r.status_code, 403)
            r = client.post("/api/scores/submit/", {"game": "ranking", "score": 0}, format="json")
            self.assertEqual(r.status_code, 201)
