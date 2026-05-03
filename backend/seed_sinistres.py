import os
import django
import sys
from datetime import timedelta
from django.utils import timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sinistres.models import Sinistre, Site, HistoriqueStatut
from django.contrib.auth import get_user_model

User = get_user_model()

# Get or create a dummy user
user = User.objects.first()
if not user:
    user = User.objects.create_superuser('admin', 'admin@example.com', 'password')

# Get some sites
sites = list(Site.objects.all()[:5])
if not sites:
    print("No sites found. Please import sites first.")
    sys.exit(1)

# Helper to create a sinistre with history
def create_sinistre_with_history(id_sinistre, nature, type_sinistre, site, dates_and_statuses):
    now = timezone.now()
    
    # Delete if exists
    Sinistre.objects.filter(idSinistre=id_sinistre).delete()
    
    # Create sinistre
    s = Sinistre.objects.create(
        idSinistre=id_sinistre,
        nature=nature,
        typeSinistre=type_sinistre,
        dateSurvenance=(now + timedelta(hours=dates_and_statuses[0][1])).date(),
        site=site,
        createur=user,
        statut=dates_and_statuses[-1][0],
        dateCreation=now + timedelta(hours=dates_and_statuses[0][1])
    )
    
    # Create history
    prev_status = ''
    for status, offset_hours in dates_and_statuses:
        HistoriqueStatut.objects.create(
            sinistre=s,
            ancienStatut=prev_status,
            nouveauStatut=status,
            dateChangement=now + timedelta(hours=offset_hours),
            modifiePar=user
        )
        prev_status = status
        
    print(f"Created {id_sinistre} - Current Status: {s.statut}")

# Seed data
# Sinistre 1: Completed fast
create_sinistre_with_history(
    'SIN-MOCK-001', 'FIBRE_OPTIQUE', 'FIBRE_OPTIQUE', sites[0],
    [
        ('OUVERT', -200),
        ('EN_EXPERTISE', -195),
        ('TRANSMIS_ASSUREUR', -180),
        ('VALIDE', -175),
        ('CLOTURE', -170)
    ]
)

# Sinistre 2: Stuck in Expertise
create_sinistre_with_history(
    'SIN-MOCK-002', 'INCENDIE', 'INCENDIE', sites[1],
    [
        ('OUVERT', -500),
        ('EN_EXPERTISE', -450),
    ]
)

# Sinistre 3: Transmis Assureur taking a while
create_sinistre_with_history(
    'SIN-MOCK-003', 'VOL', 'VOL', sites[2],
    [
        ('OUVERT', -100),
        ('EN_EXPERTISE', -98),
        ('EN_VALIDATION_LEGAL', -90),
        ('TRANSMIS_ASSUREUR', -40)
    ]
)

# Sinistre 4: Transmis Assureur taking a bit longer
create_sinistre_with_history(
    'SIN-MOCK-004', 'VOL', 'VOL', sites[3],
    [
        ('OUVERT', -150),
        ('EN_EXPERTISE', -140),
        ('EN_VALIDATION_LEGAL', -120),
        ('TRANSMIS_ASSUREUR', -65)
    ]
)

# Sinistre 5: Under Franchise
create_sinistre_with_history(
    'SIN-MOCK-005', 'INTEMPERIE', 'VENT_VIOLENT', sites[4],
    [
        ('OUVERT', -300),
        ('ATTENTE_VALIDATION_FRANCHISE', -290)
    ]
)

print("Mock sinistres generated successfully!")
