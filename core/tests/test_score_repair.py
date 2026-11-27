"""
Filet de sécurité : un jeu terminé dans la progression a toujours son Score.
"""
from datetime import date
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models import Competition, Cubeur, DailyChallenge, DailyProgress, Event, Game, Score, User
from core.tests.test_dates import at_paris
from core.views import _haversine, _location_score

DAY = date(2026, 12, 1)


def g(i, correct=False, **extra):
    return {"id": i, "name": f"P{i}", "correct": correct, **extra}


class ScoreRepairTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create(wca_id="2022TREM02", pseudo="Alexis")
        for slug in ["cubeur", "compet", "ranking", "podium", "location", "nr"]:
            Game.objects.get_or_create(slug=slug, defaults={"name": slug})
        e = Event.objects.create(slug="333", name="3x3x3")
        c = Cubeur.objects.create(wca_id="2020TEST01", first_name="A", last_name="B", wca_year=2020)
        cls.comp = Competition.objects.create(wca_id="C1", name="Comp", month="1", year="2020", day_count=1,
                                              latitude=48.8566, longitude=2.3522, date_from=date(2020, 1, 1))
        for d in [DAY, date(2026, 11, 20), date(2026, 11, 28)]:
            DailyChallenge.objects.create(date=d, cubeur=c, competition=cls.comp, ranking_cubeur=c, ranking_event=e,
                                          podium_competition=cls.comp, podium_event=e, location_competition=cls.comp)

    def client_for(self):
        client = APIClient()
        token = AccessToken(); token["user_id"] = self.user.id
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

    def push(self, data, at=(2026, 12, 1), url="/api/progress/"):
        with at_paris(*at):
            r = self.client_for().post(url, data, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        return r

    def score(self, slug, day=DAY):
        return Score.objects.filter(user=self.user, game__slug=slug, date=day).first()

    def test_not_done_no_score(self):
        self.push({"cubeur_guesses": [g(1), g(2)]})
        self.assertIsNone(self.score("cubeur"))

    def test_counts_like_the_front(self):
        self.push({
            "cubeur_guesses": [g(3, True), g(2), g(1)], "cubeur_done": True,
            "compet_guesses": [g(1, True)], "compet_done": True,
            "nr_guesses": [{"wca_id": "A", "correct": True}, {"wca_id": "B"}], "nr_done": True,
            "podium_guesses": [g(1, True), g(2), g(3, True), g(4), g(5, True)], "podium_done": True,
        })
        self.assertEqual(self.score("cubeur").score, 3)
        self.assertEqual(self.score("compet").score, 1)
        self.assertEqual(self.score("nr").score, 2)
        self.assertEqual(self.score("podium").score, 2)  # erreurs
        self.assertFalse(self.score("cubeur").is_late)

    def test_ranking_single_distance(self):
        self.push({"ranking_guesses": [{"rank": 12, "distance": 4}], "ranking_done": True})
        self.assertEqual(self.score("ranking").score, 4)

    def test_ranking_legacy_count_before_launch(self):
        day = date(2026, 11, 28)
        self.push({"ranking_guesses": [{"rank": 5, "correct": True}, {"rank": 9}], "ranking_done": True},
                  at=(2026, 11, 28))
        self.assertEqual(self.score("ranking", day).score, 2)

    def test_location_recomputed_by_server(self):
        lat, lng = 45.764, 4.8357  # Lyon
        self.push({"location_guess": {"latitude": lat, "longitude": lng, "result": {"score": 5000}},
                   "location_done": True})
        expected = _location_score(_haversine(lat, lng, self.comp.latitude, self.comp.longitude))
        self.assertEqual(self.score("location").score, expected)
        self.assertLess(expected, 5000)  # la valeur envoyée par le navigateur est ignorée

    def test_existing_score_never_changed_and_no_duplicate(self):
        with at_paris(2026, 12, 1):
            self.client_for().post("/api/scores/submit/", {"game": "cubeur", "score": 7, "date": "2026-12-01"},
                                   format="json")
        self.push({"cubeur_guesses": [g(1, True)], "cubeur_done": True})
        self.assertEqual(self.score("cubeur").score, 7)
        # et dans l'autre sens : le vrai envoi arrive après la réparation
        self.push({"compet_guesses": [g(2), g(1, True)], "compet_done": True})
        with at_paris(2026, 12, 1):
            self.client_for().post("/api/scores/submit/", {"game": "compet", "score": 2, "date": "2026-12-01"},
                                   format="json")
        self.assertEqual(Score.objects.filter(user=self.user, game__slug="compet").count(), 1)

    def test_archive_is_late_and_ranking_skipped(self):
        day = date(2026, 11, 20)
        self.push({"date": "2026-11-20", "cubeur_guesses": [g(1, True)], "cubeur_done": True,
                   "ranking_guesses": [{"rank": 3, "distance": 0}], "ranking_done": True}, at=(2026, 12, 1))
        self.assertTrue(self.score("cubeur", day).is_late)
        self.assertIsNone(self.score("ranking", day))

    def test_sync_on_login_also_repairs(self):
        self.push({"local_progress": {"nr_guesses": [{"wca_id": "A", "correct": True}], "nr_done": True}},
                  url="/api/progress/sync/")
        self.assertEqual(self.score("nr").score, 1)

    def test_reconcile_command(self):
        DailyProgress.objects.create(user=self.user, date=date(2026, 11, 20),
                                     podium_guesses=[g(1, True), g(2)], podium_done=True,
                                     ranking_guesses=[{"rank": 1, "distance": 0}], ranking_done=True)
        DailyProgress.objects.create(user=self.user, date=date(2026, 7, 1),  # avant ARCHIVE_START : ignoré
                                     cubeur_guesses=[g(1, True)], cubeur_done=True)
        out = StringIO()
        with at_paris(2026, 12, 1):
            call_command("reconcile_scores", stdout=out)
        self.assertEqual(Score.objects.count(), 0)  # lecture seule
        self.assertIn("1 score(s) à créer", out.getvalue())
        with at_paris(2026, 12, 1):
            call_command("reconcile_scores", "--apply", stdout=StringIO())
        s = self.score("podium", date(2026, 11, 20))
        self.assertEqual((s.score, s.is_late), (1, True))
        self.assertEqual(Score.objects.count(), 1)
