from django.core.management.base import BaseCommand
from core.models import Event, Game


EVENTS = [
    ("333mbf", "3x3x3 Multi-Blind", False),
    ("555bf", "5x5x5 Blindfolded", True),
    ("444bf", "4x4x4 Blindfolded", True),
    ("sq1", "Square-1", True),
    ("skewb", "Skewb", True),
    ("pyram", "Pyraminx", True),
    ("minx", "Megaminx", True),
    ("clock", "Clock", True),
    ("333oh", "3x3x3 One-Handed", True),
    ("333fm", "3x3x3 Fewest Moves", True),
    ("333bf", "3x3x3 Blindfolded", True),
    ("777", "7x7x7 Cube", True),
    ("666", "6x6x6 Cube", True),
    ("555", "5x5x5 Cube", True),
    ("444", "4x4x4 Cube", True),
    ("222", "2x2x2 Cube", True),
    ("333", "3x3x3 Cube", True),
]

GAMES = [
    ("location", "Devine la localisation"),
    ("podium", "Devine le podium"),
    ("ranking", "Devine le classement"),
    ("compet", "Devine la compet"),
    ("cubeur", "Devine le cubeur"),
]


class Command(BaseCommand):
    help = "Peuple les tables Event et Game avec les valeurs de référence"

    def handle(self, *args, **kwargs):
        for slug, name, has_avg in EVENTS:
            event, created = Event.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "has_avg": has_avg},
            )
            self.stdout.write(
                f"{'Créé' if created else 'Mis à jour'} : {event.slug} ({event.name})"
            )

        for slug, name in GAMES:
            game, created = Game.objects.update_or_create(
                slug=slug,
                defaults={"name": name},
            )
            self.stdout.write(
                f"{'Créé' if created else 'Mis à jour'} : {game.slug} ({game.name})"
            )

        self.stdout.write(self.style.SUCCESS("Seed terminé !"))