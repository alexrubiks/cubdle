# core/serializers.py

from rest_framework import serializers
from core.models import Cubeur, CubeurRanking, Competition, Event, ChampionshipResult, DailyChallenge

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['slug', 'name', 'has_avg']

class CubeurRankingSerializer(serializers.ModelSerializer):
    event = EventSerializer()
    class Meta:
        model = CubeurRanking
        fields = ['event', 'result_type', 'national_rank']

class CubeurSerializer(serializers.ModelSerializer):
    rankings = CubeurRankingSerializer(many=True, read_only=True)
    class Meta:
        model = Cubeur
        fields = [
            'id', 'wca_id', 'first_name', 'last_name',
            'gender', 'wca_year', 'competition_count',
            'gold_count', 'silver_count', 'bronze_count',
            'is_active', 'rankings'
        ]

class CubeurSearchSerializer(serializers.ModelSerializer):
    """Serializer léger pour l'autocomplete"""
    class Meta:
        model = Cubeur
        fields = ['id', 'wca_id', 'first_name', 'last_name']

class CompetitionSerializer(serializers.ModelSerializer):
    events = EventSerializer(many=True, read_only=True)
    class Meta:
        model = Competition
        fields = [
            'id', 'wca_id', 'name', 'month', 'year',
            'participant_count', 'events', 'organizers',
            'delegates', 'latitude', 'longitude',
            'is_championship'
        ]

class ChampionshipResultSerializer(serializers.ModelSerializer):
    cubeur = CubeurSearchSerializer()
    event = EventSerializer()
    class Meta:
        model = ChampionshipResult
        fields = ['cubeur', 'event', 'position', 'best', 'average']

class DailyChallengeSerializer(serializers.ModelSerializer):
    """Serializer public — ne spoile pas les réponses"""
    ranking_event = EventSerializer()
    podium_event = EventSerializer()
    podium_year = serializers.SerializerMethodField()

    class Meta:
        model = DailyChallenge
        fields = [
            'date',
            # Jeu 1 - pas d'info, juste l'existence
            # Jeu 2 - pas d'info
            # Jeu 3
            'ranking_cubeur', 'ranking_event',
            # Jeu 4
            'podium_year', 'podium_event',
            # Jeu 5
            'location_competition_name',
        ]

    def get_podium_year(self, obj):
        return obj.podium_competition.year if obj.podium_competition else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Jeu 3 - on expose le nom du cubeur mais pas son classement
        if instance.ranking_cubeur:
            data['ranking_cubeur'] = {
                'name': f"{instance.ranking_cubeur.first_name} {instance.ranking_cubeur.last_name}",
                'wca_id': instance.ranking_cubeur.wca_id,
            }
        # Jeu 5 - juste le nom de la compet
        if instance.location_competition:
            data['location_competition_name'] = instance.location_competition.name
        return data