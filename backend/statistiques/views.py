from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Count, Sum
from collections import defaultdict
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models.functions import TruncMonth, TruncWeek

from sinistres.models import Sinistre, HistoriqueStatut, STATUT_CHOICES, NATURE_CHOICES
from accounts.permissions import IsAssurance

# ═════════════════════════════════════════════
#  STATISTIQUES (Dashboard)
# ═════════════════════════════════════════════

HSE_NATURES = ['INCENDIE', 'CATASTROPHE_NATUREL', 'INTEMPERIE', 'VIOLENCE_POLITIQUE']


def _get_role_queryset(user):
    """Retourne le queryset de sinistres filtré selon le rôle de l'utilisateur."""
    if hasattr(user, 'equipeterrain'):
        return Sinistre.objects.filter(createur=user)
    elif hasattr(user, 'legal'):
        return Sinistre.objects.filter(nature='VOL')
    elif hasattr(user, 'hse'):
        return Sinistre.objects.filter(nature__in=HSE_NATURES)
    else:
        return Sinistre.objects.all()


class StatistiquesView(APIView):
    """
    GET /api/statistiques/
    Retourne les compteurs globaux pour le tableau de bord,
    filtrés selon le rôle de l'utilisateur connecté.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = _get_role_queryset(request.user)

        total = qs.count()
        par_statut = dict(
            qs.values_list('statut')
            .annotate(count=Count('idSinistre'))
            .values_list('statut', 'count')
        )
        par_nature = dict(
            qs.values_list('nature')
            .annotate(count=Count('idSinistre'))
            .values_list('nature', 'count')
        )
        montant_total = qs.aggregate(
            total=Sum('montantEstime')
        )['total'] or 0

        return Response({
            'totalSinistres':       total,
            'enAttente':            par_statut.get('OUVERT', 0),
            'enExpertise':          par_statut.get('EN_EXPERTISE', 0),
            'transmisAssureur':     par_statut.get('TRANSMIS_ASSUREUR', 0),
            'attenteFranchise':     par_statut.get('ATTENTE_VALIDATION_FRANCHISE', 0),
            'valides':              par_statut.get('VALIDE', 0),
            'rejetes':              par_statut.get('REJETE', 0),
            'clotures':             par_statut.get('CLOTURE', 0),
            'cloturesSousFranchise': par_statut.get('CLOTURE_SOUS_FRANCHISE', 0),
            'archives':             par_statut.get('ARCHIVE', 0),
            'parNature':            par_nature,
            'montantTotalEstime':   montant_total,
        })


class StatistiquesDashboardView(APIView):
    """
    GET /api/statistiques/dashboard/
    Retourne les KPIs spécifiques au rôle de l'utilisateur connecté.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        if hasattr(user, 'assurance') or user.is_staff or user.is_superuser:
            return Response(self._kpi_assurance())
        elif hasattr(user, 'ingenieur'):
            return Response(self._kpi_ingenieur())
        elif hasattr(user, 'legal'):
            return Response(self._kpi_legal())
        elif hasattr(user, 'hse'):
            return Response(self._kpi_hse())
        elif hasattr(user, 'equipeterrain'):
            return Response(self._kpi_equipe_terrain(user))
        else:
            return Response({'role': 'UNKNOWN', 'kpis': []})

    def _kpi_assurance(self):
        qs = Sinistre.objects.all()
        total = qs.count()
        ouverts = qs.filter(statut__in=['OUVERT', 'EN_EXPERTISE', 'REJET_POUR_COMPLEMENT',
                                         'TRANSMIS_ASSUREUR', 'EN_VALIDATION_LEGAL',
                                         'EN_VALIDATION_HSE', 'ATTENTE_VALIDATION_FRANCHISE']).count()
        clotures = qs.filter(statut__in=['CLOTURE', 'ARCHIVE', 'VALIDE', 'REJETE', 'CLOTURE_SOUS_FRANCHISE']).count()
        montant = qs.aggregate(total=Sum('montantEstime'))['total'] or 0
        sous_franchise = qs.filter(statut='CLOTURE_SOUS_FRANCHISE').count()
        par_nature = dict(
            qs.values_list('nature').annotate(count=Count('idSinistre')).values_list('nature', 'count')
        )
        nature_labels = dict(NATURE_CHOICES)

        return {
            'role': 'ASSURANCE',
            'kpis': [
                {'key': 'total', 'label': 'Total Sinistres', 'value': total},
                {'key': 'ouverts', 'label': 'Dossiers Ouverts', 'value': ouverts},
                {'key': 'clotures', 'label': 'Dossiers Clôturés', 'value': clotures},
                {'key': 'montant', 'label': 'Impact Financier Total (DZD)', 'value': float(montant)},
                {'key': 'sous_franchise', 'label': 'Clôturés Sous Franchise', 'value': sous_franchise},
            ],
            'par_nature': [
                {'nature': k, 'label': nature_labels.get(k, k), 'count': v}
                for k, v in par_nature.items()
            ],
        }

    def _kpi_ingenieur(self):
        qs = Sinistre.objects.all()
        en_attente = qs.filter(statut__in=['OUVERT', 'REJET_POUR_COMPLEMENT']).count()
        now = timezone.now()
        debut_mois = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Expertises complétées ce mois (transitions vers EN_EXPERTISE ce mois)
        expertises_mois = HistoriqueStatut.objects.filter(
            nouveauStatut='EN_EXPERTISE',
            dateChangement__gte=debut_mois,
        ).count()

        # Temps moyen d'expertise (OUVERT → EN_EXPERTISE)
        from collections import defaultdict
        historiques = HistoriqueStatut.objects.filter(
            nouveauStatut__in=['OUVERT', 'EN_EXPERTISE']
        ).order_by('sinistre_id', 'dateChangement')

        durations = []
        last_ouvert = {}
        for h in historiques:
            if h.nouveauStatut == 'OUVERT':
                last_ouvert[h.sinistre_id] = h.dateChangement
            elif h.nouveauStatut == 'EN_EXPERTISE' and h.sinistre_id in last_ouvert:
                dur = (h.dateChangement - last_ouvert[h.sinistre_id]).total_seconds()
                durations.append(dur)

        avg_hours = round(sum(durations) / len(durations) / 3600, 1) if durations else 0

        return {
            'role': 'INGENIEUR',
            'kpis': [
                {'key': 'en_attente', 'label': "En Attente d'Expertise", 'value': en_attente},
                {'key': 'expertises_mois', 'label': 'Expertises ce Mois', 'value': expertises_mois},
                {'key': 'temps_moyen', 'label': "Temps Moyen d'Expertise (h)", 'value': avg_hours},
            ],
        }

    def _kpi_legal(self):
        qs = Sinistre.objects.filter(nature='VOL')
        en_attente_pv = qs.filter(statut='EN_VALIDATION_LEGAL').count()
        valides = qs.filter(statut__in=['TRANSMIS_ASSUREUR', 'VALIDE', 'CLOTURE', 'ARCHIVE']).count()
        total_vol = qs.count()

        return {
            'role': 'LEGAL',
            'kpis': [
                {'key': 'en_attente_pv', 'label': 'En Attente du PV de Police', 'value': en_attente_pv},
                {'key': 'valides', 'label': 'Dossiers Légaux Validés', 'value': valides},
                {'key': 'total_vol', 'label': 'Total Dossiers VOL', 'value': total_vol},
            ],
        }

    def _kpi_hse(self):
        qs = Sinistre.objects.filter(nature__in=HSE_NATURES)
        en_attente_rapport = qs.filter(statut='EN_VALIDATION_HSE').count()
        valides = qs.filter(statut__in=['TRANSMIS_ASSUREUR', 'VALIDE', 'CLOTURE', 'ARCHIVE']).count()
        total_incidents = qs.count()

        return {
            'role': 'HSE',
            'kpis': [
                {'key': 'en_attente_rapport', 'label': 'En Attente Rapport HSE', 'value': en_attente_rapport},
                {'key': 'valides', 'label': 'Validations HSE Complétées', 'value': valides},
                {'key': 'total_incidents', 'label': 'Total Incidents Sécurité', 'value': total_incidents},
            ],
        }

    def _kpi_equipe_terrain(self, user):
        qs = Sinistre.objects.filter(createur=user)
        total = qs.count()
        actifs = qs.exclude(statut__in=['CLOTURE', 'ARCHIVE', 'CLOTURE_SOUS_FRANCHISE', 'REJETE']).count()
        clotures = qs.filter(statut__in=['CLOTURE', 'ARCHIVE', 'CLOTURE_SOUS_FRANCHISE']).count()

        return {
            'role': 'EQUIPE_TERRAIN',
            'kpis': [
                {'key': 'actifs', 'label': 'Mes Déclarations Actives', 'value': actifs},
                {'key': 'clotures', 'label': 'Mes Déclarations Clôturées', 'value': clotures},
                {'key': 'total', 'label': 'Total Mes Déclarations', 'value': total},
            ],
        }


