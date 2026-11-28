"""
Calcul des points et des classements (par jeu, et général jour / semaine / mois).

Dans chaque jeu, un joueur marque entre 10 et 100 points selon le nombre de
joueurs qui ont fait strictement mieux que lui ce jour-là :

    points = 10 + 90 × (1 − nb de joueurs meilleurs / (N − 1))      (absent = 0)

- 100 si personne n'a fait mieux (même à plusieurs ex æquo), 10 si tout le
  monde a fait mieux. Même logique que le rang affiché (rang WCA).
- Seul joueur du jour : personne n'a fait mieux, donc 100.
- Cubeur et Compét : un coup de bol (1 essai) compte comme un Perfect (2 essais).
- Les parties jouées en décalé (is_late) ne comptent ni dans N ni au classement.

Le classement général additionne les points (jour = somme des jeux,
semaine / mois = somme des journées).
"""
import calendar
import math
from datetime import timedelta
from collections import defaultdict

from .dates import ARCHIVE_START, LAUNCH_DATE, today as paris_today
from .models import Score

# Sens de tri des scores : "asc" = plus petit est meilleur
GAME_SORT_ORDER = {
    "cubeur": "asc",
    "compet": "asc",
    "ranking": "asc",
    "podium": "asc",
    "nr": "asc",
    "location": "desc",
}

MIN_POINTS = 10
MAX_POINTS = 100

# Score plancher pour le calcul des rangs et des points : un coup de bol (1 essai)
# vaut un Perfect (2 essais), le Perfect ayant même plus de mérite.
SCORE_FLOOR = {"cubeur": 2, "compet": 2}


def effective_score(slug, score):
    floor = SCORE_FLOOR.get(slug)
    return max(score, floor) if floor is not None else score


def game_points(entries, order):
    """
    entries : liste de (clé, score) — scores déjà passés par effective_score().
    Renvoie {clé: (rang, points)}. Rang à la WCA (ex æquo au même rang).
    """
    n = len(entries)
    if n == 0:
        return {}

    # On ramène tout à "plus grand = meilleur"
    def strength(score):
        return -score if order == "asc" else score

    values = [strength(score) for _, score in entries]
    result = {}
    for key, score in entries:
        s = strength(score)
        better = sum(1 for v in values if v > s)
        share = 1.0 if n == 1 else 1 - better / (n - 1)
        # arrondi classique (32,5 -> 33), pas l'arrondi bancaire de round()
        points = math.floor(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * share + 0.5)
        result[key] = (better + 1, points)
    return result


def ranks_from_totals(totals):
    """{clé: total} -> {clé: rang} (plus grand total = meilleur, ex æquo au même rang)."""
    values = list(totals.values())
    return {key: 1 + sum(1 for v in values if v > total) for key, total in totals.items()}


def period_bounds(period, day):
    if period == "day":
        return day, day
    if period == "week":
        start = day - timedelta(days=day.weekday())  # lundi
        return start, start + timedelta(days=6)
    if period == "month":
        last = calendar.monthrange(day.year, day.month)[1]
        return day.replace(day=1), day.replace(day=last)
    raise ValueError(f"Période inconnue : {period}")


def general_leaderboard(period, day, game=None):
    """Somme des points sur la période ; tous les jeux, ou un seul si `game` est donné."""
    start, end = period_bounds(period, day)
    start = max(start, ARCHIVE_START)  # rien avant le lancement de Cubdle

    slugs = [game] if game else list(GAME_SORT_ORDER)
    scores = (
        Score.objects
        .filter(date__gte=start, date__lte=end, is_late=False, game__slug__in=slugs)
        .select_related("user", "game")
    )

    # (jour, jeu) -> [(user_id, score)]
    groups = defaultdict(list)
    pseudos = {}
    supporters = {}
    for s in scores:
        groups[(s.date, s.game.slug)].append((s.user_id, effective_score(s.game.slug, s.score)))
        pseudos[s.user_id] = s.user.pseudo
        supporters[s.user_id] = s.user.is_supporter

    totals = defaultdict(int)
    days_played = defaultdict(set)
    per_game = defaultdict(dict)  # utilisé pour la période "day"
    games_seen = set()

    for (d, slug), entries in groups.items():
        games_seen.add(slug)
        for user_id, (_, points) in game_points(entries, GAME_SORT_ORDER[slug]).items():
            totals[user_id] += points
            days_played[user_id].add(d)
            if period == "day":
                per_game[user_id][slug] = points

    ranks = ranks_from_totals(totals)
    rows = [
        {
            "user_id": user_id,
            "pseudo": pseudos[user_id],
            "is_supporter": supporters[user_id],
            "rank": ranks[user_id],
            "points": totals[user_id],
            "days_played": len(days_played[user_id]),
            **({"games": per_game[user_id]} if period == "day" else {}),
        }
        for user_id in totals
    ]
    rows.sort(key=lambda r: (r["rank"], r["pseudo"].lower()))

    return {
        "period": period,
        "game": game,
        "start": str(start),
        "end": str(end),
        "provisional": end >= paris_today(),
        "games": [slug for slug in GAME_SORT_ORDER if slug in games_seen],
        "rows": rows,
    }


# ── Couronne 👑 ────────────────────────────────────────────────────────────

def crowned_user_ids(day):
    """
    Gagnant(s) du classement général de la semaine qui précède celle de `day`
    (lundi -> dimanche). Les classements affichent la couronne des tenants
    actuels (day = aujourd'hui), quelle que soit la date consultée.
    """
    previous_week_day = period_bounds("week", day)[0] - timedelta(days=1)
    if previous_week_day < ARCHIVE_START:
        return set()
    rows = general_leaderboard("week", previous_week_day)["rows"]
    return {row["user_id"] for row in rows if row["rank"] == 1}


# ── Série 🔥 ───────────────────────────────────────────────────────────────

def required_games(day):
    """Jeux à terminer ce jour-là pour prolonger la série (le NR n'existe qu'après le lancement)."""
    return {slug for slug in GAME_SORT_ORDER if slug != "nr" or day >= LAUNCH_DATE}


def streak_for_user(user, today=None):
    """
    Série = nombre de jours d'affilée où toutes les parties du jour ont été
    terminées LE JOUR MÊME (scores non "en décalé"). Tant qu'aujourd'hui n'est
    pas complet, la série de la veille reste en vie (today_done=False).
    La série démarre au lancement de la maj (LAUNCH_DATE) pour tout le monde :
    l'historique antérieur n'est pas compté (trous dus aux anciens bugs de dates).
    """
    today = today or paris_today()
    played = defaultdict(set)
    for d, slug in (
        Score.objects
        .filter(user=user, is_late=False, date__gte=LAUNCH_DATE, date__lte=today)
        .values_list("date", "game__slug")
    ):
        played[d].add(slug)

    complete = {d for d, slugs in played.items() if required_games(d) <= slugs}

    today_done = today in complete
    current = 0
    day = today if today_done else today - timedelta(days=1)
    while day in complete:
        current += 1
        day -= timedelta(days=1)

    best = 0
    run = 0
    previous = None
    for d in sorted(complete):
        run = run + 1 if previous is not None and d - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = d

    return {"current": current, "best": best, "today_done": today_done}
