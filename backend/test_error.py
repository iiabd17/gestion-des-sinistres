import urllib.request
import json
import re

req = urllib.request.Request(
    'http://localhost:8000/api/accounts/forgot-password/',
    data=json.dumps({'identifier': 'test'}).encode(),
    headers={'Content-Type': 'application/json'}
)

try:
    urllib.request.urlopen(req)
except Exception as e:
    with open('error.html', 'wb') as f:
        f.write(e.read())
