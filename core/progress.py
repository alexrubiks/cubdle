from datetime import date
from .models import DailyProgress
import copy


SESSION_KEY = f"daily_progress_{date.today()}"

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
            date=date.today(),
        )
        return progress

    if SESSION_KEY not in request.session:
        request.session[SESSION_KEY] = copy.deepcopy(DEFAULT_PROGRESS)
        request.session.modified = True

    return request.session[SESSION_KEY]


def save_progress(request, progress):
    """
    Sauvegarde selon le type d'utilisateur.
    """

    if request.user.is_authenticated:
        progress.save()

    else:
        request.session[SESSION_KEY] = progress
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


def get_done(request, field):
    progress = get_daily_progress(request)

    if request.user.is_authenticated:
        return getattr(progress, field)

    return progress[field]


def reset_daily_progress(request):
    if request.user.is_authenticated:
        DailyProgress.objects.filter(
            user=request.user,
            date=date.today()
        ).delete()
    else:
        request.session.pop(SESSION_KEY, None)