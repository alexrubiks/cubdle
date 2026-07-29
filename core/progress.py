from django.utils import timezone
from .models import DailyProgress
import copy

from core.models import ChampionshipResult


def get_session_key():
    return f"daily_progress_{timezone.localdate()}"


DEFAULT_PROGRESS = {
    "cubeur_guesses": [],
    "compet_guesses": [],
    "ranking_guesses": [],
    "podium_guesses": [],
    "location_guess": {},

    "cubeur_done": False,
    "compet_done": False,
    "ranking_done": False,
    "podium_done": False,
    "location_done": False,
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
            date=timezone.localdate(),
        )
        return progress

    key = get_session_key()

    # Nettoyage des anciennes clés de progression (jours précédents)
    for k in list(request.session.keys()):
        if k.startswith("daily_progress_") and k != key:
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
        request.session[get_session_key()] = progress
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

def get_podium_names(challenge):
    results = ChampionshipResult.objects.filter(
        competition=challenge.podium_competition,
        event=challenge.podium_event,
        position__in=[1, 2, 3],
    ).select_related("cubeur")

    names = {r.position: f"{r.cubeur.first_name} {r.cubeur.last_name}" for r in results}

    return {
        1: names.get(1, ""),
        2: names.get(2, ""),
        3: names.get(3, ""),
    }

def get_done(request, field):
    progress = get_daily_progress(request)

    if request.user.is_authenticated:
        return getattr(progress, field)

    return progress[field]


def reset_daily_progress(request):
    if request.user.is_authenticated:
        DailyProgress.objects.filter(
            user=request.user,
            date=timezone.localdate()
        ).delete()
    else:
        request.session.pop(get_session_key(), None)