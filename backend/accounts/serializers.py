"""
accounts/serializers.py
───────────────────────
Sérialiseurs pour le module de gestion des comptes.

• UtilisateurSerializer      — lecture du profil + rôle dynamique
• CreateUserSerializer       — création atomique (Utilisateur + profil spécialisé)
• CustomTokenObtainPairSerializer — enrichissement du JWT (role, nom, prenom)
"""

import re
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Utilisateur, EquipeTerrain, Ingenieur, Legal, Hse, Assurance


# ─────────────────────────────────────────────
#  CONSTANTES
# ─────────────────────────────────────────────

ROLE_CHOICES = [
    ('EQUIPE_TERRAIN', 'Équipe Terrain'),
    ('INGENIEUR',      'Ingénieur'),
    ('LEGAL',          'Service Légal'),
    ('HSE',            'Service HSE'),
    ('ASSURANCE',      'Service Assurance'),
    ('ADMIN',          'Administrateur'),
]

# Regex pour les numéros de téléphone algériens (05, 06, 07 + 8 chiffres)
ALGERIAN_PHONE_REGEX = r'^(0)(5|6|7)\d{8}$'


# ─────────────────────────────────────────────
#  UTILITAIRE : détection du rôle
# ─────────────────────────────────────────────

def get_user_role(user):
    """
    Détecte le rôle d'un utilisateur en vérifiant l'existence
    d'un profil spécialisé via la relation OneToOne (Multi-Table Inheritance).
    """
    if user.is_superuser or user.is_staff:
        # Vérifie quand même si l'admin a aussi un profil spécialisé
        pass
    
    if hasattr(user, 'equipeterrain'):
        return 'EQUIPE_TERRAIN'
    if hasattr(user, 'ingenieur'):
        return 'INGENIEUR'
    if hasattr(user, 'legal'):
        return 'LEGAL'
    if hasattr(user, 'hse'):
        return 'HSE'
    if hasattr(user, 'assurance'):
        return 'ASSURANCE'
    if user.is_superuser or user.is_staff:
        return 'ADMIN'
    return 'UNKNOWN'


# ─────────────────────────────────────────────
#  VALIDATEURS RÉUTILISABLES
# ─────────────────────────────────────────────

def validate_algerian_phone(value):
    """Valide le format téléphone algérien : 05/06/07 suivi de 8 chiffres."""
    if value and not re.match(ALGERIAN_PHONE_REGEX, value):
        raise serializers.ValidationError(
            "Le numéro de téléphone doit être au format algérien : 05XXXXXXXX, 06XXXXXXXX ou 07XXXXXXXX."
        )
    return value


# ─────────────────────────────────────────────
#  1. SÉRIALISEUR DE LECTURE (Profil + Rôle)
# ─────────────────────────────────────────────

class UtilisateurSerializer(serializers.ModelSerializer):
    """
    Sérialiseur en lecture seule pour afficher le profil utilisateur.
    Inclut un champ `role` calculé dynamiquement via SerializerMethodField.
    """
    role = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'nom', 'prenom',
            'tel', 'email', 'estActif', 'role',
        ]
        read_only_fields = fields

    def get_role(self, obj):
        return get_user_role(obj)


# ─────────────────────────────────────────────
#  2. SÉRIALISEURS SPÉCIALISÉS (lecture)
# ─────────────────────────────────────────────

class EquipeTerrainSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = EquipeTerrain
        fields = [
            'id', 'username', 'nom', 'prenom', 'tel', 'email',
            'estActif', 'departement', 'fonction', 'matricule', 'role',
        ]

    def get_role(self, obj):
        return 'EQUIPE_TERRAIN'


class IngenieurSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Ingenieur
        fields = ['id', 'username', 'nom', 'prenom', 'tel', 'email', 'estActif', 'role']

    def get_role(self, obj):
        return 'INGENIEUR'


class LegalSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Legal
        fields = ['id', 'username', 'nom', 'prenom', 'tel', 'email', 'estActif', 'role']

    def get_role(self, obj):
        return 'LEGAL'


class HseSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Hse
        fields = ['id', 'username', 'nom', 'prenom', 'tel', 'email', 'estActif', 'role']

    def get_role(self, obj):
        return 'HSE'


class AssuranceSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Assurance
        fields = ['id', 'username', 'nom', 'prenom', 'tel', 'email', 'estActif', 'role']

    def get_role(self, obj):
        return 'ASSURANCE'


