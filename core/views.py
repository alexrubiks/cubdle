import math
import unicodedata
from datetime import date, timedelta
from urllib.parse import urlencode

from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.shortcuts import redirect, get_object_or_404
from requests_oauthlib import OAuth2Session
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.permissions import AllowAny
from .authentication import CubdleJWTAuthentication

from core.models import (
    ChampionshipResult,
    Competition,
    Cubeur,
    CubeurRanking,
    DailyChallenge,
    DailyProgress,
    NationalRecord,
    User,
    Score,
    Game,
)
from core.serializers import (
    CompetitionSearchSerializer,
    CubeurSearchSerializer,
    DailyChallengeSerializer,
)

from .dates import (
    ARCHIVE_START,
    ChallengeDateError,
    is_launched,
    is_playable,
    parse_date,
    get_challenge_date,
    resolve_challenge_date,
    today as paris_today,
)
from .leaderboards import GAME_SORT_ORDER, crowned_user_ids, effective_score, game_points, general_leaderboard, streak_for_user
from .progress import (
    merge_progress,
    add_guess,
    set_done,
    get_guesses,
    get_podium_entries,
    guessed_keys,
    get_podium_ranked_by,
    podium_display_score,
    get_done,
)

# SINGLE_ONLY_EVENTS : voir core/progress.py

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
        f"https://cubdle.fr/auth/callback?{params}"
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

def _get_challenge(request):
    """
    Résout la date demandée (?date= / body "date", défaut : aujourd'hui à Paris)
    et renvoie (challenge, error_response).
    """
    try:
        day = resolve_challenge_date(request)
    except ChallengeDateError as e:
        return None, Response({"error": str(e)}, status=403)

    challenge = DailyChallenge.objects.filter(date=day).first()
    if challenge is None:
        return None, Response({"error": "Aucun défi disponible pour cette date"}, status=404)
    return challenge, None


@api_view(['GET'])
def daily_challenge(request):
    challenge, error = _get_challenge(request)
    if error:
        return error

    serializer = DailyChallengeSerializer(challenge)
    data = {**serializer.data, "date": str(challenge.date), "today": str(paris_today())}

    # Places du podium, ex æquo compris (ex : [1, 2, 2]) : une ligne par personne
    if challenge.podium_competition is not None:
        data["podium_positions"] = [e.position for e in get_podium_entries(challenge)]
        data["podium_ranked_by"] = get_podium_ranked_by(challenge)

    # Devine le NR : uniquement à partir du lancement, sans nom ni compétition
    nr = challenge.nr_record
    if is_launched() and nr is not None:
        data["nr"] = {
            "event_id": nr.event_id,
            "event_name": nr.event_name,
            "record_type": nr.record_type,
            "value": nr.value,
            "date": str(nr.date),
        }

    return Response(data)


