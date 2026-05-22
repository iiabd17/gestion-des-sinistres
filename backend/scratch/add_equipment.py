import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
django.setup()

from sinistres.models import Equipement
import uuid

items = [
    ('Groupe Electrogene Caterpillar 30kVA', 2800000),
    ('Onduleur APC Smart-UPS 10kVA', 950000),
    ('BTS Ericsson RBS 6601', 4500000),
    ('BTS Nokia Airscale', 3800000),
    ('Pylone Autoportant 30m', 6500000),
    ('Shelter Climatise 3x3m', 1200000),
    ('Climatiseur Industriel 5T', 450000),
    ('Disjoncteur Schneider NSX 400A', 85000),
    ('Tableau Electrique General TGBT', 350000),
    ('Parafoudre Citel DS50', 120000),
    ('Camera Surveillance Hikvision IP', 65000),
    ('Armoire de Brassage 42U', 280000),
    ('Switch Cisco Catalyst 2960', 380000),
    ('Routeur Huawei NE40E', 2200000),
    ('Rectifier Emerson 48V 200A', 750000),
    ('Panneau Solaire 400W Monocristallin', 95000),
    ('Regulateur de Charge MPPT 60A', 45000),
    ('Cable Cuivre 3x70mm2 (100m)', 180000),
    ('Antenne Parabolique 1.8m', 520000),
    ('Multiplexeur DWDM 40Ch', 3200000),
]

created = 0
for name, price in items:
    if not Equipement.objects.filter(nomMarque=name).exists():
        Equipement.objects.create(
            idEquipement=f'EQ-{uuid.uuid4().hex[:8].upper()}',
            nomMarque=name,
            valeurComptable=price,
            quantiteImpactee=0,
        )
        created += 1
        print(f'  + {name} ({price:,.0f} DA)')

total = Equipement.objects.filter(sinistre__isnull=True).count()
print(f'\n{created} equipment added. Total catalog: {total}')
