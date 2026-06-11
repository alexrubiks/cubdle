from django.core.management.base import BaseCommand
import requests
from bs4 import BeautifulSoup
from core.models import Competition, Cubeur

class Command(BaseCommand):
    help = "Scrape les données manquantes (participant_count et gender)"

    def handle(self, *args, **kwargs):
        self._scrape_participant_counts()
        self._scrape_genders()
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

    def _scrape_genders(self):
        cubeurs = Cubeur.objects.filter(gender="?")
        total = cubeurs.count()
        self.stdout.write(f"{total} cubeurs sans genre")

        for i, cubeur in enumerate(cubeurs, start=1):
            response = requests.get(
                f"https://www.worldcubeassociation.org/persons/{cubeur.wca_id}",
                headers={"Accept-Language": "fr"}
            )
            if response.status_code != 200:
                self.stdout.write(f"  ✗ {cubeur.wca_id} (HTTP {response.status_code})")
                continue

            soup = BeautifulSoup(response.text, "html.parser")
            table = soup.find("table")
            if not table:
                self.stdout.write(f"  ? {cubeur.wca_id} : tableau introuvable")
                continue

            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            cells = [td.get_text(strip=True) for td in table.find("tbody").find("td").parent.find_all("td")]

            if "Genre" not in headers:
                # colonne absente = other
                gender = "o"
            else:
                genre_index = headers.index("Genre")
                raw = cells[genre_index].lower()
                if "homme" in raw:
                    gender = "m"
                elif "femme" in raw:
                    gender = "f"
                else:
                    gender = "?"

            cubeur.gender = gender
            cubeur.save(update_fields=["gender"])
            self.stdout.write(f"  ✓ {cubeur.first_name} {cubeur.last_name} : {gender} ({i}/{total})")