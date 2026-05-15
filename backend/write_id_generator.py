"""Helper script to write id_generator.py in the correct location."""
import os

target = os.path.join(os.path.dirname(__file__), 'sinistres', 'id_generator.py')

code = r"""from django.db import transaction

WILAYA_CODES = {
    "adrar": "01", "chlef": "02", "laghouat": "03",
    "oum el bouaghi": "04", "oum-el-bouaghi": "04", "batna": "05",
    "bejaia": "06", "biskra": "07", "bechar": "08",
    "blida": "09", "bouira": "10", "tamanrasset": "11",
    "tebessa": "12", "tlemcen": "13", "tiaret": "14",
    "tizi ouzou": "15", "tizi-ouzou": "15",
    "alger": "16", "algiers": "16", "algier": "16",
    "djelfa": "17", "jijel": "18", "setif": "19",
    "saida": "20", "skikda": "21",
    "sidi bel abbes": "22", "annaba": "23", "guelma": "24",
    "constantine": "25", "medea": "26", "mostaganem": "27",
    "msila": "28", "mascara": "29", "ouargla": "30",
    "oran": "31", "el bayadh": "32", "illizi": "33",
    "bordj bou arreridj": "34", "boumerdes": "35", "el tarf": "36",
    "tindouf": "37", "tissemsilt": "38", "el oued": "39",
    "khenchela": "40", "souk ahras": "41", "tipaza": "42",
    "mila": "43", "ain defla": "44", "naama": "45",
    "ain temouchent": "46", "ghardaia": "47", "relizane": "48",
    "timimoun": "49", "bordj badji mokhtar": "50",
    "ouled djellal": "51", "beni abbes": "52",
    "in salah": "53", "in guezzam": "54",
    "touggourt": "55", "djanet": "56",
    "el mghair": "57", "el meniaa": "58",
}

SINISTER_CATSUB_MAP = {
    "FIBRE_OPTIQUE":              "0101",
    "ACTE_DE_SABOTAGE":           "0201",
    "VOL":                        "0301",
    "VOL_PE":                     "0302",
    "INCENDIE":                   "0401",
    "INCENDIE_PE":                "0402",
    "INCENDIE_SURTENSION_ELEC":   "0403",
    "VENT_VIOLENT":               "0501",
    "FOUDRE":                     "0502",
    "PLUIE":                      "0503",
    "TREMBLEMENT_DE_TERRE":       "0601",
    "TEMPETE":                    "0602",
    "INONDATION":                 "0603",
    "GLISSEMENT_DE_TERRAIN":      "0604",
    "DEGAT_DES_EAUX":             "0605",
    "GREVES_EMEUTES":             "0701",
    "MOUVEMENT_POPULAIRE":        "0702",
    "AUTRES":                     "0703",
    "BRIS_DE_MACHINES":           "0801",
    "BRIS_DE_GLACES":             "0802",
    "ACCIDENT_APPAREILS_ELEC":    "0803",
    "RISQUES_INFORMATIQUES_ELEC": "0804",
    "CHUTE_AERONEF_OBJET_SPATIAL":"0805",
    "TRANSPORT_INTERNE":          "0806",
    "DOMMAGES":                   "0807",
}


def get_wilaya_code(wilaya_name):
    """Convertit un nom de wilaya en code 2 chiffres. Retourne '00' si inconnu."""
    if not wilaya_name:
        return "00"
    return WILAYA_CODES.get(wilaya_name.strip().lower(), "00")


def get_catsub_code(type_sinistre):
    """Retourne le code CATSUB 4 chiffres pour un typeSinistre."""
    return SINISTER_CATSUB_MAP.get(type_sinistre, "0000")


@transaction.atomic
def generate_declaration_id(type_sinistre, wilaya_name, year):
    """
    Genere un ID unique au format WW-CATSUB-FILE.
    Exemple : '16-0302-01' = Alger, Vol+PE, dossier n1.
    Thread-safe via select_for_update + boucle de retry.
    """
    from sinistres.models import Sinistre

    ww     = get_wilaya_code(wilaya_name)
    catsub = get_catsub_code(type_sinistre)
    prefix = f"{ww}-{catsub}"

    existing_count = (
        Sinistre.objects
        .select_for_update()
        .filter(idSinistre__startswith=f"{prefix}-", dateCreation__year=year)
        .count()
    )

    file_num  = existing_count + 1
    candidate = f"{prefix}-{file_num:02d}"

    while Sinistre.objects.filter(idSinistre=candidate).exists():
        file_num += 1
        candidate = f"{prefix}-{file_num:02d}"

    return candidate
"""

with open(target, 'w', encoding='utf-8') as f:
    f.write(code)

print(f"Written: {target}")
print("Done.")
