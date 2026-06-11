from django.db import models


class User(models.Model):
    wca_id = models.CharField(max_length=10, unique=True)
    pseudo = models.CharField(max_length=200)

    def __str__(self):
        return self.pseudo


class Game(models.Model):
    slug = models.CharField(max_length=20, unique=True)  # "cuber", "compet", etc.
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Score(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    score = models.IntegerField()
    date = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'game', 'date')

    def __str__(self):
        return f"{self.user} a obtenu un score de {self.score} au jeu {self.game}"


class Event(models.Model):
    slug = models.CharField(max_length=10, unique=True)  # "333", "222", "pyram"
    name = models.CharField(max_length=50)               # "3x3x3", "2x2x2"
    has_avg = models.BooleanField(default=True)          # False pour multiblind

    def __str__(self):
        return self.name


class Cubeur(models.Model):
    wca_id = models.CharField(max_length=10, unique=True)
    is_active = models.BooleanField(default=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, default='?', choices=[('m', 'Male'), ('f', 'Female'), ('o', 'Other'), ('?', 'Unknown')])
    wca_year = models.IntegerField()
    competition_count = models.IntegerField(default=0)
    gold_count = models.IntegerField(default=0)
    silver_count = models.IntegerField(default=0)
    bronze_count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class CubeurRanking(models.Model):
    cubeur = models.ForeignKey(Cubeur, on_delete=models.CASCADE, related_name='rankings')
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    result_type = models.CharField(choices=[('single', 'Single'), ('average', 'Average')])
    national_rank = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('cubeur', 'event', 'result_type')

    def __str__(self):
        return f"{self.cubeur} est classé {self.national_rank} au {self.event}"


class Competition(models.Model):
    wca_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    month = models.CharField(max_length=20)
    year = models.CharField(max_length=20)
    day_count = models.IntegerField()
    participant_count = models.IntegerField(default=-1)
    latitude = models.FloatField()
    longitude = models.FloatField()
    is_championship = models.BooleanField(default=False)
    events = models.ManyToManyField(Event)
    organizers = models.JSONField(default=list)  # ["Nom Prénom", "Nom Prénom"]
    delegates = models.JSONField(default=list)

    def __str__(self):
        return self.name


class ChampionshipResult(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    cubeur = models.ForeignKey(Cubeur, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    position = models.IntegerField()
    score = models.IntegerField(default=-1)

    class Meta:
        unique_together = ('competition', 'cubeur', 'event')

    def __str__(self):
        return f"{self.cubeur} a terminé en {self.position} position au {self.event} à la compétition {self.competition}"


class CubeurNationalityException(models.Model):
    cubeur = models.ForeignKey(Cubeur, on_delete=models.CASCADE)
    country = models.CharField(max_length=2)  # "FR"
    # les valeurs dans year_from et year_until sont incluantes
    year_from = models.IntegerField(null=True, blank=True)  # None = depuis toujours
    year_until = models.IntegerField(null=True, blank=True)  # None = jusqu'à aujourd'hui
    
    class Meta:
        verbose_name = "Exception de nationalité"

    def __str__(self):
        return f"{self.cubeur} a été {self.country} de {self.year_from if self.year_from else 'ses débuts'} à {self.year_until if self.year_until else 'aujourd\'hui'}"