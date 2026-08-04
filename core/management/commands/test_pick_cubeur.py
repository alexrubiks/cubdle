import random
from collections import Counter

from django.core.management.base import BaseCommand

from core.models import Cubeur
from core.management.commands.generate_daily_challenge import Command as GenerateDailyChallenge


class Command(BaseCommand):
    help = "Teste la distribution de _pick_cubeur : top 150 par score + simulation de tirages"

    def add_arguments(self, parser):
        parser.add_argument(
            "--n", type=int, default=100,
            help="Nombre de tirages à simuler (défaut: 100)",
        )
        parser.add_argument(
            "--ignore-recent", action="store_true",
            help="Ignore l'exclusion des cubeurs tirés récemment (teste la pondération pure)",
        )

    def handle(self, *args, **options):
        gen = GenerateDailyChallenge()
        n = options["n"]

        # --- Top 150 par score ---
        cubeurs = list(Cubeur.objects.filter(is_active=True))
        scored = [(c, gen._cubeur_weight(c)) for c in cubeurs]
        scored.sort(key=lambda x: x[1], reverse=True)

        self.stdout.write(self.style.SUCCESS(
            f"\n=== Top 150 cubeurs par score ({len(scored)} actifs au total) ===\n"
        ))
        for i, (c, score) in enumerate(scored[:150], start=1):
            self.stdout.write(f"{i:>3}. {c.first_name} {c.last_name:<25} score={score:.2f}")

        # --- Simulation de n tirages ---
        self.stdout.write(self.style.SUCCESS(
            f"\n=== Simulation de {n} tirages via _pick_cubeur (avec remise) ===\n"
        ))

        if options["ignore_recent"]:
            # Pondération pure, sans exclusion des cubeurs récents (bypass la requête DailyChallenge)
            weights = [gen._cubeur_weight(c) for c in cubeurs]

            def pick_fn():
                return random.choices(cubeurs, weights=weights, k=1)[0]
        else:
            pick_fn = gen._pick_cubeur

        results = Counter()
        for _ in range(n):
            c = pick_fn()
            results[f"{c.first_name} {c.last_name}"] += 1

        for name, count in results.most_common():
            bar = "█" * count
            self.stdout.write(f"{count:>3}x  {name:<25} {bar}")

        self.stdout.write(self.style.SUCCESS(
            f"\n{len(results)} cubeurs distincts tirés sur {n} tirages.\n"
        ))