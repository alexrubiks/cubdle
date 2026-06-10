from django.core.management.base import BaseCommand
import requests
from core.models import Competition, ChampionshipResult, Cubeur, Event

class Command(BaseCommand):
    help = "Importe les résultats des finales de championnats FR"

    def _is_fr(self, wca_id):
        if wca_id in self.non_fr:
            return False
        if wca_id in self.cubeurs:
            return True
        response = requests.get(
            f"https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/persons/{wca_id}.json"
        )
        if response.status_code != 200:
            self.non_fr.add(wca_id)
            return False
        country = response.json().get("country")
        if country != "FR":
            self.non_fr.add(wca_id)
            return False
        return True

    def handle(self, *args, **kwargs):
        self.events = {e.slug: e for e in Event.objects.all()}
        self.cubeurs = {c.wca_id: c for c in Cubeur.objects.all()}
        self.non_fr = set()

        championships = Competition.objects.filter(is_championship=True)
        self.stdout.write(f"{championships.count()} championnats trouvés, import en cours...")

        for championship in championships:
            self._import_championship(championship)

        self.stdout.write(self.style.SUCCESS("Import terminé !"))

    def _import_championship(self, competition):
        self.stdout.write(f"  → {competition.name}")

        for event in competition.events.all():
            response = requests.get(
                f"https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/results/{competition.wca_id}/{event.slug}.json"
            )
            if response.status_code != 200:
                continue

            data = response.json()
            finalists = [r for r in data["items"] if r["round"] == "Final"]

            fr_finalists = [
                r for r in finalists
                if self._is_fr(r["personId"])
            ]

            for new_position, result in enumerate(fr_finalists, start=1):
                cubeur = self._get_or_create_cubeur(result["personId"])
                if cubeur is None:
                    continue

                ChampionshipResult.objects.update_or_create(
                    competition=competition,
                    cubeur=cubeur,
                    event=self.events[event.slug],
                    defaults={"position": new_position}
                )

    def _is_fr(self, wca_id):
        if wca_id in self.cubeurs:
            return True
        response = requests.get(
            f"https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/persons/{wca_id}.json"
        )
        if response.status_code != 200:
            return False
        return response.json().get("country") == "FR"

    def _get_or_create_cubeur(self, wca_id):
        if wca_id in self.cubeurs:
            return self.cubeurs[wca_id]

        response = requests.get(
            f"https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/persons/{wca_id}.json"
        )
        if response.status_code != 200:
            return None

        person = response.json()
        if person.get("country") != "FR":
            return None

        cubeur, _ = Cubeur.objects.get_or_create(
            wca_id=wca_id,
            defaults={
                "first_name": person["name"].split(" ")[0],
                "last_name": " ".join(person["name"].split(" ")[1:]),
                "wca_year": int(wca_id[:4]),
                "competition_count": person["numberOfCompetitions"],
                "gold_count": person["medals"]["gold"],
                "silver_count": person["medals"]["silver"],
                "bronze_count": person["medals"]["bronze"],
                "is_active": False,
            }
        )
        self.cubeurs[wca_id] = cubeur
        return cubeur