# ─────────────────────────────────────────────
#  3. SÉRIALISEUR DE CRÉATION (Admin → Utilisateur + Profil)
# ─────────────────────────────────────────────

class CreateUserSerializer(serializers.Serializer):
    """
    Sérialiseur utilisé par l'administrateur pour créer un compte.
    Crée atomiquement un Utilisateur ET son profil spécialisé.
    
    Champs obligatoires : username, password, nom, prenom, email, tel, role
    Champs optionnels   :
      - EquipeTerrain → departement, fonction, matricule
      - Assurance     → role_assurance (AGENT / DIRECTRICE)
    """
    # --- Champs de base ---
    username  = serializers.CharField(max_length=50)
    password  = serializers.CharField(write_only=True, min_length=4)
    nom       = serializers.CharField(max_length=100)
    prenom    = serializers.CharField(max_length=100)
    email     = serializers.EmailField()
    tel       = serializers.CharField(max_length=20)
    role      = serializers.ChoiceField(choices=ROLE_CHOICES)

    # --- Champs spécifiques EquipeTerrain ---
    departement = serializers.CharField(max_length=100, required=False, allow_blank=True)
    fonction    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    matricule   = serializers.CharField(max_length=50,  required=False, allow_blank=True)

    # --- Champs spécifiques Assurance ---
    role_assurance = serializers.ChoiceField(
        choices=Assurance.RoleAssurance.choices,
        required=False,
    )

    # ── Validations ──

    def validate_tel(self, value):
        return validate_algerian_phone(value)

    def validate_email(self, value):
        if Utilisateur.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value.lower()

    def validate_username(self, value):
        if Utilisateur.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate(self, attrs):
        """Validations croisées entre le rôle et les champs spécifiques."""
        role = attrs.get('role')

        if role == 'ASSURANCE' and not attrs.get('role_assurance'):
            raise serializers.ValidationError({
                'role_assurance': "Ce champ est requis pour le rôle Assurance (AGENT ou DIRECTRICE)."
            })

        return attrs

    # ── Création atomique ──

    @transaction.atomic
    def create(self, validated_data):
        role           = validated_data.pop('role')
        departement    = validated_data.pop('departement', '')
        fonction       = validated_data.pop('fonction', '')
        matricule      = validated_data.pop('matricule', '')
        role_assurance = validated_data.pop('role_assurance', None)
        password       = validated_data.pop('password')

        # Créer le profil spécialisé selon le rôle
        # Grâce au Multi-Table Inheritance, la création du modèle enfant
        # crée automatiquement la ligne parente dans utilisateur.
        if role == 'EQUIPE_TERRAIN':
            user = EquipeTerrain(**validated_data, departement=departement, fonction=fonction, matricule=matricule)
        elif role == 'INGENIEUR':
            user = Ingenieur(**validated_data)
        elif role == 'LEGAL':
            user = Legal(**validated_data)
        elif role == 'HSE':
            user = Hse(**validated_data)
        elif role == 'ASSURANCE':
            user = Assurance(**validated_data, role=role_assurance)
        elif role == 'ADMIN':
            user = Utilisateur(**validated_data, is_staff=True, is_superuser=True)
        else:
            user = Utilisateur(**validated_data)

        user.set_password(password)
        user.save()
        return user


# ─────────────────────────────────────────────
#  4. JWT PERSONNALISÉ (ajout du rôle au payload)
# ─────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Enrichit le payload JWT avec des claims personnalisés :
    - role   : le rôle détecté dynamiquement
    - nom    : nom de famille
    - prenom : prénom
    
    Cela permet au frontend React de connaître le rôle de l'utilisateur
    dès la connexion, sans appel API supplémentaire.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Claims personnalisés
        token['role']   = get_user_role(user)
        token['nom']    = user.nom
        token['prenom'] = user.prenom

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Vérifier le statut estActif
        if not self.user.estActif:
            raise serializers.ValidationError(
                "Votre compte est désactivé. Contactez l'administrateur."
            )

        # Ajouter les infos utilisateur dans la réponse JSON (en plus du token)
        data['user'] = {
            'id':     self.user.id,
            'nom':    self.user.nom,
            'prenom': self.user.prenom,
            'role':   get_user_role(self.user),
        }

        return data