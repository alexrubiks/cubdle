from django.core.management.base import BaseCommand
import requests
from core.models import Competition


class Command(BaseCommand):
    help = "Supprime les compétitions déjà en base qui sont en fait annulées (recroise avec l'API)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="N'affiche que ce qui serait supprimé, sans rien supprimer",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        self.stdout.write("Récupération des compétitions FR depuis l'API...")
        response = requests.get(
            "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/competitions/FR.json"
        )
        data = response.json()

        cancelled_ids = {
            comp["id"] for comp in data["items"] if comp.get("isCanceled")
        }

        to_delete = Competition.objects.filter(wca_id__in=cancelled_ids)
        count = to_delete.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("Aucune compétition annulée trouvée en base."))
            return

        self.stdout.write(f"{count} compétition(s) annulée(s) trouvée(s) en base :")
        for comp in to_delete:
            self.stdout.write(f"  - {comp.wca_id} ({comp.name})")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run : rien n'a été supprimé."))
            return

        deleted_count, deleted_details = to_delete.delete()
        self.stdout.write(self.style.SUCCESS(f"{count} compétition(s) supprimée(s)."))
        for model, n in deleted_details.items():
            if n:
                self.stdout.write(f"  ↳ {model} : {n} ligne(s) supprimée(s) en cascade")