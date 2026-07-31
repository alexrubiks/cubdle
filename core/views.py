import math
import unicodedata
from datetime import date
from urllib.parse import urlencode

from django.utils import timezone
from django.conf import settings
from django.shortcuts import redirect, get_object_or_404
from requests_oauthlib import OAuth2Session
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from core.models import (
    ChampionshipResult,
    Competition,
    Cubeur,
    CubeurRanking,
    DailyChallenge,
    DailyProgress,
    User,
    Score,
    Game,
)
from core.serializers import (
    CompetitionSearchSerializer,
    CubeurSearchSerializer,
    DailyChallengeSerializer,
)

from .progress import (
    add_guess,
    get_error_count,
    set_done,
    get_guesses,
    get_error_count_from_dicts,
    get_podium_wrong_count,
    get_podium_names,
)

SINGLE_ONLY_EVENTS = {"333bf", "444bf", "555bf", "333mbf"}

################################################################################
#####  AUTH WCA  ###############################################################
################################################################################

@api_view(["GET"])
def me(request):
    return Response({
        "wca_id": request.user.wca_id,
        "pseudo": request.user.pseudo,
    })

def wca_login(request):
    client = OAuth2Session(
        settings.WCA_CLIENT_ID,
        redirect_uri=settings.WCA_REDIRECT_URI,
    )

    authorization_url, state = client.authorization_url(
        "https://www.worldcubeassociation.org/oauth/authorize"
    )

    request.session["oauth_state"] = state

    return redirect(authorization_url)


def wca_callback(request):

    # 1) Reprendre la session OAuth créée au login
    client = OAuth2Session(
        settings.WCA_CLIENT_ID,
        state=request.session["oauth_state"],
        redirect_uri=settings.WCA_REDIRECT_URI,
    )

    # 2) Échanger le code WCA contre un token WCA
    client.fetch_token(
        "https://www.worldcubeassociation.org/oauth/token",
        client_secret=settings.WCA_CLIENT_SECRET,
        authorization_response=request.build_absolute_uri(),
    )

    # 3) Récupérer les informations du cubeur connecté
    response = client.get(
        "https://www.worldcubeassociation.org/api/v0/me"
    )

    # 4) Créer ou récupérer le cubeur dans ta base
    wca_data = response.json()
    wca_user = wca_data["me"]

    user, _ = User.objects.get_or_create(
        wca_id=wca_user["wca_id"],
        defaults={
            "pseudo": wca_user["name"],
        }
    )

    # 5) Créer notre JWT Cubdle
    token = AccessToken()

    token["user_id"] = user.id
    token["wca_id"] = user.wca_id
    token["pseudo"] = user.pseudo

    # 6) Rediriger vers React avec le token
    params = urlencode({
        "token": str(token),
    })

    return redirect(
        f"https://cubdle.alexrubiks.fr/auth/callback?{params}"
    )

@api_view(["PATCH"])
def update_pseudo(request):
    pseudo = request.data.get("pseudo", "").strip()

    if not pseudo:
        return Response({"error": "Le pseudo ne peut pas être vide."}, status=400)

    if len(pseudo) > 30:
        return Response({"error": "Le pseudo est trop long (30 caractères max)."}, status=400)

    user = request.user
    user.pseudo = pseudo
    user.save()

    return Response({
        "wca_id": user.wca_id,
        "pseudo": user.pseudo,
    })

################################################################################
#####  DAILY  ##################################################################
################################################################################

@api_view(['GET'])
def daily_challenge(request):
    challenge = DailyChallenge.objects.filter(date=date.today()).first()
    if challenge is None:
        return Response({"error": "Aucun défi disponible pour aujourd'hui"}, status=404)
    
    serializer = DailyChallengeSerializer(challenge)
    return Response(serializer.data)


