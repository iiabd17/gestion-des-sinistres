"""
sinistres/urls.py
─────────────────
URL patterns pour le module sinistres.
Tous les endpoints sont préfixés par /api/ (configuré dans core/urls.py).
"""

from django.urls import path
from . import views

app_name = 'sinistres'

urlpatterns = [

    # ── Constantes globales ──
    path('constants/',
         views.ConstantsView.as_view(),
         name='constants'),

    # ── Sites ──
    path('sites/',
         views.SiteListCreateView.as_view(),
         name='site-list-create'),
    path('sites/<str:pk>/',
         views.SiteDetailView.as_view(),
         name='site-detail'),

    # ── Sinistres — CRUD ──
    path('sinistres/',
         views.SinistreListCreateView.as_view(),
         name='sinistre-list-create'),
    path('sinistres/<str:pk>/',
         views.SinistreDetailView.as_view(),
         name='sinistre-detail'),

    # ── Sinistres — Workflow ──
    path('sinistres/<str:pk>/expertise/',
         views.SinistreExpertiseView.as_view(),
         name='sinistre-expertise'),
    path('sinistres/<str:pk>/validation/',
         views.SinistreValidationAssuranceView.as_view(),
         name='sinistre-validation'),
    path('sinistres/<str:pk>/validation-legal/',
         views.SinistreValidationLegalView.as_view(),
         name='sinistre-validation-legal'),
    path('sinistres/<str:pk>/validation-hse/',
         views.SinistreValidationHSEView.as_view(),
         name='sinistre-validation-hse'),
    path('sinistres/<str:pk>/decision/',
         views.SinistreDecisionView.as_view(),
         name='sinistre-decision'),
    path('sinistres/<str:pk>/cloturer/',
         views.SinistreCloturerView.as_view(),
         name='sinistre-cloturer'),
    path('sinistres/<str:pk>/archiver/',
         views.SinistreArchiverView.as_view(),
         name='sinistre-archiver'),

    # ── Sinistres — Relations imbriquées ──
    path('sinistres/<str:sinistre_pk>/equipements/',
         views.EquipementListCreateView.as_view(),
         name='sinistre-equipements'),
    path('sinistres/<str:sinistre_pk>/pieces/',
         views.PieceJointeListCreateView.as_view(),
         name='sinistre-pieces'),
    path('sinistres/<str:pk>/historique/',
         views.HistoriqueStatutListView.as_view(),
         name='sinistre-historique'),

    # ── Équipements — CRUD global ──
    path('equipements/',
         views.EquipementListCreateView.as_view(),
         name='equipement-list-create'),
    path('equipements/<str:pk>/',
         views.EquipementDetailView.as_view(),
         name='equipement-detail'),

    # ── Pièces Jointes — CRUD global ──
    path('pieces/',
         views.PieceJointeListCreateView.as_view(),
         name='piece-list-create'),
    path('pieces/<int:pk>/',
         views.PieceJointeDetailView.as_view(),
         name='piece-detail'),

    # ── Statistiques (Dashboard) ──
    path('statistiques/',
         views.StatistiquesView.as_view(),
         name='statistiques'),
]