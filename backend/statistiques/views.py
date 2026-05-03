from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Count, Sum
from collections import defaultdict
from django.utils import timezone
from datetime import timedelta

from sinistres.models import Sinistre, HistoriqueStatut, STATUT_CHOICES, NATURE_CHOICES
from accounts.permissions import IsAssurance

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
            'attenteFranchise':     par_statut.get('ATTENTE_VALIDATION_FRANCHISE', 0),
            'valides':              par_statut.get('VALIDE', 0),
            'rejetes':              par_statut.get('REJETE', 0),
            'clotures':             par_statut.get('CLOTURE', 0),
            'cloturesSousFranchise': par_statut.get('CLOTURE_SOUS_FRANCHISE', 0),
            'archives':             par_statut.get('ARCHIVE', 0),
            'parNature':            par_nature,
            'montantTotalEstime':   montant_total,
        })


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
