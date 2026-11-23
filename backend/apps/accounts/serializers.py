import zoneinfo
from datetime import date

from django.contrib.auth import password_validation
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.catalog.models import Category
from apps.progression.levels import level_progress
from apps.progression.services import effective_streak, get_stats, local_today

from .avatars import AVATAR_KEYS
from .models import PlayerProfile, PlayerSettings, PlayPreference, User

MIN_AGE_YEARS = 4
MAX_AGE_YEARS = 120


def validate_dob(value: date | None) -> date | None:
    if value is None:
        return value
    today = timezone.localdate()
    if value > today:
        raise serializers.ValidationError("Date of birth can't be in the future.")
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age < MIN_AGE_YEARS or age > MAX_AGE_YEARS:
        raise serializers.ValidationError("Please enter a valid date of birth.")
    return value


def validate_display_name(value: str) -> str:
    value = " ".join(value.split())
    if len(value) < 2:
        raise serializers.ValidationError("Player name must be at least 2 characters.")
    if "@" in value:
        raise serializers.ValidationError("Player names can't contain an email address.")
    return value


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    display_name = serializers.CharField(max_length=24)
    date_of_birth = serializers.DateField()
    country = serializers.CharField(max_length=2, required=False, allow_blank=True)
    timezone = serializers.CharField(max_length=64, required=False, default="UTC")
    language = serializers.CharField(max_length=16, required=False, default="en")
    accept_terms = serializers.BooleanField()

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_display_name(self, value):
        return validate_display_name(value)

    def validate_date_of_birth(self, value):
        return validate_dob(value)

    def validate_country(self, value):
        value = (value or "").upper()
        if value and (len(value) != 2 or not value.isalpha()):
            raise serializers.ValidationError("Use a two-letter country code.")
        return value

    def validate_timezone(self, value):
        try:
            zoneinfo.ZoneInfo(value)
        except (zoneinfo.ZoneInfoNotFoundError, ValueError):
            return "UTC"
        return value

    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError("Please accept the terms and privacy policy to continue.")
        return value

    def validate(self, attrs):
        candidate = User(email=attrs["email"])
        password_validation.validate_password(attrs["password"], user=candidate)
        return attrs

    @transaction.atomic
    def create(self, validated):
        user = User.objects.create_user(email=validated["email"], password=validated["password"])
        PlayerProfile.objects.create(
            user=user,
            display_name=validated["display_name"],
            date_of_birth=validated["date_of_birth"],
            country=validated.get("country", ""),
        )
        PlayerSettings.objects.create(
            user=user, timezone=validated.get("timezone", "UTC"), language=validated.get("language", "en")
        )
        get_stats(user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False, max_length=128)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(trim_whitespace=False, max_length=128)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": ["Current password is incorrect."]})
        password_validation.validate_password(attrs["new_password"], user=user)
        return attrs


class StatsSummarySerializer(serializers.Serializer):
    """Compact progression snapshot used across the app."""

    def to_representation(self, user):
        stats = get_stats(user)
        today = local_today(user)
        data = level_progress(stats.total_xp)
        data.update(
            {
                "coins": stats.coins,
                "sessions_completed": stats.sessions_completed,
                "games_completed": stats.games_completed,
                "perfect_scores": stats.perfect_scores,
                "daily_challenges_completed": stats.daily_challenges_completed,
                "current_streak": effective_streak(stats, today),
                "longest_streak": stats.longest_streak,
                "played_today": stats.last_active_date == today,
                "total_play_seconds": stats.total_play_seconds,
                "achievements_unlocked": user.achievements.filter(unlocked_at__isnull=False).count(),
            }
        )
        return data


class ProfileSerializer(serializers.ModelSerializer):
    interests = serializers.SlugRelatedField(
        many=True, slug_field="slug", queryset=Category.objects.filter(is_active=True)
    )
    age_group = serializers.CharField(read_only=True)
    onboarding_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = PlayerProfile
        fields = [
            "player_tag",
            "display_name",
            "avatar",
            "date_of_birth",
            "age_group",
            "country",
            "interests",
            "play_preference",
            "session_goal_minutes",
            "onboarding_completed",
            "created_at",
        ]
        read_only_fields = ["player_tag", "created_at"]

    def validate_display_name(self, value):
        return validate_display_name(value)

    def validate_avatar(self, value):
        if value not in AVATAR_KEYS:
            raise serializers.ValidationError("Unknown avatar.")
        return value

    def validate_date_of_birth(self, value):
        return validate_dob(value)

    def validate_session_goal_minutes(self, value):
        if not 5 <= value <= 120:
            raise serializers.ValidationError("Choose between 5 and 120 minutes.")
        return value


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerSettings
        exclude = ["id", "user", "updated_at"]

    def validate_timezone(self, value):
        try:
            zoneinfo.ZoneInfo(value)
        except (zoneinfo.ZoneInfoNotFoundError, ValueError) as exc:
            raise serializers.ValidationError("Unknown timezone.") from exc
        return value

    def validate_sound_volume(self, value):
        return max(0, min(value, 100))

    def validate_profile_visible(self, value):
        # Learners under 13 always have private profiles.
        user = self.context["request"].user
        if value and user.profile.age_group == "child":
            raise serializers.ValidationError("Profiles stay private for players under 13.")
        return value


class MeSerializer(serializers.Serializer):
    def to_representation(self, user):
        return {
            "id": str(user.id),
            "email": user.email,
            "profile": ProfileSerializer(user.profile).data,
            "settings": SettingsSerializer(user.settings).data,
            "stats": StatsSummarySerializer(user).data,
        }


class OnboardingSerializer(serializers.Serializer):
    interests = serializers.SlugRelatedField(
        many=True, slug_field="slug", queryset=Category.objects.filter(is_active=True), required=False
    )
    play_preference = serializers.ChoiceField(choices=PlayPreference.choices, required=False)
    session_goal_minutes = serializers.IntegerField(min_value=5, max_value=120, required=False)
    avatar = serializers.CharField(required=False)

    def validate_avatar(self, value):
        if value not in AVATAR_KEYS:
            raise serializers.ValidationError("Unknown avatar.")
        return value
