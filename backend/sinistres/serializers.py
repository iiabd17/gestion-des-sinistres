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
    NATURE_CHOICES, TYPE_PAR_NATURE, ALL_TYPE_CHOICES, Notification,
    Franchise
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
            'typeSite', 'owner',
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
        extra_kwargs = {
            'sinistre': {'required': False, 'allow_null': True},
            'idEquipement': {'required': False},
        }

    def get_sousGarantie(self, obj):
        return obj.verifierGarantie()

    def create(self, validated_data):
        # Auto-generate idEquipement if not provided (catalog entries)
        if not validated_data.get('idEquipement'):
            import uuid
            validated_data['idEquipement'] = f"EQ-{uuid.uuid4().hex[:8].upper()}"
        return super().create(validated_data)


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
    dernier_mouvement  = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Sinistre
        fields = [
            'idSinistre', 'nature', 'nature_label',
            'typeSinistre', 'typeSinistre_label',
            'dateSurvenance', 'statut', 'statut_label', 'urgence',
            'codeSite', 'nomSite', 'wilaya', 'montantEstime',
            'dateCreation', 'createur', 'createur_nom', 'dernier_mouvement',
        ]

    def get_dernier_mouvement(self, obj):
        # On récupère le dernier changement de statut
        # Note: On utilise historiqueStatuts.all()[0] si on a déjà préchargé ou .first()
        latest = obj.historiqueStatuts.first()
        if latest:
            return latest.dateChangement
        return obj.dateCreation

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
    createur_detail    = serializers.SerializerMethodField(read_only=True)
    franchise_info     = serializers.SerializerMethodField(read_only=True)

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
            'site_detail', 'createur', 'createur_nom', 'createur_detail',
            # Champs spécifiques aux services
            'observationsIngenieur',
            'numeroPV', 'observationsLegal',
            'observationsHSE', 'mesuresCorrectives',
            'montantIndemnisation', 'motifRejet',
            # Relations imbriquées
            'piecesJointes', 'equipements', 'historiqueStatuts',
            'franchise_info',
        ]

    def get_createur_nom(self, obj):
        if obj.createur:
            return f"{obj.createur.nom} {obj.createur.prenom}"
        return None

    def get_createur_detail(self, obj):
        """Retourne les informations complètes du déclarant."""
        if not obj.createur:
            return None
        user = obj.createur
        detail = {
            'nom': user.nom,
            'prenom': user.prenom,
            'nom_complet': f"{user.nom} {user.prenom}",
            'tel': user.tel,
            'email': user.email,
            'username': user.username,
        }
        # Ajouter les champs spécifiques à EquipeTerrain si applicable
        if hasattr(user, 'equipeterrain'):
            detail['departement'] = user.equipeterrain.departement or ''
            detail['fonction'] = user.equipeterrain.fonction or ''
            detail['matricule'] = user.equipeterrain.matricule or ''
        return detail

    def get_franchise_info(self, obj):
        if obj.nature in ['VOL', 'ACTE_DE_SABOTAGE']:
            return "Non applicable"
        try:
            franchise = Franchise.objects.get(nature=obj.nature)
            return franchise.montant
        except Franchise.DoesNotExist:
            return 0.0


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


# ═════════════════════════════════════════════
#  NOTIFICATIONS
# ═════════════════════════════════════════════

class NotificationSerializer(serializers.ModelSerializer):
    expediteur_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'utilisateur', 'message', 'is_read', 'lien_action', 'dateCreation', 'expediteur', 'expediteur_nom', 'sinistre_id']
        read_only_fields = ['id', 'utilisateur', 'dateCreation', 'expediteur', 'sinistre_id']

    def get_expediteur_nom(self, obj):
        if obj.expediteur:
            return f"{obj.expediteur.nom} {obj.expediteur.prenom}"
        return None

# ═════════════════════════════════════════════
#  FRANCHISE
# ═════════════════════════════════════════════

class FranchiseSerializer(serializers.ModelSerializer):
    nature_label = serializers.CharField(source='get_nature_display', read_only=True)
    modifie_par_nom = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Franchise
        fields = ['id', 'nature', 'nature_label', 'montant', 'date_modification', 'modifie_par', 'modifie_par_nom']
        read_only_fields = ['id', 'date_modification', 'modifie_par']

    def get_modifie_par_nom(self, obj):
        if obj.modifie_par:
            return f"{obj.modifie_par.nom} {obj.modifie_par.prenom}"
        return None
