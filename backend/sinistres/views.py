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
from django.db import transaction
from django.db.models import Q

from .models import (
    Site, Sinistre, Equipement, PieceJointe, HistoriqueStatut,
    NATURE_CHOICES, TYPE_PAR_NATURE, STATUT_CHOICES, URGENCE_CHOICES,
)
from .serializers import (
    SiteSerializer,
    SinistreListSerializer,
    SinistreDetailSerializer,
    SinistreCreateSerializer,
    EquipementSerializer,
    PieceJointeSerializer,
    HistoriqueStatutSerializer,
)
from accounts.permissions import (
    IsEquipeTerrain,
    IsIngenieur,
    IsLegal,
    IsHse,
    IsAssurance,
    IsAdmin,
)


# ═════════════════════════════════════════════
#  HELPER : Enregistrer un changement de statut
# ═════════════════════════════════════════════

def _log_changement_statut(sinistre, ancien, nouveau, user, commentaire=''):
    """Crée une entrée dans le journal HistoriqueStatut."""
    HistoriqueStatut.objects.create(
        sinistre=sinistre,
        ancienStatut=ancien,
        nouveauStatut=nouveau,
        modifiePar=user,
        commentaire=commentaire,
    )


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
        return Response({
            'natures': [{'code': code, 'label': label} for code, label in NATURE_CHOICES],
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
    POST /api/sites/       → Crée un site (Assurance Directrice / Admin)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsAssurance()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        sites = Site.objects.all()

        # Recherche par codeSite ou nomSite (pour l'autocomplete frontend)
        search = request.query_params.get('search', '').strip()
        if search:
            sites = sites.filter(
                Q(codeSite__icontains=search) |
                Q(nomSite__icontains=search)
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
            return [permissions.IsAuthenticated(), IsAssurance()]
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
            return [permissions.IsAuthenticated(), IsEquipeTerrain()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        user = request.user

        # Équipe Terrain : ne voit que ses propres sinistres
        if hasattr(user, 'equipeterrain'):
            sinistres = Sinistre.objects.filter(createur=user)
        else:
            sinistres = Sinistre.objects.all()

        # Filtres optionnels via query params
        statut_filter = request.query_params.get('statut')
        nature_filter = request.query_params.get('nature')
        if statut_filter:
            sinistres = sinistres.filter(statut=statut_filter)
        if nature_filter:
            sinistres = sinistres.filter(nature=nature_filter)

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
        return Response(SinistreDetailSerializer(sinistre).data)

    @transaction.atomic
    def put(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        # Seul le créateur, un ingénieur, ou l'assurance peut modifier
        user = request.user
        is_creator  = sinistre.createur == user
        is_ing      = hasattr(user, 'ingenieur')
        is_assur    = hasattr(user, 'assurance')
        is_admin    = user.is_staff or user.is_superuser

        if not (is_creator or is_ing or is_assur or is_admin):
            return Response(
                {'error': "Vous n'avez pas la permission de modifier ce sinistre."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Champs modifiables selon le statut
        allowed_fields = [
            'descriptionDetailliee', 'montantEstime', 'urgence',
            'heureSurvenance',
        ]
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
    permission_classes = [permissions.IsAuthenticated, IsIngenieur]

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

        sinistre.statut = 'EN_EXPERTISE'
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'EN_EXPERTISE', request.user,
            'Expertise technique complétée. Dossier transmis pour validation.'
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

        if sinistre.statut != 'EN_EXPERTISE':
            return Response(
                {'error': f"Ce sinistre doit être en statut 'En Expertise' pour être validé. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action      = request.data.get('action', '').upper()
        commentaire = request.data.get('commentaire', '')

        if action == 'VALIDER':
            ancien_statut = sinistre.statut

            # Routage conditionnel selon la nature (diagramme de séquence)
            if sinistre.nature == 'VOL' or sinistre.nature == 'ACTE_DE_SABOTAGE':
                sinistre.statut = 'EN_VALIDATION_LEGAL'
                msg = 'Dossier validé. Transmis au service Légal pour PV de Police.'
            elif sinistre.nature == 'INCENDIE':
                sinistre.statut = 'EN_VALIDATION_HSE'
                msg = 'Dossier validé. Transmis au service HSE pour rapport d\'expertise.'
            else:
                sinistre.statut = 'TRANSMIS_ASSUREUR'
                msg = 'Dossier validé. Transmis pour décision finale.'

            sinistre.save()
            _log_changement_statut(sinistre, ancien_statut, sinistre.statut, request.user, msg)

        elif action == 'REJETER':
            ancien_statut = sinistre.statut
            sinistre.statut = 'REJET_POUR_COMPLEMENT'
            sinistre.motifRejet = commentaire
            sinistre.save()
            _log_changement_statut(
                sinistre, ancien_statut, 'REJET_POUR_COMPLEMENT', request.user,
                f'Dossier rejeté pour complément. Motif : {commentaire}'
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
    Transition : EN_VALIDATION_LEGAL → TRANSMIS_ASSUREUR

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
        sinistre.statut = 'TRANSMIS_ASSUREUR'
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'TRANSMIS_ASSUREUR', request.user,
            f'PV de Police ajouté (N° {numero_pv}). Dossier transmis à l\'assureur.'
        )

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW STEP 3b : HSE → Rapport d'expertise (INCENDIE)
# ═════════════════════════════════════════════

class SinistreValidationHSEView(APIView):
    """
    POST /api/sinistres/<pk>/validation-hse/

    Le service HSE ajoute ses observations et mesures correctives.
    Transition : EN_VALIDATION_HSE → TRANSMIS_ASSUREUR

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
        sinistre.statut = 'TRANSMIS_ASSUREUR'
        sinistre.save()

        _log_changement_statut(
            sinistre, ancien_statut, 'TRANSMIS_ASSUREUR', request.user,
            'Rapport HSE complété. Dossier transmis à l\'assureur.'
        )

        return Response(SinistreDetailSerializer(sinistre).data)


# ═════════════════════════════════════════════
#  WORKFLOW STEP 4 : Assurance → Décision finale
# ═════════════════════════════════════════════

class SinistreDecisionView(APIView):
    """
    POST /api/sinistres/<pk>/decision/

    L'assurance rend la décision finale.
    Transition : TRANSMIS_ASSUREUR → VALIDE (DSR) ou REJETE (DSNR)

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

        if sinistre.statut != 'TRANSMIS_ASSUREUR':
            return Response(
                {'error': f"Ce sinistre doit être en statut 'Transmis à l'Assureur'. "
                          f"Statut actuel : {sinistre.get_statut_display()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision    = request.data.get('decision', '').upper()
        commentaire = request.data.get('commentaire', '')

        if decision == 'ACCEPTER':
            ancien_statut = sinistre.statut
            sinistre.statut = 'VALIDE'
            sinistre.montantIndemnisation = request.data.get(
                'montantIndemnisation', sinistre.montantIndemnisation
            )
            sinistre.save()
            _log_changement_statut(
                sinistre, ancien_statut, 'VALIDE', request.user,
                f'Dossier accepté (DSR). Prêt pour remboursement. {commentaire}'
            )

        elif decision == 'REFUSER':
            ancien_statut = sinistre.statut
            sinistre.statut = 'REJETE'
            sinistre.motifRejet = commentaire
            sinistre.save()
            _log_changement_statut(
                sinistre, ancien_statut, 'REJETE', request.user,
                f'Dossier refusé (DSNR). Motif : {commentaire}'
            )

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
    Transition : VALIDE | REJETE → CLOTURE
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    @transaction.atomic
    def post(self, request, pk):
        sinistre = get_object_or_404(Sinistre, pk=pk)

        if sinistre.statut not in ('VALIDE', 'REJETE'):
            return Response(
                {'error': f"Seuls les sinistres Validés ou Rejetés peuvent être clôturés. "
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

        if sinistre.statut != 'CLOTURE':
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
    POST /api/equipements/                        → Ajouter un équipement (Ingénieur)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsIngenieurOrAssurance()]
        return [permissions.IsAuthenticated()]

    def get(self, request, sinistre_pk=None):
        if sinistre_pk:
            get_object_or_404(Sinistre, pk=sinistre_pk)
            equipements = Equipement.objects.filter(sinistre_id=sinistre_pk)
        else:
            equipements = Equipement.objects.all()
        return Response(EquipementSerializer(equipements, many=True).data)

    @transaction.atomic
    def post(self, request, sinistre_pk=None):
        data = request.data.copy()
        if sinistre_pk:
            data['sinistre'] = sinistre_pk

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
#  STATISTIQUES (Dashboard)
# ═════════════════════════════════════════════

class StatistiquesView(APIView):
    """
    GET /api/statistiques/
    Retourne les compteurs globaux pour le tableau de bord.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Count, Sum

        total = Sinistre.objects.count()
        par_statut = dict(
            Sinistre.objects.values_list('statut')
            .annotate(count=Count('idSinistre'))
            .values_list('statut', 'count')
        )
        par_nature = dict(
            Sinistre.objects.values_list('nature')
            .annotate(count=Count('idSinistre'))
            .values_list('nature', 'count')
        )
        montant_total = Sinistre.objects.aggregate(
            total=Sum('montantEstime')
        )['total'] or 0

        return Response({
            'totalSinistres':       total,
            'enAttente':            par_statut.get('OUVERT', 0),
            'enExpertise':          par_statut.get('EN_EXPERTISE', 0),
            'transmisAssureur':     par_statut.get('TRANSMIS_ASSUREUR', 0),
            'valides':              par_statut.get('VALIDE', 0),
            'rejetes':              par_statut.get('REJETE', 0),
            'clotures':             par_statut.get('CLOTURE', 0),
            'archives':             par_statut.get('ARCHIVE', 0),
            'parNature':            par_nature,
            'montantTotalEstime':   montant_total,
        })