"""
« Passer à l'indice » : erreurs ajoutées volontairement pour atteindre le prochain palier.
"""
from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models import (
    ChampionshipResult, Competition, Cubeur, DailyChallenge, DailyProgress, Event, Game, NationalRecord, Score, User,
)
from core.progress import skips_total
from core.score_repair import score_from_progress
from core.tests.test_dates import at_paris

DAY = date(2026, 12, 1)


class SkipHintTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        e = Event.objects.create(slug="333", name="3x3x3")
        cls.target = Cubeur.objects.create(wca_id="2015GOLU01", first_name="Theo", last_name="Goluboff", wca_year=2015)
        cls.others = [Cubeur.objects.create(wca_id=f"2015OTHE{i:02d}", first_name=f"O{i}", last_name="X", wca_year=2015)
                      for i in range(4)]
        comp = Competition.objects.create(wca_id="C1", name="Paris Open", month="1", year="2020", day_count=1,
                                          latitude=48.8, longitude=2.3, date_from=date(2020, 1, 1))
        for pos, c in enumerate([cls.target, cls.others[0], cls.others[1]], start=1):
            ChampionshipResult.objects.create(competition=comp, cubeur=c, event=e, position=pos, best=900 + pos, average=1000 + pos)
        rec = NationalRecord.objects.create(wca_id="2008MART01", name="Alice Martin", event_id="333", event_name="3x3x3",
                                            record_type="single", value=900, competition_id="C1",
                                            competition_name="Paris Open", date=date(2010, 1, 1))
        for d in [DAY, date(2026, 11, 28)]:
            DailyChallenge.objects.create(date=d, cubeur=cls.target, competition=comp, ranking_cubeur=cls.target,
                                          ranking_event=e, podium_competition=comp, podium_event=e,
                                          location_competition=comp, nr_record=rec)
        cls.user = User.objects.create(wca_id="2022TREM02", pseudo="Alexis")
        for slug in ["cubeur", "compet", "podium", "nr"]:
            Game.objects.get_or_create(slug=slug, defaults={"name": slug})

    def hint(self, game, body, at=(2026, 12, 1)):
        with at_paris(*at):
            return APIClient().post(f"/api/hint/{game}/", body, format="json")

    def test_skip_unlocks_first_letter(self):
        # 2 erreurs + 3 passées = 5 -> première lettre
        r = self.hint("cubeur", {"previous_ids": [self.others[2].id, self.others[3].id], "skipped": 3})
        self.assertEqual(r.data["hint"], "T")
        self.assertEqual(r.data["mistakes"], 5)
        r = self.hint("cubeur", {"previous_ids": [], "skipped": 10})
        self.assertEqual(r.data["hint"], "Th")

    def test_not_enough_no_hint_and_garbage(self):
        self.assertEqual(self.hint("cubeur", {"previous_ids": [], "skipped": 4}).data["hint"], "")
        self.assertEqual(self.hint("cubeur", {"skipped": "abc"}).data["mistakes"], 0)
        self.assertEqual(self.hint("cubeur", {"skipped": -7}).data["mistakes"], 0)

    def test_compet_nr_podium(self):
        self.assertEqual(self.hint("compet", {"skipped": 5}).data["hint"], "P")
        self.assertEqual(self.hint("nr", {"previous_ids": ["2009DURA01"], "skipped": 4}).data["hint"], "A")
        hints = self.hint("podium", {"previous_ids": [self.others[2].id], "skipped": 4}).data["hints"]
        self.assertEqual(hints, ["T", "O", "O"])

    def test_hidden_before_launch_and_unknown_game(self):
        self.assertEqual(self.hint("cubeur", {"skipped": 5}, at=(2026, 11, 28)).status_code, 404)
        self.assertEqual(self.hint("ranking", {"skipped": 5}).status_code, 404)

    def test_guess_counts_skipped(self):
        with at_paris(2026, 12, 1):
            r = APIClient().post("/api/guess/cubeur/", {"cubeur_id": self.others[3].id, "skipped": 4}, format="json")
        self.assertEqual(r.data["hint"], "T")  # 1 erreur + 4 passées

    def test_progress_merge_union_and_score(self):
        client = APIClient()
        token = AccessToken(); token["user_id"] = self.user.id
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        with at_paris(2026, 12, 1):
            client.post("/api/progress/", {"skips": {"cubeur": [{"at": 2, "n": 3, "to": 5}]}}, format="json")
            # autre appareil : même passage + un second, plus une entrée invalide
            r = client.post("/api/progress/", {"skips": {"cubeur": [
                {"at": 2, "n": 3, "to": 5}, {"at": 2, "n": 5, "to": 10}, {"at": "x"}]}}, format="json")
            self.assertEqual(skips_total(r.data["skips"]["cubeur"]), 8)
            # partie finie : 3 essais + 8 passés -> score 11, recréé par la réparation si l'envoi se perd
            client.post("/api/progress/", {
                "cubeur_guesses": [{"id": self.target.id, "correct": True}, {"id": 9001}, {"id": 9002}],
                "cubeur_done": True,
            }, format="json")
        self.assertEqual(Score.objects.get(user=self.user, game__slug="cubeur").score, 11)

    def test_score_from_progress_podium_with_skips(self):
        p = DailyProgress(user=self.user, date=DAY, podium_guesses=[{"id": 1, "correct": True}, {"id": 9}],
                          skips={"podium": [{"at": 1, "n": 4, "to": 5}]})
        self.assertEqual(score_from_progress(p, "podium"), 5)
