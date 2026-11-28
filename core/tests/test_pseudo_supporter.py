from datetime import date

from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from core.models import Game, Score, User
from core.pseudo import validate_pseudo
from core.tests.test_dates import at_paris


class ValidatePseudoTests(SimpleTestCase):
    def ok(self, raw, expected=None):
        pseudo, error = validate_pseudo(raw)
        self.assertIsNone(error, raw)
        self.assertEqual(pseudo, expected if expected is not None else raw)

    def ko(self, raw):
        pseudo, error = validate_pseudo(raw)
        self.assertIsNone(pseudo, raw)
        self.assertTrue(error)

    def test_accepts_letters_digits_and_allowed_punctuation(self):
        for p in ("Alexis", "Chloé", "Jean-Pierre", "x_cuber.42", "O'Brien", "O’Brien", "アレクシス", "王艺衡", "Yiheng Wang (王艺衡)"):
            self.ok(p)

    def test_normalizes_spaces(self):
        self.ok("  Alexis   Tremellat ", "Alexis Tremellat")
        self.ok("Alexis\tT", "Alexis T")

    def test_normalizes_combining_accents(self):
        self.ok("Chloé", "Chloé")

    def test_rejects_hearts_and_emojis(self):
        for p in ("Alexis ❤️", "Alexis ❤", "♥ Alexis", "Alexis ♡", "💖", "Alexis 👑", "Alexis <3", "Alexis ❥", "Alexis ✨"):
            self.ko(p)

    def test_rejects_empty_too_long_and_punctuation_only(self):
        for p in ("", "   ", "a" * 31, "...", "- _ '", "()"):
            self.ko(p)
        self.ok("a" * 30)


class PseudoAndSupporterApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice = User.objects.create(wca_id="2008MART01", pseudo="Alice", is_supporter=True)
        cls.bob = User.objects.create(wca_id="2009DURA01", pseudo="Bob")
        game = Game.objects.get_or_create(slug="cubeur", defaults={"name": "cubeur"})[0]
        Score.objects.create(user=cls.alice, game=game, score=2, date=date(2026, 12, 1))
        Score.objects.create(user=cls.bob, game=game, score=5, date=date(2026, 12, 1))

    def client_for(self, user):
        client = APIClient()
        token = AccessToken(); token["user_id"] = user.id
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return client

    def test_update_pseudo_rejects_heart(self):
        r = self.client_for(self.bob).patch("/api/auth/update-pseudo/", {"pseudo": "Bob ❤️"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.bob.refresh_from_db()
        self.assertEqual(self.bob.pseudo, "Bob")

    def test_update_pseudo_saves_cleaned_value(self):
        r = self.client_for(self.bob).patch("/api/auth/update-pseudo/", {"pseudo": "  Bobby   B "}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["pseudo"], "Bobby B")
        self.bob.refresh_from_db()
        self.assertEqual(self.bob.pseudo, "Bobby B")

    def test_me_exposes_supporter(self):
        self.assertTrue(self.client_for(self.alice).get("/api/auth/me/").data["is_supporter"])
        self.assertFalse(self.client_for(self.bob).get("/api/auth/me/").data["is_supporter"])

    def test_leaderboards_expose_supporter(self):
        with at_paris(2026, 12, 3):
            daily = APIClient().get("/api/leaderboard/?game=cubeur&date=2026-12-01").data
            general = APIClient().get("/api/leaderboard/general/?period=day&date=2026-12-01").data["rows"]
        self.assertEqual({x["pseudo"]: x["is_supporter"] for x in daily}, {"Alice": True, "Bob": False})
        self.assertEqual({x["pseudo"]: x["is_supporter"] for x in general}, {"Alice": True, "Bob": False})
