from rest_framework import serializers
from .models import Utilisateur, EquipeTerrain, Ingenieur, Legal, Hse, Assurance

# Sérialiseur de base pour l'utilisateur
class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'nom', 'prenom', 'tel', 'email', 'username', 'estActif']

# Sérialiseur pour l'Equipe Terrain 
class EquipeTerrainSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipeTerrain
        fields = ['id', 'nom', 'prenom', 'tel', 'email', 'username', 'estActif', 'departement', 'fonction', 'matricule']

# Sérialiseurs simplifiés pour les autres rôles
class IngenieurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingenieur
        fields = ['id', 'nom', 'prenom', 'tel', 'email', 'username', 'estActif']

class LegalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Legal
        fields = ['id', 'nom', 'prenom', 'tel', 'email', 'username', 'estActif']

class HseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hse
        fields = ['id', 'nom', 'prenom', 'tel', 'email', 'username', 'estActif']

class AssuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assurance
        fields = ['id', 'nom', 'prenom', 'tel', 'email', 'username', 'estActif', 'role']