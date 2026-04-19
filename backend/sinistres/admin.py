from django.contrib import admin
from .models import Site, Sinistre, Declaration, Equipement, PieceJointe

class EquipementInline(admin.TabularInline):
    model = Equipement
    extra = 1

class PieceJointeInline(admin.TabularInline):
    model = PieceJointe
    extra = 1

@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ('codeSite', 'adresseSite', 'wilaya', 'codeRegion')
    search_fields = ('codeSite', 'adresseSite', 'wilaya')
    list_filter = ('wilaya', 'codeRegion')

@admin.register(Sinistre)
class SinistreAdmin(admin.ModelAdmin):
    list_display = ('idSinistre', 'nature', 'typeSinistre', 'dateSurvenance', 'site', 'montantEstime')
    list_filter = ('nature', 'typeSinistre', 'dateSurvenance')
    search_fields = ('idSinistre', 'site__codeSite')
    ordering = ('-dateSurvenance',)
    inlines = [EquipementInline, PieceJointeInline]

@admin.register(Declaration)
class DeclarationAdmin(admin.ModelAdmin):
    list_display = ('idDeclaration', 'sinistre', 'etatActuel', 'urgence', 'dateCreation')
    list_filter = ('etatActuel', 'urgence', 'dateCreation')
    search_fields = ('idDeclaration', 'sinistre__idSinistre')
    ordering = ('-dateCreation',)

@admin.register(Equipement)
class EquipementAdmin(admin.ModelAdmin):
    list_display = ('idEquipement', 'nomMarque', 'sinistre', 'quantiteImpactee', 'valeurComptable')
    search_fields = ('idEquipement', 'nomMarque', 'sinistre__idSinistre')

@admin.register(PieceJointe)
class PieceJointeAdmin(admin.ModelAdmin):
    list_display = ('idPiece', 'titreDoc', 'format', 'sinistre', 'dateUpload')
    list_filter = ('format', 'dateUpload')
    search_fields = ('titreDoc', 'sinistre__idSinistre')
