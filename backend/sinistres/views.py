from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist, ValidationError
import json

from .models import (
    Sinistre, Declaration, Equipement, PieceJointe, Site,
    NATURE_CHOICES, TYPE_PAR_NATURE, ALL_TYPE_CHOICES
)


#  Helpers


def json_body(request):
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return None

def not_found(message="Objet introuvable"):
    return JsonResponse({"error": message}, status=404)

def bad_request(message="Données invalides"):
    return JsonResponse({"error": message}, status=400)



#  REFERENTIEL NATURE / TYPE

@require_http_methods(["GET"])
def nature_list(request):
    """GET /natures/ → liste toutes les natures disponibles."""
    natures = [{"code": code, "label": label} for code, label in NATURE_CHOICES]
    return JsonResponse(natures, safe=False)


@require_http_methods(["GET"])
def types_par_nature(request, nature_code):
    """GET /natures/<nature_code>/types/ → types appartenant à cette nature."""
    types = TYPE_PAR_NATURE.get(nature_code)
    if types is None:
        return not_found(f"Nature '{nature_code}' introuvable.")
    return JsonResponse(
        [{"code": code, "label": label} for code, label in types],
        safe=False
    )



#  SITE


@csrf_exempt
@require_http_methods(["GET", "POST"])
def site_list(request):
    if request.method == "GET":
        sites = list(Site.objects.values(
            'idSite', 'codeSite', 'adresseSite', 'wilaya', 'codeRegion'
        ))
        return JsonResponse(sites, safe=False)

    data = json_body(request)
    if not data:
        return bad_request()

    site = Site.objects.create(
        codeSite   =data.get('codeSite', ''),
        adresseSite=data.get('adresseSite', ''),
        wilaya     =data.get('wilaya', ''),
        codeRegion =data.get('codeRegion', ''),
    )
    return JsonResponse({
        "idSite": site.idSite, "codeSite": site.codeSite,
        "adresseSite": site.adresseSite, "wilaya": site.wilaya,
    }, status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def site_detail(request, pk):
    try:
        site = Site.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found("Site introuvable")

    if request.method == "GET":
        return JsonResponse({
            "idSite": site.idSite, "codeSite": site.codeSite,
            "adresseSite": site.adresseSite, "wilaya": site.wilaya,
            "codeRegion": site.codeRegion,
        })

    if request.method == "PUT":
        data = json_body(request)
        if not data:
            return bad_request()
        for field in ('codeSite', 'adresseSite', 'wilaya', 'codeRegion'):
            if field in data:
                setattr(site, field, data[field])
        site.save()
        return JsonResponse({"message": "Site mis à jour"})

    site.delete()
    return JsonResponse({"message": "Site supprimé"}, status=204)


#  SINISTRE


def _sinistre_to_dict(s):
    return {
        "idSinistre":            s.idSinistre,
        "nature":                s.nature,
        "nature_label":          s.get_nature_display(),
        "typeSinistre":          s.typeSinistre,
        "typeSinistre_label":    s.get_typeSinistre_display(),
        "dateSurvenance":        str(s.dateSurvenance),
        "codeSite":              s.site.codeSite,
        "adresseSite":           s.site.adresseSite,
        "wilaya":                s.site.wilaya,
        "descriptionDetailliee": s.descriptionDetailliee,
        "montantEstime":         s.montantEstime,
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
def sinistre_list(request):
    if request.method == "GET":
        sinistres = [_sinistre_to_dict(s) for s in Sinistre.objects.all()]
        return JsonResponse(sinistres, safe=False)

    data = json_body(request)
    if not data:
        return bad_request()

    sinistre = Sinistre(
        idSinistre           =data.get('idSinistre'),
        nature               =data.get('nature'),
        typeSinistre         =data.get('typeSinistre'),
        dateSurvenance       =data.get('dateSurvenance'),
        descriptionDetailliee=data.get('descriptionDetailliee', ''),
        montantEstime        =data.get('montantEstime', 0.0),
        site_id              =data.get('codeSite'),   # codeSite de Site
    )
    try:
        sinistre.clean()  # valide nature/type
    except ValidationError as e:
        return bad_request(str(e))

    sinistre.save()
    return JsonResponse(_sinistre_to_dict(sinistre), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def sinistre_detail(request, pk):
    try:
        sinistre = Sinistre.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found("Sinistre introuvable")

    if request.method == "GET":
        return JsonResponse(_sinistre_to_dict(sinistre))

    if request.method == "PUT":
        data = json_body(request)
        if not data:
            return bad_request()
        for field in ('nature', 'typeSinistre', 'dateSurvenance',
                      'descriptionDetailliee', 'montantEstime'):
            if field in data:
                setattr(sinistre, field, data[field])
        if 'codeSite' in data:
            sinistre.site_id = data['codeSite']
        try:
            sinistre.clean()
        except ValidationError as e:
            return bad_request(str(e))
        sinistre.save()
        return JsonResponse({"message": "Sinistre mis à jour"})

    sinistre.delete()
    return JsonResponse({"message": "Sinistre supprimé"}, status=204)


@csrf_exempt
@require_http_methods(["POST"])
def sinistre_update_estimation(request, pk):
    try:
        sinistre = Sinistre.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found()
    data = json_body(request)
    if not data or 'montantEstime' not in data:
        return bad_request("Champ 'montantEstime' requis")
    sinistre.mettreAJourEstimation(data['montantEstime'])
    return JsonResponse({"montantEstime": sinistre.montantEstime})


@require_http_methods(["GET"])
def sinistre_details_complets(request, pk):
    try:
        sinistre = Sinistre.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found()
    return JsonResponse({"details": sinistre.obtenirDetailsComplets()})



#  DECLARATION

def _declaration_to_dict(d):
    return {
        "idDeclaration": d.idDeclaration,
        "dateCreation":  str(d.dateCreation),
        "etatActuel":    d.etatActuel,
        "urgence":       d.urgence,
        "sinistre_id":   d.sinistre_id,
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
def declaration_list(request):
    if request.method == "GET":
        return JsonResponse(
            [_declaration_to_dict(d) for d in Declaration.objects.all()],
            safe=False
        )
    data = json_body(request)
    if not data:
        return bad_request()
    declaration = Declaration.objects.create(
        idDeclaration=data.get('idDeclaration'),
        etatActuel   =data.get('etatActuel', 'EN_ATTENTE'),
        urgence      =data.get('urgence', 1),
        sinistre_id  =data.get('sinistre_id'),
    )
    return JsonResponse(_declaration_to_dict(declaration), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def declaration_detail(request, pk):
    try:
        declaration = Declaration.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found("Déclaration introuvable")

    if request.method == "GET":
        return JsonResponse(_declaration_to_dict(declaration))

    if request.method == "PUT":
        data = json_body(request)
        if not data:
            return bad_request()
        for field in ('etatActuel', 'urgence'):
            if field in data:
                setattr(declaration, field, data[field])
        declaration.save()
        return JsonResponse({"message": "Déclaration mise à jour"})

    declaration.delete()
    return JsonResponse({"message": "Déclaration supprimée"}, status=204)


@csrf_exempt
@require_http_methods(["POST"])
def declaration_changer_etat(request, pk):
    try:
        declaration = Declaration.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found()
    data = json_body(request)
    if not data or 'etatActuel' not in data:
        return bad_request("Champ 'etatActuel' requis")
    try:
        declaration.changerEtat(data['etatActuel'])
    except ValueError as e:
        return bad_request(str(e))
    return JsonResponse({"etatActuel": declaration.etatActuel})


@require_http_methods(["GET"])
def declaration_temps_traitement(request, pk):
    try:
        declaration = Declaration.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found()
    return JsonResponse({"tempsTraitementSecondes": declaration.calculerTempsTraitement()})


# ─────────────────────────────────────────────
#  EQUIPEMENT
# ─────────────────────────────────────────────

def _equipement_to_dict(e):
    return {
        "idEquipement":     e.idEquipement,
        "nomMarque":        e.nomMarque,
        "numeroSerie":      e.numeroSerie,
        "dateInstallation": str(e.dateInstallation) if e.dateInstallation else None,
        "valeurComptable":  e.valeurComptable,
        "quantiteImpactee": e.quantiteImpactee,
        "sinistre_id":      e.sinistre_id,
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
def equipement_list(request):
    if request.method == "GET":
        return JsonResponse(
            [_equipement_to_dict(e) for e in Equipement.objects.all()],
            safe=False
        )
    data = json_body(request)
    if not data:
        return bad_request()
    equipement = Equipement.objects.create(
        idEquipement    =data.get('idEquipement'),
        nomMarque       =data.get('nomMarque', ''),
        numeroSerie     =data.get('numeroSerie', ''),
        dateInstallation=data.get('dateInstallation'),
        valeurComptable =data.get('valeurComptable', 0.0),
        quantiteImpactee=data.get('quantiteImpactee', 1),
        sinistre_id     =data.get('sinistre_id'),
    )
    return JsonResponse(_equipement_to_dict(equipement), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def equipement_detail(request, pk):
    try:
        equipement = Equipement.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found("Équipement introuvable")

    if request.method == "GET":
        return JsonResponse(_equipement_to_dict(equipement))

    if request.method == "PUT":
        data = json_body(request)
        if not data:
            return bad_request()
        for field in ('nomMarque', 'numeroSerie', 'dateInstallation',
                      'valeurComptable', 'quantiteImpactee'):
            if field in data:
                setattr(equipement, field, data[field])
        equipement.save()
        return JsonResponse({"message": "Équipement mis à jour"})

    equipement.delete()
    return JsonResponse({"message": "Équipement supprimé"}, status=204)


@require_http_methods(["GET"])
def equipement_garantie(request, pk):
    try:
        equipement = Equipement.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found()
    return JsonResponse({"sousGarantie": equipement.verifierGarantie()})


# ─────────────────────────────────────────────
#  PIECE JOINTE
# ─────────────────────────────────────────────

def _piece_to_dict(p):
    return {
        "idPiece":    p.idPiece,
        "titreDoc":   p.titreDoc,
        "format":     p.format,
        "urlFichier": p.urlFichier,
        "dateUpload": str(p.dateUpload),
        "tailleKo":   p.tailleKo,
        "sinistre_id":p.sinistre_id,
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
def piecejointe_list(request):
    if request.method == "GET":
        return JsonResponse(
            [_piece_to_dict(p) for p in PieceJointe.objects.all()],
            safe=False
        )
    data = json_body(request)
    if not data:
        return bad_request()
    piece = PieceJointe.objects.create(
        titreDoc   =data.get('titreDoc', ''),
        format     =data.get('format', 'PDF'),
        urlFichier =data.get('urlFichier', ''),
        tailleKo   =data.get('tailleKo', 0),
        sinistre_id=data.get('sinistre_id'),
    )
    return JsonResponse(_piece_to_dict(piece), status=201)


@csrf_exempt
@require_http_methods(["GET", "DELETE"])
def piecejointe_detail(request, pk):
    try:
        piece = PieceJointe.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found("Pièce jointe introuvable")

    if request.method == "GET":
        return JsonResponse(_piece_to_dict(piece))

    piece.supprimer()
    return JsonResponse({"message": "Pièce jointe supprimée"}, status=204)


@require_http_methods(["GET"])
def piecejointe_telecharger(request, pk):
    try:
        piece = PieceJointe.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found()
    return JsonResponse({"urlFichier": piece.telecharger()})


# ─────────────────────────────────────────────
#  VUES CROISÉES
# ─────────────────────────────────────────────

@require_http_methods(["GET"])
def sinistre_equipements(request, pk):
    try:
        Sinistre.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found()
    return JsonResponse(
        [_equipement_to_dict(e) for e in Equipement.objects.filter(sinistre_id=pk)],
        safe=False
    )


@require_http_methods(["GET"])
def sinistre_pieces(request, pk):
    try:
        Sinistre.objects.get(pk=pk)
    except ObjectDoesNotExist:
        return not_found()
    return JsonResponse(
        [_piece_to_dict(p) for p in PieceJointe.objects.filter(sinistre_id=pk)],
        safe=False
    )