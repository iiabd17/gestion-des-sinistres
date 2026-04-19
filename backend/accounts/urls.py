"""
accounts/urls.py
────────────────
URL patterns pour le module de gestion des comptes.

Tous les endpoints sont préfixés par /api/accounts/ (configuré dans core/urls.py).
"""

from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # ── Profil utilisateur ──
    path('profile/',        views.ProfileView.as_view(),        name='profile'),
    path('profile/update/', views.UpdateProfileView.as_view(),  name='profile-update'),

    # ── Authentification utilitaire ──
    path('auth/status/',    views.CheckAuthStatusView.as_view(), name='auth-status'),

    # ── Gestion des utilisateurs (Admin) ──
    path('users/',                              views.ListUsersView.as_view(),        name='user-list'),
    path('users/create/',                       views.CreateUserView.as_view(),        name='user-create'),
    path('users/<int:user_id>/toggle-status/',  views.ToggleUserStatusView.as_view(),  name='user-toggle-status'),
]
