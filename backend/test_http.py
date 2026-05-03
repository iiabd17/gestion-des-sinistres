import urllib.request
import urllib.error
import json

try:
    req = urllib.request.Request('http://127.0.0.1:8000/api/sinistres/stats/delais-detail/?statut=TRANSMIS_ASSUREUR')
    # We will get a 401 Unauthorized without a token, but let's see
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