@api_view(['GET'])
def yesterday_challenge(request):
    from datetime import date, timedelta
    yesterday = date.today() - timedelta(days=1)
    challenge = DailyChallenge.objects.filter(date=yesterday).first()
    if not challenge:
        return Response({"cubeur": None, "competition": None})
    
    return Response({
        "cubeur": f"{challenge.cubeur.first_name} {challenge.cubeur.last_name}" if challenge.cubeur else None,
        "competition": challenge.competition.name if challenge.competition else None,
    })

################################################################################
#####  SEARCH  #################################################################
################################################################################

def normalize(s):
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    ).lower()


def build_hint(text, mistakes, first_at=5, every=5):
    if mistakes < first_at:
        return ""

    letters_to_reveal = 1 + (mistakes - first_at) // every

    revealed = []
    count = 0

    for char in text:
        if count >= letters_to_reveal:
            break
        revealed.append(char)
        if char.isalpha():
            count += 1

    return "".join(revealed)


@api_view(['GET'])
def cubeur_detail(request, pk):
    cubeur = get_object_or_404(Cubeur, id=pk)

    return Response({
        "id": cubeur.id,
        "wca_id": cubeur.wca_id,
        "name": f"{cubeur.first_name} {cubeur.last_name}",
        "avatar_url": cubeur.avatar_url,
    })


@api_view(['GET'])
def competition_detail(request, pk):
    competition = get_object_or_404(Competition, id=pk)

    return Response({
        "id": competition.id,
        "name": competition.name,
        "wca_id": competition.wca_id,
    })


@api_view(['GET'])
def cubeur_search(request):
    query = request.query_params.get("q", "").strip()
    if len(query) < 2:
        return Response([])

    query_norm = normalize(query)
    terms = query_norm.split()

    active_only = request.query_params.get("active_only", "true").lower() == "true"
    exclude_ids = request.query_params.get("exclude_ids", "")
    exclude_ids = [int(i) for i in exclude_ids.split(",") if i.strip().isdigit()]

    cubeurs = Cubeur.objects.all()

    if active_only:
        cubeurs = cubeurs.filter(is_active=True)

    if exclude_ids:
        cubeurs = cubeurs.exclude(id__in=exclude_ids)

    results = []

    for cubeur in cubeurs:
        full = normalize(f"{cubeur.first_name} {cubeur.last_name}")

        if not all(term in full for term in terms):
            continue

        words = full.split()

        if full.startswith(query_norm):
            category = 0
        elif all(any(word.startswith(term) for word in words) for term in terms):
            category = 1
        else:
            category = 2

        position = min(full.find(term) for term in terms)
        results.append((category, position, full, cubeur))

    results.sort(key=lambda x: (x[0], x[2]))

    serializer = CubeurSearchSerializer(
        [cubeur for _, _, _, cubeur in results[:10]],
        many=True
    )
    return Response(serializer.data)


@api_view(['GET'])
def competition_search(request):
    query = request.query_params.get('q', '').strip()
    if len(query) < 2:
        return Response([])

    query_norm = normalize(query)
    terms = query_norm.split()

    exclude_ids = request.query_params.get("exclude_ids", "")
    exclude_ids = [int(i) for i in exclude_ids.split(",") if i.strip().isdigit()]

    competitions = Competition.objects.all()

    if exclude_ids:
        competitions = competitions.exclude(id__in=exclude_ids)

    results = []

    for competition in competitions:
        full = normalize(competition.name)

        if not all(term in full for term in terms):
            continue

        words = full.split()

        if full.startswith(query_norm):
            category = 0
        elif all(any(word.startswith(term) for word in words) for term in terms):
            category = 1
        else:
            category = 2

        position = min(full.find(term) for term in terms)
        results.append((category, position, full, competition))

    results.sort(key=lambda x: (x[0], x[2]))

    serializer = CompetitionSearchSerializer(
        [competition for _, _, _, competition in results[:10]],
        many=True
    )
    return Response(serializer.data)

