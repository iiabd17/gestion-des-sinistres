from django.urls import path
from . import views

app_name = 'statistiques'

urlpatterns = [
    # ── Statistiques (Dashboard) ──
    path('statistiques/',
         views.StatistiquesView.as_view(),
         name='statistiques'),
    path('statistiques/dashboard/',
         views.StatistiquesDashboardView.as_view(),
         name='statistiques-dashboard'),
    path('stats/assurance/',
         views.StatistiquesAssuranceView.as_view(),
         name='stats-assurance'),
    path('stats/delais-detail/',
         views.StatistiquesDelaisDetailView.as_view(),
         name='stats-delais-detail'),
]
