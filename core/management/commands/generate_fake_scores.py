import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import User, Game, Score

FAKE_USERS = [
    ("2015TREM01", "Alexis"),
    ("2018DUPO02", "Camille"),
    ("2019MART03", "Léo"),
    ("2020BERN04", "Manon"),
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

        self.stdout.write(self.style.SUCCESS(
            f"Scores factices générés pour {len(users)} utilisateurs sur {len(GAME_SCORE_RANGES)} jeux."
        ))