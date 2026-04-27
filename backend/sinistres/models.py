"""
sinistres/models.py
───────────────────
Modèles de données pour le système de gestion des sinistres Djezzy.

Workflow (d'après le diagramme de séquence) :
    OUVERT → EN_EXPERTISE → EN_VALIDATION_LEGAL / EN_VALIDATION_HSE
    → TRANSMIS_ASSUREUR → VALIDE / REJETE → CLOTURE → ARCHIVE

Modèles :
    • Site              — Référentiel des sites/stations Djezzy
    • Sinistre          — Événement sinistre avec statut workflow
    • Equipement        — Équipements impactés (liés à un sinistre)
    • PieceJointe       — Fichiers uploadés (photos terrain, PV, rapports HSE)
    • HistoriqueStatut  — Journal des changements de statut
"""

from django.db import models
from django.conf import settings
from django.utils import timezone


# ═════════════════════════════════════════════
#  CHOIX : NATURE → TYPES
# ═════════════════════════════════════════════

NATURE_CHOICES = [
    ('FIBRE_OPTIQUE',       'Fibre Optique'),
    ('ACTE_DE_SABOTAGE',    'Acte de Sabotage'),
    ('VOL',                 'Vol'),
    ('INCENDIE',            'Incendie'),
    ('INTEMPERIE',          'Intempérie'),
    ('CATASTROPHE_NATUREL', 'Catastrophe Naturel'),
    ('VIOLENCE_POLITIQUE',  'Violence Politique'),
    ('RC',                  'RC'),
]

# Dictionnaire nature → types qui lui appartiennent
TYPE_PAR_NATURE = {
    'FIBRE_OPTIQUE': [
        ('FIBRE_OPTIQUE',               'Fibre Optique'),
    ],
    'ACTE_DE_SABOTAGE': [
        ('ACTE_DE_SABOTAGE',            'Acte de Sabotage'),
    ],
    'VOL': [
        ('VOL',                         'Vol'),
        ('VOL_PE',                      'Vol + PE'),
    ],
    'INCENDIE': [
        ('INCENDIE',                    'Incendie'),
        ('INCENDIE_PE',                 'Incendie + PE'),
        ('INCENDIE_SURTENSION_ELEC',    'Incendie Surtension Électrique'),
    ],
    'INTEMPERIE': [
        ('VENT_VIOLENT',                'Vent Violent'),
        ('FOUDRE',                      'Foudre'),
        ('PLUIE',                       'Pluie'),
    ],
    'CATASTROPHE_NATUREL': [
        ('TREMBLEMENT_DE_TERRE',        'Tremblement de Terre'),
        ('TEMPETE',                     'Tempête'),
        ('INONDATION',                  'Inondation'),
        ('GLISSEMENT_DE_TERRAIN',       'Glissement de Terrain'),
        ('DEGAT_DES_EAUX',              'Dégât des Eaux'),
    ],
    'VIOLENCE_POLITIQUE': [
        ('GREVES_EMEUTES',              'Grèves Émeutes'),
        ('MOUVEMENT_POPULAIRE',         'Mouvement Populaire'),
        ('AUTRES',                      'Autres'),
    ],
    'RC': [
        ('BRIS_DE_MACHINES',            'Bris de Machines'),
        ('BRIS_DE_GLACES',              'Bris de Glaces'),
        ('ACCIDENT_APPAREILS_ELEC',     'Accident aux Appareils Électriques'),
        ('RISQUES_INFORMATIQUES_ELEC',  'Risques Informatiques & Électroniques'),
        ('CHUTE_AERONEF_OBJET_SPATIAL', "Chute d'Aéronef ou Objet Spatial"),
        ('TRANSPORT_INTERNE',           'Transport Interne'),
        ('DOMMAGES',                    'Dommages'),
    ],
}

# Liste plate de tous les types (utilisée comme choices Django)
ALL_TYPE_CHOICES = [
    type_tuple
    for types in TYPE_PAR_NATURE.values()
    for type_tuple in types
]


# ═════════════════════════════════════════════
#  STATUT DU WORKFLOW (Diagramme de séquence)
# ═════════════════════════════════════════════

STATUT_CHOICES = [
    ('OUVERT',                  'Ouvert'),
    ('EN_EXPERTISE',            'En Expertise'),
    ('REJET_POUR_COMPLEMENT',   'Rejeté pour Complément'),
    ('EN_VALIDATION_LEGAL',     'En Validation Légale'),
    ('EN_VALIDATION_HSE',       'En Validation HSE'),
    ('TRANSMIS_ASSUREUR',       'Transmis à l\'Assureur'),
    ('VALIDE',                  'Validé'),
    ('REJETE',                  'Rejeté'),
    ('CLOTURE',                 'Clôturé'),
    ('ARCHIVE',                 'Archivé'),
]

