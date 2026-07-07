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


class CompetitionSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = ['id', 'wca_id', 'name']


class ChampionshipResultSerializer(serializers.ModelSerializer):
    cubeur = CubeurSearchSerializer()
    event = EventSerializer()
    class Meta:
        model = ChampionshipResult
        fields = ['cubeur', 'event', 'position', 'best', 'average']


class DailyChallengeSerializer(serializers.ModelSerializer):
    """Serializer public — ne spoile pas les réponses"""
    ranking_event = EventSerializer(read_only=True)
    podium_event = EventSerializer(read_only=True)
    podium_year = serializers.SerializerMethodField()
    location_competition_name = serializers.SerializerMethodField()
    ranking_cubeur = serializers.SerializerMethodField()

    class Meta:
        model = DailyChallenge
        fields = [
            'date',
            'ranking_cubeur', 'ranking_event',
            'ranking_result_type',
            'podium_year', 'podium_event',
            'location_competition_name',
        ]

    def get_podium_year(self, obj):
        return obj.podium_competition.year if obj.podium_competition else None

    def get_location_competition_name(self, obj):
        return obj.location_competition.name if obj.location_competition else None

    def get_ranking_cubeur(self, obj):
        if not obj.ranking_cubeur:
            return None
        return {
            'name': f"{obj.ranking_cubeur.first_name} {obj.ranking_cubeur.last_name}",
            'wca_id': obj.ranking_cubeur.wca_id,
            'avatar_url': obj.ranking_cubeur.avatar_url,
        }