################################################################################
#####  GUESSCUBEUR  ############################################################
################################################################################

@api_view(['POST'])
def guess_cubeur(request):
    challenge = DailyChallenge.objects.filter(date=date.today()).first()

    if challenge is None or challenge.cubeur is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    guessed_id = request.data.get('cubeur_id')

    if guessed_id is None:
        return Response({"error": "cubeur_id requis"}, status=400)

    try:
        guessed = Cubeur.objects.get(id=guessed_id)
    except Cubeur.DoesNotExist:
        return Response({"error": "Cubeur introuvable"}, status=404)

    target = challenge.cubeur
    correct = guessed.id == target.id

    add_guess(request, "cubeur_guesses", guessed.id)

    if correct:
        set_done(request, "cubeur_done")

    comparison = {
        "gender": _compare_categorical(guessed.gender, target.gender),
        "wca_year": _compare_numeric(guessed.wca_year, target.wca_year, threshold=1),
        "competition_count": _compare_numeric(guessed.competition_count, target.competition_count),
        "gold_count": _compare_numeric(guessed.gold_count, target.gold_count),
        "silver_count": _compare_numeric(guessed.silver_count, target.silver_count),
        "bronze_count": _compare_numeric(guessed.bronze_count, target.bronze_count),
        "rankings": _compare_rankings(guessed, target),
    }

    error_count = get_error_count(request, "cubeur_guesses", target.id)
    print("DEBUG error_count:", error_count, "guesses stockés:", get_guesses(request, "cubeur_guesses"))

    return Response({
        "correct": correct,
        "guessed_name": f"{guessed.first_name} {guessed.last_name}",
        "comparison": comparison,
        "hint": None if correct else build_hint(
            f"{target.first_name} {target.last_name}",
            get_error_count(request, "cubeur_guesses", target.id),
            first_at=5,
            every=5,
        ),
    })

def _compare_categorical(guessed_value, target_value):
    return {
        "value": guessed_value,
        "status": "correct" if guessed_value == target_value else "wrong",
    }

def _compare_numeric(guessed_value, target_value, threshold=5):
    if guessed_value is None and target_value is None:
        return {"value": None, "status": "correct"}
    if guessed_value is None or target_value is None:
        return {"value": guessed_value, "status": "wrong"}
    if guessed_value == target_value:
        status = "correct"
    elif abs(guessed_value - target_value) <= threshold:
        status = "near"
    else:
        status = "wrong"
    return {
        "value": guessed_value,
        "target": target_value,  # gardé pour les chevrons côté frontend
        "status": status,
    }

ALL_RANKINGS = [
    ('333', 'average'),
    ('222', 'average'),
    ('444', 'average'),
    ('555', 'average'),
    ('666', 'average'),
    ('777', 'average'),
    ('333bf', 'single'),
    ('333fm', 'average'),
    ('333oh', 'average'),
    ('clock', 'average'),
    ('minx', 'average'),
    ('pyram', 'average'),
    ('skewb', 'average'),
    ('sq1', 'average'),
    ('444bf', 'single'),
    ('555bf', 'single'),
    ('333mbf', 'single'),
]

def _compare_rankings(guessed, target):
    guessed_rankings = {
        (r.event.slug, r.result_type): r.national_rank
        for r in CubeurRanking.objects.filter(cubeur=guessed).select_related('event')
    }
    target_rankings = {
        (r.event.slug, r.result_type): r.national_rank
        for r in CubeurRanking.objects.filter(cubeur=target).select_related('event')
    }
    result = {}

    for event_slug, result_type in ALL_RANKINGS:
        key = f"{event_slug}_{result_type}"
        guessed_rank = guessed_rankings.get((event_slug, result_type))
        target_rank  = target_rankings.get((event_slug, result_type))

        if guessed_rank is None and target_rank is None:
            status = "correct"
        elif guessed_rank is None or target_rank is None:
            status = "wrong"
        elif guessed_rank == target_rank:
            status = "correct"
        elif abs(guessed_rank - target_rank) <= 5:
            status = "near"
        else:
            status = "partial"

        result[key] = {
            "value":  guessed_rank,
            "target": target_rank,  # gardé pour les chevrons
            "status": status,
        }
    return result