URGENCE_CHOICES = [
    (1, 'Faible'),
    (2, 'Moyenne'),
    (3, 'Haute'),
]


# ═════════════════════════════════════════════
#  SITE
# ═════════════════════════════════════════════

class Site(models.Model):
    # On utilise codeSite comme clé primaire car S.Locality est unique
    codeSite    = models.CharField(max_length=50, primary_key=True, verbose_name="S.Locality")
    nomSite     = models.CharField(max_length=255, verbose_name="Name", default='')
    region      = models.CharField(max_length=100, verbose_name="Region", default='')
    wilaya      = models.CharField(max_length=100, verbose_name="Wilaya")
    commune     = models.CharField(max_length=100, blank=True, null=True, verbose_name="Commune")
    adresseSite = models.TextField(blank=True, null=True, verbose_name="Adresse")
    
    # Coordonnées géographiques pour la carte
    longitude   = models.FloatField(blank=True, null=True, verbose_name="X")
    latitude    = models.FloatField(blank=True, null=True, verbose_name="Y")
    
    # Autres informations utiles du CSV
    typeSite    = models.CharField(max_length=50, blank=True, null=True, verbose_name="Type")
    owner       = models.CharField(max_length=100, blank=True, null=True, verbose_name="Owner")

    def __str__(self):
        return f"{self.codeSite} - {self.nomSite} ({self.wilaya})"

    class Meta:
        db_table            = 'site'
        verbose_name        = 'Site'
        verbose_name_plural = 'Sites'


# ═════════════════════════════════════════════
#  SINISTRE
# ═════════════════════════════════════════════

class Sinistre(models.Model):

    idSinistre            = models.CharField(max_length=100, primary_key=True)
    nature                = models.CharField(max_length=30, choices=NATURE_CHOICES)
    typeSinistre          = models.CharField(max_length=50, choices=ALL_TYPE_CHOICES)
    dateSurvenance        = models.DateField()
    heureSurvenance       = models.TimeField(blank=True, null=True)
    descriptionDetailliee = models.TextField(blank=True, null=True)
    montantEstime         = models.FloatField(default=0.0)

    # ── Workflow ──
    statut    = models.CharField(max_length=30, choices=STATUT_CHOICES, default='OUVERT')
    urgence   = models.IntegerField(choices=URGENCE_CHOICES, default=1)

    # ── Dates de suivi ──
    dateCreation  = models.DateTimeField(default=timezone.now)
    dateCloture   = models.DateTimeField(blank=True, null=True)

    # ── Relations ──
    site = models.ForeignKey(
        Site,
        on_delete=models.PROTECT,
        related_name='sinistres',
        db_column='codeSite'
    )
    createur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='sinistres_crees',
        verbose_name='Créateur (Équipe Terrain)',
        null=True, blank=True
    )

    # ── Champs remplis par les services internes ──
    # Ingénieur
    observationsIngenieur = models.TextField(blank=True, null=True,
        verbose_name='Observations de l\'ingénieur')

    # Légal (VOL → PV de Police)
    numeroPV         = models.CharField(max_length=100, blank=True, null=True,
        verbose_name='Numéro PV de Police')
    observationsLegal = models.TextField(blank=True, null=True,
        verbose_name='Observations du service légal')

    # HSE (INCENDIE → Rapport HSE)
    observationsHSE     = models.TextField(blank=True, null=True,
        verbose_name='Observations HSE')
    mesuresCorrectives  = models.TextField(blank=True, null=True,
        verbose_name='Mesures correctives proposées')

    # Assurance
    montantIndemnisation = models.FloatField(default=0.0,
        verbose_name='Montant d\'indemnisation')
    motifRejet           = models.TextField(blank=True, null=True,
        verbose_name='Motif de rejet')

    def clean(self):
        """Valide que typeSinistre appartient bien à la nature choisie."""
        from django.core.exceptions import ValidationError
        types_valides = [t[0] for t in TYPE_PAR_NATURE.get(self.nature, [])]
        if self.typeSinistre not in types_valides:
            raise ValidationError(
                f"Le type '{self.typeSinistre}' n'appartient pas à la nature "
                f"'{self.nature}'. Types valides : {types_valides}"
            )

    def obtenirDetailsComplets(self):
        return (
            f"Sinistre {self.idSinistre} | "
            f"Nature: {self.get_nature_display()} | "
            f"Type: {self.get_typeSinistre_display()} | "
            f"Site: {self.site.codeSite} ({self.site.wilaya}) | "
            f"Date: {self.dateSurvenance} | "
            f"Statut: {self.get_statut_display()} | "
            f"Montant estimé: {self.montantEstime} DA"
        )

    def mettreAJourEstimation(self, nouveauMontant: float):
        self.montantEstime = nouveauMontant
        self.save()

    def __str__(self):
        return (
            f"Sinistre {self.idSinistre} - "
            f"{self.get_nature_display()} / {self.get_typeSinistre_display()} "
            f"[{self.get_statut_display()}]"
        )

    class Meta:
        db_table            = 'sinistre'
        verbose_name        = 'Sinistre'
        verbose_name_plural = 'Sinistres'
        ordering            = ['-dateCreation']


