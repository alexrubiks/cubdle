from django.urls import path
from core import views

urlpatterns = [
    path('daily/', views.daily_challenge),

    path('guess/cubeur/', views.guess_cubeur),
    path('guess/compet/', views.guess_compet),

    path('cubeurs/search/', views.cubeur_search),
    path('competitions/search/', views.competition_search),
]