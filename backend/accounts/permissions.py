"""
accounts/permissions.py
───────────────────────
Classes de permissions RBAC (Role-Based Access Control) pour le système
de gestion des sinistres Djezzy.

Chaque classe vérifie :
  1. L'utilisateur est authentifié
  2. Le compte est actif (estActif = True)
  3. Le profil spécialisé correspondant existe (Multi-Table Inheritance)

Utilisation dans les vues :
    permission_classes = [IsAuthenticated, IsIngenieur]
"""

from rest_framework.permissions import BasePermission


# ─────────────────────────────────────────────
#  PERMISSIONS PAR RÔLE MÉTIER
# ─────────────────────────────────────────────

class IsEquipeTerrain(BasePermission):
    """
    Équipe Terrain (Field Team).
    
    Responsabilités :
    - Créer les déclarations initiales de sinistre.
    - Uploader les photos prises sur les lieux.
    - Consulter l'historique de ses propres déclarations.
    """
    message = "Accès réservé aux membres de l'Équipe Terrain."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'estActif', False)
            and hasattr(request.user, 'equipeterrain')
        )


class IsIngenieur(BasePermission):
    """
    Ingénieur (Technical Department).
    
    Responsabilités :
    - Compléter le dossier technique.
    - Évaluer les dommages matériels.
    - Identifier et lier les équipements impactés (BTS, antennes, etc.).
    """
    message = "Accès réservé aux ingénieurs du département technique."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'estActif', False)
            and hasattr(request.user, 'ingenieur')
        )


class IsLegal(BasePermission):
    """
    Service Légal (Legal Department).
    
    Responsabilités :
    - Ajouter et consulter les Procès-Verbaux (PV de Police / Gendarmerie).
    - Mettre à jour l'état d'avancement des procédures juridiques.
    """
    message = "Accès réservé au service légal."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'estActif', False)
            and hasattr(request.user, 'legal')
        )


class IsHse(BasePermission):
    """
    Service HSE (Health, Safety & Environment).
    
    Responsabilités :
    - Réviser les circonstances du sinistre (angle sécurité).
    - Apporter des observations et validations de conformité.
    """
    message = "Accès réservé au service HSE."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'estActif', False)
            and hasattr(request.user, 'hse')
        )


class IsAssurance(BasePermission):
    """
    Direction de l'Assurance (Insurance Department).
    
    Responsabilités :
    - Consulter l'intégralité du dossier (Terrain + Technique + PV + HSE).
    - Gérer les interactions avec les assureurs externes.
    - Clôturer le sinistre (seul rôle autorisé à passer l'état à "Clôturé").
    - Gérer l'indemnisation.
    """
    message = "Accès réservé à la direction de l'assurance."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'estActif', False)
            and hasattr(request.user, 'assurance')
        )


# ─────────────────────────────────────────────
#  PERMISSIONS ADMINISTRATIVES
# ─────────────────────────────────────────────

class IsAdmin(BasePermission):
    """
    Administrateur Système.
    
    Responsabilités :
    - Gestion des comptes utilisateurs (CRUD, activation/désactivation).
    - Maintenance des tables de référence (Régions, Types d'équipements).
    """
    message = "Accès réservé aux administrateurs du système."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'estActif', False)
            and (request.user.is_staff or request.user.is_superuser)
        )


class IsAdminOrSelf(BasePermission):
    """
    Autorise l'accès si l'utilisateur est admin OU s'il accède
    à ses propres données (utile pour le profil).
    """
    message = "Vous ne pouvez accéder qu'à votre propre profil."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Admin : accès global
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Utilisateur standard : uniquement ses propres données
        return obj.pk == request.user.pk


# ─────────────────────────────────────────────
#  PERMISSION DE PROPRIÉTÉ (DÉCLARATIONS)
# ─────────────────────────────────────────────

class IsDeclarationOwner(BasePermission):
    """
    Vérifie que l'utilisateur est le créateur du sinistre/déclaration.
    S'applique via has_object_permission pour les actions de détail.
    
    Note : Le nom du champ ForeignKey vers Utilisateur dans le modèle
    Sinistre doit être ajusté selon l'implémentation du module sinistres.
    """
    message = "Vous n'êtes pas le créateur de cette déclaration."

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if not getattr(request.user, 'estActif', False):
            return False

        # Les administrateurs ont un accès global
        if request.user.is_staff or request.user.is_superuser:
            return True

        # Vérification du propriétaire
        if hasattr(obj, 'createur'):
            return obj.createur == request.user
        if hasattr(obj, 'utilisateur'):
            return obj.utilisateur == request.user

        return False