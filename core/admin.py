from django.contrib import admin
from .models import (
    User, Game, Score,
    Event, Cubeur, CubeurRanking,
    Competition, ChampionshipResult,
    CubeurNationalityException
)

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("wca_id", "pseudo")
    search_fields = ("wca_id", "pseudo")


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("slug", "name")
    search_fields = ("slug", "name")


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display = ("user", "game", "score", "date")
    list_filter = ("game", "date")
    search_fields = ("user__pseudo", "user__wca_id", "game__name")
    autocomplete_fields = ("user", "game")


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "has_avg")
    list_filter = ("has_avg",)
    search_fields = ("slug", "name")


@admin.register(Cubeur)
class CubeurAdmin(admin.ModelAdmin):
    list_display = (
        "wca_id",
        "first_name",
        "last_name",
        "is_active",
        "wca_year",
        "competition_count",
        "gold_count",
        "silver_count",
        "bronze_count",
        "avatar_url",
    )

    list_filter = ("is_active", "gender", "wca_year")
    search_fields = ("wca_id", "first_name", "last_name")
    ordering = ("-competition_count",)

    list_editable = ("is_active",)

    fieldsets = (
        ("Identity", {
            "fields": ("wca_id", "first_name", "last_name", "gender")
        }),
        ("Stats", {
            "fields": (
                "wca_year",
                "competition_count",
                "gold_count",
                "silver_count",
                "bronze_count",
                "is_active"
            )
        }),
    )


@admin.register(CubeurRanking)
class CubeurRankingAdmin(admin.ModelAdmin):
    list_display = ("cubeur", "event", "result_type", "national_rank")
    list_filter = ("event", "result_type")
    search_fields = ("cubeur__wca_id", "cubeur__first_name", "cubeur__last_name")
    autocomplete_fields = ("cubeur", "event")


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "wca_id",
        "year",
        "month",
        "day_count",
        "participant_count",
        "is_championship",
    )

    list_filter = ("year", "is_championship", "events")
    search_fields = ("name", "wca_id")

    filter_horizontal = ("events",)

    fieldsets = (
        ("Info", {
            "fields": ("wca_id", "name", "year", "month", "day_count")
        }),
        ("Stats", {
            "fields": ("participant_count", "is_championship")
        }),
        ("Location", {
            "fields": ("latitude", "longitude")
        }),
        ("Relations", {
            "fields": ("events", "organizers", "delegates")
        }),
    )


@admin.register(ChampionshipResult)
class ChampionshipResultAdmin(admin.ModelAdmin):
    list_display = ("competition", "cubeur", "event", "position", "best", "average")
    list_filter = ("event", "competition")
    search_fields = ("cubeur__wca_id", "cubeur__first_name", "competition__name")
    autocomplete_fields = ("competition", "cubeur", "event")


@admin.register(CubeurNationalityException)
class CubeurNationalityExceptionAdmin(admin.ModelAdmin):
    list_display = ("cubeur", "country", "year_from", "year_until")