# ═════════════════════════════════════════════
#  STATISTIQUES ASSURANCE
# ═════════════════════════════════════════════

class StatistiquesAssuranceView(APIView):
    """
    GET /api/sinistres/stats/assurance/
    Renvoie les statistiques pour le tableau de bord Assurance :
    - Nombre de sinistres 'En attente' (OUVERT, ATTENTE_VALIDATION_FRANCHISE)
    - Temps moyen de traitement par étape
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    def get(self, request):
        en_attente_count = Sinistre.objects.filter(statut__in=['OUVERT', 'ATTENTE_VALIDATION_FRANCHISE']).count()
        counts_by_status = Sinistre.objects.values('statut').annotate(count=Count('statut'))
        
        historiques = HistoriqueStatut.objects.all().order_by('sinistre_id', 'dateChangement')
        
        durations = defaultdict(list)
        last_hist = {}
        
        for h in historiques:
            sid = h.sinistre_id
            if sid in last_hist:
                prev = last_hist[sid]
                dur_secs = (h.dateChangement - prev.dateChangement).total_seconds()
                statut = prev.nouveauStatut
                durations[statut].append(dur_secs)
            last_hist[sid] = h
            
        temps_moyen_par_etape = []
        statut_dict = dict(STATUT_CHOICES)
        for statut, label in statut_dict.items():
            durs = durations.get(statut, [])
            if len(durs) > 0:
                avg_secs = sum(durs) / len(durs)
                temps_moyen_par_etape.append({
                    'etape': statut,
                    'label': label,
                    'duree_moyenne_heures': round(avg_secs / 3600, 2),
                    'duree_moyenne_jours': round(avg_secs / 86400, 2),
                    'echantillon': len(durs)
                })
            else:
                temps_moyen_par_etape.append({
                    'etape': statut,
                    'label': label,
                    'duree_moyenne_heures': 0,
                    'duree_moyenne_jours': 0,
                    'echantillon': 0
                })
                
        return Response({
            'en_attente_count': en_attente_count,
            'counts_by_status': {item['statut']: item['count'] for item in counts_by_status},
            'temps_moyen_par_etape': temps_moyen_par_etape
        })

class StatistiquesDelaisDetailView(APIView):
    """
    GET /api/sinistres/stats/delais-detail/?statut=EN_EXPERTISE
    Renvoie les délais individuels de chaque sinistre pour le statut donné.
    """
    permission_classes = [permissions.IsAuthenticated, IsAssurance]

    def get(self, request):
        statut_cible = request.query_params.get('statut')
        periode = request.query_params.get('periode', 'tout')
        
        if not statut_cible:
            return Response({"error": "Le paramètre 'statut' est requis."}, status=400)
            
        now = timezone.now()
        date_limite = None
        if periode == 'semaine':
            date_limite = now - timedelta(days=7)
        elif periode == 'mois':
            date_limite = now - timedelta(days=30)
        elif periode == 'annee':
            date_limite = now - timedelta(days=365)
            
        historiques = HistoriqueStatut.objects.all().order_by('sinistre_id', 'dateChangement').select_related('sinistre')
        
        resultats = []
        last_hist = {}
        
        for h in historiques:
            sid = h.sinistre_id
            
            # Si on a un enregistrement précédent pour ce sinistre et que c'était le statut cible
            if sid in last_hist and last_hist[sid].nouveauStatut == statut_cible:
                prev = last_hist[sid]
                dur_secs = (h.dateChangement - prev.dateChangement).total_seconds()
                
                resultats.append({
                    'idSinistre': h.sinistre.idSinistre,
                    'duree_heures': round(dur_secs / 3600, 2),
                    'duree_jours': round(dur_secs / 86400, 2),
                    'en_cours': False,
                    'date_entree': prev.dateChangement,
                    'date_sortie': h.dateChangement
                })
            
            last_hist[sid] = h
            
        # Gérer les sinistres qui sont ACTUELLEMENT dans le statut cible (pas encore sortis)
        for sid, h in last_hist.items():
            if h.nouveauStatut == statut_cible:
                dur_secs = (timezone.now() - h.dateChangement).total_seconds()
                resultats.append({
                    'idSinistre': h.sinistre.idSinistre,
                    'duree_heures': round(dur_secs / 3600, 2),
                    'duree_jours': round(dur_secs / 86400, 2),
                    'en_cours': True,
                    'date_entree': h.dateChangement,
                    'date_sortie': None
                })
                
        # Filtrer par date d'entrée si une période est sélectionnée
        if date_limite:
            resultats = [r for r in resultats if r['date_entree'] >= date_limite]
                
        # Tri du plus long au plus court
        resultats.sort(key=lambda x: x['duree_heures'], reverse=True)
        
        # Résumé
        total_heures = sum(r['duree_heures'] for r in resultats)
        moyenne = round(total_heures / len(resultats), 2) if resultats else 0
        maximum = max(resultats, key=lambda x: x['duree_heures'])['duree_heures'] if resultats else 0
        minimum = min(resultats, key=lambda x: x['duree_heures'])['duree_heures'] if resultats else 0
        
        return Response({
            'statut': statut_cible,
            'total_dossiers': len(resultats),
            'moyenne_heures': moyenne,
            'max_heures': maximum,
            'min_heures': minimum,
            'details': resultats
        })

# ═════════════════════════════════════════════
#  ADVANCED ANALYTICS (Ingénieur)
# ═════════════════════════════════════════════

class IngenieurAnalyticsView(APIView):
    """
    GET /api/statistiques/ingenieur-analytics/
    Renvoie les données analytiques avancées :
    - Hotspots géographiques (par wilaya)
    - Top 5 Sites problématiques
    - Répartition par nature
    - Coût estimé dans le temps
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Sinistre.objects.all()

        # Filtrage
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        wilaya = request.query_params.get('wilaya')

        if start_date:
            qs = qs.filter(dateSurvenance__gte=start_date)
        if end_date:
            qs = qs.filter(dateSurvenance__lte=end_date)
        if wilaya:
            qs = qs.filter(site__wilaya__icontains=wilaya)

        # 1. Répartition par nature (Pie Chart)
        nature_counts = qs.values('nature').annotate(count=Count('idSinistre')).order_by('-count')
        nature_labels = dict(NATURE_CHOICES)
        distribution_nature = [
            {'name': nature_labels.get(item['nature'], item['nature']), 'value': item['count']}
            for item in nature_counts
        ]

        # 2. Hotspots Géographiques (Bar Chart - Wilaya)
        wilaya_counts = qs.values('site__wilaya').annotate(count=Count('idSinistre')).order_by('-count')
        hotspots = [
            {'name': item['site__wilaya'] or 'Inconnue', 'count': item['count']}
            for item in wilaya_counts if item['site__wilaya']
        ]

        # 3. Top 5 Sites Problématiques (Horizontal Bar Chart)
        site_counts = qs.values('site__codeSite', 'site__nomSite').annotate(count=Count('idSinistre')).order_by('-count')[:5]
        top_sites = [
            {'code': item['site__codeSite'], 'name': item['site__nomSite'] or item['site__codeSite'], 'count': item['count']}
            for item in site_counts if item['site__codeSite']
        ]

        # 4. Cost Analysis (Line/Area Chart)
        # Déterminer le groupement selon l'intervalle (mois par défaut, semaine si très court)
        delta_days = 30
        if start_date and end_date:
            try:
                sd = datetime.strptime(start_date, '%Y-%m-%d')
                ed = datetime.strptime(end_date, '%Y-%m-%d')
                delta_days = (ed - sd).days
            except:
                pass

        if delta_days <= 60:
            cost_qs = qs.annotate(date=TruncWeek('dateSurvenance'))
        else:
            cost_qs = qs.annotate(date=TruncMonth('dateSurvenance'))

        costs = cost_qs.values('date').annotate(total=Sum('montantEstime')).order_by('date')
        cost_analysis = [
            {
                'date': item['date'].strftime('%Y-%m-%d') if hasattr(item['date'], 'strftime') else str(item['date']).split(' ')[0],
                'cost': float(item['total'] or 0)
            }
            for item in costs if item['date']
        ]

        return Response({
            'distributionNature': distribution_nature,
            'hotspots': hotspots,
            'topSites': top_sites,
            'costAnalysis': cost_analysis
        })