################################################################################
#####  GUESSCOMPET  ############################################################
################################################################################

@api_view(['POST'])
def guess_compet(request):
    challenge = DailyChallenge.objects.filter(date=date.today()).first()

    if challenge is None or challenge.competition is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    guessed_id = request.data.get('competition_id')

    if guessed_id is None:
        return Response({"error": "competition_id requis"}, status=400)

    try:
        guessed = Competition.objects.get(id=guessed_id)
    except Competition.DoesNotExist:
        return Response({"error": "Compétition introuvable"}, status=404)

    target = challenge.competition
    correct = guessed.id == target.id

    add_guess(request, "compet_guesses", {
        "id": guessed.id,
        "name": guessed.name,
        "correct": correct,
    })

    if correct:
        set_done(request, "compet_done")

    comparison = {
        "month": _compare_set_string(guessed.month, target.month),
        "year": _compare_set_string(guessed.year, target.year),
        "participant_count": _compare_numeric(
            guessed.participant_count,
            target.participant_count
        ),
        "events": _compare_events(
            [e.slug for e in guessed.events.all()],
            [e.slug for e in target.events.all()],
        ),
        "organizers": _compare_list(
            guessed.organizers,
            target.organizers
        ),
        "delegates": _compare_list(
            guessed.delegates,
            target.delegates
        ),
    }

    return Response({
        "correct": correct,
        "guessed_name": guessed.name,
        "comparison": comparison,
        "hint": None if correct else build_hint(
            target.name,
            get_error_count_from_dicts(request, "compet_guesses", target.id),
            first_at=5,
            every=5,
        ),
    })

def _compare_events(guessed_events, target_events):
    guessed_set = set(guessed_events)
    target_set  = set(target_events)
    per_slug = {}
    for slug in target_set | guessed_set:
        g_has = slug in guessed_set
        t_has = slug in target_set
        per_slug[slug] = {
            "value":  g_has,
            "status": g_has == t_has,
        }
    return per_slug

def _compare_set_string(guessed_value, target_value):
    """Compare des strings type 'avril' ou 'avril-mai' / '2023' ou '2022-2023'"""

    guessed_values = guessed_value.split("-")
    target_values = target_value.split("-")

    guessed_set = set(guessed_values)
    target_set = set(target_values)

    if guessed_set == target_set:
        status = "correct"
    elif guessed_set & target_set:
        status = "partial"
    else:
        status = "wrong"

    months = {
        "janvier": 1,
        "février": 2,
        "mars": 3,
        "avril": 4,
        "mai": 5,
        "juin": 6,
        "juillet": 7,
        "août": 8,
        "septembre": 9,
        "octobre": 10,
        "novembre": 11,
        "décembre": 12,
    }

    def get_value(value):
        if value.isdigit():
            return int(value)
        return months.get(value)

    direction = None

    guessed_min = get_value(guessed_values[0])
    target_min = get_value(target_values[0])

    if guessed_min is not None and target_min is not None:
        diff = guessed_min - target_min

        if abs(diff) == 1 and status == "wrong":
            status = "near"

        if diff < 0:
            direction = "up"
        elif diff > 0:
            direction = "down"

    def format_display_value(value):
        abbreviations = {
            "janvier": "jan",
            "février": "févr",
            "mars": "mars",
            "avril": "avr",
            "mai": "mai",
            "juin": "juin",
            "juillet": "juil",
            "août": "août",
            "septembre": "sept",
            "octobre": "oct",
            "novembre": "nov",
            "décembre": "déc",
        }

        if "-" not in value:
            return value

        return "-".join(
            abbreviations.get(part, part)
            for part in value.split("-")
        )

    return {
        "status": status,
        "direction": direction,
        "value": guessed_value,
        "display_value": format_display_value(guessed_value),
    }

