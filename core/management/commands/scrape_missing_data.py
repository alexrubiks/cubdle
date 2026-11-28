import time

from django.core.management.base import BaseCommand
import requests
from bs4 import BeautifulSoup
from core.models import Competition, Cubeur

WCA_API = "https://www.worldcubeassociation.org/api/v0"
RETRY_DELAY = 5  # secondes avant le 2e essai (429 / erreur réseau)


class Command(BaseCommand):
    help = "Scrape les données manquantes (participant_count et gender)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--recheck-other",
            action="store_true",
            help="Revérifie aussi les cubeurs en genre 'o' (mal classés par l'ancien scraping HTML)",
        )

    def handle(self, *args, **options):
        self._scrape_participant_counts()
        self._scrape_genders(recheck_other=options["recheck_other"])
        self.stdout.write(self.style.SUCCESS("Scraping terminé !"))

    def _scrape_participant_counts(self):
        competitions = Competition.objects.filter(participant_count=-1)
        total = competitions.count()
        self.stdout.write(f"{total} compétitions sans participant_count")

        for i, competition in enumerate(competitions, start=1):
            response = requests.get(
                f"https://www.worldcubeassociation.org/competitions/{competition.wca_id}",
                headers={"Accept-Language": "fr"}
            )
            if response.status_code != 200:
                self.stdout.write(f"  ✗ {competition.name} (HTTP {response.status_code})")
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            dt = soup.find("dt", string="Compétiteurs")
            if dt is None:
                # Fallback anglais
                dt = soup.find("dt", string="Competitors")
            
            if dt and dt.find_next_sibling("dd"):
                count = int(dt.find_next_sibling("dd").text.strip())
                competition.participant_count = count
                competition.save(update_fields=["participant_count"])
                self.stdout.write(f"  ✓ {competition.name} : {count} ({i}/{total})")
            else:
                self.stdout.write(f"  ? {competition.name} : champ introuvable")

    def _scrape_genders(self, recheck_other=False):
        # API officielle WCA : person.gender vaut déjà "m" / "f" / "o".
        # (L'ancien scraping HTML ne marche plus depuis la refonte des profils WCA.)
        statuses = ["?", "o"] if recheck_other else ["?"]
        cubeurs = Cubeur.objects.filter(gender__in=statuses)
        total = cubeurs.count()
        self.stdout.write(f"{total} cubeurs à vérifier (genre {' / '.join(statuses)})")

        for i, cubeur in enumerate(cubeurs, start=1):
            gender = self._fetch_gender(cubeur.wca_id)
            if gender is None:
                # échec : on laisse tel quel, réessai à la prochaine exécution
                continue

            if gender != cubeur.gender:
                cubeur.gender = gender
                cubeur.save(update_fields=["gender"])
            self.stdout.write(f"  ✓ {cubeur.first_name} {cubeur.last_name} : {gender} ({i}/{total})")

    def _fetch_gender(self, wca_id):
        """Renvoie "m" / "f" / "o", ou None si l'info n'a pas pu être récupérée."""
        url = f"{WCA_API}/persons/{wca_id}"
        for attempt in range(2):
            try:
                response = requests.get(url, timeout=15)
            except requests.RequestException as e:
                self.stdout.write(f"  ✗ {wca_id} (erreur réseau : {e.__class__.__name__})")
                response = None
            else:
                if response.status_code == 200:
                    break
                self.stdout.write(f"  ✗ {wca_id} (HTTP {response.status_code})")
                if response.status_code != 429:
                    return None
            if attempt == 0:
                time.sleep(RETRY_DELAY)
        else:
            return None

        try:
            gender = response.json()["person"]["gender"]
        except (ValueError, KeyError, TypeError):
            self.stdout.write(f"  ? {wca_id} : réponse API inattendue")
            return None

        if gender not in ("m", "f", "o"):
            self.stdout.write(f"  ? {wca_id} : genre inconnu ({gender!r})")
            return None
        return gender