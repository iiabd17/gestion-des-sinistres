"""
accounts/views.py
─────────────────
Vues API REST pour la gestion des comptes utilisateurs.

Endpoints publics :
    - Le login est géré par SimpleJWT via /api/token/ (core/urls.py)

Endpoints authentifiés :
    - ProfileView          → GET  /api/accounts/profile/
    - UpdateProfileView    → PUT  /api/accounts/profile/update/
    - CheckAuthStatusView  → GET  /api/accounts/auth/status/

Endpoints administrateur :
    - ListUsersView        → GET  /api/accounts/users/
    - CreateUserView       → POST /api/accounts/users/create/
    - ToggleUserStatusView → PATCH /api/accounts/users/<id>/toggle-status/
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404

from .models import Utilisateur
from .serializers import (
    UtilisateurSerializer,
    CreateUserSerializer,
    get_user_role,
)
from .permissions import IsAdmin


# ─────────────────────────────────────────────
#  1. PROFIL DE L'UTILISATEUR CONNECTÉ
# ─────────────────────────────────────────────

class ProfileView(APIView):
    """
    GET /api/accounts/profile/
    
    Retourne les informations complètes de l'utilisateur connecté,
    incluant son rôle détecté dynamiquement.
    Utilisé par le frontend React pour le routing et la sidebar.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UtilisateurSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UpdateProfileView(APIView):
    """
    PUT /api/accounts/profile/update/
    
    Permet à l'utilisateur de mettre à jour ses informations
    de contact (téléphone et email uniquement).
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        tel   = request.data.get('tel', user.tel)
        email = request.data.get('email', user.email)

        # Validation du téléphone algérien
        from .serializers import validate_algerian_phone
        try:
            validate_algerian_phone(tel)
        except Exception as e:
            return Response(
                {'tel': [str(e.detail[0]) if hasattr(e, 'detail') else str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérification unicité email (si modifié)
        if email.lower() != user.email.lower():
            if Utilisateur.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response(
                    {'email': ["Un compte avec cet email existe déjà."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        user.tel   = tel
        user.email = email.lower()
        user.save(update_fields=['tel', 'email'])

        return Response(
            {"message": "Profil mis à jour avec succès."},
            status=status.HTTP_200_OK,
        )


# ─────────────────────────────────────────────
#  2. VÉRIFICATION DE L'ÉTAT D'AUTHENTIFICATION
# ─────────────────────────────────────────────

class CheckAuthStatusView(APIView):
    """
    GET /api/accounts/auth/status/
    
    Endpoint utilitaire pour le frontend React.
    Vérifie si le token JWT est toujours valide et retourne
    le rôle de l'utilisateur.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'isAuthenticated': True,
            'user': {
                'id':     request.user.id,
                'nom':    request.user.nom,
                'prenom': request.user.prenom,
                'role':   get_user_role(request.user),
            },
        }, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────
#  3. GESTION DES UTILISATEURS (ADMIN UNIQUEMENT)
# ─────────────────────────────────────────────

class ListUsersView(APIView):
    """
    GET /api/accounts/users/
    
    Liste tous les utilisateurs avec leur rôle.
    Accès réservé aux administrateurs.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        users = Utilisateur.objects.all().order_by('-id')
        serializer = UtilisateurSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CreateUserView(APIView):
    """
    POST /api/accounts/users/create/
    
    Crée un nouvel utilisateur et son profil spécialisé de manière atomique.
    Seul l'administrateur peut accéder à cet endpoint.
    
    Body JSON attendu :
    {
        "username":  "jdoe",
        "password":  "secretpass",
        "nom":       "Doe",
        "prenom":    "John",
        "email":     "jdoe@djezzy.dz",
        "tel":       "0550123456",
        "role":      "INGENIEUR",
        
        // Optionnel (EquipeTerrain uniquement) :
        "departement": "Réseau",
        "fonction":    "Technicien",
        "matricule":   "MAT-001",
        
        // Optionnel (Assurance uniquement) :
        "role_assurance": "AGENT"
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': f"Compte créé avec succès pour {user.nom} {user.prenom}.",
                'user': UtilisateurSerializer(user).data,
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ToggleUserStatusView(APIView):
    """
    PATCH /api/accounts/users/<id>/toggle-status/
    
    Active ou désactive un compte utilisateur en basculant le champ estActif.
    Seul l'administrateur peut accéder à cet endpoint.
    
    Un utilisateur désactivé ne pourra plus se connecter
    (vérifié dans le CustomTokenObtainPairSerializer).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def patch(self, request, user_id):
        user = get_object_or_404(Utilisateur, pk=user_id)

        # Empêcher l'admin de se désactiver lui-même
        if user.pk == request.user.pk:
            return Response(
                {"message": "Vous ne pouvez pas désactiver votre propre compte."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.estActif  = not user.estActif
        user.is_active = user.estActif  # Synchroniser avec le champ Django natif
        user.save(update_fields=['estActif', 'is_active'])

        etat = "activé" if user.estActif else "désactivé"
        return Response({
            'message': f"Le compte de {user.nom} {user.prenom} a été {etat}.",
            'estActif': user.estActif,
        }, status=status.HTTP_200_OK)