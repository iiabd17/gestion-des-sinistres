from django.urls import path
from . import views

urlpatterns = [
    # Référentiel
    path('natures/', views.nature_list, name='nature_list'),
    path('natures/<str:nature_code>/types/', views.types_par_nature, name='types_par_nature'),

    # Site
    path('sites/', views.site_list, name='site_list'),
    path('sites/<int:pk>/', views.site_detail, name='site_detail'),
    # Sinistres
    path('sinistres/', views.sinistre_list, name='sinistre_list'),
    path('sinistres/<str:pk>/', views.sinistre_detail, name='sinistre_detail'),
    path('sinistres/<str:pk>/estimation/', views.sinistre_update_estimation, name='sinistre_update_estimation'),
    path('sinistres/<str:pk>/details/', views.sinistre_details_complets, name='sinistre_details_complets'),
    path('sinistres/<str:pk>/equipements/', views.sinistre_equipements, name='sinistre_equipements'),
    path('sinistres/<str:pk>/pieces/', views.sinistre_pieces, name='sinistre_pieces'),
    # Déclaration
    path('declarations/', views.declaration_list, name='declaration_list'),
    path('declarations/<str:pk>/', views.declaration_detail, name='declaration_detail'),
    path('declarations/<str:pk>/changer-etat/', views.declaration_changer_etat, name='declaration_changer_etat'),
    path('declarations/<str:pk>/temps/', views.declaration_temps_traitement, name='declaration_temps_traitement'),

    # Équipement
    path('equipements/', views.equipement_list, name='equipement_list'),
    path('equipements/<str:pk>/', views.equipement_detail, name='equipement_detail'),
    path('equipements/<str:pk>/garantie/', views.equipement_garantie, name='equipement_garantie'),

    # Pieces Jointe
    path('pieces/', views.piecejointe_list, name='piecejointe_list'),
    path('pieces/<int:pk>/', views.piecejointe_detail, name='piecejointe_detail'),
    path('pieces/<int:pk>/telecharger/', views.piecejointe_telecharger, name='piecejointe_telecharger'),
]