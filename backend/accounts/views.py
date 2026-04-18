from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken # Import JWT tokens
from .serializers import UtilisateurSerializer
from .models import EquipeTerrain, Ingenieur, Legal, Hse, Assurance

class UserLoginView(APIView):
    """
    Handles the authentication process using JWT.
    Checks credentials, account status (estActif), and issues access/refresh tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        login_val = request.data.get('login')
        password_val = request.data.get('password')

        # Authentication against PostgreSQL database
        user = authenticate(username=login_val, password=password_val)

        if user is not None:
            # Check account status (based on 'estActif' field in your diagram)
            if not user.estActif:
                return Response(
                    {"message": "Votre compte est désactivé. Contactez l'administrateur."}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            # Generate JWT Tokens instead of establishing a session
            refresh = RefreshToken.for_user(user)
            
            # Identify the specific role for React redirection logic
            role = self.get_user_role(user)
            
            return Response({
                "access": str(refresh.access_token), # Access token for requests
                "refresh": str(refresh),             # Refresh token to stay logged in
                "user": {
                    "id": user.idUtilisateur,
                    "nom": user.nom,
                    "prenom": user.prenom,
                    "role": role
                },
                "redirect_url": "/ajouter-declaration" if role == "Équipe Terrain" else "/dashboard"
            }, status=status.HTTP_200_OK)
        
        # Alternative block: Invalid credentials
        return Response(
            {"message": "Identifiants erronés"}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

    def get_user_role(self, user):
        """Helper method to detect the child table associated with the user."""
        if hasattr(user, 'equipeterrain'): return "Équipe Terrain"
        if hasattr(user, 'ingenieur'): return "Ingénieur"
        if hasattr(user, 'legal'): return "Légal"
        if hasattr(user, 'hse'): return "HSE"
        if hasattr(user, 'assurance'): return "Assurance"
        return "Standard"


class GetUserProfileView(APIView):
    """
    Retrieves current user profile details using JWT authentication.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UtilisateurSerializer(request.user)
        return Response(serializer.data)


class UpdateProfileView(APIView):
    """
    Allows employees to update their contact information (Phone and Email).
    Requires a valid JWT token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        user.tel = request.data.get('tel', user.tel)
        user.email = request.data.get('email', user.email)
        user.save()
        return Response({"message": "Profil mis à jour avec succès"})


class CheckAuthStatusView(APIView):
    """
    Utility view for React to verify if the provided JWT token is still valid.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # If the request reaches here, it means the JWT is valid
        role = UserLoginView().get_user_role(request.user)
        return Response({"isAuthenticated": True, "role": role})