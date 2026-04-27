"""
sinistres/serializers.py
────────────────────────
Sérialiseurs DRF pour le système de gestion des sinistres.

• SiteSerializer              — CRUD des sites
• PieceJointeSerializer       — Upload de fichiers (photos, PV, rapports)
• EquipementSerializer        — Équipements impactés
• HistoriqueStatutSerializer  — Journal des changements de statut (lecture)
• SinistreListSerializer      — Liste résumée des sinistres
• SinistreDetailSerializer    — Détail complet avec pièces jointes et équipements
• SinistreCreateSerializer    — Création d'un sinistre (Équipe Terrain / Assurance)
"""

from rest_framework import serializers
from .models import (
    Site, Sinistre, Equipement, PieceJointe, HistoriqueStatut,
    NATURE_CHOICES, TYPE_PAR_NATURE, ALL_TYPE_CHOICES,
)


# ═════════════════════════════════════════════
#  SITE
# ═════════════════════════════════════════════

class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Site
        fields = [
            'codeSite', 'nomSite', 'region', 'wilaya',
            'commune', 'adresseSite', 'longitude', 'latitude',
        ]


# ═════════════════════════════════════════════
#  PIECE JOINTE
# ═════════════════════════════════════════════

class PieceJointeSerializer(serializers.ModelSerializer):
    """
    Gère l'upload de fichiers liés à un sinistre.
    Le champ `uploadePar` est en lecture seule (assigné automatiquement
    dans la vue à partir de request.user).
    """
    uploadePar_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = PieceJointe
        fields = [
            'idPiece', 'titreDoc', 'typePiece', 'fichier',
            'dateUpload', 'sinistre', 'uploadePar', 'uploadePar_nom',
        ]
        read_only_fields = ['idPiece', 'dateUpload', 'uploadePar']

    def get_uploadePar_nom(self, obj):
        if obj.uploadePar:
            return f"{obj.uploadePar.nom} {obj.uploadePar.prenom}"
        return None


# ═════════════════════════════════════════════
#  EQUIPEMENT
# ═════════════════════════════════════════════

class EquipementSerializer(serializers.ModelSerializer):
    sousGarantie = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Equipement
        fields = [
            'idEquipement', 'nomMarque', 'numeroSerie',
            'dateInstallation', 'valeurComptable', 'quantiteImpactee',
            'sinistre', 'sousGarantie',
        ]

    def get_sousGarantie(self, obj):
        return obj.verifierGarantie()


# ═════════════════════════════════════════════
#  HISTORIQUE STATUT (lecture seule)
# ═════════════════════════════════════════════

class HistoriqueStatutSerializer(serializers.ModelSerializer):
    modifiePar_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = HistoriqueStatut
        fields = [
            'id', 'sinistre', 'ancienStatut', 'nouveauStatut',
            'dateChangement', 'modifiePar', 'modifiePar_nom', 'commentaire',
        ]
        read_only_fields = fields

    def get_modifiePar_nom(self, obj):
        if obj.modifiePar:
            return f"{obj.modifiePar.nom} {obj.modifiePar.prenom}"
        return None


# ═════════════════════════════════════════════
#  SINISTRE — Liste (résumé)
# ═════════════════════════════════════════════

class SinistreListSerializer(serializers.ModelSerializer):
    """Sérialiseur léger pour les listes et tableaux."""

    nature_label       = serializers.CharField(source='get_nature_display', read_only=True)
    typeSinistre_label = serializers.CharField(source='get_typeSinistre_display', read_only=True)
    statut_label       = serializers.CharField(source='get_statut_display', read_only=True)
    codeSite           = serializers.CharField(source='site.codeSite', read_only=True)
    nomSite            = serializers.CharField(source='site.nomSite', read_only=True)
    wilaya             = serializers.CharField(source='site.wilaya', read_only=True)
    createur_nom       = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Sinistre
        fields = [
            'idSinistre', 'nature', 'nature_label',
            'typeSinistre', 'typeSinistre_label',
            'dateSurvenance', 'statut', 'statut_label', 'urgence',
            'codeSite', 'nomSite', 'wilaya', 'montantEstime',
            'dateCreation', 'createur', 'createur_nom',
        ]

    def get_createur_nom(self, obj):
        if obj.createur:
            return f"{obj.createur.nom} {obj.createur.prenom}"
        return None