# ═════════════════════════════════════════════
#  EQUIPEMENT
# ═════════════════════════════════════════════

class Equipement(models.Model):

    idEquipement     = models.CharField(max_length=100, primary_key=True)
    nomMarque        = models.CharField(max_length=100)
    numeroSerie      = models.CharField(max_length=100, blank=True, null=True)
    dateInstallation = models.DateField(blank=True, null=True)
    valeurComptable  = models.FloatField(default=0.0)
    quantiteImpactee = models.IntegerField(default=1)

    sinistre = models.ForeignKey(
        Sinistre,
        on_delete=models.CASCADE,
        related_name='equipements'
    )

    def mettreAJourValeur(self, nouvelleValeur: float):
        self.valeurComptable = nouvelleValeur
        self.save()

    def verifierGarantie(self) -> bool:
        if not self.dateInstallation:
            return False
        from datetime import timedelta
        date_fin_garantie = self.dateInstallation + timedelta(days=730)
        return timezone.now().date() <= date_fin_garantie

    def __str__(self):
        return f"{self.idEquipement} - {self.nomMarque}"

    class Meta:
        db_table            = 'equipement'
        verbose_name        = 'Équipement'
        verbose_name_plural = 'Équipements'


# ═════════════════════════════════════════════
#  PIECE JOINTE (avec FileField pour upload réel)
# ═════════════════════════════════════════════

class PieceJointe(models.Model):

    TYPE_PIECE_CHOICES = [
        ('PHOTO_TERRAIN',       'Photo Terrain'),
        ('PV_POLICE',           'PV de Police'),
        ('RAPPORT_HSE',         'Rapport HSE'),
        ('RAPPORT_EXPERTISE',   'Rapport d\'Expertise'),
        ('DOCUMENT_ASSURANCE',  'Document Assurance'),
        ('AUTRE',               'Autre'),
    ]

    idPiece    = models.AutoField(primary_key=True)
    titreDoc   = models.CharField(max_length=255)
    typePiece  = models.CharField(max_length=30, choices=TYPE_PIECE_CHOICES, default='AUTRE')
    fichier    = models.FileField(upload_to='sinistres/attachments/', null=True, blank=True)
    dateUpload = models.DateTimeField(default=timezone.now)

    sinistre = models.ForeignKey(
        Sinistre,
        on_delete=models.CASCADE,
        related_name='piecesJointes'
    )
    uploadePar = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='pieces_uploadees',
        verbose_name='Uploadé par',
    )

    def __str__(self):
        return f"{self.titreDoc} ({self.get_typePiece_display()})"

    class Meta:
        db_table            = 'piece_jointe'
        verbose_name        = 'Pièce Jointe'
        verbose_name_plural = 'Pièces Jointes'
        ordering            = ['-dateUpload']


# ═════════════════════════════════════════════
#  HISTORIQUE DES STATUTS (Journal de traçabilité)
# ═════════════════════════════════════════════

class HistoriqueStatut(models.Model):
    """
    Enregistre chaque changement de statut d'un sinistre.
    Cela permet un audit complet du workflow.
    """
    sinistre = models.ForeignKey(
        Sinistre,
        on_delete=models.CASCADE,
        related_name='historiqueStatuts'
    )
    ancienStatut    = models.CharField(max_length=30, choices=STATUT_CHOICES)
    nouveauStatut   = models.CharField(max_length=30, choices=STATUT_CHOICES)
    dateChangement  = models.DateTimeField(default=timezone.now)
    modifiePar      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='changements_statut',
    )
    commentaire = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.sinistre_id}: {self.ancienStatut} → {self.nouveauStatut}"

    class Meta:
        db_table            = 'historique_statut'
        verbose_name        = 'Historique de Statut'
        verbose_name_plural = 'Historiques de Statut'
        ordering            = ['-dateChangement']