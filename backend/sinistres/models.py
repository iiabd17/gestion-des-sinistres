from django.db import models
from django.utils import timezone



#  CHOIX : NATURE → TYPES


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



#  SITE

class Site(models.Model):
    idSite      = models.AutoField(primary_key=True)
    codeSite    = models.CharField(max_length=50, unique=True)
    adresseSite = models.CharField(max_length=255)
    wilaya      = models.CharField(max_length=100)
    codeRegion  = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.codeSite} - {self.adresseSite}"

    class Meta:
        db_table            = 'site'
        verbose_name        = 'Site'
        verbose_name_plural = 'Sites'



#  SINISTRE


class Sinistre(models.Model):

    idSinistre            = models.CharField(max_length=100, primary_key=True)
    nature                = models.CharField(max_length=30, choices=NATURE_CHOICES)
    typeSinistre          = models.CharField(max_length=50, choices=ALL_TYPE_CHOICES)
    dateSurvenance        = models.DateField()
    descriptionDetailliee = models.TextField(blank=True, null=True)
    montantEstime         = models.FloatField(default=0.0)

    # codeSite est une ForeignKey vers Site.codeSite
    site = models.ForeignKey(
        Site,
        to_field='codeSite',
        on_delete=models.PROTECT,
        related_name='sinistres',
        db_column='codeSite'
    )

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
            f"Montant estimé: {self.montantEstime} DA"
        )

    def mettreAJourEstimation(self, nouveauMontant: float):
        self.montantEstime = nouveauMontant
        self.save()

    def __str__(self):
        return (
            f"Sinistre {self.idSinistre} - "
            f"{self.get_nature_display()} / {self.get_typeSinistre_display()}"
        )

    class Meta:
        db_table            = 'sinistre'
        verbose_name        = 'Sinistre'
        verbose_name_plural = 'Sinistres'



#  DECLARATION


class Declaration(models.Model):

    ETAT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('VALIDE',     'Validé'),
        ('REJETE',     'Rejeté'),
    ]
    URGENCE_CHOICES = [
        (1, 'Faible'),
        (2, 'Moyenne'),
        (3, 'Haute'),
    ]

    idDeclaration = models.CharField(max_length=100, primary_key=True)
    dateCreation  = models.DateTimeField(default=timezone.now)
    etatActuel    = models.CharField(
        max_length=20, choices=ETAT_CHOICES, default='EN_ATTENTE'
    )
    urgence = models.IntegerField(choices=URGENCE_CHOICES, default=1)

    sinistre = models.OneToOneField(
        Sinistre,
        on_delete=models.CASCADE,
        related_name='declaration'
    )

    def changerEtat(self, nouvelEtat: str):
        etats_valides = [e[0] for e in self.ETAT_CHOICES]
        if nouvelEtat not in etats_valides:
            raise ValueError(f"État invalide : {nouvelEtat}")
        self.etatActuel = nouvelEtat
        self.save()

    def calculerTempsTraitement(self) -> int:
        delta = timezone.now() - self.dateCreation
        return int(delta.total_seconds())

    def __str__(self):
        return f"Déclaration {self.idDeclaration} [{self.etatActuel}]"

    class Meta:
        db_table            = 'declaration'
        verbose_name        = 'Déclaration'
        verbose_name_plural = 'Déclarations'



#  EQUIPEMENT


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


# ─────────────────────────────────────────────
#  PIECE JOINTE
# ─────────────────────────────────────────────

class PieceJointe(models.Model):

    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('JPG', 'JPG'),
        ('PNG', 'PNG'),
    ]

    idPiece    = models.AutoField(primary_key=True)
    titreDoc   = models.CharField(max_length=255)
    format     = models.CharField(max_length=5, choices=FORMAT_CHOICES)
    urlFichier = models.CharField(max_length=500)
    dateUpload = models.DateTimeField(default=timezone.now)
    tailleKo   = models.BigIntegerField(default=0)

    sinistre = models.ForeignKey(
        Sinistre,
        on_delete=models.CASCADE,
        related_name='piecesJointes'
    )

    def uploader(self, nomFichier: str) -> bool:
        self.titreDoc   = nomFichier
        self.dateUpload = timezone.now()
        self.save()
        return True

    def supprimer(self) -> bool:
        try:
            self.delete()
            return True
        except Exception:
            return False

    def telecharger(self):
        return self.urlFichier

    def __str__(self):
        return f"{self.titreDoc} ({self.format})"

    class Meta:
        db_table            = 'piece_jointe'
        verbose_name        = 'Pièce Jointe'
        verbose_name_plural = 'Pièces Jointes'