def _compare_list(guessed_list, target_list):
    """Compare deux listes (events, organizers, delegates)"""
    guessed_set = set(guessed_list)
    target_set = set(target_list)
    if guessed_set == target_set:
        status = "correct"
    elif guessed_set & target_set:
        status = "partial"
    else:
        status = "wrong"
    return {"status": status, "value": guessed_list}

################################################################################
#####  GUESSRANKING  ###########################################################
################################################################################

@api_view(['POST'])
def guess_ranking(request):
    challenge = DailyChallenge.objects.filter(date=date.today()).first()

    if challenge is None or challenge.ranking_cubeur is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    guessed_rank = request.data.get("rank")

    if guessed_rank is None:
        return Response({"error": "rank requis"}, status=400)

    try:
        guessed_rank = int(guessed_rank)
    except (TypeError, ValueError):
        return Response({"error": "rank doit être un entier"}, status=400)

    if not (1 <= guessed_rank <= 100):
        return Response({"error": "rank doit être entre 1 et 100"}, status=400)

    target_ranking = CubeurRanking.objects.get(
        cubeur=challenge.ranking_cubeur,
        event=challenge.ranking_event,
        result_type=challenge.ranking_result_type,
    )

    target_rank = target_ranking.national_rank

    ranking_result = _get_persons_at_rank(
        challenge.ranking_event,
        challenge.ranking_result_type,
        guessed_rank,
    )

    persons_at_rank = ranking_result["persons"]
    resolved_rank = ranking_result["resolved_rank"]

    if resolved_rank is None:
        blocked_ranks = []
    else:
        next_rank = (
            CubeurRanking.objects.filter(
                event=challenge.ranking_event,
                result_type=challenge.ranking_result_type,
                national_rank__gt=resolved_rank,
            )
            .order_by("national_rank")
            .values_list("national_rank", flat=True)
            .first()
        )

        if next_rank is None:
            blocked_ranks = list(range(resolved_rank, 101))
        else:
            blocked_ranks = list(range(resolved_rank, next_rank))

    correct = any(
        p["id"] == challenge.ranking_cubeur.id
        for p in persons_at_rank
    )

    direction = None

    if not correct:
        direction = (
            "needs_lower"
            if guessed_rank > target_rank
            else "needs_higher"
        )

    add_guess(
        request,
        "ranking_guesses",
        {
            "rank": guessed_rank,
            "blocked_ranks": blocked_ranks,
            "persons": persons_at_rank,
            "direction": direction,
            "correct": correct,
            "score": target_ranking.score if correct else None,
        }
    )

    if correct:
        set_done(request, "ranking_done")

    return Response({
        "correct": correct,
        "rank": target_rank,
        "score": target_ranking.score if correct else None,
        "direction": direction,
        "persons_at_rank": persons_at_rank,
        "blocked_ranks": blocked_ranks,
    })


def _get_persons_at_rank(event, result_type, guessed_rank):
    rank = guessed_rank

    while rank >= 1:
        rankings = CubeurRanking.objects.filter(
            event=event,
            result_type=result_type,
            national_rank=rank,
        ).select_related('cubeur')

        if rankings.exists():
            return {
                "persons": [
                    {
                        "id": r.cubeur.id,
                        "name": f"{r.cubeur.first_name} {r.cubeur.last_name}",
                        "score": r.score,
                        "rank": r.national_rank,
                    }
                    for r in rankings
                ],
                "resolved_rank": rank,
            }

        rank -= 1

    return {
        "persons": [],
        "resolved_rank": None,
    }

################################################################################
#####  GUESSPODIUM  ############################################################
################################################################################

