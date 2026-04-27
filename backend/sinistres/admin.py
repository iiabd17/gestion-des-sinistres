"""
sinistres/admin.py
──────────────────
Configuration de l'interface d'administration Django
pour le module sinistres.
"""

from django.contrib import admin
from .models import Site, Sinistre, Equipement, PieceJointe, HistoriqueStatut


# ── Inlines ──

class EquipementInline(admin.TabularInline):
    model = Equipement
    extra = 1

class PieceJointeInline(admin.TabularInline):
    model = PieceJointe
    extra = 1
    readonly_fields = ('dateUpload',)

class HistoriqueStatutInline(admin.TabularInline):
    model = HistoriqueStatut
    extra = 0
    readonly_fields = ('ancienStatut', 'nouveauStatut', 'dateChangement', 'modifiePar', 'commentaire')
    can_delete = False


# ── Admins ──

@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display  = ('codeSite', 'nomSite', 'region', 'wilaya', 'commune', 'typeSite')
    search_fields = ('codeSite', 'nomSite', 'wilaya', 'region', 'commune', 'adresseSite')
    list_filter   = ('region', 'wilaya', 'typeSite')


@admin.register(Sinistre)
class SinistreAdmin(admin.ModelAdmin):
    list_display  = (
        'idSinistre', 'nature', 'typeSinistre', 'statut',
        'dateSurvenance', 'site', 'createur', 'montantEstime',
    )
    list_filter   = ('statut', 'nature', 'typeSinistre', 'dateSurvenance')
    search_fields = ('idSinistre', 'site__codeSite', 'createur__nom', 'createur__prenom')
    ordering      = ('-dateCreation',)
    readonly_fields = ('dateCreation',)
    inlines       = [EquipementInline, PieceJointeInline, HistoriqueStatutInline]

    fieldsets = (
        ('Informations Générales', {
            'fields': (
                'idSinistre', 'nature', 'typeSinistre',
                'dateSurvenance', 'heureSurvenance',
                'descriptionDetailliee', 'montantEstime',
                'statut', 'urgence', 'dateCreation', 'dateCloture',
            )
        }),
        ('Relations', {
            'fields': ('site', 'createur'),
        }),
        ('Service Ingénieur', {
            'fields': ('observationsIngenieur',),
            'classes': ('collapse',),
        }),
        ('Service Légal', {
            'fields': ('numeroPV', 'observationsLegal'),
            'classes': ('collapse',),
        }),
        ('Service HSE', {
            'fields': ('observationsHSE', 'mesuresCorrectives'),
            'classes': ('collapse',),
        }),
        ('Assurance', {
            'fields': ('montantIndemnisation', 'motifRejet'),
            'classes': ('collapse',),
        }),
    )


@admin.register(Equipement)
class EquipementAdmin(admin.ModelAdmin):
    list_display  = ('idEquipement', 'nomMarque', 'sinistre', 'quantiteImpactee', 'valeurComptable')
    search_fields = ('idEquipement', 'nomMarque', 'sinistre__idSinistre')
    list_filter   = ('sinistre__nature',)


@admin.register(PieceJointe)
class PieceJointeAdmin(admin.ModelAdmin):
    list_display  = ('idPiece', 'titreDoc', 'typePiece', 'sinistre', 'uploadePar', 'dateUpload')
    list_filter   = ('typePiece', 'dateUpload')
    search_fields = ('titreDoc', 'sinistre__idSinistre')
    readonly_fields = ('dateUpload',)


@admin.register(HistoriqueStatut)
class HistoriqueStatutAdmin(admin.ModelAdmin):
    list_display  = ('sinistre', 'ancienStatut', 'nouveauStatut', 'dateChangement', 'modifiePar')
    list_filter   = ('nouveauStatut', 'dateChangement')
    search_fields = ('sinistre__idSinistre',)
    readonly_fields = ('sinistre', 'ancienStatut', 'nouveauStatut', 'dateChangement', 'modifiePar', 'commentaire')
