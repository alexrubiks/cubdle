"""
DEV UNIQUEMENT : marque tous les jeux d'un jour comme terminés (PERFECT) pour un joueur,
pour voir les bandeaux de l'accueil en local. Refuse de tourner si DEBUG est faux.

    python manage.py fake_perfect_day                       # 2022TREM02, aujourd'hui
    python manage.py fake_perfect_day --coup-de-bol         # Cubeur et Compet en COUP DE BOL
    python manage.py fake_perfect_day --date 2026-11-15     # un autre jour (archives)
    python manage.py fake_perfect_day --reset               # efface la progression et les scores du jour

Affiche ensuite la ligne à coller dans la console du navigateur pour se connecter
en tant que ce joueur : au rechargement, la synchro recopie la progression en local.
Attention : les essais créés sont factices, les grilles des pages de jeu peuvent mal s'afficher.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from rest_framework_simplejwt.tokens import AccessToken

from core.dates import parse_date, today as paris_today
from core.models import DailyProgress, Game, Score, User

FAKE = {"id": -1, "name": "Faux essai", "correct": False}


def perfect_progress(coup_de_bol):
    win = {"id": -9, "name": "Bonne réponse", "correct": True}
    two = [win] if coup_de_bol else [win, FAKE]
    return {
        "cubeur_guesses": two, "cubeur_done": True,
        "compet_guesses": two, "compet_done": True,
        "ranking_guesses": [{"rank": 1, "distance": 0}], "ranking_done": True,
        "podium_guesses": [{"id": -i, "name": f"Podium {i}", "correct": True, "slot": i - 1} for i in (1, 2, 3)],
        "podium_done": True,
        "nr_guesses": [{"wca_id": "FAKE", "name": "Bonne réponse", "correct": True}], "nr_done": True,
        "location_guess": {"latitude": 0, "longitude": 0, "result": {"score": 5000, "distance_m": 0}},
        "location_done": True,
        "skips": {},
    }


class Command(BaseCommand):
    help = "DEV : marque tous les jeux d'un jour en PERFECT pour un joueur (bandeaux de l'accueil)."

    def add_arguments(self, parser):
        parser.add_argument("--user", default="2022TREM02", help="WCA ID du joueur (créé s'il n'existe pas).")
        parser.add_argument("--date", help="Jour du défi (YYYY-MM-DD), aujourd'hui par défaut.")
        parser.add_argument("--coup-de-bol", action="store_true", help="Cubeur et Compet trouvés au 1er essai.")
        parser.add_argument("--reset", action="store_true", help="Efface la progression et les scores du jour.")

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("Commande de dev : refusée hors DEBUG.")

        day = parse_date(opts["date"]) if opts["date"] else paris_today()
        if day is None:
            raise CommandError("Date invalide (YYYY-MM-DD).")

        user, _ = User.objects.get_or_create(wca_id=opts["user"].upper(), defaults={"pseudo": "Alexis Tremellat"})

        if opts["reset"]:
            DailyProgress.objects.filter(user=user, date=day).delete()
            n, _ = Score.objects.filter(user=user, date=day).delete()
            self.stdout.write(self.style.SUCCESS(f"Progression et {n} score(s) du {day} effacés pour {user.wca_id}."))
            self.stdout.write("Dans le navigateur : localStorage.removeItem('cubdle_progress_%s'), puis recharge." % day)
            return

        progress = perfect_progress(opts["coup_de_bol"])
        DailyProgress.objects.update_or_create(user=user, date=day, defaults=progress)

        scores = {"cubeur": 1 if opts["coup_de_bol"] else 2, "compet": 1 if opts["coup_de_bol"] else 2,
                  "ranking": 0, "podium": 0, "nr": 1, "location": 5000}
        is_late = day != paris_today()
        for slug, value in scores.items():
            game = Game.objects.filter(slug=slug).first()
            if game:
                Score.objects.update_or_create(user=user, game=game, date=day,
                                               defaults={"score": value, "is_late": is_late})

        token = AccessToken()
        token["user_id"] = user.id
        self.stdout.write(self.style.SUCCESS(f"Tous les jeux du {day} sont terminés en PERFECT pour {user.wca_id}."))
        self.stdout.write("\n1. Front lancé avec VITE_LAUNCH_DATE=2026-11-01 (sinon pas de bandeaux avant le 1er)")
        self.stdout.write("2. Dans la console du navigateur (localhost), puis recharge la page :\n")
        self.stdout.write(f"localStorage.removeItem('cubdle_progress_{day}'); "
                          f"localStorage.setItem('access_token', '{token}');")
