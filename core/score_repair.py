"""
Filet de sécurité : un jeu « terminé » dans la progression doit avoir son Score.

La progression et le score partent par deux envois séparés. Le second peut se
perdre (erreur définitive jetée par le navigateur, score en attente resté sur un
appareil, bug propre à un jeu…). Or série, couronne et classements reposent sur
Score. Ici on recalcule le score à partir de la progression et on le crée s'il
manque — jamais on ne modifie ni ne supprime un score existant.
"""
from datetime import timedelta

from django.utils import timezone

from core.dates import ARCHIVE_START, is_playable, today as paris_today
from core.models import DailyChallenge, Game, Score

# Après minuit, on accepte encore pendant SCORE_GRACE les scores de la veille
SCORE_GRACE = timedelta(hours=2)

# jeu -> champ "terminé" dans DailyProgress
DONE_FIELD = {
    "cubeur": "cubeur_done",
    "compet": "compet_done",
    "ranking": "ranking_done",
    "podium": "podium_done",
    "location": "location_done",
    "nr": "nr_done",
}


def score_timing(day, now=None):
    """
    Règles communes à l'envoi d'un score et à sa réparation.
    Renvoie (accepté, en_retard).
    """
    now = timezone.localtime(now) if now else timezone.localtime()
    today = now.date()
    in_grace = (
        day == today - timedelta(days=1)
        and now - now.replace(hour=0, minute=0, second=0, microsecond=0) < SCORE_GRACE
    )
    if not (is_playable(day, today) or in_grace):
        return False, False
    return True, day != today and not in_grace


# ── Recalcul du score à partir de la progression ────────────────────────────
# Doit donner exactement la même valeur que celle envoyée par le front.

def _guess_list(progress, field):
    value = getattr(progress, field) or []
    return [g for g in value if isinstance(g, dict)]


def score_from_progress(progress, game_slug, challenge=None):
    """Score recalculé, ou None si la progression ne permet pas de le déduire."""
    if game_slug in ("cubeur", "compet", "nr"):
        guesses = _guess_list(progress, f"{game_slug}_guesses")
        return len(guesses) or None

    if game_slug == "podium":
        guesses = _guess_list(progress, "podium_guesses")
        if not guesses:
            return None
        return sum(1 for g in guesses if not g.get("correct"))

    if game_slug == "ranking":
        guesses = _guess_list(progress, "ranking_guesses")
        if not guesses:
            return None
        distance = guesses[0].get("distance")
        if distance is not None:  # essai unique (à partir du 1er décembre)
            try:
                return int(distance)
            except (TypeError, ValueError):
                return None
        return len(guesses)  # ancienne version : nombre d'essais

    if game_slug == "location":
        loc = progress.location_guess or {}
        target = getattr(challenge, "location_competition", None) if challenge else None
        try:
            lat, lng = float(loc["latitude"]), float(loc["longitude"])
        except (KeyError, TypeError, ValueError):
            return None
        if target is None or target.latitude is None or target.longitude is None:
            return None
        # mêmes fonctions que guess_location (import local : évite une boucle d'imports)
        from core.views import _haversine, _location_score
        return _location_score(_haversine(lat, lng, target.latitude, target.longitude))

    return None


def missing_scores(progress):
    """Jeux terminés dans cette progression mais sans Score en base."""
    done = [slug for slug, field in DONE_FIELD.items() if getattr(progress, field, False)]
    if not done:
        return []
    existing = set(
        Score.objects.filter(user=progress.user, date=progress.date, game__slug__in=done)
        .values_list("game__slug", flat=True)
    )
    return [slug for slug in done if slug not in existing]


def ensure_scores(progress, now=None):
    """
    Crée les Score manquants pour les jeux terminés (au moment de la sauvegarde).
    Mêmes règles que submit_score : jour accessible ou tolérance de 2 h,
    pas de score en retard pour le Classement. Renvoie les jeux réparés.
    """
    missing = missing_scores(progress)
    if not missing:
        return []

    accepted, is_late = score_timing(progress.date, now)
    if not accepted:
        return []

    challenge = DailyChallenge.objects.filter(date=progress.date).select_related("location_competition").first()
    games = {g.slug: g for g in Game.objects.filter(slug__in=missing)}
    repaired = []

    for slug in missing:
        if slug == "ranking" and is_late:
            continue
        value = score_from_progress(progress, slug, challenge)
        if value is None or slug not in games:
            continue
        _, created = Score.objects.get_or_create(
            user=progress.user, game=games[slug], date=progress.date,
            defaults={"score": value, "is_late": is_late},
        )
        if created:
            repaired.append(slug)

    return repaired


def repair_old_progress(progress, apply=False):
    """
    Pour la commande reconcile_scores (données déjà en base).
    On ignore l'heure réelle de ces parties : on les crée en retard, sauf le jour même.
    Renvoie [(jeu, valeur ou None, raison si ignoré)].
    """
    report = []
    if progress.date < ARCHIVE_START:
        return report

    today = paris_today()
    is_late = progress.date != today
    challenge = DailyChallenge.objects.filter(date=progress.date).select_related("location_competition").first()

    for slug in missing_scores(progress):
        if slug == "ranking" and is_late:
            report.append((slug, None, "classement en retard non accepté"))
            continue
        value = score_from_progress(progress, slug, challenge)
        if value is None:
            report.append((slug, None, "score impossible à recalculer"))
            continue
        game = Game.objects.filter(slug=slug).first()
        if game is None:
            report.append((slug, value, "jeu absent en base"))
            continue
        if apply:
            Score.objects.get_or_create(
                user=progress.user, game=game, date=progress.date,
                defaults={"score": value, "is_late": is_late},
            )
        report.append((slug, value, None))

    return report
