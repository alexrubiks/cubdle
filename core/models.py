from django.db import models

class User(models.Model):
    wca_id = models.CharField(max_length=10, unique=True)
    pseudo = models.CharField(max_length=30)

    # Compatibilité avec request.user.is_authenticated (DRF / progress.py)
    is_authenticated = True
    is_anonymous = False

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
    # Date du DÉFI joué (et non date à laquelle on a joué)
    date = models.DateField()
    played_at = models.DateTimeField(auto_now_add=True, null=True)
    # Partie jouée en décalé (archive) : hors classement
    is_late = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'game', 'date')
        indexes = [
            models.Index(fields=['game', 'date']),
        ]

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
    avatar_url = models.URLField(null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class CubeurRanking(models.Model):
    cubeur = models.ForeignKey(Cubeur, on_delete=models.CASCADE, related_name='rankings')
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    result_type = models.CharField(choices=[('single', 'Single'), ('average', 'Average')])
    score = models.IntegerField(default=-1)
    national_rank = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('cubeur', 'event', 'result_type')
        indexes = [
            models.Index(fields=['cubeur', 'event', 'result_type']),
        ]

    def __str__(self):
        return f"{self.cubeur} est classé {self.national_rank} au {self.event} ({self.result_type})"


class Competition(models.Model):
    wca_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    date_from = models.DateField(null=True)
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
    best = models.IntegerField(default=-1)
    average = models.IntegerField(default=-1)  # -1 si pas de moyenne

    class Meta:
        unique_together = ('competition', 'cubeur', 'event')
        indexes = [
            models.Index(fields=['competition', 'event']),
        ]

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
    

class DailyChallenge(models.Model):
    date = models.DateField(primary_key=True)
    
    # Jeu 1 - Devine le cubeur
    cubeur = models.ForeignKey(Cubeur, on_delete=models.SET_NULL, null=True, related_name='daily_cubeur')
    
    # Jeu 2 - Devine la compet
    competition = models.ForeignKey(Competition, on_delete=models.SET_NULL, null=True, related_name='daily_competition')
    
    # Jeu 3 - Devine le classement
    ranking_cubeur = models.ForeignKey(Cubeur, on_delete=models.SET_NULL, null=True, related_name='daily_ranking')
    ranking_event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True)
    ranking_result_type = models.CharField(max_length=10, default="average")
    # Réponse figée à la génération (le classement national évolue à chaque import)
    ranking_answer_rank = models.IntegerField(null=True, blank=True)
    ranking_answer_score = models.IntegerField(null=True, blank=True)
    # Nb de personnes ex æquo à ce rang (le groupe occupe les places rang..rang+n-1)
    ranking_answer_tie_count = models.IntegerField(null=True, blank=True)

    # Devine le NR (maj de décembre)
    nr_record = models.ForeignKey(
        "NationalRecord", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    
    # Jeu 4 - Devine le podium
    podium_competition = models.ForeignKey(Competition, on_delete=models.SET_NULL, null=True, related_name='daily_podium')
    podium_event = models.ForeignKey(Event, on_delete=models.SET_NULL, null=True, related_name='daily_podium_event')
    
    # Jeu 5 - Devine la localisation
    location_competition = models.ForeignKey(Competition, on_delete=models.SET_NULL, null=True, related_name='daily_location')

    def __str__(self):
        return f"Défis du {self.date}"
    

class DailyProgress(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
    )

    date = models.DateField()

    cubeur_guesses = models.JSONField(default=list)
    compet_guesses = models.JSONField(default=list)
    ranking_guesses = models.JSONField(default=list)
    podium_guesses = models.JSONField(default=list)
    location_guess = models.JSONField(default=dict)
    nr_guesses = models.JSONField(default=list)

    cubeur_latest_hint = models.JSONField(default=None, null=True)
    compet_latest_hint = models.JSONField(default=None, null=True)
    podium_latest_hint = models.JSONField(default=dict)
    nr_latest_hint = models.JSONField(default=None, null=True)

    cubeur_done = models.BooleanField(default=False)
    compet_done = models.BooleanField(default=False)
    ranking_done = models.BooleanField(default=False)
    podium_done = models.BooleanField(default=False)
    location_done = models.BooleanField(default=False)
    nr_done = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'date')
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

class NationalRecord(models.Model):
    """
    Record de France (NR, ou ER/WR établi par un·e Français·e), actuel ou historique.
    Importé depuis l'export officiel WCA (commande import_nr_history), jamais modifié
    ni supprimé par l'import : les corrections manuelles faites dans l'admin sont conservées.
    """
    RECORD_TYPES = [("single", "Single"), ("average", "Average")]

    wca_id = models.CharField(max_length=10, db_index=True)
    name = models.CharField(max_length=100)
    # Épreuve en texte (et non FK vers Event) pour inclure les épreuves disparues
    event_id = models.CharField(max_length=10)
    event_name = models.CharField(max_length=60)
    record_type = models.CharField(max_length=10, choices=RECORD_TYPES)
    # Valeur brute WCA (centisecondes, nb de coups ×100 pour la moyenne FMC, encodage MBLD…)
    value = models.IntegerField()
    # Marquage d'origine dans l'export : NR, ER ou WR
    record_tag = models.CharField(max_length=3, default="NR")
    competition_id = models.CharField(max_length=64)
    competition_name = models.CharField(max_length=200)
    date = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["wca_id", "event_id", "record_type", "value", "competition_id"],
                name="unique_national_record",
            )
        ]
        indexes = [models.Index(fields=["event_id", "record_type"])]
        ordering = ["event_id", "record_type", "date"]

    def __str__(self):
        return f"{self.event_id} {self.record_type} {self.value} — {self.name} ({self.date})"

    @property
    def is_current(self):
        """NR encore en vigueur (meilleure valeur de l'épreuve, ex æquo compris)."""
        best = (
            NationalRecord.objects
            .filter(event_id=self.event_id, record_type=self.record_type)
            .aggregate(models.Min("value"))["value__min"]
        )
        return self.value == best
