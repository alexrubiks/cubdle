from django.core.management.base import BaseCommand
from core.models import Cubeur, CubeurNationalityException


# (prénom, nom, country, year_from, year_until)
EXCEPTIONS = [
    ("Eden", "Robinson-Rechavi", "FR", None, 2023),
]


class Command(BaseCommand):
    help = "Peuple la table CubeurNationalityException avec les valeurs de référence"

    def handle(self, *args, **kwargs):
        for first_name, last_name, country, year_from, year_until in EXCEPTIONS:
            try:
                cubeur = Cubeur.objects.get(
                    first_name=first_name,
                    last_name=last_name,
                )
            except Cubeur.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"Cubeur introuvable : {first_name} {last_name} (vérifie l'orthographe ou importe-le d'abord)"
                    )
                )
                continue
            except Cubeur.MultipleObjectsReturned:
                self.stdout.write(
                    self.style.ERROR(
                        f"Plusieurs cubeurs trouvés pour {first_name} {last_name}, résous l'ambiguïté manuellement"
                    )
                )
                continue

            exception, created = CubeurNationalityException.objects.update_or_create(
                cubeur=cubeur,
                country=country,
                year_from=year_from,
                year_until=year_until,
            )
            self.stdout.write(
                f"{'Créé' if created else 'Déjà existant'} : {exception}"
            )

        self.stdout.write(self.style.SUCCESS("Seed terminé !"))