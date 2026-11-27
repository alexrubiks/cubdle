"""
Scores factices pour tester les classements en local (NE PAS lancer en prod).

    python manage.py generate_fake_scores                  # aujourd'hui seulement
    python manage.py generate_fake_scores --days 14        # + les 14 jours précédents
    python manage.py generate_fake_scores --days 30 --late # + des parties "en décalé"
"""
import random
from datetime import timedelta

from django.core.management.base import BaseCommand

from core.dates import ARCHIVE_DELAY_DAYS, ARCHIVE_START, today as paris_today
from core.models import DailyChallenge, DailyProgress, Game, Score, User

FAKE_USERS = [
    ("2015TREM01", "Alexis Tremellat"),
    ("2018DUPO02", "Camille Leclerc"),
    ("2019MART03", "Léo Bayer-Dumolunin"),
    ("2021PETI05", "Hugo Perricouxh"),
    ("2022ROUX06", "Chloé TroisMaisons"),
    ("2016GARC07", "Nathan Doodlejump"),
    ("2017FONT08", "Sarah Daloz-Baltenberger"),
]

# Joueurs qui rejouent les anciens défis (scores "en décalé", hors classement)
FAKE_LATE_USERS = [
    ("2020RETA01", "Marie Retardataire"),
    ("2020RETA02", "Paul Endecalé"),
]

GAME_SCORE_RANGES = {
    "cubeur": (1, 8),         # nombre d'essais (1 = coup de bol, 2 = perfect)
    "compet": (1, 10),        # nombre d'essais
    "ranking": (0, 15),       # écart de rangs (0 = perfect)
    "podium": (0, 12),        # erreurs
    "nr": (1, 10),            # nombre d'essais
    "location": (500, 5000),  # points /5000
}

SKIP_DAY_PROBABILITY = 0.25   # un joueur ne joue pas tous les jours
SKIP_GAME_PROBABILITY = 0.15  # ni forcément tous les jeux

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
    help = "Génère des scores factices pour tester les classements (dev uniquement)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=0,
                            help="Génère aussi les N jours précédents (défaut : 0, aujourd'hui seulement).")
        parser.add_argument("--late", action="store_true",
                            help="Ajoute des parties 'en décalé' sur les jours rejouables en archive.")

    def handle(self, *args, **options):
        today = paris_today()
        days = [today - timedelta(days=i) for i in range(options["days"] + 1)]
        days = [d for d in days if d >= ARCHIVE_START]

        games = {}
        for slug in GAME_SCORE_RANGES:
            game = Game.objects.filter(slug=slug).first()
            if game is None:
                self.stdout.write(self.style.WARNING(f"Jeu '{slug}' introuvable, ignoré."))
            else:
                games[slug] = game

        users = [User.objects.get_or_create(wca_id=w, defaults={"pseudo": p})[0] for w, p in FAKE_USERS]

        count = 0
        for day in days:
            for user in users:
                # Aujourd'hui tout le monde joue ; les jours passés, certains sautent
                if day != today and random.random() < SKIP_DAY_PROBABILITY:
                    continue
                for slug, game in games.items():
                    if day != today and random.random() < SKIP_GAME_PROBABILITY:
                        continue
                    Score.objects.update_or_create(
                        user=user, game=game, date=day,
                        defaults={"score": random.randint(*GAME_SCORE_RANGES[slug]), "is_late": False},
                    )
                    count += 1

        late_count = 0
        if options["late"]:
            late_users = [User.objects.get_or_create(wca_id=w, defaults={"pseudo": p})[0] for w, p in FAKE_LATE_USERS]
            archive_days = [d for d in days if d <= today - timedelta(days=ARCHIVE_DELAY_DAYS)]
            for day in archive_days:
                for user in late_users:
                    if random.random() < 0.5:
                        continue
                    for slug in ("cubeur", "compet", "podium", "nr", "location"):  # pas de Classement en archive
                        if slug not in games or random.random() < 0.3:
                            continue
                        Score.objects.update_or_create(
                            user=user, game=games[slug], date=day,
                            defaults={"score": random.randint(*GAME_SCORE_RANGES[slug]), "is_late": True},
                        )
                        late_count += 1
            if not archive_days:
                self.stdout.write(self.style.WARNING(
                    f"--late : aucun jour rejouable dans la période (il faut --days {ARCHIVE_DELAY_DAYS} ou plus)."
                ))

        # Progressions "location" du jour (marqueurs des autres joueurs sur la carte)
        challenge = DailyChallenge.objects.filter(date=today).first()
        target = getattr(challenge, "location_competition", None) if challenge else None
        for user in users:
            if target is not None:
                lat, lng = _random_point_near(target.latitude, target.longitude)
            else:
                lat, lng = _random_point_france()
            DailyProgress.objects.update_or_create(
                user=user, date=today,
                defaults={
                    "location_guess": {"latitude": round(lat, 6), "longitude": round(lng, 6)},
                    "location_done": True,
                },
            )

        self.stdout.write(self.style.SUCCESS(
            f"{count} scores factices sur {len(days)} jour(s) pour {len(users)} joueurs"
            + (f", + {late_count} scores en décalé" if options["late"] else "")
            + ", et les progressions Localisation du jour."
        ))
