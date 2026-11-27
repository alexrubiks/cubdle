from .models import DailyProgress
from .dates import get_challenge_date
import copy

from core.models import ChampionshipResult


SESSION_PREFIX = "daily_progress_"
MAX_SESSION_DAYS = 15  # nb de journées gardées en session (jour + archives)


def get_session_key(request):
    return f"{SESSION_PREFIX}{get_challenge_date(request)}"


DEFAULT_PROGRESS = {
    "cubeur_guesses": [],
    "compet_guesses": [],
    "ranking_guesses": [],
    "podium_guesses": [],
    "location_guess": {},
    "nr_guesses": [],

    "cubeur_done": False,
    "compet_done": False,
    "ranking_done": False,
    "podium_done": False,
    "location_done": False,
    "nr_done": False,
}


def get_daily_progress(request):
    """
    Retourne la progression du jour.
    - User connecté : base de données
    - Invité : session Django
    """

    if request.user.is_authenticated:
        progress, _ = DailyProgress.objects.get_or_create(
            user=request.user,
            date=get_challenge_date(request),
        )
        return progress

    key = get_session_key(request)

    # Nettoyage : on garde les MAX_SESSION_DAYS journées les plus récentes
    # (le jour courant + les archives jouées récemment)
    day_keys = sorted(k for k in request.session.keys() if k.startswith(SESSION_PREFIX))
    for k in day_keys[:-MAX_SESSION_DAYS]:
        if k != key:
            del request.session[k]

    if key not in request.session:
        request.session[key] = copy.deepcopy(DEFAULT_PROGRESS)
        request.session.modified = True

    return request.session[key]


def save_progress(request, progress):
    """
    Sauvegarde selon le type d'utilisateur.
    """

    if request.user.is_authenticated:
        progress.save()

    else:
        request.session[get_session_key(request)] = progress
        request.session.modified = True


def add_guess(request, field, value):
    """
    Ajoute une tentative dans une liste JSON sans doublon.
    """

    progress = get_daily_progress(request)

    guesses = getattr(progress, field) \
        if request.user.is_authenticated \
        else progress[field]

    if value not in guesses:
        guesses.append(value)
        save_progress(request, progress)

    return progress


def set_location_guess(request, latitude, longitude):
    progress = get_daily_progress(request)

    guess = {
        "latitude": latitude,
        "longitude": longitude,
    }

    if request.user.is_authenticated:
        progress.location_guess = guess
    else:
        progress["location_guess"] = guess

    save_progress(request, progress)


def set_done(request, field):
    """
    Marque un jeu comme terminé.
    """

    progress = get_daily_progress(request)

    if request.user.is_authenticated:
        setattr(progress, field, True)
    else:
        progress[field] = True

    save_progress(request, progress)


def get_guesses(request, field):
    """
    Retourne la liste des tentatives pour un jeu.
    """

    progress = get_daily_progress(request)

    if request.user.is_authenticated:
        return getattr(progress, field)

    return progress[field]


def get_error_count(request, field, target_id):
    """
    Retourne le nombre d'erreurs pour un jeu.
    Les bonnes réponses ne sont pas comptées.
    """

    guesses = get_guesses(request, field)

    return len([
        guess
        for guess in guesses
        if guess != target_id
    ])

def get_error_count_from_dicts(request, field, target_id, id_key="id"):
    """
    Comme get_error_count, mais pour les listes de dicts
    (ex: compet_guesses, ranking_guesses...).
    """
    guesses = get_guesses(request, field)

    return len([
        guess
        for guess in guesses
        if guess.get(id_key) != target_id
    ])

def get_podium_wrong_count(request, field):
    """
    Nombre d'essais qui n'ont matché aucune des 3 positions du podium.
    """
    guesses = get_guesses(request, field)
    return len([g for g in guesses if not g.get("correct")])

# Épreuves toujours classées au single (BLD)
SINGLE_ONLY_EVENTS = {"333bf", "444bf", "555bf", "333mbf"}


def get_podium_ranked_by(challenge):
    """
    Comment la finale est classée : "single" pour les BLD et les finales en
    "Best of" (personne n'a de moyenne), sinon "average" (Mean of 3 / Average of 5).
    Déduit des résultats en base, sans avoir besoin du format de la manche.
    """
    if challenge.podium_event.slug in SINGLE_ONLY_EVENTS:
        return "single"
    has_average = ChampionshipResult.objects.filter(
        competition=challenge.podium_competition,
        event=challenge.podium_event,
        average__gt=0,
    ).exists()
    return "average" if has_average else "single"


def podium_display_score(result, ranked_by):
    """
    Valeur sur laquelle la personne est réellement classée : sa moyenne en finale
    à la moyenne si elle en a une, sinon son meilleur single (règle WCA : les
    moyennes DNF sont classées après, au single). Renvoie (valeur, "average"|"single").
    """
    if ranked_by == "average" and result.average > 0:
        return result.average, "average"
    return result.best, "single"


def get_podium_entries(challenge):
    """
    Personnes du podium = toutes celles classées 3e ou mieux, avec leur vraie place.
    Gère les ex æquo : 1-2-2, 1-1-3, 1-2-3-3… Chaque personne a sa ligne (slot),
    dans l'ordre (place, nom).
    """
    return list(
        ChampionshipResult.objects.filter(
            competition=challenge.podium_competition,
            event=challenge.podium_event,
            position__lte=3,
        )
        .select_related("cubeur")
        .order_by("position", "cubeur__last_name", "cubeur__first_name")
    )


def get_done(request, field):
    progress = get_daily_progress(request)

    if request.user.is_authenticated:
        return getattr(progress, field)

    return progress[field]


def reset_daily_progress(request):
    if request.user.is_authenticated:
        DailyProgress.objects.filter(
            user=request.user,
            date=get_challenge_date(request)
        ).delete()
    else:
        request.session.pop(get_session_key(request), None)