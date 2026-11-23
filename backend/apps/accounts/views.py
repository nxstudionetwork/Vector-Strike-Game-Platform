"""
Authentication & account endpoints.

Token model:
- access token  → returned in the JSON body, kept in memory by the frontend.
- refresh token → set as an httpOnly, SameSite=Lax cookie scoped to /api/auth/.
  JavaScript can never read it, and it is rotated + blacklisted on every use.
"""

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import authenticate, password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .avatars import AVATAR_KEYS
from .models import User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    MeSerializer,
    OnboardingSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    SettingsSerializer,
    SignupSerializer,
)

COOKIE = settings.AUTH_REFRESH_COOKIE


def _set_refresh_cookie(response: Response, refresh: RefreshToken) -> None:
    response.set_cookie(
        COOKIE["name"],
        str(refresh),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=COOKIE["secure"],
        samesite=COOKIE["samesite"],
        path=COOKIE["path"],
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE["name"], path=COOKIE["path"], samesite=COOKIE["samesite"])


def _unauthorized(message: str) -> Response:
    """401 with our error envelope (views without auth classes would otherwise answer 403)."""
    return Response({"error": {"code": "not_authenticated", "message": message}}, status=status.HTTP_401_UNAUTHORIZED)


def _session_response(user: User, status_code=status.HTTP_200_OK) -> Response:
    refresh = RefreshToken.for_user(user)
    response = Response(
        {"access": str(refresh.access_token), "user": MeSerializer(user).data}, status=status_code
    )
    _set_refresh_cookie(response, refresh)
    return response


class AuthThrottleMixin:
    throttle_scope = "auth"


class SignupView(AuthThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _session_response(user, status.HTTP_201_CREATED)


class LoginView(AuthThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            email=serializer.validated_data["email"].strip().lower(),
            password=serializer.validated_data["password"],
        )
        if user is None:
            return _unauthorized("Email or password is incorrect.")
        return _session_response(user)


class RefreshView(AuthThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def post(self, request):
        raw = request.COOKIES.get(COOKIE["name"])
        if not raw:
            # No session at all is a normal state on launch, not an error.
            return Response(status=status.HTTP_204_NO_CONTENT)
        try:
            old = RefreshToken(raw)
            user = User.objects.get(pk=old["user_id"], is_active=True)
            old.blacklist()
        except (TokenError, User.DoesNotExist, KeyError):
            response = _unauthorized("Your session has ended. Please log in again.")
            _clear_refresh_cookie(response)
            return response
        return _session_response(user)


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def post(self, request):
        raw = request.COOKIES.get(COOKIE["name"])
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        return response


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is not None:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            send_mail(
                subject="Reset your Vector Strike password",
                message=(
                    "We received a request to reset your Vector Strike password.\n\n"
                    f"Open this link to choose a new password:\n{link}\n\n"
                    "If you didn't ask for this, you can ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        # Same response either way, so the endpoint can't be used to discover accounts.
        return Response({"detail": "If an account exists for that email, a reset link is on its way."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(data["uid"])), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError, UnicodeDecodeError, DjangoValidationError):
            user = None
        if user is None or not default_token_generator.check_token(user, data["token"]):
            raise ValidationError({"token": ["This reset link is invalid or has expired."]})
        password_validation.validate_password(data["password"], user=user)
        user.set_password(data["password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can now log in."})


# --- Current learner ---------------------------------------------------------


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def delete(self, request):
        """Permanently delete the account. Requires the current password."""
        password = request.data.get("password", "")
        if not request.user.check_password(password):
            raise ValidationError({"password": ["Password is incorrect."]})
        request.user.delete()
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        return response


class ProfileView(APIView):
    def patch(self, request):
        serializer = ProfileSerializer(request.user.profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class SettingsView(APIView):
    def patch(self, request):
        serializer = SettingsSerializer(
            request.user.settings, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MeSerializer(request.user).data)


class OnboardingView(APIView):
    """Completes onboarding. Every field is optional so learners can skip steps."""

    def post(self, request):
        serializer = OnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = request.user.profile
        data = serializer.validated_data
        if "interests" in data:
            profile.interests.set(data["interests"])
        for field in ("play_preference", "session_goal_minutes", "avatar"):
            if field in data:
                setattr(profile, field, data[field])
        profile.onboarding_completed_at = profile.onboarding_completed_at or timezone.now()
        profile.save()
        return Response(MeSerializer(request.user).data)


class ChangePasswordView(APIView):
    throttle_scope = "auth"

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        # Issue a fresh session so the current device stays signed in.
        return _session_response(request.user)


class AvatarListView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request):
        return Response({"avatars": AVATAR_KEYS})
