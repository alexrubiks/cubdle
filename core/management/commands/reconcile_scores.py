"""
Liste (et répare avec --apply) les jeux « terminés » dans DailyProgress sans Score.

    python manage.py reconcile_scores            # lecture seule : liste les cas
    python manage.py reconcile_scores --apply    # crée les Score manquants

L'heure réelle de ces anciennes parties est inconnue : les scores réparés sont
créés « en retard » (hors classement du jour, hors série), sauf pour aujourd'hui.
Jamais de modification ni de suppression d'un score existant.
"""
from collections import Counter

from django.core.management.base import BaseCommand
from django.db.models import Q

from core.dates import ARCHIVE_START
from core.models import DailyProgress
from core.score_repair import DONE_FIELD, repair_old_progress


class Command(BaseCommand):
    help = "Crée les Score manquants pour les jeux terminés dans DailyProgress."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Écrit en base (sinon : lecture seule).")

    def handle(self, *args, **opts):
        apply = opts["apply"]
        any_done = Q()
        for field in DONE_FIELD.values():
            any_done |= Q(**{field: True})

        rows = (
            DailyProgress.objects.filter(any_done, date__gte=ARCHIVE_START)
            .select_related("user").order_by("date", "user_id")
        )

        fixed, skipped = Counter(), Counter()
        for progress in rows.iterator():
            for slug, value, reason in repair_old_progress(progress, apply=apply):
                who = getattr(progress.user, "pseudo", progress.user_id)
                if reason:
                    skipped[slug] += 1
                    self.stdout.write(f"  ignoré  {progress.date} {who} {slug} : {reason}")
                else:
                    fixed[slug] += 1
                    self.stdout.write(f"  {'créé' if apply else 'à créer'}  {progress.date} {who} {slug} = {value}")

        verb = "créés" if apply else "à créer (lecture seule, relancer avec --apply)"
        self.stdout.write(self.style.SUCCESS(
            f"{sum(fixed.values())} score(s) {verb} {dict(fixed)} ; {sum(skipped.values())} ignoré(s) {dict(skipped)}"
        ))