@api_view(['GET'])
def yesterday_challenge(request):
    try:
        day = resolve_challenge_date(request)
    except ChallengeDateError as e:
        return Response({"error": str(e)}, status=403)
    yesterday = day - timedelta(days=1)
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
    challenge, error = _get_challenge(request)
    if error:
        return error

    if challenge.cubeur is None:
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
    
    return Response({
        "correct": correct,
        "guessed_name": f"{guessed.first_name} {guessed.last_name}",
        "comparison": comparison,
        "hint": None if correct else build_hint(
            f"{target.first_name} {target.last_name}",
            len(guessed_keys(request, "cubeur_guesses") - {target.id}),
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
    challenge, error = _get_challenge(request)
    if error:
        return error

    if challenge.competition is None:
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
            len(guessed_keys(request, "compet_guesses") - {target.id}),
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
    challenge, error = _get_challenge(request)
    if error:
        return error

    if challenge.ranking_cubeur is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    if is_launched():
        return _guess_ranking_single(request, challenge)

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


def _ranking_answer(challenge):
    """
    Renvoie (rang, score, nb d'ex æquo) de la bonne réponse.
    Figés à la génération ; à défaut (anciens défis), classement actuel.
    """
    rankings = CubeurRanking.objects.filter(
        event=challenge.ranking_event,
        result_type=challenge.ranking_result_type,
    )

    if challenge.ranking_answer_rank is not None:
        rank, score = challenge.ranking_answer_rank, challenge.ranking_answer_score
        tie_count = challenge.ranking_answer_tie_count
    else:
        ranking = rankings.get(cubeur=challenge.ranking_cubeur)
        rank, score, tie_count = ranking.national_rank, ranking.score, None

    if not tie_count:
        tie_count = rankings.filter(national_rank=rank).count()

    return rank, score, max(1, tie_count)


def ranking_distance(guessed_rank, target_rank, tie_count):
    """
    Écart entre le rang proposé et la bonne réponse.
    Un groupe de N ex æquo classés R occupe les places R à R+N-1 :
    viser n'importe laquelle de ces places donne un écart de 0,
    sinon on mesure la distance jusqu'au bord le plus proche du groupe.
    """
    low = target_rank
    high = target_rank + tie_count - 1
    if guessed_rank < low:
        return low - guessed_rank
    if guessed_rank > high:
        return guessed_rank - high
    return 0


def _guess_ranking_single(request, challenge):
    """
    Nouveau mode (maj de décembre) : un seul guess, score = écart (cf. ranking_distance).
    Pas d'archive pour ce jeu (le classement national évolue en permanence).
    """
    if challenge.date != paris_today():
        return Response({"error": "Ce jeu n'est pas disponible pour les anciens défis."}, status=403)

    if get_done(request, "ranking_done"):
        return Response({"error": "Tu as déjà joué au classement aujourd'hui."}, status=409)

    try:
        guessed_rank = int(request.data.get("rank"))
    except (TypeError, ValueError):
        return Response({"error": "rank doit être un entier"}, status=400)

    if not (1 <= guessed_rank <= 100):
        return Response({"error": "rank doit être entre 1 et 100"}, status=400)

    target_rank, target_score, tie_count = _ranking_answer(challenge)
    distance = ranking_distance(guessed_rank, target_rank, tie_count)

    # Toutes les personnes entre le guess et la bonne réponse (bornes incluses).
    # Le groupe visé est celui du rang occupé <= guess (ex : 13 -> les 12e ex æquo).
    guessed_block = _get_persons_at_rank(
        challenge.ranking_event,
        challenge.ranking_result_type,
        guessed_rank,
    )
    guessed_block_rank = guessed_block["resolved_rank"] or guessed_rank

    rank_min = min(target_rank, guessed_block_rank)
    rank_max = max(target_rank, guessed_rank)

    persons = [
        {
            "id": r.cubeur.id,
            "name": f"{r.cubeur.first_name} {r.cubeur.last_name}",
            "score": r.score,
            "rank": r.national_rank,
            "is_answer_group": r.national_rank == target_rank,
            "is_answer": r.cubeur_id == challenge.ranking_cubeur_id,
        }
        for r in CubeurRanking.objects.filter(
            event=challenge.ranking_event,
            result_type=challenge.ranking_result_type,
            national_rank__gte=rank_min,
            national_rank__lte=rank_max,
        ).select_related("cubeur").order_by("national_rank", "cubeur__last_name")
    ]

    add_guess(
        request,
        "ranking_guesses",
        {
            "rank": guessed_rank,
            "distance": distance,
        },
    )
    set_done(request, "ranking_done")

    return Response({
        "guessed_rank": guessed_rank,
        "rank": target_rank,
        "score": target_score,
        "tie_count": tie_count,
        "distance": distance,
        "persons": persons,
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
    challenge, error = _get_challenge(request)
    if error:
        return error
    if challenge.podium_competition is None:
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

    # Podium = toutes les personnes classées 3e ou mieux (ex æquo compris)
    entries = get_podium_entries(challenge)
    slot = next((i for i, e in enumerate(entries) if e.cubeur_id == guessed.id), None)
    correct = slot is not None

    add_guess(request, "podium_guesses", {
        "id": guessed.id,
        "name": f"{guessed.first_name} {guessed.last_name}",
        "correct": correct,
        "position": result.position if result else None,
        "slot": slot,
    })

    # nombre d'essais qui n'ont touché aucune ligne du podium
    podium_ids = {e.cubeur_id for e in entries}
    wrong_count = len(guessed_keys(request, "podium_guesses") - podium_ids)

    # un indice par ligne du podium (même ordre que podium_positions)
    hints = [
        build_hint(f"{e.cubeur.first_name} {e.cubeur.last_name}", wrong_count, first_at=5, every=5)
        for e in entries
    ]

    if result is None:
        return Response({
            "correct": False,
            "in_final": False,
            "name": f"{guessed.first_name} {guessed.last_name}",
            "hints": hints,
        })

    score, score_type = podium_display_score(result, get_podium_ranked_by(challenge))

    return Response({
        "correct": correct,
        "in_final": True,
        "name": f"{guessed.first_name} {guessed.last_name}",
        "position": result.position,
        "slot": slot,
        "score": score,
        "score_type": score_type,
        "hints": hints,
    })

################################################################################
#####  GUESSLOCATION  ##########################################################
################################################################################

@api_view(['POST'])
def guess_location(request):
    challenge, error = _get_challenge(request)
    if error:
        return error
    if challenge.location_competition is None:
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

@api_view(['GET'])
@authentication_classes([CubdleJWTAuthentication])
@permission_classes([AllowAny])
def location_guesses(request):
    challenge, error = _get_challenge(request)
    if error:
        return error
    if challenge.location_competition is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    progresses = DailyProgress.objects.filter(
        date=challenge.date,
        location_done=True,
    ).exclude(
        location_guess={},
    )

    if getattr(request.user, "is_authenticated", False):
        progresses = progresses.exclude(user=request.user)

    progresses = progresses.select_related('user').values_list('user__pseudo', 'location_guess')

    guesses = [
        {
            "pseudo": pseudo,
            "latitude": g["latitude"],
            "longitude": g["longitude"],
        }
        for pseudo, g in progresses
        if g.get("latitude") is not None and g.get("longitude") is not None
    ]

    return Response(guesses)


################################################################################
#####  DEVINE LE NR  ###########################################################
################################################################################

def _nr_holders():
    """Toutes les personnes ayant détenu au moins un NR : {wca_id: nom}."""
    holders = {}
    for wca_id, name in NationalRecord.objects.order_by("date").values_list("wca_id", "name"):
        holders[wca_id] = name  # le plus récent l'emporte (nom actuel)
    return holders


def _nr_accepted_ids(record):
    """
    WCA IDs acceptés comme bonne réponse : la personne du record, plus toute
    personne ayant établi exactement le même record (même valeur, même compétition).
    """
    return set(
        NationalRecord.objects.filter(
            event_id=record.event_id,
            record_type=record.record_type,
            value=record.value,
            competition_id=record.competition_id,
        ).values_list("wca_id", flat=True)
    )


@api_view(['GET'])
def nr_search(request):
    if not is_launched():
        return Response([])

    query = request.query_params.get("q", "").strip()
    if len(query) < 2:
        return Response([])

    query_norm = normalize(query)
    terms = query_norm.split()
    exclude = {i.strip() for i in request.query_params.get("exclude_ids", "").split(",") if i.strip()}

    results = []
    for wca_id, name in _nr_holders().items():
        if wca_id in exclude:
            continue
        full = normalize(name)
        if not all(term in full for term in terms):
            continue
        words = full.split()
        if full.startswith(query_norm):
            category = 0
        elif all(any(word.startswith(term) for word in words) for term in terms):
            category = 1
        else:
            category = 2
        results.append((category, full, wca_id, name))

    results.sort()
    return Response([{"wca_id": wca_id, "name": name} for _, _, wca_id, name in results[:10]])


@api_view(['POST'])
def guess_nr(request):
    if not is_launched():
        return Response({"error": "Ce jeu n'est pas encore disponible."}, status=404)

    challenge, error = _get_challenge(request)
    if error:
        return error

    record = challenge.nr_record
    if record is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    if get_done(request, "nr_done"):
        return Response({"error": "Tu as déjà trouvé ce NR."}, status=409)

    wca_id = str(request.data.get("wca_id", "")).strip().upper()
    holders = _nr_holders()
    if wca_id not in holders:
        return Response({"error": "Personne inconnue"}, status=400)

    def guessed_ids():
        # Session : liste de WCA IDs ; base (poussée par le front) : liste de dicts
        return [g if isinstance(g, str) else g.get("wca_id") for g in get_guesses(request, "nr_guesses")]

    if wca_id in guessed_ids():
        return Response({"error": "Déjà proposé"}, status=400)

    accepted = _nr_accepted_ids(record)
    correct = wca_id in accepted

    add_guess(request, "nr_guesses", wca_id)
    if correct:
        set_done(request, "nr_done")

    mistakes = len(guessed_keys(request, "nr_guesses", key="wca_id") - accepted)

    response = {
        "correct": correct,
        "wca_id": wca_id,
        "guessed_name": holders[wca_id],
        "hint": None if correct else build_hint(record.name, mistakes, first_at=5, every=5),
    }

    if correct:
        response["answer"] = {
            "wca_id": record.wca_id,
            "name": record.name,
            "competition_id": record.competition_id,
            "competition_name": record.competition_name,
            "record_tag": record.record_tag,
        }

    return Response(response)


################################################################################
#####  PROGRESS  ###############################################################
################################################################################

GAME_LIST_FIELDS = [
    "cubeur_guesses",
    "compet_guesses",
    "ranking_guesses",
    "podium_guesses",
    "nr_guesses",
]

DONE_FIELDS = [
    "cubeur_done",
    "compet_done",
    "ranking_done",
    "podium_done",
    "location_done",
    "nr_done",
]

GAME_FIELDS = {
    "cubeur": ("cubeur_guesses", "cubeur_done", list),
    "compet": ("compet_guesses", "compet_done", list),
    "ranking": ("ranking_guesses", "ranking_done", list),
    "podium": ("podium_guesses", "podium_done", list),
    "location": ("location_guess", "location_done", dict),
    "nr": ("nr_guesses", "nr_done", list),
}

HINT_FIELDS = [
    "cubeur_latest_hint",
    "compet_latest_hint",
    "podium_latest_hint",
    "nr_latest_hint",
]


def get_daily_progress(user, day):
    return DailyProgress.objects.get_or_create(
        user=user,
        date=day,
    )[0]


def _is_logged(request):
    return getattr(request.user, "is_authenticated", False)


def serialize_progress(progress):
    return {
        "date": str(progress.date),

        "cubeur_guesses": progress.cubeur_guesses,
        "compet_guesses": progress.compet_guesses,
        "ranking_guesses": progress.ranking_guesses,
        "podium_guesses": progress.podium_guesses,
        "location_guess": progress.location_guess,
        "nr_guesses": progress.nr_guesses,

        "cubeur_latest_hint": progress.cubeur_latest_hint,
        "compet_latest_hint": progress.compet_latest_hint,
        "podium_latest_hint": progress.podium_latest_hint,
        "nr_latest_hint": progress.nr_latest_hint,

        "cubeur_done": progress.cubeur_done,
        "compet_done": progress.compet_done,
        "ranking_done": progress.ranking_done,
        "podium_done": progress.podium_done,
        "location_done": progress.location_done,
        "nr_done": progress.nr_done,
    }

@api_view(["GET", "POST"])
def daily_progress(request):
    if not _is_logged(request):
        return Response(status=401)

    try:
        day = resolve_challenge_date(request)
    except ChallengeDateError as e:
        return Response({"error": str(e)}, status=403)

    if request.method == "POST":
        # Fusion (et non plus écrasement) : rien ne peut reculer, quel que soit
        # l'ordre d'arrivée des envois ou le nombre d'appareils. Verrou de ligne
        # pour que deux envois simultanés ne s'écrasent pas.
        get_daily_progress(request.user, day)
        with transaction.atomic():
            progress = DailyProgress.objects.select_for_update().get(user=request.user, date=day)
            merge_progress(progress, request.data, single_ranking=is_launched())
            progress.save()
        return Response(serialize_progress(progress))

    progress = get_daily_progress(request.user, day)
    return Response(serialize_progress(progress))


@api_view(["POST"])
def sync_daily_progress(request):
    """
    Fusionne le localStorage envoyé par le front avec le DailyProgress
    du jour en base. Pour chaque jeu, si des guesses existent déjà en
    base (le jeu est "commencé"), le localStorage est ignoré pour ce jeu.
    Renvoie l'état fusionné complet.
    """
    if not _is_logged(request):
        return Response(status=401)

    try:
        day = resolve_challenge_date(request)
    except ChallengeDateError as e:
        return Response({"error": str(e)}, status=403)

    local_data = request.data.get("local_progress") or {}
    progress = get_daily_progress(request.user, day)

    updated = False

    for game, (guesses_field, done_field, empty_type) in GAME_FIELDS.items():
        current_guesses = getattr(progress, guesses_field)

        if current_guesses != empty_type():
            continue

        local_guesses = local_data.get(guesses_field, empty_type())
        local_done = local_data.get(done_field, False)

        if local_guesses != empty_type() or local_done:
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


# Après minuit, on accepte encore pendant SCORE_GRACE les scores de la veille
# comme "dans les temps" (partie commencée à 23h58, finie à 00h01).
SCORE_GRACE = timedelta(hours=2)


@api_view(["POST"])
def submit_score(request):
    if not _is_logged(request):
        return Response(status=401)

    game_slug = request.data.get("game")  # "cubeur", "compet", "ranking", "podium", "location"
    score_value = request.data.get("score")

    if game_slug is None or score_value is None:
        return Response({"error": "game et score sont requis."}, status=400)

    try:
        score_value = int(score_value)
    except (TypeError, ValueError):
        return Response({"error": "score doit être un entier."}, status=400)

    try:
        game = Game.objects.get(slug=game_slug)
    except Game.DoesNotExist:
        return Response({"error": "Jeu introuvable."}, status=404)

    today = paris_today()
    day = parse_date(request.data.get("date")) or today
    now = timezone.localtime()
    in_grace = (
        day == today - timedelta(days=1)
        and now - now.replace(hour=0, minute=0, second=0, microsecond=0) < SCORE_GRACE
    )

    if not (is_playable(day) or in_grace):
        return Response({"error": "Ce défi n'est pas accessible."}, status=403)

    is_late = day != today and not in_grace

    if game_slug == "ranking" and is_late:
        return Response({"error": "Pas d'ancien défi pour le classement."}, status=403)

    # Le premier score enregistré pour un (joueur, jeu, jour) fait foi.
    score, created = Score.objects.get_or_create(
        user=request.user,
        game=game,
        date=day,
        defaults={"score": score_value, "is_late": is_late},
    )

    if not created:
        return Response({
            "message": "Score déjà enregistré pour ce jour.",
            "score": score.score,
        })

    return Response({"score": score.score, "is_late": score.is_late}, status=201)


# GAME_SORT_ORDER : voir core/leaderboards.py


def _current_user_id(request):
    return request.user.id if getattr(request.user, "is_authenticated", False) else None


@api_view(["GET"])
def daily_leaderboard(request):
    """
    ?game=<slug>&date=YYYY-MM-DD&include_late=1
    Chaque ligne "dans les temps" porte son rang et ses points (cf. core/leaderboards.py).
    Les parties jouées en décalé (archives) ne sont renvoyées que si include_late=1 :
    intercalées selon leur score, marquées is_late=True, sans rang ni points.
    """
    game_slug = request.GET.get("game")

    if game_slug not in GAME_SORT_ORDER:
        return Response({"error": "Jeu invalide."}, status=400)

    try:
        game = Game.objects.get(slug=game_slug)
    except Game.DoesNotExist:
        return Response({"error": "Jeu introuvable."}, status=404)

    day = parse_date(request.GET.get("date")) or paris_today()
    if day > paris_today():
        return Response({"error": "Pas encore de classement pour ce jour."}, status=403)
    if day < ARCHIVE_START:
        return Response({"error": "Pas de classement avant le lancement de Cubdle."}, status=403)

    include_late = request.GET.get("include_late") in ("1", "true")
    order = "score" if GAME_SORT_ORDER[game_slug] == "asc" else "-score"
    me = _current_user_id(request)

    scores = Score.objects.filter(game=game, date=day).select_related("user")
    if not include_late:
        scores = scores.filter(is_late=False)
    scores = list(scores.order_by(order, "is_late", "played_at"))

    ranked = game_points(
        [(s.id, effective_score(game_slug, s.score)) for s in scores if not s.is_late],
        GAME_SORT_ORDER[game_slug],
    )

    crowned = crowned_user_ids(paris_today())  # couronne "fixe" : le tenant actuel, quelle que soit la date consultée

    return Response([
        {
            "pseudo": s.user.pseudo,
            "score": s.score,
            "is_late": s.is_late,
            "crowned": s.user_id in crowned,
            "rank": ranked[s.id][0] if s.id in ranked else None,
            "points": ranked[s.id][1] if s.id in ranked else None,
            "is_me": s.user_id == me,
        }
        for s in scores
    ])


@api_view(["GET"])
def progress_streak(request):
    """Série 🔥 du joueur connecté : {current, best, today_done}."""
    if not _is_logged(request):
        return Response(status=401)
    return Response(streak_for_user(request.user))


@api_view(["GET"])
def progress_summary(request):
    """
    Calendrier des archives : pour le joueur connecté, les jeux terminés
    par date (depuis ARCHIVE_START). {"2026-11-13": ["cubeur", "nr"], ...}
    """
    if not _is_logged(request):
        return Response(status=401)

    done_fields = {
        "cubeur": "cubeur_done", "compet": "compet_done", "ranking": "ranking_done",
        "podium": "podium_done", "nr": "nr_done", "location": "location_done",
    }
    rows = DailyProgress.objects.filter(user=request.user, date__gte=ARCHIVE_START).values("date", *done_fields.values())
    return Response({
        str(row["date"]): [slug for slug, field in done_fields.items() if row[field]]
        for row in rows
    })


@api_view(["GET"])
def general_leaderboard_view(request):
    """
    ?period=day|week|month&date=YYYY-MM-DD[&game=<slug>] : somme des points
    (tous les jeux, ou un seul jeu si `game` est donné). Cf. core/leaderboards.py.
    """
    period = request.GET.get("period", "day")
    if period not in ("day", "week", "month"):
        return Response({"error": "Période invalide."}, status=400)

    game = request.GET.get("game") or None
    if game is not None and game not in GAME_SORT_ORDER:
        return Response({"error": "Jeu invalide."}, status=400)

    day = parse_date(request.GET.get("date")) or paris_today()
    if day > paris_today():
        return Response({"error": "Pas encore de classement pour ce jour."}, status=403)
    if day < ARCHIVE_START:
        return Response({"error": "Pas de classement avant le lancement de Cubdle."}, status=403)

    data = general_leaderboard(period, day, game)
    me = _current_user_id(request)
    crowned = crowned_user_ids(paris_today())  # couronne "fixe" : le tenant actuel, quelle que soit la date consultée
    for row in data["rows"]:
        user_id = row.pop("user_id")
        row["is_me"] = user_id == me
        row["crowned"] = user_id in crowned
    return Response(data)
