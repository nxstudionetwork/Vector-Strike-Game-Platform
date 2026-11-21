"""
Accounts: authentication identity, public player identity and preferences.

- ``User`` is the private authentication record (email + hashed password).
- ``PlayerProfile`` is the learner's Vector Strike identity. Only the
  display name, avatar, player tag and level are ever meant to be public.
- ``PlayerSettings`` holds per-learner preferences (language, accessibility,
  sound, notifications, privacy).
"""

import secrets
import uuid
from datetime import date

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone

# Player tags avoid look-alike characters (0/O, 1/I/L) so they are easy to read aloud.
PLAYER_TAG_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"


def generate_player_tag() -> str:
    return "VS-" + "".join(secrets.choice(PLAYER_TAG_ALPHABET) for _ in range(6))


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self._create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    def __str__(self) -> str:
        return self.email


class AgeGroup(models.TextChoices):
    CHILD = "child", "Under 13"
    TEEN = "teen", "13–17"
    ADULT = "adult", "18+"


def age_group_for(dob: date | None, today: date | None = None) -> str:
    if dob is None:
        return AgeGroup.CHILD  # Safest default when unknown.
    today = today or timezone.localdate()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 13:
        return AgeGroup.CHILD
    if age < 18:
        return AgeGroup.TEEN
    return AgeGroup.ADULT


class PlayPreference(models.TextChoices):
    QUICK = "quick", "Quick challenges"
    BALANCED = "balanced", "A mix of both"
    DEEP = "deep", "Longer missions"


class PlayerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    player_tag = models.CharField(max_length=12, unique=True, default=generate_player_tag, editable=False)
    display_name = models.CharField(max_length=24)
    avatar = models.CharField(max_length=32, default="orbit")
    date_of_birth = models.DateField(null=True, blank=True)
    country = models.CharField(max_length=2, blank=True, help_text="ISO 3166-1 alpha-2")
    interests = models.ManyToManyField("catalog.Category", blank=True, related_name="interested_players")
    play_preference = models.CharField(max_length=16, choices=PlayPreference.choices, default=PlayPreference.BALANCED)
    session_goal_minutes = models.PositiveSmallIntegerField(default=15)
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.display_name} ({self.player_tag})"

    @property
    def age_group(self) -> str:
        return age_group_for(self.date_of_birth)

    @property
    def onboarding_completed(self) -> bool:
        return self.onboarding_completed_at is not None


class MotionPreference(models.TextChoices):
    SYSTEM = "system", "Follow device"
    REDUCED = "reduced", "Reduced"
    FULL = "full", "Full"


class ThemePreference(models.TextChoices):
    SYSTEM = "system", "Follow device"
    DARK = "dark", "Dark"
    LIGHT = "light", "Light"


class TextSize(models.TextChoices):
    DEFAULT = "default", "Default"
    LARGE = "large", "Large"
    XLARGE = "xlarge", "Extra large"


class PlayerSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")
    language = models.CharField(max_length=16, default="en")
    # IANA zone used to decide where a learner's "day" starts (streaks, daily challenges).
    timezone = models.CharField(max_length=64, default="UTC")
    theme = models.CharField(max_length=8, choices=ThemePreference.choices, default=ThemePreference.DARK)
    motion = models.CharField(max_length=8, choices=MotionPreference.choices, default=MotionPreference.SYSTEM)
    text_size = models.CharField(max_length=8, choices=TextSize.choices, default=TextSize.DEFAULT)
    high_contrast = models.BooleanField(default=False)
    sound_effects = models.BooleanField(default=True)
    music = models.BooleanField(default=True)
    sound_volume = models.PositiveSmallIntegerField(default=70)
    show_hints = models.BooleanField(default=True)
    show_timers = models.BooleanField(default=True)
    notify_achievements = models.BooleanField(default=True)
    notify_daily_challenge = models.BooleanField(default=True)
    notify_streak = models.BooleanField(default=True)
    # Privacy: profiles are private by default. Future social features must respect this.
    profile_visible = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Settings for {self.user_id}"
