import csv
import os
from django.core.management.base import BaseCommand, CommandError
from sinistres.models import Site

class Command(BaseCommand):
    help = 'Importe les sites depuis un fichier CSV ou Excel (.xlsx)'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Le chemin vers le fichier (ex: localities.csv ou localities.xlsx)')

    def handle(self, *args, **options):
        file_path = options['file_path']
        
        if not os.path.exists(file_path):
            raise CommandError(f'Le fichier "{file_path}" n\'existe pas.')

        sites_to_create = []
        rows = []
        
        self.stdout.write(f'Lecture du fichier {file_path}...')
        
        if file_path.lower().endswith('.xlsx'):
            try:
                import openpyxl
            except ImportError:
                raise CommandError("La librairie openpyxl est requise. Exécutez : pip install openpyxl")
            
            wb = openpyxl.load_workbook(file_path, data_only=True)
            sheet = wb.active
            headers = [str(cell.value).strip() if cell.value is not None else '' for cell in sheet[1]]
            
            for row in sheet.iter_rows(min_row=2, values_only=True):
                # On ignore les lignes complètement vides
                if not any(row):
                    continue
                row_dict = {k: str(v).strip() if v is not None else '' for k, v in zip(headers, row)}
                rows.append(row_dict)
        else:
            with open(file_path, mode='r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    rows.append(row)
            
        for row_dict in rows:
            code_site = row_dict.get('S.Locality', '').strip()
            
            if not code_site:
                continue

            x_val = row_dict.get('X', '').strip()
            y_val = row_dict.get('Y', '').strip()
            
            try:
                longitude = float(x_val.replace(',', '.')) if x_val else None
            except ValueError:
                longitude = None
                
            try:
                latitude = float(y_val.replace(',', '.')) if y_val else None
            except ValueError:
                latitude = None
                
            site = Site(
                codeSite=code_site,
                nomSite=row_dict.get('Name', '').strip(),
                owner=row_dict.get('Owner', '').strip(),
                region=row_dict.get('Region', '').strip(),
                wilaya=row_dict.get('Wilaya', '').strip(),
                typeSite=row_dict.get('Type', '').strip(),
                longitude=longitude,
                latitude=latitude,
                adresseSite=row_dict.get('Adresse', '').strip(),
                commune=row_dict.get('Commune', '').strip()
            )
            
            sites_to_create.append(site)
                    
        self.stdout.write(f'Tentative d\'importation de {len(sites_to_create)} sites en base de données...')
        
        if sites_to_create:
            Site.objects.bulk_create(sites_to_create, ignore_conflicts=True)
            self.stdout.write(self.style.SUCCESS(f'Succès : {len(sites_to_create)} sites traités (insérés ou ignorés).'))
        else:
            self.stdout.write(self.style.WARNING('Aucun site valide n\'a été trouvé dans le fichier.'))
