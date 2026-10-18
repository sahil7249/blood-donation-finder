from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

User = get_user_model()


def user_payload(user):
    return {"id": user.id, "name": user.first_name, "email": user.email}


def token_response(user, code=status.HTTP_200_OK):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": user_payload(user)}, status=code)


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=60)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("An account with this email already exists. Sign in instead.")
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def signup(request):
    ser = SignupSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    d = ser.validated_data
    user = User.objects.create_user(username=d["email"], email=d["email"], password=d["password"], first_name=d["name"])
    return token_response(user, status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    user = authenticate(username=str(request.data.get("email", "")).lower(), password=request.data.get("password", ""))
    if not user:
        return Response({"detail": "Incorrect email or password."}, status=status.HTTP_400_BAD_REQUEST)
    return token_response(user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(user_payload(request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