@api_view(['POST'])
def guess_podium(request):
    challenge = DailyChallenge.objects.filter(date=date.today()).first()
    if challenge is None or challenge.podium_competition is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    guessed_id = request.data.get('cubeur_id')
    if guessed_id is None:
        return Response({"error": "cubeur_id requis"}, status=400)

    try:
        guessed = Cubeur.objects.get(id=guessed_id)
    except Cubeur.DoesNotExist:
        return Response({"error": "Cubeur introuvable"}, status=404)

    result = ChampionshipResult.objects.filter(
        competition=challenge.podium_competition,
        event=challenge.podium_event,
        cubeur=guessed,
    ).first()

    correct = result is not None and result.position <= 3

    add_guess(request, "podium_guesses", {
        "id": guessed.id,
        "name": f"{guessed.first_name} {guessed.last_name}",
        "correct": correct,
        "position": result.position if result else None,
    })

    # nombre d'essais qui n'ont touché aucune des 3 places
    wrong_count = get_podium_wrong_count(request, "podium_guesses")

    # noms des 3 places du podium, dans l'ordre 1/2/3
    podium_names = get_podium_names(challenge)

    hints = {
        pos: build_hint(name, wrong_count, first_at=5, every=5)
        for pos, name in podium_names.items()
    }

    if result is None:
        return Response({
            "correct": False,
            "in_final": False,
            "name": f"{guessed.first_name} {guessed.last_name}",
            "hints": hints,
        })

    score = (
        result.best
        if challenge.podium_event.slug in SINGLE_ONLY_EVENTS
        else result.average
    )

    return Response({
        "correct": correct,
        "in_final": True,
        "name": f"{guessed.first_name} {guessed.last_name}",
        "position": result.position,
        "score": score,
        "hints": hints,
    })

################################################################################
#####  GUESSLOCATION  ##########################################################
################################################################################

@api_view(['POST'])
def guess_location(request):
    challenge = DailyChallenge.objects.filter(date=date.today()).first()
    if challenge is None or challenge.location_competition is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    try:
        guessed_lat = float(request.data.get('latitude'))
        guessed_lng = float(request.data.get('longitude'))
    except (TypeError, ValueError):
        return Response({"error": "latitude et longitude requis"}, status=400)

    target = challenge.location_competition
    distance_m = _haversine(guessed_lat, guessed_lng, target.latitude, target.longitude)
    score = _location_score(distance_m)

    return Response({
        "distance_m": round(distance_m, 1),
        "score": score,
        "correct_location": {
            "latitude": target.latitude,
            "longitude": target.longitude,
            "name": target.name,
        },
    })


def _haversine(lat1, lon1, lat2, lon2):
    """Distance en m entre deux points GPS"""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _location_score(distance_m, max_score=5000, scale=100000):
    if distance_m <= 15:
        return max_score

    adjusted_distance = distance_m - 15

    return round(
        max_score * math.exp(-adjusted_distance / scale)
    )


################################################################################
#####  PROGRESS  ###############################################################
################################################################################

GAME_LIST_FIELDS = [
    "cubeur_guesses",
    "compet_guesses",
    "ranking_guesses",
    "podium_guesses",
]

DONE_FIELDS = [
    "cubeur_done",
    "compet_done",
    "ranking_done",
    "podium_done",
    "location_done",
]

GAME_FIELDS = {
    "cubeur": ("cubeur_guesses", "cubeur_done", list),
    "compet": ("compet_guesses", "compet_done", list),
    "ranking": ("ranking_guesses", "ranking_done", list),
    "podium": ("podium_guesses", "podium_done", list),
    "location": ("location_guess", "location_done", dict),
}

HINT_FIELDS = [
    "cubeur_latest_hint",
    "compet_latest_hint",
    "podium_latest_hint",
]


def get_daily_progress(user):
    return DailyProgress.objects.get_or_create(
        user=user,
        date=timezone.localdate(),
    )[0]


