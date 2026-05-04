"""
sinistres/views.py
──────────────────
Vues API REST pour le système de gestion des sinistres Djezzy.

Toutes les vues utilisent des APIViews DRF avec les permission
classes importées depuis accounts.permissions.

Workflow (Diagramme de séquence) :
    1. Équipe Terrain  → déclare le sinistre        (OUVERT)
    2. Ingénieur       → complète et transmet        (EN_EXPERTISE)
    3. Assurance        → rejette pour complément ou valide
    4. Légal           → upload PV si nature == VOL  (EN_VALIDATION_LEGAL)
    5. HSE             → upload rapport si INCENDIE  (EN_VALIDATION_HSE)
    6. Assurance        → décision finale            (VALIDE / REJETE)
    7. Assurance        → clôture                    (CLOTURE)
    8. Assurance        → archive                    (ARCHIVE)
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction, models
from django.db.models import Q

from .models import (
    Site, Sinistre, Equipement, PieceJointe, HistoriqueStatut,
    NATURE_CHOICES, TYPE_PAR_NATURE, STATUT_CHOICES, URGENCE_CHOICES,
    Notification
)
from .serializers import (
    SiteSerializer,
    SinistreListSerializer,
    SinistreDetailSerializer,
    SinistreCreateSerializer,
    EquipementSerializer,
    PieceJointeSerializer,
    HistoriqueStatutSerializer,
    NotificationSerializer,
)
from accounts.permissions import (
    IsEquipeTerrain,
    IsIngenieur,
    IsIngenieurOrAssurance,
    IsLegal,
    IsHse,
    IsAssurance,
    IsAdmin,
)


# ═════════════════════════════════════════════
#  HELPER : Enregistrer un changement de statut & Notifications
# ═════════════════════════════════════════════

def _log_changement_statut(sinistre, ancien, nouveau, modifie_par, commentaire=""):
    HistoriqueStatut.objects.create(
        sinistre=sinistre,
        ancienStatut=ancien,
        nouveauStatut=nouveau,
        modifiePar=modifie_par,
        commentaire=commentaire,
    )

def _create_notification(destinataires, message, lien_action=None, expediteur=None, sinistre_id=None):
    from django.db.models import QuerySet
    if not destinataires: return
    if isinstance(destinataires, QuerySet) or isinstance(destinataires, list):
        notifs = [
            Notification(utilisateur=u, message=message, lien_action=lien_action, expediteur=expediteur, sinistre_id=sinistre_id)
            for u in destinataires if u is not None
        ]
        if notifs:
            Notification.objects.bulk_create(notifs)
    else:
        Notification.objects.create(utilisateur=destinataires, message=message, lien_action=lien_action, expediteur=expediteur, sinistre_id=sinistre_id)


# ═════════════════════════════════════════════
#  PERMISSION HELPERS (combinaisons OR)
# ═════════════════════════════════════════════

class IsAnyAuthenticated(permissions.BasePermission):
    """Tout utilisateur authentifié et actif."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'estActif', False)
        )


class CanDeclare(permissions.BasePermission):
    """Tout utilisateur authentifié et actif SAUF HSE et Légal."""
    message = "Les services HSE et Légal ne peuvent pas créer de déclarations."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not getattr(request.user, 'estActif', False):
            return False
        # Admin bypass — full access
        if request.user.is_staff or request.user.is_superuser:
            return True
        # Refuser HSE et Légal
        if hasattr(request.user, 'hse') or hasattr(request.user, 'legal'):
            return False
        return True


class IsEquipeTerrainOrAssurance(permissions.BasePermission):
    """Équipe Terrain OU Assurance (pour la création de sinistre)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not getattr(request.user, 'estActif', False):
            return False
        return (
            hasattr(request.user, 'equipeterrain')
            or hasattr(request.user, 'assurance')
            or request.user.is_staff
            or request.user.is_superuser
        )


class IsIngenieurOrAssurance(permissions.BasePermission):
    """Ingénieur OU Assurance."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not getattr(request.user, 'estActif', False):
            return False
        return (
            hasattr(request.user, 'ingenieur')
            or hasattr(request.user, 'assurance')
            or request.user.is_staff
            or request.user.is_superuser
        )


# ═════════════════════════════════════════════
#  REFERENTIEL NATURE / TYPE
# ═════════════════════════════════════════════

