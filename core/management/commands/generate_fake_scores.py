import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import User, Game, Score, DailyChallenge, DailyProgress

FAKE_USERS = [
    ("2015TREM01", "Alexis"),
    ("2018DUPO02", "Camille"),
    ("2019MART03", "Léo"),
    ("2021PETI05", "Hugo"),
    ("2022ROUX06", "Chloé"),
    ("2016GARC07", "Nathan"),
    ("2017FONT08", "Sarah"),
]

GAME_SCORE_RANGES = {
    "cubeur": (1, 8),      # nombre de tentatives
    "compet": (1, 10),
    "ranking": (1, 6),
    "podium": (0, 12),     # erreurs
    "location": (500, 5000),  # score /5000
}

# Bornes approximatives de la France métropolitaine, utilisées en fallback
FRANCE_LAT_RANGE = (42.5, 51.0)
FRANCE_LNG_RANGE = (-4.5, 8.0)


def _random_point_near(lat, lng, max_offset_deg=3.0):
    return (
        lat + random.uniform(-max_offset_deg, max_offset_deg),
        lng + random.uniform(-max_offset_deg, max_offset_deg),
    )


def _random_point_france():
    return (
        random.uniform(*FRANCE_LAT_RANGE),
        random.uniform(*FRANCE_LNG_RANGE),
    )


class Command(BaseCommand):
    help = "Génère des scores factices pour tester le classement du jour."

    def handle(self, *args, **options):
        today = timezone.localdate()

        # Créer les faux users s'ils n'existent pas déjà
        users = []
        for wca_id, pseudo in FAKE_USERS:
            user, _ = User.objects.get_or_create(
                wca_id=wca_id,
                defaults={"pseudo": pseudo},
            )
            users.append(user)

        for game_slug, (low, high) in GAME_SCORE_RANGES.items():
            try:
                game = Game.objects.get(slug=game_slug)
            except Game.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"Jeu '{game_slug}' introuvable, ignoré."
                ))
                continue

            for user in users:
                score_value = random.randint(low, high)

                Score.objects.update_or_create(
                    user=user,
                    game=game,
                    date=today,
                    defaults={"score": score_value},
                )

        # Génération des DailyProgress pour le mode "location"
        challenge = DailyChallenge.objects.filter(date=today).first()
        target = getattr(challenge, "location_competition", None) if challenge else None

        for user in users:
            if target is not None:
                lat, lng = _random_point_near(target.latitude, target.longitude)
            else:
                lat, lng = _random_point_france()

            DailyProgress.objects.update_or_create(
                user=user,
                date=today,
                defaults={
                    "location_guess": {
                        "latitude": round(lat, 6),
                        "longitude": round(lng, 6),
                    },
                    "location_done": True,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            f"Scores factices générés pour {len(users)} utilisateurs sur {len(GAME_SCORE_RANGES)} jeux, "
            f"ainsi que les DailyProgress location associés."
        ))