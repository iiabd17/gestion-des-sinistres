import os
import django
import sys
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from sinistres.views import StatistiquesDelaisDetailView
from django.contrib.auth import get_user_model
from rest_framework.test import force_authenticate

User = get_user_model()
user = User.objects.first()

factory = APIRequestFactory()
request = factory.get('/api/sinistres/stats/delais-detail/?statut=TRANSMIS_ASSUREUR')
force_authenticate(request, user=user)

view = StatistiquesDelaisDetailView.as_view()
response = view(request)

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print("Content:", response.data)
else:
    print("Error:", response.data)
