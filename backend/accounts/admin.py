from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import EquipeTerrain, Ingenieur, Legal, Hse, Assurance, Utilisateur

# Since there is no "Utilisateur" table anymore, we manage each role directly.
# We can create a base admin class to reuse common configurations.

class MemberAdmin(admin.ModelAdmin):
    """
    Base Admin configuration for all members because they all share 
    fields from the abstract Utilisateur class.
    """
    list_display = ('username', 'nom', 'prenom', 'email', 'estActif')
    search_fields = ('username', 'nom', 'prenom', 'email')
    list_filter = ('estActif',)

    def save_model(self, request, obj, form, change):
        if obj.password and not obj.password.startswith('pbkdf2_'):
            obj.set_password(obj.password)
        super().save_model(request, obj, form, change)

@admin.register(EquipeTerrain)
class EquipeTerrainAdmin(MemberAdmin):
    """
    Specific admin for Field Teams with their unique fields.
    """
    # Adding specific fields to the list display
    list_display = MemberAdmin.list_display + ('matricule', 'fonction')
    
    fieldsets = (
        ('Account Info', {'fields': ('username', 'password')}),
        ('Personal Identity', {'fields': ('nom', 'prenom', 'email', 'tel')}),
        ('Professional Details', {'fields': ('matricule', 'fonction', 'departement')}),
        ('Status', {'fields': ('estActif', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

@admin.register(Assurance)
class AssuranceAdmin(MemberAdmin):
    list_display = MemberAdmin.list_display + ('role',)
    fieldsets = (
        ('Account Info', {'fields': ('username', 'password')}),
        ('Personal Identity', {'fields': ('nom', 'prenom', 'email', 'tel')}),
        ('Insurance Role', {'fields': ('role',)}),
        ('Status', {'fields': ('estActif', 'is_staff', 'is_superuser')}),
    )

# Registering the remaining specialized members
admin.site.register(Ingenieur, MemberAdmin)
admin.site.register(Legal, MemberAdmin)
admin.site.register(Hse, MemberAdmin)
admin.site.register(Utilisateur, MemberAdmin)