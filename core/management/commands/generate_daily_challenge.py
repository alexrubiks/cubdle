from django.core.management.base import BaseCommand
from datetime import date, timedelta
import random
import requests
from bs4 import BeautifulSoup
from core.models import DailyChallenge, Cubeur, Competition, CubeurRanking, Event, ChampionshipResult

EVENT_GROUPS = {
    "blind": ["333bf", "444bf", "555bf", "333mbf"],
    "big": ["555", "666", "777"],
    "333": ["333"],
    "222": ["222"],
    "444": ["444"],
    "oh": ["333oh"],
    "fm": ["333fm"],
    "clock": ["clock"],
    "minx": ["minx"],
    "pyram": ["pyram"],
    "skewb": ["skewb"],
    "sq1": ["sq1"],
}
CUTOFF = date.today() - timedelta(days=50)
SINGLE_ONLY_EVENTS = {"333bf", "444bf", "555bf", "333mbf"}

def _get_ranking_result_type(event_slug):
    return "single" if event_slug in SINGLE_ONLY_EVENTS else "average"

class Command(BaseCommand):
    help = "Génère le défi quotidien"

    def handle(self, *args, **kwargs):
        target_date = date.today() + timedelta(days=1)

        if DailyChallenge.objects.filter(date=target_date).exists():
            self.stdout.write("Défi du jour déjà généré.")
            return

        cubeur = self._pick_cubeur()
        self._get_avatar_url(cubeur)
        competition = self._pick_competition()
        ranking_cubeur, ranking_event, ranking_result_type = self._pick_ranking()
        self._get_avatar_url(ranking_cubeur)
        podium_competition, podium_event = self._pick_podium()
        location_competition = self._pick_competition()

        DailyChallenge.objects.create(
            date=target_date,
            cubeur=cubeur,
            competition=competition,
            ranking_cubeur=ranking_cubeur,
            ranking_event=ranking_event,
            ranking_result_type=ranking_result_type,
            podium_competition=podium_competition,
            podium_event=podium_event,
            location_competition=location_competition,
        )

        self.stdout.write(self.style.SUCCESS(f"Défi du {target_date} généré !"))
        self.stdout.write(f"  Cubeur     : {cubeur.first_name} {cubeur.last_name}")
        self.stdout.write(f"  Compet     : {competition.name}")
        self.stdout.write(f"  Classement : {ranking_cubeur.first_name} {ranking_cubeur.last_name} / {ranking_event.name} ({ranking_result_type})")
        self.stdout.write(f"  Podium     : {podium_competition.name} / {podium_event.name}")
        self.stdout.write(f"  Location   : {location_competition.name}")

    def _get_avatar_url(self, cubeur):
        if cubeur.avatar_url:
            return cubeur.avatar_url

        response = requests.get(f"https://www.worldcubeassociation.org/persons/{cubeur.wca_id}")
        if response.status_code != 200:
            return None

        soup = BeautifulSoup(response.text, "html.parser")
        img = soup.find("img", class_="avatar")
        if img and img.get("src"):
            cubeur.avatar_url = img["src"]
            cubeur.save(update_fields=["avatar_url"])
            return cubeur.avatar_url
        return None

    def _pick_cubeur(self):
        recent = DailyChallenge.objects.filter(date__gte=CUTOFF).values_list('cubeur_id', flat=True)
        cubeurs = list(Cubeur.objects.filter(is_active=True).exclude(id__in=recent))
        if not cubeurs:
            cubeurs = list(Cubeur.objects.filter(is_active=True))
        weights = [self._cubeur_weight(c) for c in cubeurs]
        return random.choices(cubeurs, weights=weights, k=1)[0]
    
    def _pick_competition(self):
        recent = DailyChallenge.objects.filter(date__gte=CUTOFF).values_list('competition_id', flat=True)
        competitions = list(Competition.objects.filter(participant_count__gt=0).exclude(id__in=recent))
        if not competitions:
            competitions = list(Competition.objects.filter(participant_count__gt=0))
        weights = [self._competition_weight(c) for c in competitions]
        return random.choices(competitions, weights=weights, k=1)[0]

    def _pick_ranking(self):
        recent = DailyChallenge.objects.filter(
            date__gte=CUTOFF
        ).exclude(
            ranking_cubeur__isnull=True
        ).values_list(
            'ranking_cubeur_id',
            'ranking_event_id',
            'ranking_result_type'
        )

        recent_pairs = set(recent)

        all_rankings = list(
            CubeurRanking.objects.filter(
                cubeur__is_active=True,
                national_rank__lte=100
            ).select_related('cubeur', 'event')
        )

        available = []

        for ranking in all_rankings:
            expected_type = _get_ranking_result_type(ranking.event.slug)

            if ranking.result_type != expected_type:
                continue

            if (ranking.cubeur_id, ranking.event_id, ranking.result_type) in recent_pairs:
                continue

            available.append(ranking)

        if not available:
            available = all_rankings

        ranking = random.choice(available)

        return (
            ranking.cubeur,
            ranking.event,
            ranking.result_type
        )

    def _pick_podium(self):
        recent = DailyChallenge.objects.filter(date__gte=CUTOFF).exclude(
            podium_competition__isnull=True
        ).values_list('podium_competition_id', 'podium_event_id')
        recent_pairs = set(recent)

        championships = Competition.objects.filter(is_championship=True)

        valid_pairs = []
        for comp in championships:
            if (comp.id,) in [(r[0],) for r in recent_pairs]:
                continue
            events = ChampionshipResult.objects.filter(
                competition=comp
            ).values_list('event_id', flat=True).distinct()

            for event_id in events:
                if (comp.id, event_id) in recent_pairs:
                    continue

                # Compter les finalistes avec un score valide (ni -1 ni 0)
                valid_results = ChampionshipResult.objects.filter(
                    competition=comp,
                    event_id=event_id,
                    best__gt=0,
                ).count()

                if valid_results >= 3:
                    valid_pairs.append((comp, event_id))

        if not valid_pairs:
            # Fallback sans filtre recent
            valid_pairs = [
                (comp, event_id)
                for comp in championships
                for event_id in ChampionshipResult.objects.filter(
                    competition=comp,
                    best__gt=0,
                    average__gt=0,
                ).values_list('event_id', flat=True).distinct()
            ]

        comp, event_id = random.choice(valid_pairs)
        return comp, Event.objects.get(id=event_id)

    def _cubeur_weight(self, cubeur):
        rankings = CubeurRanking.objects.filter(cubeur=cubeur, national_rank__isnull=False)
        rankings_by_event = {r.event.slug: r.national_rank for r in rankings}

        score = 0
        for group, events in EVENT_GROUPS.items():
            # Meilleur classement du groupe (valeur la plus basse = meilleur)
            group_ranks = [rankings_by_event[e] for e in events if e in rankings_by_event]
            if group_ranks:
                best_rank = min(group_ranks)
                score += max(0, 101 - best_rank)

        return max(score, 1)

    def _competition_weight(self, competition):
        age_days = (date.today() - competition.date_from).days
        return max(1, 3650 - age_days)