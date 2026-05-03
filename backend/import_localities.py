import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from sinistres.models import Site
import openpyxl

file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Data', 'localities.xlsx')
print(f"Loading {file_path}...")

try:
    wb = openpyxl.load_workbook(file_path, data_only=True)
    sheet = wb.active
except Exception as e:
    print(f"Failed to load workbook: {e}")
    sys.exit(1)

# Ensure headers are strings and strip spaces
headers = [str(cell.value).strip() if cell.value else '' for cell in sheet[1]]

# Provide mapping of expected column names to be safe. We assume the headers from the model
# ['S.Locality', 'Name', 'Owner', 'Region', 'Wilaya', 'Type', 'X', 'Y', 'Adresse', 'Commune']

sites_to_create = []
skipped = 0

print("Parsing rows...")
for row in sheet.iter_rows(min_row=2, values_only=True):
    if not any(row):
        continue
        
    row_dict = {k: str(v).strip() if v is not None else '' for k, v in zip(headers, row)}
    
    code_site = row_dict.get('S.Locality', '').strip()
    if not code_site:
        skipped += 1
        continue
        
    x_val = row_dict.get('X', '').strip()
    y_val = row_dict.get('Y', '').strip()
    
    longitude = None
    if x_val:
        try:
            longitude = float(x_val.replace(',', '.'))
        except ValueError:
            pass
            
    latitude = None
    if y_val:
        try:
            latitude = float(y_val.replace(',', '.'))
        except ValueError:
            pass
            
    site = Site(
        codeSite=code_site,
        nomSite=row_dict.get('Name', '')[:255].strip(),
        owner=row_dict.get('Owner', '')[:100].strip(),
        region=row_dict.get('Region', '')[:100].strip(),
        wilaya=row_dict.get('Wilaya', '')[:100].strip(),
        typeSite=row_dict.get('Type', '')[:50].strip(),
        longitude=longitude,
        latitude=latitude,
        adresseSite=row_dict.get('Adresse', '').strip(),
        commune=row_dict.get('Commune', '')[:100].strip(),
    )
    sites_to_create.append(site)

print(f"Found {len(sites_to_create)} valid rows. Inserting in bulk...")

# Chunk the creation to avoid memory issues and sqlite limits
chunk_size = 500
total = len(sites_to_create)
for i in range(0, total, chunk_size):
    chunk = sites_to_create[i:i + chunk_size]
    Site.objects.bulk_create(chunk, ignore_conflicts=True)
    print(f"Inserted {min(i + chunk_size, total)}/{total}")

print(f"Done! Imported {total} sites. Skipped {skipped} rows.")
