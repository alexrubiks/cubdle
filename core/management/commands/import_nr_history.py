"""
Import de l'historique des records de France depuis l'export officiel WCA.

- Télécharge l'export TSV (≈ 350 Mo zippé) dans un fichier temporaire,
  puis lit les tables en flux (jamais chargées entièrement en mémoire).
- Garde les résultats des Français·es marqués NR / ER / WR (un ER ou un WR
  établi par un·e Français·e est aussi un record de France).
- Exclut les épreuves qui n'ont fait que changer de format (333mbo).
- N'AJOUTE que les records manquants : rien n'est modifié ni supprimé,
  les corrections manuelles faites dans l'admin sont conservées.

Usage :
    python manage.py import_nr_history                 # import complet
    python manage.py import_nr_history --weekly        # seulement le mercredi (ou si la table est vide)
    python manage.py import_nr_history --file export.zip   # depuis un export déjà téléchargé
"""
import csv
import io
import os
import re
import sys
import tempfile
import zipfile
from datetime import date

import requests
from django.core.management.base import BaseCommand, CommandError

from core.dates import today as paris_today
from core.models import NationalRecord

EXPORT_API_URL = "https://www.worldcubeassociation.org/api/v0/export/public"
EXPORT_FALLBACK_URL = "https://www.worldcubeassociation.org/export/results/v2/tsv"

COUNTRY = "France"
RECORD_TAGS = {"NR", "ER", "WR"}
EXCLUDED_EVENTS = {"333mbo"}  # ancien format du multi-blind
WEDNESDAY = 2

csv.field_size_limit(sys.maxsize)


def snake(name):
    """regionalSingleRecord -> regional_single_record (compatibilité export v1)."""
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def table_name(filename):
    """'WCA_export_results.tsv' / 'WCA_export_Results.tsv' -> 'results'."""
    base = os.path.basename(filename)
    base = re.sub(r"\.tsv$", "", base, flags=re.I)
    base = re.sub(r"^wca_export_", "", base, flags=re.I)
    return snake(base)


def iter_table(archive, wanted):
    """Itère sur les lignes (dict, clés en snake_case) d'une table de l'export."""
    member = next((n for n in archive.namelist() if table_name(n) == wanted), None)
    if member is None:
        raise CommandError(f"Table '{wanted}' introuvable dans l'export ({archive.namelist()})")

    with archive.open(member) as raw:
        reader = csv.reader(io.TextIOWrapper(raw, encoding="utf-8"), delimiter="\t", quoting=csv.QUOTE_NONE)
        header = [snake(h) for h in next(reader)]
        for row in reader:
            yield dict(zip(header, row))


def competition_date(row):
    if row.get("start_date"):
        return date.fromisoformat(row["start_date"][:10])
    return date(int(row["year"]), int(row["month"]), int(row["day"]))


class Command(BaseCommand):
    help = "Importe l'historique des records de France depuis l'export WCA."

    def add_arguments(self, parser):
        parser.add_argument("--weekly", action="store_true",
                            help="Ne fait rien sauf le mercredi (heure de Paris) ou si aucun NR n'est encore importé.")
        parser.add_argument("--file", type=str, default=None,
                            help="Chemin d'un export TSV zippé déjà téléchargé.")
        parser.add_argument("--dry-run", action="store_true",
                            help="Affiche ce qui serait importé, sans rien écrire.")

    def handle(self, *args, **options):
        if options["weekly"]:
            table_empty = not NationalRecord.objects.exists()
            if paris_today().weekday() != WEDNESDAY and not table_empty:
                self.stdout.write("import_nr_history : pas mercredi, rien à faire.")
                return

        if options["file"]:
            self._import(options["file"], options["dry_run"])
            return

        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "wca_export.tsv.zip")
            self._download(path)
            self._import(path, options["dry_run"])

    # ── Téléchargement ──────────────────────────────────────────────

    def _download(self, path):
        url = EXPORT_FALLBACK_URL
        try:
            meta = requests.get(EXPORT_API_URL, timeout=30).json()
            url = meta.get("tsv_url") or url
            self.stdout.write(f"Export WCA du {meta.get('export_date')} (version {meta.get('export_version')})")
        except (requests.RequestException, ValueError):
            self.stdout.write("API d'export indisponible, utilisation du lien permanent.")

        self.stdout.write(f"Téléchargement de {url} …")
        with requests.get(url, stream=True, timeout=60) as response:
            response.raise_for_status()
            size = 0
            with open(path, "wb") as f:
                for chunk in response.iter_content(chunk_size=1 << 20):
                    f.write(chunk)
                    size += len(chunk)
        self.stdout.write(f"  {size / 1e6:.0f} Mo téléchargés.")

    # ── Import ──────────────────────────────────────────────────────

    def _import(self, path, dry_run):
        with zipfile.ZipFile(path) as archive:
            # 1) Résultats : on ne garde que les records français
            found = []
            for row in iter_table(archive, "results"):
                if row.get("person_country_id") != COUNTRY:
                    continue
                if row.get("event_id") in EXCLUDED_EVENTS:
                    continue
                for record_type, value_col, tag_col in (
                    ("single", "best", "regional_single_record"),
                    ("average", "average", "regional_average_record"),
                ):
                    tag = (row.get(tag_col) or "").strip()
                    if tag in RECORD_TAGS:
                        found.append({
                            "wca_id": row["person_id"],
                            "name": row["person_name"],
                            "event_id": row["event_id"],
                            "record_type": record_type,
                            "value": int(row[value_col]),
                            "record_tag": tag,
                            "competition_id": row["competition_id"],
                        })

            self.stdout.write(f"{len(found)} records français trouvés dans l'export.")

            comp_ids = {r["competition_id"] for r in found}
            event_ids = {r["event_id"] for r in found}
            person_ids = {r["wca_id"] for r in found}

            # 2) Compétitions, épreuves et noms actuels des personnes
            competitions = {
                row["id"]: (row["name"], competition_date(row))
                for row in iter_table(archive, "competitions")
                if row["id"] in comp_ids
            }
            events = {
                row["id"]: row["name"]
                for row in iter_table(archive, "events")
                if row["id"] in event_ids
            }
            names = {}
            for row in iter_table(archive, "persons"):
                wca_id = row.get("wca_id") or row.get("id")
                sub_id = row.get("sub_id") or row.get("subid") or "1"
                if wca_id in person_ids and sub_id == "1":
                    names[wca_id] = row["name"]

        # 3) Ajout des records manquants uniquement
        existing = set(NationalRecord.objects.values_list(
            "wca_id", "event_id", "record_type", "value", "competition_id"
        ))
        to_create = []
        for r in found:
            key = (r["wca_id"], r["event_id"], r["record_type"], r["value"], r["competition_id"])
            if key in existing:
                continue
            existing.add(key)
            comp_name, comp_date = competitions[r["competition_id"]]
            to_create.append(NationalRecord(
                **{**r, "name": names.get(r["wca_id"], r["name"])},
                event_name=events.get(r["event_id"], r["event_id"]),
                competition_name=comp_name,
                date=comp_date,
            ))

        to_create.sort(key=lambda nr: (nr.date, nr.event_id))
        for nr in to_create[-15:]:
            self.stdout.write(f"  + {nr.date} {nr.event_id} {nr.record_type} {nr.value} — {nr.name} ({nr.competition_name})")

        if dry_run:
            self.stdout.write(self.style.WARNING(f"[dry-run] {len(to_create)} records seraient ajoutés."))
            return

        NationalRecord.objects.bulk_create(to_create, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(
            f"{len(to_create)} records ajoutés ({NationalRecord.objects.count()} au total)."
        ))
