"""
Gestion centralisée des dates de défi.

Règle d'or : on ne doit JAMAIS utiliser date.today() dans le projet.
Le serveur (Railway) tourne en UTC, alors que le jeu vit à l'heure de Paris
(settings.TIME_ZONE). timezone.localdate() renvoie la date à Paris.
"""
from datetime import date as date_cls, timedelta

from decouple import config
from django.utils import timezone


# Date de lancement de la "maj de décembre" (nouveau Classement, Devine le NR…).
# Surchargeable via CUBDLE_LAUNCH_DATE (variable d'env ou .env) pour tester en avance.
LAUNCH_DATE = date_cls.fromisoformat(config("CUBDLE_LAUNCH_DATE", default="2026-12-01"))


def is_launched(ref=None):
    """True si la maj de décembre est active pour cette date (défaut : aujourd'hui)."""
    return (ref or today()) >= LAUNCH_DATE


# Un défi devient rejouable en "archive" ARCHIVE_DELAY_DAYS jours après sa date.
# Ex : le 23, on a accès aux défis jusqu'au 13 inclus.
ARCHIVE_DELAY_DAYS = 10

# Lancement officiel de Cubdle : rien d'antérieur n'est accessible
# (ni en archive, ni dans les classements). Les données plus anciennes
# en base sont des données de test.
ARCHIVE_START = date_cls(2026, 8, 1)


def today():
    """Date du jour à Paris."""
    return timezone.localdate()


def parse_date(value):
    """'YYYY-MM-DD' -> date, ou None si absent / invalide."""
    if not value:
        return None
    try:
        return date_cls.fromisoformat(str(value))
    except ValueError:
        return None


def last_archive_date(ref=None):
    """Dernier jour jouable en archive."""
    return (ref or today()) - timedelta(days=ARCHIVE_DELAY_DAYS)


def is_playable(day, ref=None):
    """Un défi est jouable s'il est celui du jour, ou s'il est assez ancien."""
    ref = ref or today()
    return day == ref or ARCHIVE_START <= day <= last_archive_date(ref)


class ChallengeDateError(Exception):
    pass


def resolve_challenge_date(request):
    """
    Lit la date demandée (?date=YYYY-MM-DD, ou "date" dans le body),
    la valide, et la mémorise sur request.challenge_date pour que les
    helpers de progress.py l'utilisent.

    Sans paramètre -> défi du jour.
    """
    raw = request.query_params.get("date") if hasattr(request, "query_params") else None
    if raw is None and hasattr(request, "data") and isinstance(request.data, dict):
        raw = request.data.get("date")

    if raw in (None, ""):
        day = today()
    else:
        day = parse_date(raw)
        if day is None:
            raise ChallengeDateError("Date invalide (format attendu : YYYY-MM-DD).")
        if not is_playable(day):
            raise ChallengeDateError("Ce défi n'est pas (encore) accessible.")

    request.challenge_date = day
    return day


def get_challenge_date(request):
    """Date du défi en cours de traitement (défaut : aujourd'hui)."""
    return getattr(request, "challenge_date", None) or today()