def serialize_progress(progress):
    return {
        "date": str(progress.date),

        "cubeur_guesses": progress.cubeur_guesses,
        "compet_guesses": progress.compet_guesses,
        "ranking_guesses": progress.ranking_guesses,
        "podium_guesses": progress.podium_guesses,
        "location_guess": progress.location_guess,

        "cubeur_latest_hint": progress.cubeur_latest_hint,
        "compet_latest_hint": progress.compet_latest_hint,
        "podium_latest_hint": progress.podium_latest_hint,

        "cubeur_done": progress.cubeur_done,
        "compet_done": progress.compet_done,
        "ranking_done": progress.ranking_done,
        "podium_done": progress.podium_done,
        "location_done": progress.location_done,
    }

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def daily_progress(request):
    progress = get_daily_progress(request.user)

    if request.method == "POST":
        for field in GAME_LIST_FIELDS + ["location_guess"] + DONE_FIELDS + HINT_FIELDS:
            if field in request.data:
                setattr(progress, field, request.data[field])
        progress.save()

    return Response(serialize_progress(progress))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_daily_progress(request):
    """
    Fusionne le localStorage envoyé par le front avec le DailyProgress
    du jour en base. Pour chaque jeu, si des guesses existent déjà en
    base (le jeu est "commencé"), le localStorage est ignoré pour ce jeu.
    Renvoie l'état fusionné complet.
    """
    local_data = request.data.get("local_progress") or {}
    progress = get_daily_progress(request.user)

    updated = False

    for game, (guesses_field, done_field, empty_type) in GAME_FIELDS.items():
        current_guesses = getattr(progress, guesses_field)

        if current_guesses != empty_type():
            continue

        local_guesses = local_data.get(guesses_field, empty_type())
        local_done = local_data.get(done_field, False)

        if local_guesses != empty_type():
            setattr(progress, guesses_field, local_guesses)
            setattr(progress, done_field, local_done)
            updated = True

    for field in HINT_FIELDS:
        current_hint = getattr(progress, field)

        if current_hint:
            continue

        local_hint = local_data.get(field)

        if local_hint:
            setattr(progress, field, local_hint)
            updated = True

    if updated:
        progress.save()

    return Response(serialize_progress(progress))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_score(request):
    game_slug = request.data.get("game")  # "cubeur", "compet", "ranking", "podium", "location"
    score_value = request.data.get("score")

    if game_slug is None or score_value is None:
        return Response({"error": "game et score sont requis."}, status=400)

    try:
        game = Game.objects.get(slug=game_slug)
    except Game.DoesNotExist:
        return Response({"error": "Jeu introuvable."}, status=404)

    score, created = Score.objects.update_or_create(
        user=request.user,
        game=game,
        date=timezone.localdate(),
        defaults={"score": score_value},
    )

    if not created:
        return Response({
            "message": "Score déjà enregistré pour aujourd'hui.",
            "score": score.score,
        })

    return Response({"score": score.score}, status=201)


GAME_SORT_ORDER = {
    "cubeur": "asc",
    "compet": "asc",
    "ranking": "asc",
    "podium": "asc",
    "location": "desc",
}


@api_view(["GET"])
def daily_leaderboard(request):
    game_slug = request.GET.get("game")

    if game_slug not in GAME_SORT_ORDER:
        return Response({"error": "Jeu invalide."}, status=400)

    try:
        game = Game.objects.get(slug=game_slug)
    except Game.DoesNotExist:
        return Response({"error": "Jeu introuvable."}, status=404)

    today = timezone.localdate()
    order = "score" if GAME_SORT_ORDER[game_slug] == "asc" else "-score"

    scores = (
        Score.objects
        .filter(game=game, date=today)
        .select_related("user")
        .order_by(order)
    )

    return Response([
        {
            "pseudo": s.user.pseudo,
            "score": s.score,
        }
        for s in scores
    ])