# ═════════════════════════════════════════════
#  SINISTRE — Détail complet (avec nested)
# ═════════════════════════════════════════════

class SinistreDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet utilisé pour le détail d'un sinistre.
    Inclut les pièces jointes, équipements et historique en lecture seule.
    """

    nature_label       = serializers.CharField(source='get_nature_display', read_only=True)
    typeSinistre_label = serializers.CharField(source='get_typeSinistre_display', read_only=True)
    statut_label       = serializers.CharField(source='get_statut_display', read_only=True)
    site_detail        = SiteSerializer(source='site', read_only=True)
    createur_nom       = serializers.SerializerMethodField(read_only=True)

    # Nested relations (lecture seule dans ce sérialiseur)
    piecesJointes     = PieceJointeSerializer(many=True, read_only=True)
    equipements       = EquipementSerializer(many=True, read_only=True)
    historiqueStatuts = HistoriqueStatutSerializer(many=True, read_only=True)

    class Meta:
        model  = Sinistre
        fields = [
            'idSinistre', 'nature', 'nature_label',
            'typeSinistre', 'typeSinistre_label',
            'dateSurvenance', 'heureSurvenance',
            'descriptionDetailliee', 'montantEstime',
            'statut', 'statut_label', 'urgence',
            'dateCreation', 'dateCloture',
            'site_detail', 'createur', 'createur_nom',
            # Champs spécifiques aux services
            'observationsIngenieur',
            'numeroPV', 'observationsLegal',
            'observationsHSE', 'mesuresCorrectives',
            'montantIndemnisation', 'motifRejet',
            # Relations imbriquées
            'piecesJointes', 'equipements', 'historiqueStatuts',
        ]

    def get_createur_nom(self, obj):
        if obj.createur:
            return f"{obj.createur.nom} {obj.createur.prenom}"
        return None


# ═════════════════════════════════════════════
#  SINISTRE — Création
# ═════════════════════════════════════════════

class SinistreCreateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la création d'un sinistre.
    Le champ `createur` est assigné automatiquement dans la vue
    via perform_create (request.user).
    Le champ `codeSite` attend le code du site (pas l'id numérique).
    """
    codeSite = serializers.CharField(write_only=True)

    class Meta:
        model  = Sinistre
        fields = [
            'idSinistre', 'nature', 'typeSinistre',
            'dateSurvenance', 'heureSurvenance',
            'descriptionDetailliee', 'montantEstime',
            'urgence', 'codeSite',
        ]

    def validate_codeSite(self, value):
        try:
            Site.objects.get(codeSite=value)
        except Site.DoesNotExist:
            raise serializers.ValidationError(
                f"Le site avec le code '{value}' n'existe pas."
            )
        return value

    def validate(self, attrs):
        """Valide que typeSinistre appartient à la nature sélectionnée."""
        nature = attrs.get('nature')
        type_sinistre = attrs.get('typeSinistre')

        if nature and type_sinistre:
            types_valides = [t[0] for t in TYPE_PAR_NATURE.get(nature, [])]
            if type_sinistre not in types_valides:
                raise serializers.ValidationError({
                    'typeSinistre': (
                        f"Le type '{type_sinistre}' n'appartient pas à la nature "
                        f"'{nature}'. Types valides : {types_valides}"
                    )
                })
        return attrs

    def create(self, validated_data):
        code_site = validated_data.pop('codeSite')
        site = Site.objects.get(codeSite=code_site)
        validated_data['site'] = site
        return super().create(validated_data)
