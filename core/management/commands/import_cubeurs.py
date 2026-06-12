from django.core.management.base import BaseCommand
import requests
from core.models import Cubeur, CubeurRanking, Event

SINGLE_ONLY_EVENTS = {"333bf", "444bf", "555bf", "333mbf"}

# environ 120 cubeurs importés / minute
class Command(BaseCommand):
    help = "Importe les cubeurs FR top 80 par event"

    def handle(self, *args, **kwargs):
        self.events = {e.slug: e for e in Event.objects.all()}
        self.stdout.write("Récupération des WCA IDs...")
        cubers_id = self._fetch_cubers_ids()

        total = len(cubers_id)
        self.stdout.write(f"{len(cubers_id)} cubeurs trouvés, import en cours...")
        for i, wca_id in enumerate(cubers_id, start=1):
            self._import_cubeur(wca_id)
            self.stdout.write(
                f"\rImport cubeurs : {i}/{total}",
                ending=""
            )
            self.stdout.flush()
        self.stdout.write("")

        Cubeur.objects.filter(wca_id__in=cubers_id).update(is_active=True)
        Cubeur.objects.exclude(wca_id__in=cubers_id).update(is_active=False)

        self.stdout.write(self.style.SUCCESS("Import terminé !"))

    def _fetch_cubers_ids(self):
        cubers_id = set()
        for event in self.events.values():
            for metric in ["single", "average"]:
                if metric == "average" and not event.has_avg:
                    continue
                response = requests.get(
                    f"https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/rank/FR/{metric}/{event.slug}.json"
                )
                data = response.json()
                for person in data["items"]:
                    if person["rank"]["country"] <= 80:
                        cubers_id.add(person["personId"])
        return cubers_id

    def _import_cubeur(self, wca_id):
        response = requests.get(
            f"https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/persons/{wca_id}.json"
        )
        person = response.json()
        if person["country"] != "FR":
            return

        cubeur, _ = Cubeur.objects.update_or_create(
            wca_id=wca_id,
            defaults={
                "first_name": person["name"].split(" ")[0],
                "last_name": " ".join(person["name"].split(" ")[1:]),
                "wca_year": int(wca_id[:4]),
                "competition_count": person["numberOfCompetitions"],
                "gold_count": person["medals"]["gold"],
                "silver_count": person["medals"]["silver"],
                "bronze_count": person["medals"]["bronze"],
            }
        )

        self._import_rankings(cubeur, person)

    def _import_rankings(self, cubeur, person):
        for item in person["rank"]["singles"]:
            event = self.events.get(item["eventId"])
            if event is None:
                continue
            CubeurRanking.objects.update_or_create(
                cubeur=cubeur,
                event=event,
                result_type="single",
                defaults={
                    "national_rank": item["rank"]["country"],
                    "score": item["best"],
                }
            )
        for item in person["rank"]["averages"]:
            event = self.events.get(item["eventId"])
            if event is None:
                continue
            CubeurRanking.objects.update_or_create(
                cubeur=cubeur,
                event=event,
                result_type="average",
                defaults={
                    "national_rank": item["rank"]["country"],
                    "score": item["best"],
                }
            )

    