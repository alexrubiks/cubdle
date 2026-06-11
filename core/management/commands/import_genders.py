from django.core.management.base import BaseCommand
import csv
from core.models import Cubeur

class Command(BaseCommand):
    help = "Importe les genres depuis le TSV WCA export"

    def add_arguments(self, parser):
        parser.add_argument('filepath', type=str, help="Chemin vers WCA_export_persons.tsv")

    def handle(self, *args, **kwargs):
        filepath = kwargs['filepath']
        
        wca_ids = set(Cubeur.objects.filter(gender='?').values_list('wca_id', flat=True))
        self.stdout.write(f"{len(wca_ids)} cubeurs sans genre trouvés")

        updated = 0
        with open(filepath, encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for row in reader:
                if row['wca_id'] not in wca_ids:
                    continue
                gender = row['gender']
                if gender not in ('m', 'f', 'o'):
                    gender = '?'
                Cubeur.objects.filter(wca_id=row['wca_id']).update(gender=gender)
                wca_ids.discard(row['wca_id'])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"{updated} genres mis à jour !"))