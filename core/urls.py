from django.urls import path
from core import views

urlpatterns = [
    path("auth/me/", views.me),
    path("auth/wca/login/", views.wca_login),
    path("auth/wca/callback/", views.wca_callback),
    path("auth/update-pseudo/", views.update_pseudo),

    path('daily/', views.daily_challenge),
    path('yesterday/', views.yesterday_challenge),
    path("sync-progress/", views.sync_progress),

    path('guess/cubeur/', views.guess_cubeur),
    path('guess/competition/', views.guess_compet),
    path('guess/ranking/', views.guess_ranking),
    path('guess/podium/', views.guess_podium),
    path('guess/location/', views.guess_location),

    path("cubeurs/<int:pk>/", views.cubeur_detail),
    path("competitions/<int:pk>/", views.competition_detail),

    path('cubeurs/search/', views.cubeur_search),
    path('competitions/search/', views.competition_search),
]