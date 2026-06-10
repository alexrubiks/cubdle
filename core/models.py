from django.db import models


class User(models.Model):
    wca_id = models.CharField(max_length=10, unique=True)
    pseudo = models.CharField(max_length=200)


class Game(models.Model):
    slug = models.CharField(max_length=20, unique=True)  # "cuber", "compet", etc.
    name = models.CharField(max_length=100)


class Score(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    score = models.IntegerField()
    date = models.DateField(auto_now_add=True)


class Event(models.Model):
    slug = models.CharField(max_length=10, unique=True)  # "333", "222", "pyram"
    name = models.CharField(max_length=50)               # "3x3x3", "2x2x2"
    has_avg = models.BooleanField(default=True)          # False pour multiblind


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


class CubeurRanking(models.Model):
    cubeur = models.ForeignKey(Cubeur, on_delete=models.CASCADE, related_name='rankings')
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    result_type = models.CharField(max_length=6, choices=[('single', 'Single'), ('avg', 'Average')])
    rank = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('cubeur', 'event', 'result_type')


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


class ChampionshipResult(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    cubeur = models.ForeignKey(Cubeur, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    position = models.IntegerField()

    class Meta:
        unique_together = ('competition', 'cubeur', 'event')