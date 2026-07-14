from django.core.management.base import BaseCommand
import re
import requests
from datetime import date, timedelta
from core.models import Competition, Event

MONTHS_FR = {
    1: "janvier", 2: "février", 3: "mars", 4: "avril",
    5: "mai", 6: "juin", 7: "juillet", 8: "août",
    9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre"
}

# importe 500 comps en quelques secondes
class Command(BaseCommand):
    help = "Importe toutes les compétitions WCA FR"

    def handle(self, *args, **kwargs):
        self.events = {e.slug: e for e in Event.objects.all()}

        self.stdout.write("Récupération des compétitions FR...")
        response = requests.get(
            "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/competitions/FR.json"
        )
        data = response.json()
        competitions = data["items"]

        total = len(competitions)
        self.stdout.write(f"{len(competitions)} compétitions trouvées, import en cours...")

        skipped_cancelled = 0

        for i, comp in enumerate(competitions, start=1):
            if not self._import_competition(comp):
                skipped_cancelled += 1

            self.stdout.write(
                f"\rImport compétitions : {i}/{total}",
                ending=""
            )
            self.stdout.flush()
        self.stdout.write("")

        self.stdout.write(f"{skipped_cancelled} compétitions annulées ignorées.")
        self.stdout.write(self.style.SUCCESS("Import terminé !"))

    def _import_competition(self, comp):
        if comp.get("isCanceled"):
            return False

        date_from_str = comp["date"]["from"]
        date_till_str = comp["date"]["till"]
        parsed_date_from = date.fromisoformat(date_from_str)

        cutoff = date.today() - timedelta(days=7)
        if parsed_date_from > cutoff:
            return True

        month_str, year_str = self._format_month_year(date_from_str, date_till_str)

        organizers = [o["name"] for o in comp["organisers"]]
        delegates = [d["name"] for d in comp["wcaDelegates"]]
        coords = comp["venue"]["coordinates"]

        competition, _ = Competition.objects.update_or_create(
            wca_id=comp["id"],
            defaults={
                "name": comp["name"],
                "date_from": parsed_date_from,
                "month": month_str,
                "year": year_str,
                "day_count": comp["date"]["numberOfDays"],
                "latitude": coords["latitude"],
                "longitude": coords["longitude"],
                "organizers": organizers,
                "delegates": delegates,
                "participant_count": -1,
                "is_championship": self._is_championship(comp["id"]),
            }
        )

        event_objects = [
            self.events[slug]
            for slug in comp["events"]
            if slug in self.events
        ]
        competition.events.set(event_objects)

        return True

    def _format_month_year(self, date_from, date_till):
        year_from, month_from, _ = date_from.split("-")
        year_till, month_till, _ = date_till.split("-")

        month_from_str = MONTHS_FR[int(month_from)]
        month_till_str = MONTHS_FR[int(month_till)]

        if year_from != year_till:
            return f"{month_from_str}-{month_till_str}", f"{year_from}-{year_till}"
        elif month_from != month_till:
            return f"{month_from_str}-{month_till_str}", year_from
        else:
            return month_from_str, year_from

    def _is_championship(self, wca_id):
        return bool(re.match(r'^(France|FrenchChampionship|FrenchFMCChampionship)\d{4}', wca_id))