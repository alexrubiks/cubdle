from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from datetime import date
from core.models import DailyChallenge, Cubeur, CubeurRanking, Competition, ChampionshipResult
from core.serializers import DailyChallengeSerializer, CubeurSearchSerializer, CompetitionSearchSerializer


@api_view(['GET'])
def daily_challenge(request):
    challenge = DailyChallenge.objects.filter(date=date.today()).first()
    if challenge is None:
        return Response({"error": "Aucun défi disponible pour aujourd'hui"}, status=404)
    
    serializer = DailyChallengeSerializer(challenge)
    return Response(serializer.data)


@api_view(['GET'])
def cubeur_search(request):
    query = request.query_params.get('q', '').strip()
    if len(query) < 2:
        return Response([])
    
    cubeurs = Cubeur.objects.filter(
        Q(first_name__icontains=query) | Q(last_name__icontains=query)
    )[:10]
    
    serializer = CubeurSearchSerializer(cubeurs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def competition_search(request):
    query = request.query_params.get('q', '').strip()
    if len(query) < 2:
        return Response([])

    competitions = Competition.objects.filter(name__icontains=query)[:10]

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

    comparison = {
        "gender": _compare_categorical(guessed.gender, target.gender),
        "wca_year": _compare_numeric(guessed.wca_year, target.wca_year),
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
    })


def _compare_categorical(guessed_value, target_value):
    return {
        "status": "correct" if guessed_value == target_value else "wrong",
        "value": guessed_value,
    }


def _compare_numeric(guessed_value, target_value):
    if guessed_value == target_value:
        status = "correct"
    elif guessed_value < target_value:
        status = "needs_higher"
    else:
        status = "needs_lower"
    return {"status": status, "value": guessed_value}


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
    all_keys = set(guessed_rankings) | set(target_rankings)

    for event_slug, result_type in all_keys:
        guessed_rank = guessed_rankings.get((event_slug, result_type))
        target_rank = target_rankings.get((event_slug, result_type))

        key = f"{event_slug}_{result_type}"

        if guessed_rank is None and target_rank is None:
            result[key] = {"status": "correct", "value": None}
        elif guessed_rank is None or target_rank is None:
            result[key] = {"status": "wrong", "value": guessed_rank}
        elif guessed_rank == target_rank:
            result[key] = {"status": "correct", "value": guessed_rank}
        elif guessed_rank < target_rank:
            result[key] = {"status": "needs_higher", "value": guessed_rank}
        else:
            result[key] = {"status": "needs_lower", "value": guessed_rank}

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

    comparison = {
        "month": _compare_set_string(guessed.month, target.month),
        "year": _compare_set_string(guessed.year, target.year),
        "participant_count": _compare_numeric(guessed.participant_count, target.participant_count),
        "events": _compare_list(
            [e.slug for e in guessed.events.all()],
            [e.slug for e in target.events.all()],
        ),
        "organizers": _compare_list(guessed.organizers, target.organizers),
        "delegates": _compare_list(guessed.delegates, target.delegates),
    }

    return Response({
        "correct": correct,
        "guessed_name": guessed.name,
        "comparison": comparison,
    })


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

    return {"status": status, "value": guessed_value}


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

    if guessed_rank == target_rank:
        return Response({"correct": True})

    direction = "needs_lower" if guessed_rank > target_rank else "needs_higher"

    persons_at_rank = _get_persons_at_rank(
        challenge.ranking_event, challenge.ranking_result_type, guessed_rank
    )

    return Response({
        "correct": False,
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