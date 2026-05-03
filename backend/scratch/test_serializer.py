import os
import django
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sinistres.models import Sinistre
from sinistres.serializers import SinistreListSerializer

try:
    s = Sinistre.objects.first()
    if s:
        ser = SinistreListSerializer(s)
        print("Serializer Success:")
        print(ser.data)
    else:
        print("No sinistre found in DB")
except Exception as e:
    print("Serializer Error:")
    import traceback
    traceback.print_exc()