class ConstantsView(APIView):
    """
    GET /api/constants/
    Renvoie les listes de choix (Constantes) pour le frontend.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import Franchise
        franchises_dict = {}
        for f in Franchise.objects.all():
            franchises_dict[f.nature] = f.montant

        return Response({
            'natures': [{'code': code, 'label': label, 'franchise': franchises_dict.get(code, 0.0)} for code, label in NATURE_CHOICES],
            'types_par_nature': {nature: [{'code': c, 'label': l} for c, l in types] for nature, types in TYPE_PAR_NATURE.items()},
            'statuts': [{'code': code, 'label': label} for code, label in STATUT_CHOICES],
            'urgences': [{'code': code, 'label': label} for code, label in URGENCE_CHOICES],
            'types_pieces': [{'code': code, 'label': label} for code, label in PieceJointe.TYPE_PIECE_CHOICES],
        })


# ═════════════════════════════════════════════
#  SITE — CRUD
# ═════════════════════════════════════════════

class SiteListCreateView(APIView):
    """
    GET  /api/sites/       → Liste tous les sites (tout utilisateur authentifié)
    POST /api/sites/       → Crée un site (Assurance / Admin)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsEquipeTerrainOrAssurance()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        sites = Site.objects.all()

        # Recherche par codeSite ou nomSite (pour l'autocomplete frontend)
        search = request.query_params.get('search', '').strip()
        if search:
            sites = sites.filter(
                Q(codeSite__icontains=search) |
                Q(nomSite__icontains=search) |
                Q(wilaya__icontains=search)
            )

        # Limiter les résultats pour l'autocomplete (26k+ sites en BDD)
        sites = sites[:50]

        serializer = SiteSerializer(sites, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = SiteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SiteDetailView(APIView):
    """
    GET    /api/sites/<pk>/   → Détail d'un site
    PUT    /api/sites/<pk>/   → Mise à jour (Assurance / Admin)
    DELETE /api/sites/<pk>/   → Suppression (Assurance / Admin)
    """
    def get_permissions(self):
        if self.request.method in ('PUT', 'DELETE'):
            return [permissions.IsAuthenticated(), IsEquipeTerrainOrAssurance()]
        return [permissions.IsAuthenticated()]

    def get(self, request, pk):
        site = get_object_or_404(Site, pk=pk)
        return Response(SiteSerializer(site).data)

    @transaction.atomic
    def put(self, request, pk):
        site = get_object_or_404(Site, pk=pk)
        serializer = SiteSerializer(site, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        site = get_object_or_404(Site, pk=pk)
        site.delete()
        return Response(
            {'message': 'Site supprimé.'},
            status=status.HTTP_204_NO_CONTENT,
        )


class SiteImportCSVView(APIView):
    """
    POST /api/sites/import/
    Importe des sites depuis un fichier CSV ou Excel (.xlsx).
    Mapping des colonnes : S.Locality, Name, Owner, Region, Wilaya, Type, X, Y, Adresse, Commune
    Accès : Assurance / Admin
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated, IsEquipeTerrainOrAssurance]

    @transaction.atomic
    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'error': 'Aucun fichier fourni. Utilisez le champ "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filename = file_obj.name.lower()
        rows = []

        try:
            if filename.endswith('.xlsx'):
                import openpyxl
                from io import BytesIO
                wb = openpyxl.load_workbook(BytesIO(file_obj.read()), data_only=True)
                sheet = wb.active
                headers = [str(cell.value).strip() if cell.value else '' for cell in sheet[1]]
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    if not any(row):
                        continue
                    row_dict = {k: str(v).strip() if v is not None else '' for k, v in zip(headers, row)}
                    rows.append(row_dict)
            else:
                import csv, io
                content = file_obj.read().decode('utf-8')
                reader = csv.DictReader(io.StringIO(content))
                for row in reader:
                    rows.append(row)
        except Exception as e:
            return Response(
                {'error': f'Erreur de lecture du fichier : {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sites_to_create = []
        skipped = 0

        for row_dict in rows:
            code_site = row_dict.get('S.Locality', '').strip()
            if not code_site:
                skipped += 1
                continue

            x_val = row_dict.get('X', '').strip()
            y_val = row_dict.get('Y', '').strip()

            try:
                longitude = float(x_val.replace(',', '.')) if x_val else None
            except ValueError:
                longitude = None
            try:
                latitude = float(y_val.replace(',', '.')) if y_val else None
            except ValueError:
                latitude = None

            site = Site(
                codeSite=code_site,
                nomSite=row_dict.get('Name', '').strip(),
                owner=row_dict.get('Owner', '').strip(),
                region=row_dict.get('Region', '').strip(),
                wilaya=row_dict.get('Wilaya', '').strip(),
                typeSite=row_dict.get('Type', '').strip(),
                longitude=longitude,
                latitude=latitude,
                adresseSite=row_dict.get('Adresse', '').strip(),
                commune=row_dict.get('Commune', '').strip(),
            )
            sites_to_create.append(site)

        if sites_to_create:
            Site.objects.bulk_create(sites_to_create, ignore_conflicts=True)

        return Response({
            'message': f'{len(sites_to_create)} sites importés avec succès.',
            'imported': len(sites_to_create),
            'skipped': skipped,
        }, status=status.HTTP_201_CREATED)

class SiteExportCSVView(APIView):
    """
    GET /api/sites/export/
    Exporte la liste des sites en CSV.
    Accès : Assurance / Admin
    """
    permission_classes = [permissions.IsAuthenticated, IsEquipeTerrainOrAssurance]

    def get(self, request):
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="sites_export.csv"'
        
        # Write BOM for Excel compatibility
        response.write('\ufeff'.encode('utf8'))

        writer = csv.writer(response, delimiter=';')
        writer.writerow(['S.Locality', 'Name', 'Owner', 'Region', 'Wilaya', 'Type', 'X', 'Y', 'Adresse', 'Commune'])

        sites = Site.objects.all().values_list(
            'codeSite', 'nomSite', 'owner', 'region', 'wilaya', 'typeSite', 'longitude', 'latitude', 'adresseSite', 'commune'
        )

        for site in sites:
            writer.writerow(site)

        return response


# ═════════════════════════════════════════════
#  SINISTRE — Liste & Création
# ═════════════════════════════════════════════

class SinistreListCreateView(APIView):
    """
    GET  /api/sinistres/       → Liste des sinistres
        - Équipe Terrain : voit uniquement ses propres sinistres
        - Autres rôles   : voient tous les sinistres
    POST /api/sinistres/       → Déclarer un nouveau sinistre
        - Réservé à Équipe Terrain et Assurance
        - Statut initial : OUVERT
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), CanDeclare()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        user = request.user

        # ── Filtrage strict par rôle ──
        if hasattr(user, 'equipeterrain'):
            # Équipe Terrain : uniquement ses propres déclarations
            sinistres = Sinistre.objects.filter(createur=user)
        elif hasattr(user, 'legal'):
            # Légal : uniquement les dossiers de nature VOL
            sinistres = Sinistre.objects.filter(nature='VOL')
        elif hasattr(user, 'hse'):
            # HSE : uniquement les natures liées à la sécurité
            sinistres = Sinistre.objects.filter(
                nature__in=['INCENDIE', 'CATASTROPHE_NATUREL', 'INTEMPERIE', 'VIOLENCE_POLITIQUE']
            )
        else:
            # Assurance, Ingénieur, Admin : accès global
            sinistres = Sinistre.objects.all()

        # Filtres optionnels via query params
        statut_filter = request.query_params.get('statut')
        nature_filter = request.query_params.get('nature')
        if statut_filter:
            sinistres = sinistres.filter(statut=statut_filter)
        if nature_filter:
            sinistres = sinistres.filter(nature=nature_filter)

        sinistres = sinistres.select_related('site', 'createur').order_by('-dateCreation')

        # Pagination manuelle (APIView ne pagine pas automatiquement)
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get('page_size', 20))
        page = paginator.paginate_queryset(sinistres, request)

        if page is not None:
            serializer = SinistreListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = SinistreListSerializer(sinistres, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        serializer = SinistreCreateSerializer(data=request.data)
        if serializer.is_valid():
            sinistre = serializer.save(createur=request.user, statut='OUVERT')

            # Journaliser la création
            _log_changement_statut(
                sinistre, '', 'OUVERT', request.user,
                'Déclaration initiale du sinistre.'
            )

            # --- Notifications ---
            lien = f"/declarations/completer/{sinistre.idSinistre}"
            
            # CRITICAL ZONE ALERT: 3 claims in the current month
            from datetime import date
            current_month = date.today().month
            current_year = date.today().year
            claims_this_month = Sinistre.objects.filter(
                site=sinistre.site,
                dateCreation__year=current_year,
                dateCreation__month=current_month
            ).count()

            from accounts.models import Assurance, Ingenieur, Legal
            directeurs_assurance = Assurance.objects.filter(role=Assurance.RoleAssurance.DIRECTRICE)
            ingenieurs = Ingenieur.objects.all()

            if claims_this_month >= 3:
                alert_msg = f"ALERTE CRITIQUE: Le site {sinistre.site.codeSite} a enregistré {claims_this_month} sinistres ce mois-ci."
                _create_notification(directeurs_assurance, alert_msg, lien, expediteur=request.user, sinistre_id=sinistre.idSinistre)
                _create_notification(ingenieurs, alert_msg, lien, expediteur=request.user, sinistre_id=sinistre.idSinistre)
            
            # 1. Informer le Directeur Assurance
            _create_notification(directeurs_assurance, f"Nouveau sinistre déclaré : {sinistre.idSinistre} ({sinistre.get_nature_display()}).", lien, expediteur=request.user, sinistre_id=sinistre.idSinistre)
            
            # 2. Informer l'Ingénieur
            _create_notification(ingenieurs, f"Besoin d'expertise pour le sinistre {sinistre.idSinistre}.", lien, expediteur=request.user, sinistre_id=sinistre.idSinistre)
            
            # 3. Informer le rôle Legal si Vol ou Vandalisme
            if sinistre.nature in ['VOL', 'ACTE_DE_SABOTAGE']:
                legals = Legal.objects.all()
                _create_notification(legals, f"Dossier juridique potentiel (Vol/Vandalisme) : {sinistre.idSinistre}.", lien, expediteur=request.user, sinistre_id=sinistre.idSinistre)

            return Response(
                SinistreDetailSerializer(sinistre).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ═════════════════════════════════════════════
#  SINISTRE — Détail, Mise à jour, Suppression
# ═════════════════════════════════════════════

class SinistreDetailView(APIView):
    """
    GET    /api/sinistres/<pk>/    → Détail complet
    PUT    /api/sinistres/<pk>/    → Mise à jour (champs descriptifs)
    DELETE /api/sinistres/<pk>/    → Suppression (Admin / Assurance uniquement)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)
        user = request.user

        # ── Vérification de visibilité par rôle ──
        HSE_NATURES = ['INCENDIE', 'CATASTROPHE_NATUREL', 'INTEMPERIE', 'VIOLENCE_POLITIQUE']

        if hasattr(user, 'equipeterrain') and sinistre.createur != user:
            return Response(
                {'error': "Vous n'avez accès qu'à vos propres déclarations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if hasattr(user, 'legal') and sinistre.nature != 'VOL':
            return Response(
                {'error': "Le service Légal n'a accès qu'aux dossiers de nature VOL."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if hasattr(user, 'hse') and sinistre.nature not in HSE_NATURES:
            return Response(
                {'error': "Le service HSE n'a accès qu'aux dossiers liés à la sécurité."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(SinistreDetailSerializer(sinistre).data)

    @transaction.atomic
    def patch(self, request, pk):
        return self.put(request, pk)

    @transaction.atomic
    def put(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        # Seul le créateur, un ingénieur, l'assurance, legal ou HSE peut modifier
        user = request.user
        is_creator  = sinistre.createur == user
        is_ing      = hasattr(user, 'ingenieur')
        is_assur    = hasattr(user, 'assurance')
        is_legal    = hasattr(user, 'legal')
        is_hse      = hasattr(user, 'hse')
        is_admin    = user.is_staff or user.is_superuser

        if not (is_creator or is_ing or is_assur or is_admin or is_legal or is_hse):
            return Response(
                {'error': "Vous n'avez pas la permission de modifier ce sinistre."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Champs modifiables selon le statut
        allowed_fields = [
            'descriptionDetailliee', 'montantEstime', 'urgence',
            'heureSurvenance', 'numeroPV', 'observationsLegal',
            'observationsHSE', 'mesuresCorrectives',
        ]
        
        # Admin et Assurance peuvent forcer le changement de statut
        if is_assur or is_admin:
            allowed_fields.append('statut')

        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        for field, value in update_data.items():
            setattr(sinistre, field, value)
        sinistre.save()

        return Response(SinistreDetailSerializer(sinistre).data)

    def delete(self, request, pk):
        user = request.user
        if not (hasattr(user, 'assurance') or user.is_staff or user.is_superuser):
            return Response(
                {'error': 'Seuls les administrateurs et l\'assurance peuvent supprimer un sinistre.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        sinistre = get_object_or_404(Sinistre, pk=pk)
        sinistre.delete()
        return Response(
            {'message': 'Sinistre supprimé.'},
            status=status.HTTP_204_NO_CONTENT,
        )


# ═════════════════════════════════════════════
#  WORKFLOW STEP 1 : Ingénieur → Expertise technique
# ═════════════════════════════════════════════

class SinistreExpertiseView(APIView):
    """
    POST /api/sinistres/<pk>/expertise/

    L'ingénieur complète l'évaluation technique et transmet le dossier.
    Transition : OUVERT | REJET_POUR_COMPLEMENT → EN_EXPERTISE

    Body JSON :
    {
        "observationsIngenieur": "Description technique...",
        "montantEstime": 150000.0
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsIngenieurOrAssurance]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        # Vérifier le statut attendu
        if sinistre.statut not in ('OUVERT', 'REJET_POUR_COMPLEMENT'):
            return Response(
                {'error': f"Ce sinistre est en statut '{sinistre.get_statut_display()}'. "
                          f"L'expertise n'est possible que pour les sinistres OUVERT ou REJETÉ POUR COMPLÉMENT."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = sinistre.statut

        # Mise à jour des champs techniques
        sinistre.observationsIngenieur = request.data.get(
            'observationsIngenieur', sinistre.observationsIngenieur
        )
        if 'montantEstime' in request.data:
            sinistre.montantEstime = request.data['montantEstime']

        # Expertise complétée → toujours EN_EXPERTISE (la vérification franchise se fait lors de la validation assurance)
        sinistre.statut = 'EN_EXPERTISE'
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'EN_EXPERTISE', request.user,
            f'Expertise technique complétée. Montant estimé : {sinistre.montantEstime} DA.'
        )

        from accounts.models import Assurance
        directeurs_assurance = Assurance.objects.filter(role=Assurance.RoleAssurance.DIRECTRICE)
        lien = f"/gestion/{sinistre.idSinistre}"
        _create_notification(
            directeurs_assurance,
            f"Expertise terminée pour le sinistre {sinistre.idSinistre}. Le dossier est prêt pour votre validation.",
            lien, expediteur=request.user, sinistre_id=sinistre.idSinistre
        )

        return Response(SinistreDetailSerializer(sinistre).data)

# ═════════════════════════════════════════════
#  WORKFLOW STEP 1.5 : Assurance → Validation Clôture Sous Franchise
# ═════════════════════════════════════════════

class SinistreValidationFranchiseView(APIView):
    """
    POST /api/sinistres/<pk>/validation-franchise/
    L'assurance valide manuellement un dossier dont le montant est inférieur à la franchise.
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut != 'ATTENTE_VALIDATION_FRANCHISE':
            return Response(
                {'error': f"Ce sinistre n'est pas en attente de validation de franchise. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = sinistre.statut
        sinistre.statut = 'CLOTURE_SOUS_FRANCHISE'
        sinistre.dateCloture = timezone.now()
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'CLOTURE_SOUS_FRANCHISE', request.user,
            'Validation manuelle de la clôture sous franchise par l\'Assurance.'
        )

        from accounts.models import Ingenieur
        ingenieurs = Ingenieur.objects.all()
        _create_notification(ingenieurs, f"Le dossier {sinistre.idSinistre} a été clôturé sous franchise.", f"/gestion/{sinistre.idSinistre}", expediteur=request.user, sinistre_id=sinistre.idSinistre)
        if sinistre.createur and not hasattr(sinistre.createur, 'ingenieur'):
            _create_notification(sinistre.createur, f"Le dossier {sinistre.idSinistre} a été clôturé sous franchise.", f"/gestion/{sinistre.idSinistre}", expediteur=request.user, sinistre_id=sinistre.idSinistre)

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW : Retour à compléter (Assurance → Ingénieur)
# ═════════════════════════════════════════════

class SinistreRetourCompletionView(APIView):
    """
    POST /api/sinistres/<pk>/retour-completion/

    L'assurance (ou admin) renvoie un dossier à l'ingénieur pour complétion.
    Transition : EN_EXPERTISE → OUVERT

    Body JSON :
    {
        "motif": "Informations manquantes sur les équipements"
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut not in ('EN_EXPERTISE', 'EN_VALIDATION'):
            return Response(
                {'error': f"Ce sinistre est en statut '{sinistre.get_statut_display()}'. "
                          f"Le retour n'est possible que pour les sinistres EN EXPERTISE ou EN VALIDATION."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = sinistre.statut
        motif = request.data.get('motif', 'Informations manquantes')

        sinistre.statut = 'OUVERT'
        sinistre.motifRejet = motif
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'OUVERT', request.user,
            f'Dossier renvoyé pour complétion : {motif}'
        )

        # Notifier tous les ingénieurs
        from accounts.models import Ingenieur
        ingenieurs = Ingenieur.objects.all()
        lien = f"/declarations/completer/{sinistre.idSinistre}"
        _create_notification(
            ingenieurs,
            f"Dossier {sinistre.idSinistre} renvoyé pour complétion : {motif}",
            lien,
            expediteur=request.user,
            sinistre_id=sinistre.idSinistre
        )

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW STEP 2 : Assurance → Validation / Rejet pour complément
# ═════════════════════════════════════════════

class SinistreValidationAssuranceView(APIView):
    """
    POST /api/sinistres/<pk>/validation/

    L'assurance examine le dossier et décide :
      - action = "VALIDER"  → transmet aux services internes (Legal/HSE)
      - action = "REJETER"  → renvoie à l'ingénieur pour complément

    Body JSON :
    {
        "action": "VALIDER" | "REJETER",
        "commentaire": "Motif optionnel..."
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut not in ('EN_EXPERTISE', 'ATTENTE_VALIDATION_FRANCHISE'):
            return Response(
                {'error': f"Ce sinistre doit être en statut 'En Expertise' pour être validé. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action      = request.data.get('action', '').upper()
        commentaire = request.data.get('commentaire', '')

        if action == 'VALIDER':
            ancien_statut = sinistre.statut

            # ── VÉRIFICATION FRANCHISE (s'applique après validation assurance) ──
            from .models import Franchise
            try:
                franchise = Franchise.objects.get(nature=sinistre.nature)
                franchise_amount = franchise.montant
            except Franchise.DoesNotExist:
                franchise_amount = 0.0

            # VOL et SABOTAGE sont exemptés de la franchise
            nature_exclue_franchise = sinistre.nature in ['VOL', 'ACTE_DE_SABOTAGE']

            if not nature_exclue_franchise and franchise_amount > 0 and sinistre.montantEstime < franchise_amount:
                # Montant sous la franchise → attente de clôture sous franchise
                sinistre.statut = 'ATTENTE_VALIDATION_FRANCHISE'
                sinistre.save()
                _log_changement_statut(
                    sinistre, ancien_statut, 'ATTENTE_VALIDATION_FRANCHISE', request.user,
                    f'Montant estimé ({sinistre.montantEstime} DA) inférieur à la franchise ({franchise_amount} DA). En attente de validation clôture.'
                )
                lien = f"/gestion/{sinistre.idSinistre}"
                _create_notification(
                    [request.user],
                    f"Le sinistre {sinistre.idSinistre} est sous la franchise ({franchise_amount} DA). En attente de clôture sous franchise.",
                    lien, expediteur=request.user, sinistre_id=sinistre.idSinistre
                )
            else:
                # Montant >= franchise → routage normal selon la nature
                if sinistre.nature == 'VOL' or sinistre.nature == 'ACTE_DE_SABOTAGE':
                    sinistre.statut = 'EN_VALIDATION_LEGAL'
                    msg = 'Dossier validé. Transmis au service Légal pour PV de Police.'
                elif sinistre.nature == 'INCENDIE':
                    sinistre.statut = 'EN_VALIDATION_HSE'
                    msg = 'Dossier validé. Transmis au service HSE pour rapport d\'expertise.'
                else:
                    sinistre.statut = 'VALIDE'
                    msg = 'Dossier validé en interne. Prêt pour transmission.'

                sinistre.save()
                _log_changement_statut(sinistre, ancien_statut, sinistre.statut, request.user, msg)

                lien = f"/gestion/{sinistre.idSinistre}"
                if sinistre.statut == 'EN_VALIDATION_LEGAL':
                    from accounts.models import Legal
                    legals = Legal.objects.all()
                    _create_notification(legals, f"Dossier {sinistre.idSinistre} validé par l'assurance. En attente du PV de Police.", lien, expediteur=request.user, sinistre_id=sinistre.idSinistre)
                elif sinistre.statut == 'EN_VALIDATION_HSE':
                    from accounts.models import Hse
                    hses = Hse.objects.all()
                    _create_notification(hses, f"Dossier {sinistre.idSinistre} validé par l'assurance. En attente du rapport d'expertise HSE.", lien, expediteur=request.user, sinistre_id=sinistre.idSinistre)
                elif sinistre.statut == 'VALIDE':
                    from accounts.models import Assurance as AssuranceModel
                    directeurs = AssuranceModel.objects.filter(role=AssuranceModel.RoleAssurance.DIRECTRICE)
                    _create_notification(directeurs, f"Dossier {sinistre.idSinistre} validé en interne. Prêt pour transmission à l'assureur.", lien, expediteur=request.user, sinistre_id=sinistre.idSinistre)

        elif action == 'REJETER':
            ancien_statut = sinistre.statut
            sinistre.statut = 'REJET_POUR_COMPLEMENT'
            sinistre.motifRejet = commentaire
            sinistre.save()
            _log_changement_statut(
                sinistre, ancien_statut, 'REJET_POUR_COMPLEMENT', request.user,
                f'Dossier rejeté pour complément. Motif : {commentaire}'
            )

            # Notifier les ingénieurs du rejet pour complément
            from accounts.models import Ingenieur
            ingenieurs = Ingenieur.objects.all()
            lien = f"/declarations/completer/{sinistre.idSinistre}"
            _create_notification(
                ingenieurs,
                f"L'assurance a demandé des modifications pour le dossier {sinistre.idSinistre}. Motif : {commentaire}",
                lien,
                expediteur=request.user,
                sinistre_id=sinistre.idSinistre
            )

        else:
            return Response(
                {'error': "L'action doit être 'VALIDER' ou 'REJETER'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW STEP 3a : Légal → PV de Police (VOL)
# ═════════════════════════════════════════════

class SinistreValidationLegalView(APIView):
    """
    POST /api/sinistres/<pk>/validation-legal/

    Le service Légal ajoute le numéro du PV de Police.
    Transition : EN_VALIDATION_LEGAL → VALIDE

    Body JSON :
    {
        "numeroPV": "PV-2026-00123",
        "observationsLegal": "Observations optionnelles..."
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsLegal]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut != 'EN_VALIDATION_LEGAL':
            return Response(
                {'error': f"Ce sinistre doit être en statut 'En Validation Légale'. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        numero_pv = request.data.get('numeroPV')
        if not numero_pv:
            return Response(
                {'error': "Le numéro du PV de Police est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = sinistre.statut
        sinistre.numeroPV = numero_pv
        sinistre.observationsLegal = request.data.get(
            'observationsLegal', sinistre.observationsLegal
        )
        sinistre.statut = 'VALIDE'
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'VALIDE', request.user,
            f'PV de Police ajouté (N° {numero_pv}). Dossier validé en interne.'
        )

        # Notifier l'assurance que le PV légal est prêt
        from accounts.models import Assurance
        directeurs_assurance = Assurance.objects.filter(role=Assurance.RoleAssurance.DIRECTRICE)
        lien = f"/gestion/{sinistre.idSinistre}"
        _create_notification(
            directeurs_assurance,
            f"Le service Légal a ajouté le PV de Police pour le dossier {sinistre.idSinistre}. Dossier prêt pour transmission.",
            lien,
            expediteur=request.user,
            sinistre_id=sinistre.idSinistre
        )

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW STEP 3b : HSE → Rapport d'expertise (INCENDIE)
# ═════════════════════════════════════════════

class SinistreValidationHSEView(APIView):
    """
    POST /api/sinistres/<pk>/validation-hse/

    Le service HSE ajoute ses observations et mesures correctives.
    Transition : EN_VALIDATION_HSE → VALIDE

    Body JSON :
    {
        "observationsHSE": "Observations de sécurité...",
        "mesuresCorrectives": "Mesures proposées..."
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsHse]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut != 'EN_VALIDATION_HSE':
            return Response(
                {'error': f"Ce sinistre doit être en statut 'En Validation HSE'. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        observations = request.data.get('observationsHSE')
        if not observations:
            return Response(
                {'error': "Les observations HSE sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = sinistre.statut
        sinistre.observationsHSE = observations
        sinistre.mesuresCorrectives = request.data.get(
            'mesuresCorrectives', sinistre.mesuresCorrectives
        )
        sinistre.statut = 'VALIDE'
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'VALIDE', request.user,
            'Rapport HSE complété. Dossier validé en interne.'
        )

        # Notifier l'assurance que le rapport HSE est prêt
        from accounts.models import Assurance
        directeurs_assurance = Assurance.objects.filter(role=Assurance.RoleAssurance.DIRECTRICE)
        lien = f"/gestion/{sinistre.idSinistre}"
        _create_notification(
            directeurs_assurance,
            f"Le service HSE a complété le rapport pour le dossier {sinistre.idSinistre}. Dossier prêt pour transmission.",
            lien,
            expediteur=request.user,
            sinistre_id=sinistre.idSinistre
        )

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW STEP 4 : Assurance → Décision finale
# ═════════════════════════════════════════════

class SinistreDecisionView(APIView):
    """
    POST /api/sinistres/<pk>/decision/

    L'assurance rend la décision finale (transmission externe).
    Transition : VALIDE → TRANSMIS_ASSUREUR ou REJETE

    Body JSON :
    {
        "decision": "ACCEPTER" | "REFUSER",
        "montantIndemnisation": 120000.0,
        "commentaire": "Motif..."
    }
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut != 'VALIDE':
            return Response(
                {'error': f"Ce sinistre doit être en statut 'Validé' en interne. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision    = request.data.get('decision', '').upper()
        commentaire = request.data.get('commentaire', '')

        if decision == 'ACCEPTER':
            ancien_statut = sinistre.statut
            sinistre.statut = 'TRANSMIS_ASSUREUR'
            sinistre.montantIndemnisation = request.data.get(
                'montantIndemnisation', sinistre.montantIndemnisation
            )
            sinistre.save()
            _log_changement_statut(
                sinistre, ancien_statut, 'TRANSMIS_ASSUREUR', request.user,
                f'Dossier transmis à l\'assureur externe. {commentaire}'
            )
            from accounts.models import Ingenieur
            _create_notification(Ingenieur.objects.all(), f"Dossier {sinistre.idSinistre} transmis à l'assureur.", f"/gestion/{sinistre.idSinistre}", expediteur=request.user, sinistre_id=sinistre.idSinistre)
            if sinistre.createur and not hasattr(sinistre.createur, 'ingenieur'):
                _create_notification(sinistre.createur, f"Dossier {sinistre.idSinistre} transmis à l'assureur.", f"/gestion/{sinistre.idSinistre}", expediteur=request.user, sinistre_id=sinistre.idSinistre)

        elif decision == 'REFUSER':
            ancien_statut = sinistre.statut
            sinistre.statut = 'REJETE'
            sinistre.motifRejet = commentaire
            sinistre.save()
            _log_changement_statut(
                sinistre, ancien_statut, 'REJETE', request.user,
                f'Dossier refusé (DSNR). Motif : {commentaire}'
            )
            from accounts.models import Ingenieur
            _create_notification(Ingenieur.objects.all(), f"Dossier {sinistre.idSinistre} rejeté (DSNR).", f"/gestion/{sinistre.idSinistre}", expediteur=request.user, sinistre_id=sinistre.idSinistre)
            if sinistre.createur and not hasattr(sinistre.createur, 'ingenieur'):
                _create_notification(sinistre.createur, f"Dossier {sinistre.idSinistre} rejeté (DSNR).", f"/gestion/{sinistre.idSinistre}", expediteur=request.user, sinistre_id=sinistre.idSinistre)

        else:
            return Response(
                {'error': "La décision doit être 'ACCEPTER' ou 'REFUSER'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW STEP 5 : Assurance → Clôture
# ═════════════════════════════════════════════

class SinistreCloturerView(APIView):
    """
    POST /api/sinistres/<pk>/cloturer/

    Seule l'Assurance peut clôturer un sinistre.
    Transition : TRANSMIS_ASSUREUR | REJETE → CLOTURE
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut not in ('TRANSMIS_ASSUREUR', 'REJETE'):
            return Response(
                {'error': f"Seuls les sinistres Transmis ou Rejetés peuvent être clôturés. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = sinistre.statut
        sinistre.statut = 'CLOTURE'
        sinistre.dateCloture = timezone.now()
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'CLOTURE', request.user,
            request.data.get('commentaire', 'Sinistre clôturé.')
        )

        from accounts.models import Ingenieur
        _create_notification(Ingenieur.objects.all(), f"Dossier {sinistre.idSinistre} clôturé avec succès.", f"/gestion/{sinistre.idSinistre}", expediteur=request.user, sinistre_id=sinistre.idSinistre)
        if sinistre.createur and not hasattr(sinistre.createur, 'ingenieur'):
            _create_notification(sinistre.createur, f"Dossier {sinistre.idSinistre} clôturé avec succès.", f"/gestion/{sinistre.idSinistre}", expediteur=request.user, sinistre_id=sinistre.idSinistre)

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW STEP 6 : Assurance → Archivage
# ═════════════════════════════════════════════

class SinistreArchiverView(APIView):
    """
    POST /api/sinistres/<pk>/archiver/

    Seule l'Assurance peut archiver un sinistre clôturé.
    Transition : CLOTURE → ARCHIVE
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut not in ('CLOTURE', 'CLOTURE_SOUS_FRANCHISE'):
            return Response(
                {'error': f"Seuls les sinistres clôturés peuvent être archivés. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = sinistre.statut
        sinistre.statut = 'ARCHIVE'
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'ARCHIVE', request.user,
            'Sinistre archivé.'
        )

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  EQUIPEMENT — CRUD (Ingénieur / Assurance)
# ═════════════════════════════════════════════

class EquipementListCreateView(APIView):
    """
    GET  /api/equipements/                       → Liste tous les équipements
    GET  /api/sinistres/<pk>/equipements/         → Équipements d'un sinistre
    POST /api/equipements/                        → Ajouter un équipement au catalogue (Ingénieur/Assurance)
    POST /api/sinistres/<pk>/equipements/         → Ajouter un équipement à un sinistre (tout utilisateur authentifié actif)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            # Adding equipment linked to a sinistre → any authenticated active user
            # Adding to the catalog (no sinistre) → Ingénieur or Assurance only
            sinistre_pk = self.kwargs.get('sinistre_pk') or self.request.data.get('sinistre')
            if sinistre_pk:
                return [permissions.IsAuthenticated(), IsAnyAuthenticated()]
            return [permissions.IsAuthenticated(), IsIngenieurOrAssurance()]
        return [permissions.IsAuthenticated()]

    def get(self, request, sinistre_pk=None):
        if sinistre_pk:
            # Nested route: equipment linked to a specific sinistre
            get_object_or_404(Sinistre, pk=sinistre_pk)
            equipements = Equipement.objects.filter(sinistre_id=sinistre_pk)
        else:
            # Global catalog: only standalone entries (not linked to any sinistre)
            equipements = Equipement.objects.filter(sinistre__isnull=True)
        return Response(EquipementSerializer(equipements, many=True).data)

    @transaction.atomic
    def post(self, request, sinistre_pk=None):
        import uuid
        data = request.data.copy()
        if sinistre_pk:
            data['sinistre'] = sinistre_pk

        # Auto-generate idEquipement if not provided
        if not data.get('idEquipement'):
            data['idEquipement'] = f"EQ-{uuid.uuid4().hex[:8].upper()}"

        serializer = EquipementSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EquipementDetailView(APIView):
    """
    GET    /api/equipements/<pk>/
    PUT    /api/equipements/<pk>/
    DELETE /api/equipements/<pk>/
    """
    def get_permissions(self):
        if self.request.method in ('PUT', 'DELETE'):
            return [permissions.IsAuthenticated(), IsIngenieurOrAssurance()]
        return [permissions.IsAuthenticated()]

    def get(self, request, pk):
        equipement = get_object_or_404(Equipement, pk=pk)
        return Response(EquipementSerializer(equipement).data)

    @transaction.atomic
    def put(self, request, pk):
        equipement = get_object_or_404(Equipement, pk=pk)
        serializer = EquipementSerializer(equipement, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        equipement = get_object_or_404(Equipement, pk=pk)
        equipement.delete()
        return Response(
            {'message': 'Équipement supprimé.'},
            status=status.HTTP_204_NO_CONTENT,
        )


# ═════════════════════════════════════════════
#  EQUIPEMENT — Suggestions (Autocomplete)
# ═════════════════════════════════════════════

class EquipementSuggestionsView(APIView):
    """
    GET /api/equipements/suggestions/?q=Rou
    Returns distinct equipment names and average values from past sinistres
    for autocomplete suggestions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()

        qs = Equipement.objects.values('nomMarque').annotate(
            avg_value=models.Avg('valeurComptable'),
            count=models.Count('idEquipement'),
        ).order_by('-count')

        if query:
            qs = qs.filter(nomMarque__icontains=query)

        suggestions = [
            {
                'nomMarque': item['nomMarque'],
                'avgValue': round(item['avg_value'] or 0, 2),
                'count': item['count'],
            }
            for item in qs[:20]
        ]

        return Response(suggestions)


# ═════════════════════════════════════════════
#  PIECE JOINTE — Upload & Gestion
# ═════════════════════════════════════════════

class PieceJointeListCreateView(APIView):
    """
    GET  /api/pieces/                           → Liste toutes les pièces
    GET  /api/sinistres/<pk>/pieces/             → Pièces d'un sinistre
    POST /api/pieces/                            → Upload d'une pièce jointe

    Permissions :
        - PHOTO_TERRAIN       → Équipe Terrain
        - PV_POLICE           → Légal
        - RAPPORT_HSE         → HSE
        - RAPPORT_EXPERTISE   → Ingénieur
        - DOCUMENT_ASSURANCE  → Assurance
        - AUTRE               → Tout utilisateur authentifié
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, sinistre_pk=None):
        if sinistre_pk:
            get_object_or_404(Sinistre, pk=sinistre_pk)
            pieces = PieceJointe.objects.filter(sinistre_id=sinistre_pk)
        else:
            pieces = PieceJointe.objects.all()
        return Response(PieceJointeSerializer(pieces, many=True).data)

    @transaction.atomic
    def post(self, request, sinistre_pk=None):
        data = request.data.copy()
        if sinistre_pk:
            data['sinistre'] = sinistre_pk

        serializer = PieceJointeSerializer(data=data)
        if serializer.is_valid():
            serializer.save(uploadePar=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PieceJointeDetailView(APIView):
    """
    GET    /api/pieces/<pk>/
    DELETE /api/pieces/<pk>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        piece = get_object_or_404(PieceJointe, pk=pk)
        return Response(PieceJointeSerializer(piece).data)

    def delete(self, request, pk):
        piece = get_object_or_404(PieceJointe, pk=pk)

        # Seul l'uploader, l'assurance ou l'admin peut supprimer
        user = request.user
        if not (piece.uploadePar == user or hasattr(user, 'assurance')
                or user.is_staff or user.is_superuser):
            return Response(
                {'error': "Vous n'avez pas la permission de supprimer cette pièce."},
                status=status.HTTP_403_FORBIDDEN,
            )

        piece.fichier.delete(save=False)  # Supprimer le fichier physique
        piece.delete()
        return Response(
            {'message': 'Pièce jointe supprimée.'},
            status=status.HTTP_204_NO_CONTENT,
        )


# ═════════════════════════════════════════════
#  HISTORIQUE STATUT (lecture seule)
# ═════════════════════════════════════════════

class HistoriqueStatutListView(APIView):
    """
    GET /api/sinistres/<pk>/historique/
    Retourne le journal complet des changements de statut d'un sinistre.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        get_object_or_404(Sinistre, pk=pk)
        historique = HistoriqueStatut.objects.filter(sinistre_id=pk)
        return Response(HistoriqueStatutSerializer(historique, many=True).data)




# ═════════════════════════════════════════════
#  NOTIFICATIONS
# ═════════════════════════════════════════════

class NotificationListView(APIView):
    """
    GET /api/notifications/
    Retourne la liste des notifications pour l'utilisateur connecté.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(utilisateur=request.user)
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MarkNotificationReadView(APIView):
    """
    POST /api/notifications/<id>/read/
    Marque une notification spécifique comme lue.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, utilisateur=request.user)
            notification.is_read = True
            notification.save()
            return Response({"message": "Notification marquée comme lue"}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"error": "Notification non trouvée"}, status=status.HTTP_404_NOT_FOUND)

# ═════════════════════════════════════════════
#  FRANCHISE
# ═════════════════════════════════════════════

class FranchiseListView(APIView):
    """
    GET /api/franchises/
    Retourne la liste des franchises pour toutes les natures.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import Franchise
        from .serializers import FranchiseSerializer
        
        # S'assurer que chaque nature a une franchise (création auto à 0 si n'existe pas)
        for code, label in NATURE_CHOICES:
            Franchise.objects.get_or_create(nature=code)

        franchises = Franchise.objects.all().order_by('nature')
        return Response(FranchiseSerializer(franchises, many=True).data)

class FranchiseUpdateView(APIView):
    """
    PUT /api/franchises/<nature>/
    Met à jour le montant de la franchise pour une nature spécifique.
    Accès: Assurance / Admin
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    @transaction.atomic
    def put(self, request, nature):
        from .models import Franchise
        from .serializers import FranchiseSerializer
        
        # S'assurer que la nature est valide
        valid_natures = [n[0] for n in NATURE_CHOICES]
        if nature not in valid_natures:
            return Response({"error": f"Nature invalide. Natures valides : {valid_natures}"}, status=status.HTTP_400_BAD_REQUEST)
        
        franchise, created = Franchise.objects.get_or_create(nature=nature)
        
        if 'montant' in request.data:
            try:
                franchise.montant = float(request.data['montant'])
            except ValueError:
                return Response({"error": "Le montant doit être un nombre."}, status=status.HTTP_400_BAD_REQUEST)
                
            franchise.modifie_par = request.user
            franchise.save()
            return Response(FranchiseSerializer(franchise).data)
        
        return Response({"error": "Le champ 'montant' est requis."}, status=status.HTTP_400_BAD_REQUEST)

