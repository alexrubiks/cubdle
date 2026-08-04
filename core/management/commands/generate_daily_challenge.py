from django.core.management.base import BaseCommand
from datetime import date, timedelta
import math
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
LOCATION_PROXIMITY_KM = 5
LOCATION_CITY_CUTOFF_DAYS = 50
CUBEUR_WEIGHT_EXPONENT = 2.0  # ajuste ce curseur pour contrôler l'écart top vs reste

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
        ranking_cubeur, ranking_event, ranking_result_type = self._pick_ranking(cubeur)
        self._get_avatar_url(ranking_cubeur)
        podium_competition, podium_event = self._pick_podium()
        location_competition = self._pick_location_competition(competition)

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
        recent = list(DailyChallenge.objects.filter(date__gte=CUTOFF).values_list('competition_id', flat=True))
        competitions = list(Competition.objects.filter(participant_count__gt=0).exclude(id__in=recent))
        if not competitions:
            competitions = list(Competition.objects.filter(participant_count__gt=0))
        weights = [self._competition_weight(c) for c in competitions]
        return random.choices(competitions, weights=weights, k=1)[0]

    def _pick_ranking(self, excluded_cubeur):
        recent_pairs = set(
            DailyChallenge.objects.filter(
                date__gte=date.today() - timedelta(days=50)
            ).exclude(
                ranking_cubeur__isnull=True
            ).values_list(
                "ranking_cubeur_id",
                "ranking_event_id",
                "ranking_result_type"
            )
        )

        recent_cubeurs = set(
            DailyChallenge.objects.filter(
                date__gte=date.today() - timedelta(days=15)
            ).exclude(
                ranking_cubeur__isnull=True
            ).values_list(
                "ranking_cubeur_id",
                flat=True
            )
        )

        all_rankings = list(
            CubeurRanking.objects.filter(
                cubeur__is_active=True,
                national_rank__lte=100
            ).select_related("cubeur", "event")
        )

        available = []

        for ranking in all_rankings:
            expected_type = _get_ranking_result_type(ranking.event.slug)

            if ranking.result_type != expected_type:
                continue

            if ranking.cubeur_id == excluded_cubeur.id:
                continue

            if ranking.cubeur_id in recent_cubeurs:
                continue

            if (
                ranking.cubeur_id,
                ranking.event_id,
                ranking.result_type
            ) in recent_pairs:
                continue

            available.append(ranking)

        if not available:
            available = [
                r for r in all_rankings
                if r.cubeur_id != excluded_cubeur.id
                and r.result_type == _get_ranking_result_type(r.event.slug)
            ]

        weights = [(101 - r.national_rank) ** 1.5 for r in available]
        ranking = random.choices(available, weights=weights, k=1)[0]

        return (
            ranking.cubeur,
            ranking.event,
            ranking.result_type,
        )

    def _pick_podium(self):
        recent = DailyChallenge.objects.filter(date__gte=CUTOFF).exclude(
            podium_competition__isnull=True
        ).values_list('podium_competition_id', 'podium_event_id')
        recent_pairs = set(recent)

        championships = Competition.objects.filter(is_championship=True)

        valid_pairs = []
        for comp in championships:
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
            valid_pairs = [
                (comp, event_id)
                for comp in championships
                for event_id in ChampionshipResult.objects.filter(
                    competition=comp,
                    best__gt=0,
                ).values_list('event_id', flat=True).distinct()
            ]

        comp, event_id = random.choice(valid_pairs)
        return comp, Event.objects.get(id=event_id)

    def _cubeur_weight(self, cubeur):
        rankings = CubeurRanking.objects.filter(cubeur=cubeur, national_rank__isnull=False)
        rankings_by_event = {r.event.slug: r.national_rank for r in rankings}

        group_scores = []
        for group, events in EVENT_GROUPS.items():
            group_ranks = [rankings_by_event[e] for e in events if e in rankings_by_event]
            if group_ranks:
                best_rank = min(group_ranks)
                group_scores.append(100 * (0.965 ** (best_rank - 1)))

        if not group_scores:
            return 1

        group_scores.sort(reverse=True)
        score = sum(s * (0.5 ** i) for i, s in enumerate(group_scores))

        return max(score, 1) ** CUBEUR_WEIGHT_EXPONENT

    def _competition_weight(self, competition):
        age_days = (date.today() - competition.date_from).days
        return max(1, 3650 - age_days)

    def _distance_km(self, lat1, lon1, lat2, lon2):
        lat_avg = math.radians((lat1 + lat2) / 2)
        dx = math.radians(lon2 - lon1) * math.cos(lat_avg)
        dy = math.radians(lat2 - lat1)
        return 6371 * math.sqrt(dx ** 2 + dy ** 2)

    def _pick_location_competition(self, competition_du_jour):
        cutoff = date.today() - timedelta(days=LOCATION_CITY_CUTOFF_DAYS)

        recent_locations = list(
            DailyChallenge.objects.filter(
                date__gte=cutoff
            ).exclude(
                location_competition__isnull=True
            ).values_list('location_competition__latitude', 'location_competition__longitude')
        )
        recent_locations.append((competition_du_jour.latitude, competition_du_jour.longitude))

        recent_ids = list(DailyChallenge.objects.filter(date__gte=CUTOFF).values_list('competition_id', flat=True))
        candidates = Competition.objects.filter(participant_count__gt=0).exclude(id__in=recent_ids).exclude(id=competition_du_jour.id)

        filtered = [
            c for c in candidates
            if all(
                self._distance_km(c.latitude, c.longitude, lat, lon) > LOCATION_PROXIMITY_KM
                for lat, lon in recent_locations
            )
        ]

        if not filtered:
            filtered = [
                c for c in Competition.objects.filter(participant_count__gt=0).exclude(id=competition_du_jour.id)
                if self._distance_km(c.latitude, c.longitude, competition_du_jour.latitude, competition_du_jour.longitude) > LOCATION_PROXIMITY_KM
            ]

        weights = [self._competition_weight(c) for c in filtered]
        return random.choices(filtered, weights=weights, k=1)[0]