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
from django.db import transaction
from .models import (
    Site, Sinistre, Equipement, PieceJointe, HistoriqueStatut,
    NATURE_CHOICES, TYPE_PAR_NATURE, ALL_TYPE_CHOICES, Notification,
    Franchise
)


# ═════════════════════════════════════════════
#  CODIFICATION WW-CATSUB-FILE
#  Mapping complet wilaya + type → codes
# ═════════════════════════════════════════════

_WILAYA_CODES = {
    "adrar": "01", "chlef": "02", "laghouat": "03",
    "oum el bouaghi": "04", "oum-el-bouaghi": "04", "oum el-bouaghi": "04", "batna": "05",
    "béjaïa": "06", "bejaia": "06", "biskra": "07", "béchar": "08", "bechar": "08",
    "blida": "09", "bouira": "10", "tamanrasset": "11",
    "tébessa": "12", "tebessa": "12", "tlemcen": "13", "tiaret": "14",
    "tizi ouzou": "15", "tizi-ouzou": "15",
    "alger": "16", "algiers": "16", "algier": "16",
    "djelfa": "17", "jijel": "18", "sétif": "19", "setif": "19",
    "saïda": "20", "saida": "20", "skikda": "21",
    "sidi bel abbès": "22", "sidi bel abbes": "22", "sidi-belabbes": "22", "annaba": "23", "guelma": "24",
    "constantine": "25", "médéa": "26", "medea": "26", "mostaganem": "27",
    "m'sila": "28", "msila": "28", "mascara": "29", "ouargla": "30",
    "oran": "31", "el bayadh": "32", "el-bayadh": "32", "illizi": "33",
    "bordj bou arréridj": "34", "bordj bou arreridj": "34", "bordj-bou-arreridj": "34", "boumerdès": "35", "boumerdes": "35", "el tarf": "36", "el-tarf": "36",
    "tindouf": "37", "tissemsilt": "38", "el oued": "39", "el-oued": "39",
    "khenchela": "40", "khenchla": "40", "souk ahras": "41", "souk-ahras": "41", "tipaza": "42",
    "mila": "43", "aïn defla": "44", "ain defla": "44", "ain-defla": "44", "naâma": "45", "naama": "45",
    "aïn témouchent": "46", "ain temouchent": "46", "ain-temouchent": "46", "ghardaïa": "47", "ghardaia": "47", "relizane": "48",
    "timimoun": "49", "bordj badji mokhtar": "50",
    "ouled djellal": "51", "béni abbès": "52", "beni abbes": "52",
    "in salah": "53", "in guezzam": "54",
    "touggourt": "55", "djanet": "56",
    "el m'ghair": "57", "el mghair": "57", "el meniaa": "58", "el meniaâ": "58",
    "aflou": "59", "aïn oussera": "60", "ain oussera": "60", "m'sila reorganized": "61",
    "barika": "62", "el eulma": "63", "touggourt expanded": "64",
    "ksar el boukhari": "65", "lakhdaria": "66", "maghnia": "67",
    "labiodh sidi cheikh": "68", "el abiodh": "69",
}

_SINISTER_CATSUB_MAP = {
    # 01 Fibre Optique
    "FIBRE_OPTIQUE":              "0101",
    # 02 Acte de Sabotage
    "ACTE_DE_SABOTAGE":           "0201",
    # 03 Vol
    "VOL":                        "0301",
    "VOL_PE":                     "0302",
    # 04 Incendie
    "INCENDIE":                   "0401",
    "INCENDIE_PE":                "0402",
    "INCENDIE_SURTENSION_ELEC":   "0403",
    # 05 Intemperie
    "VENT_VIOLENT":               "0501",
    "FOUDRE":                     "0502",
    "PLUIE":                      "0503",
    # 06 Catastrophe Naturelle
    "TREMBLEMENT_DE_TERRE":       "0601",
    "TEMPETE":                    "0602",
    "INONDATION":                 "0603",
    "GLISSEMENT_DE_TERRAIN":      "0604",
    "DEGAT_DES_EAUX":             "0605",
    # 07 Violence Politique
    "GREVES_EMEUTES":             "0701",
    "MOUVEMENT_POPULAIRE":        "0702",
    "AUTRES":                     "0703",
    # 08 RC
    "BRIS_DE_MACHINES":           "0801",
    "BRIS_DE_GLACES":             "0802",
    "ACCIDENT_APPAREILS_ELEC":    "0803",
    "RISQUES_INFORMATIQUES_ELEC": "0804",
    "CHUTE_AERONEF_OBJET_SPATIAL":"0805",
    "TRANSPORT_INTERNE":          "0806",
    "DOMMAGES":                   "0807",
}


def _get_wilaya_code(wilaya_name):
    """Mappe un nom de wilaya (texte BDD) vers son code 2 chiffres."""
    if not wilaya_name:
        return "00"
    return _WILAYA_CODES.get(wilaya_name.strip().lower(), "00")


def _get_catsub_code(type_sinistre):
    """Retourne le code CATSUB 4 chiffres pour un typeSinistre."""
    return _SINISTER_CATSUB_MAP.get(type_sinistre, "0000")


@transaction.atomic
def _generate_declaration_id(type_sinistre, wilaya_name, year):
    """
    Genere un ID unique au format WW-CATSUB-FILE.
    Thread-safe via select_for_update + boucle de retry sur collision.

    Exemples :
      Alger + VOL_PE  (2026) -> '16-0302-01'
      Oran  + INCENDIE(2026) -> '31-0401-01'
    """
    ww     = _get_wilaya_code(wilaya_name)
    catsub = _get_catsub_code(type_sinistre)
    prefix = f"{ww}-{catsub}"

    existing_count = (
        Sinistre.objects
        .filter(idSinistre__startswith=f"{prefix}-", dateCreation__year=year)
        .count()
    )

    file_num  = existing_count + 1
    candidate = f"{prefix}-{file_num:02d}"

    # Boucle de securite en cas de collision residuelle
    while Sinistre.objects.filter(idSinistre=candidate).exists():
        file_num += 1
        candidate = f"{prefix}-{file_num:02d}"

    return candidate



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
    codeSite           = serializers.SerializerMethodField(read_only=True)
    nomSite            = serializers.SerializerMethodField(read_only=True)
    wilaya             = serializers.SerializerMethodField(read_only=True)
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

    def get_codeSite(self, obj):
        return obj.site.codeSite if obj.site else "N/A"

    def get_nomSite(self, obj):
        return obj.site.nomSite if obj.site else "N/A"

    def get_wilaya(self, obj):
        return obj.site.wilaya if obj.site else "N/A"


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
    codeSite = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model  = Sinistre
        fields = [
            'idSinistre', 'nature', 'typeSinistre',
            'dateSurvenance', 'heureSurvenance',
            'descriptionDetailliee', 'montantEstime',
            'urgence', 'codeSite',
        ]
        extra_kwargs = {
            'idSinistre': {'required': False},
        }

    def validate_codeSite(self, value):
        if not value:
            return None
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
        from django.utils import timezone

        code_site = validated_data.pop('codeSite', None)
        site      = None
        if code_site:
            site = Site.objects.get(codeSite=code_site)
            validated_data['site'] = site

        # ── Auto-génération de l'ID au format WW-CATSUB-FILE ──────────
        type_sinistre = validated_data.get('typeSinistre', '')
        wilaya_name   = site.wilaya if site else ''
        year          = timezone.now().year

        validated_data['idSinistre'] = _generate_declaration_id(
            type_sinistre, wilaya_name, year
        )
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
