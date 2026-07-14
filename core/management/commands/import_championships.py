from django.core.management.base import BaseCommand
import requests
from core.models import Competition, ChampionshipResult, Cubeur, Event, CubeurNationalityException
import time
import re
from contextlib import contextmanager

SINGLE_ONLY_EVENTS = {"333bf", "444bf", "555bf", "333mbf"}

@contextmanager
def timer(label, stdout):
    start = time.time()
    yield
    end = time.time()
    stdout.write(f"{label}: {end - start:.2f}s")

class Command(BaseCommand):
    help = "Importe les résultats des finales de championnats FR"

    def handle(self, *args, **kwargs):
        self.events = {e.slug: e for e in Event.objects.all()}
        self.cubeurs = {c.wca_id: c for c in Cubeur.objects.all()}
        self.fr_cache = {}
        self.exceptions = {}
        for e in CubeurNationalityException.objects.all():
            self.exceptions[e.cubeur.wca_id] = e

        # (competition_id, event_id) déjà importés = jamais retouchés
        self.done_pairs = set(
            ChampionshipResult.objects.values_list('competition_id', 'event_id')
        )

        championships = Competition.objects.filter(is_championship=True)
        self.stdout.write(f"{championships.count()} championnats trouvés, import en cours...")

        total = championships.count()
        skipped_events = 0

        for i, championship in enumerate(championships, start=1):
            skipped_events += self._import_championship(championship)

            self.stdout.write(
                f"\rImport championnats : {i}/{total}",
                ending=""
            )
            self.stdout.flush()
        self.stdout.write("")

        self.stdout.write(f"{skipped_events} épreuves déjà en base ignorées.")
        self.stdout.write(self.style.SUCCESS("Import terminé !"))

    def _is_fr(self, wca_id, competition_year):
        start = time.time()

        # Exception manuelle connue
        if wca_id in self.exceptions:
            ex = self.exceptions[wca_id]
            year_ok = (ex.year_from is None or competition_year >= ex.year_from)
            year_ok = year_ok and (ex.year_until is None or competition_year <= ex.year_until)
            result = ex.country == "FR" and year_ok
            self.fr_cache[wca_id] = result
            return result

        # Cache
        if wca_id in self.fr_cache:
            return self.fr_cache[wca_id]

        # Cubeurs déjà en base = FR actif
        if wca_id in self.cubeurs:
            self.fr_cache[wca_id] = True
            return True

        # Appel API
        response = requests.get(
            f"https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/persons/{wca_id}.json"
        )
        if response.status_code != 200:
            self.fr_cache[wca_id] = False
            return False

        is_fr = response.json().get("country") == "FR"
        self.fr_cache[wca_id] = is_fr
        self.stdout.write(f"_is_fr {wca_id}: {time.time() - start:.2f}s")
        return is_fr

    def _import_championship(self, competition):
        competition_year = int(re.search(r'\d{4}', competition.wca_id).group())
        skipped = 0

        for event in competition.events.all():
            # Épreuve déjà importée pour ce championnat -> les résultats d'un
            # championnat passé ne changent jamais, pas besoin de rappeler l'API
            if (competition.id, event.id) in self.done_pairs:
                skipped += 1
                continue

            response = requests.get(
                f"https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/results/{competition.wca_id}/{event.slug}.json"
            )
            if response.status_code != 200:
                continue

            data = response.json()

            # Finalistes de CET event uniquement
            use_single = event.slug in SINGLE_ONLY_EVENTS

            finalists = [
                (r["personId"], r["best"], r["average"])
                for r in data["items"]
                if r["round"] == "Final"
            ]

            fr_finalists = [
                (person_id, best, average) for person_id, best, average in finalists
                if self._is_fr(person_id, competition_year)
            ]

            for new_position, (person_id, best, average) in enumerate(fr_finalists, start=1):
                cubeur = self._get_or_create_cubeur(person_id)
                if cubeur is None:
                    continue

                ChampionshipResult.objects.update_or_create(
                    competition=competition,
                    cubeur=cubeur,
                    event=self.events[event.slug],
                    defaults={
                        "position": new_position,
                        "best": best,
                        "average": average,
                    }
                )

                self.stdout.write(
                    f"{cubeur.first_name} {cubeur.last_name} : {new_position} au {self.events[event.slug].slug} à {competition_year} ({best}, {average})"
                )

        return skipped

    def _get_or_create_cubeur(self, wca_id):
        start = time.time()

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

        self.stdout.write(f"_get_or_create_cubeur {wca_id}: {time.time() - start:.2f}s")

        return cubeur