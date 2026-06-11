from django.core.management.base import BaseCommand
from core.models import Competition

class Command(BaseCommand):
    help = "Importe les résultats des finales de championnats FR"

    def handle(self, *args, **kwargs):
        self._display_podiums()

    def decode_mbf(self, value):
        manques = value % 100
        secondes = (value % 10000000) // 100
        points = 99 - (value // 10000000)
        resolus = points + manques
        tentes = resolus + manques
        minutes, secs = divmod(secondes, 60)
        return f"{resolus}/{tentes} {minutes}:{secs:02d}"

    def _display_podiums(self):
        from core.models import ChampionshipResult
        
        championships = Competition.objects.filter(
            is_championship=True
        ).order_by('year')
        
        for championship in championships:
            self.stdout.write(f"\n{'='*50}")
            self.stdout.write(f"{championship.name} ({championship.year})")
            self.stdout.write(f"{'='*50}")
            
            for event in championship.events.all():
                results = ChampionshipResult.objects.filter(
                    competition=championship,
                    event=event
                ).order_by('position')[:3]
                
                if not results:
                    continue
                
                self.stdout.write(f"\n  {event.name}")
                for result in results:
                    # Multi
                    if event.slug == "333mbf":
                        self.stdout.write(
                            f"    {result.position}. {result.cubeur.first_name} {result.cubeur.last_name} ({self.decode_mbf(result.best)})"
                        )
                    
                    # Normal
                    else :
                        self.stdout.write(
                            f"    {result.position}. {result.cubeur.first_name} {result.cubeur.last_name} ({result.average}, {result.best})"
                        )