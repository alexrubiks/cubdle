import math
from datetime import date

import unicodedata
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import (
    ChampionshipResult,
    Competition,
    Cubeur,
    CubeurRanking,
    DailyChallenge,
    DailyProgress,
)
from core.serializers import (
    CompetitionSearchSerializer,
    CubeurSearchSerializer,
    DailyChallengeSerializer,
)
from .progress import (
    get_error_count,
    add_guess,
    set_done,
)


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


def normalize(s):
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    ).lower()


def build_hint(text, mistakes, first_at=10, every=5):
    if mistakes < first_at:
        return ""

    letters = 1 + (mistakes - first_at) // every

    return text[:min(len(text), letters)]


@api_view(['GET'])
def cubeur_search(request):
    query = request.query_params.get('q', '').strip()
    if len(query) < 2:
        return Response([])

    terms = [normalize(t) for t in query.split()]

    # Récupère plus de résultats pour filtrer ensuite en Python
    cubeurs = Cubeur.objects.all()

    # Filtre en Python avec normalisation
    def matches(cubeur):
        full = normalize(f"{cubeur.first_name} {cubeur.last_name}")
        return all(term in full for term in terms)

    results = [c for c in cubeurs if matches(c)][:10]

    serializer = CubeurSearchSerializer(results, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def competition_search(request):
    query = request.query_params.get('q', '').strip()
    if len(query) < 2:
        return Response([])
    already_guessed = int(request.query_params.get('exclude_count', 0))
    limit = 10 + already_guessed
    competitions = Competition.objects.filter(name__icontains=query)[:limit]
    serializer = CompetitionSearchSerializer(competitions, many=True)
    return Response(serializer.data)


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

    return Response({
        "correct": correct,
        "guessed_name": f"{guessed.first_name} {guessed.last_name}",
        "comparison": comparison,
        "hint": None if correct else build_hint(
            f"{target.first_name} {target.last_name}",
            get_error_count(request, "cubeur_guesses", target.id)
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
    guessed_set = set(guessed_value.split("-"))
    target_set = set(target_value.split("-"))
    if guessed_set == target_set:
        status = "correct"
    elif guessed_set & target_set:
        status = "partial"
    else:
        status = "wrong"

    months = {
        "janvier":1,
        "février":2,
        "mars":3,
        "avril":4,
        "mai":5,
        "juin":6,
        "juillet":7,
        "août":8,
        "septembre":9,
        "octobre":10,
        "novembre":11,
        "décembre":12,
    }

    direction = None
    guessed_set = list(guessed_set)
    target_set = list(target_set)
    try:
        if int(guessed_set[0]) < int(target_set[0]):
            direction = "up"
        elif int(guessed_set[0]) > int(target_set[0]):
            direction = "down"
    except Exception:
        if months[guessed_set[0]] < months[target_set[0]]:
            direction = "down"
        elif months[guessed_set[0]] > months[target_set[0]]:
            direction = "up"

    return {"status": status, "direction": direction, "value": guessed_value}



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


@api_view(['POST'])
def guess_ranking(request):
    challenge = DailyChallenge.objects.filter(date=date.today()).first()
    if challenge is None or challenge.ranking_cubeur is None:
        return Response({"error": "Aucun défi disponible"}, status=404)

    guessed_rank = request.data.get('rank')
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

    correct = guessed_rank == target_rank
    persons_at_rank = []
    direction = None

    if not correct:
        direction = "needs_lower" if guessed_rank > target_rank else "needs_higher"

        persons_at_rank = _get_persons_at_rank(
            challenge.ranking_event,
            challenge.ranking_result_type,
            guessed_rank,
        )

    add_guess(
        request,
        "ranking_guesses",
        {
            "rank": guessed_rank,
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
        "rank": target_rank if correct else guessed_rank,
        "score": target_ranking.score if correct else None,
        "direction": direction,
        "persons_at_rank": persons_at_rank,
    })


def _get_persons_at_rank(event, result_type, guessed_rank):
    """Trouve les personnes au rang demandé, en gérant les ex-aequo
    qui créent des trous dans le classement (ex: deux 37e -> pas de 38e)"""
    rank = guessed_rank
    while rank >= 1:
        rankings = CubeurRanking.objects.filter(
            event=event,
            result_type=result_type,
            national_rank=rank,
        ).select_related('cubeur')

        if rankings.exists():
            return [
                {
                    "name": f"{r.cubeur.first_name} {r.cubeur.last_name}",
                    "score": r.score,
                    "rank": r.national_rank,
                }
                for r in rankings
            ]
        rank -= 1

    return []


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

    if result is None:
        return Response({
            "correct": False,
            "in_final": False,
            "name": f"{guessed.first_name} {guessed.last_name}",
        })

    correct = result.position <= 3

    return Response({
        "correct": correct,
        "in_final": True,
        "name": f"{guessed.first_name} {guessed.last_name}",
        "position": result.position,
        "score": result.average if result.average > 0 else result.best,
    })


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
    """Score décroissance exponentielle, calibré pour la France (~1000km de diagonale)"""
    return round(max_score * math.exp(-distance_m / scale))


def get_daily_progress(user):
    return DailyProgress.objects.get_or_create(
        user=user,
        date=date.today()
    )[0]


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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_progress(request):

    local_progress = request.data

    progress, created = DailyProgress.objects.get_or_create(
        user=request.user,
        date=date.today(),
    )

    changed = False

    # ── LISTES DE TENTATIVES ──
    for field in GAME_LIST_FIELDS:

        local_value = local_progress.get(field, [])
        db_value = getattr(progress, field)

        # Si aucune tentative dans le compte,
        # on récupère la progression locale
        if len(db_value) == 0 and len(local_value) > 0:
            setattr(progress, field, local_value)
            changed = True

    # ── LOCATION ──
    local_location = local_progress.get(
        "location_guess",
        {}
    )

    if not progress.location_guess and local_location:
        progress.location_guess = local_location
        changed = True

    # ── JEUX TERMINÉS ──
    for field in DONE_FIELDS:

        local_value = local_progress.get(field, False)
        db_value = getattr(progress, field)

        # On ne peut passer de False -> True
        # que si le compte n'avait pas déjà une valeur
        if not db_value and local_value:
            setattr(progress, field, True)
            changed = True

    if changed:
        progress.save()

    return Response({
        "success": True,
        "synced": changed,
        "progress": {
            "cubeur_guesses": progress.cubeur_guesses,
            "compet_guesses": progress.compet_guesses,
            "ranking_guesses": progress.ranking_guesses,
            "podium_guesses": progress.podium_guesses,
            "location_guess": progress.location_guess,

            "cubeur_done": progress.cubeur_done,
            "compet_done": progress.compet_done,
            "ranking_done": progress.ranking_done,
            "podium_done": progress.podium_done,
            "location_done": progress.location_done,
        }
    })