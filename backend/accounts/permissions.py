from rest_framework.permissions import BasePermission

class IsEquipeTerrain(BasePermission):
    """
    1. Équipe Terrain (Field Team)
    Vérifie l'authentification, le statut actif et le rôle.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'estActif', False) and 
            hasattr(request.user, 'equipeterrain')
        )


class IsIngenieur(BasePermission):
    """
    2. Ingénieur (Technical Department)
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'estActif', False) and 
            hasattr(request.user, 'ingenieur')
        )


class IsLegal(BasePermission):
    """
    3. Service Légal (Legal Department)
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'estActif', False) and 
            hasattr(request.user, 'legal')
        )


class IsHse(BasePermission):
    """
    4. Service HSE (Health, Safety & Environment)
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'estActif', False) and 
            hasattr(request.user, 'hse')
        )


class IsAssurance(BasePermission):
    """
    5. Direction de l'Assurance (Assurance Department)
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'estActif', False) and 
            hasattr(request.user, 'assurance')
        )


class IsAdmin(BasePermission):
    """
    6. Administrateur (System Admin)
    Accès basé sur les flags Django par défaut.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'estActif', False) and 
            (request.user.is_staff or request.user.is_superuser)
        )


class IsDeclarationOwner(BasePermission):
    """
    Vérifie que l'utilisateur est le créateur du sinistre.
    Appliqué via has_object_permission pour les actions de détail (Retrieve/Update).
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated or not getattr(request.user, 'estActif', False):
            return False
            
        # Les administrateurs ont un accès global
        if request.user.is_staff or request.user.is_superuser:
            return True
            
        # Logique de vérification du propriétaire
        # (À ajuster selon le nom du champ dans le modèle Sinistre de votre binôme)
        if hasattr(obj, 'createur'):
            return obj.createur == request.user
        if hasattr(obj, 'utilisateur'):
            return obj.utilisateur == request.user
            
        return False