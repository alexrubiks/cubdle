from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import User


class CubdleJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):
        try:
            return User.objects.get(
                id=validated_token["user_id"]
            )
        except User.DoesNotExist:
            raise AuthenticationFailed("Utilisateur introuvable")