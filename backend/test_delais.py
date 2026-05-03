import os
import django
import sys
from datetime import timedelta
from django.utils import timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sinistres.models import Sinistre, HistoriqueStatut
statut_cible = 'TRANSMIS_ASSUREUR'

historiques = HistoriqueStatut.objects.all().order_by('sinistre_id', 'dateChangement').select_related('sinistre')

resultats = []
last_hist = {}

for h in historiques:
    sid = h.sinistre_id
    
    if sid in last_hist and last_hist[sid].nouveauStatut == statut_cible:
        prev = last_hist[sid]
        dur_secs = (h.dateChangement - prev.dateChangement).total_seconds()
        
        resultats.append({
            'idSinistre': h.sinistre.idSinistre, # Using the string ID instead of int
            'duree_heures': round(dur_secs / 3600, 2),
            'duree_jours': round(dur_secs / 86400, 2),
            'en_cours': False,
            'date_entree': prev.dateChangement,
            'date_sortie': h.dateChangement
        })
    
    last_hist[sid] = h
    
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

print("RESULTATS:", resultats)
