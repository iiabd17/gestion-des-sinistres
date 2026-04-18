from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

# --- 1. USER MANAGER ---
class UtilisateurManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('estActif', True)
        return self.create_user(username, email, password, **extra_fields)

# --- 2. TABLE UTILISATEUR (PIVOT) ---
class Utilisateur(AbstractBaseUser, PermissionsMixin):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    tel = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True)
    estActif = models.BooleanField(default=True) 
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UtilisateurManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'nom', 'prenom']

    def __str__(self):
        return f"{self.nom} {self.prenom} ({self.username})"

# --- 3. TABLES SPÉCIALISÉES (HÉRITAGE) ---

class EquipeTerrain(Utilisateur):
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, parent_link=True, primary_key=True)
    # New attributes added
    departement = models.CharField(max_length=100, null=True, blank=True)
    fonction = models.CharField(max_length=100, null=True, blank=True)
    matricule = models.CharField(max_length=50, null=True, blank=True)

class Ingenieur(Utilisateur):
    # Only inherits from Utilisateur now
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, parent_link=True, primary_key=True)

class Legal(Utilisateur):
    # Only inherits from Utilisateur now
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, parent_link=True, primary_key=True)

class Hse(Utilisateur):
    # Only inherits from Utilisateur now
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, parent_link=True, primary_key=True)

class Assurance(Utilisateur):
    class RoleAssurance(models.TextChoices):
        AGENT = 'AGENT', 'Agent'
        DIRECTRICE = 'DIRECTRICE', 'Directrice'

    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE, parent_link=True, primary_key=True)
    role = models.CharField(max_length=20, choices=RoleAssurance.choices)
    # codeDepartement has been removed as requested