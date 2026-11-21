"""
Catalog: the Vector Strike game universe.

``Category`` is the single taxonomy used for browsing the Game Zone *and* for
learner interests chosen during onboarding, so the two never drift apart.

``Game`` describes a playable experience. Gameplay itself is implemented by a
frontend game module identified by ``module_key``; scoring rules that the
server enforces live in ``scoring`` (see apps.progression.services).
"""

from django.db import models


class Category(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=64)
    tagline = models.CharField(max_length=140, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=32, help_text="Frontend icon key")
    color = models.CharField(max_length=16, help_text="Accent colour token or hex")
    sort_order = models.PositiveSmallIntegerField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name


class Difficulty(models.TextChoices):
    BEGINNER = "beginner", "Beginner"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"
    EXPERT = "expert", "Expert"


class GameStatus(models.TextChoices):
    DRAFT = "draft", "Draft (hidden)"
    COMING_SOON = "coming_soon", "Coming soon"
    LIVE = "live", "Live"
    RETIRED = "retired", "Retired"


class Game(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=80)
    short_description = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="games")
    secondary_categories = models.ManyToManyField(Category, blank=True, related_name="cross_listed_games")
    difficulty = models.CharField(max_length=16, choices=Difficulty.choices, default=Difficulty.BEGINNER)
    status = models.CharField(max_length=16, choices=GameStatus.choices, default=GameStatus.DRAFT)
    module_key = models.CharField(
        max_length=64, unique=True, help_text="Identifier of the frontend game module that implements gameplay"
    )
    # Learning & mechanics metadata used by discovery and recommendations.
    skills = models.JSONField(default=list, blank=True, help_text="Skill keys the game develops")
    mechanics = models.JSONField(default=list, blank=True, help_text="Mechanic keys, e.g. 'build', 'timing'")
    min_age = models.PositiveSmallIntegerField(default=6)
    estimated_minutes = models.PositiveSmallIntegerField(default=5)
    # Rewards & server-side scoring rules.
    base_xp = models.PositiveIntegerField(default=50, help_text="XP for a full-performance completion")
    base_coins = models.PositiveIntegerField(default=10)
    max_score = models.PositiveIntegerField(default=1000, help_text="Scores above this are rejected")
    min_duration_seconds = models.PositiveIntegerField(
        default=10, help_text="Sessions completed faster than this are rejected as implausible"
    )
    required_level = models.PositiveSmallIntegerField(default=1)
    thumbnail = models.CharField(max_length=255, blank=True)
    accent_color = models.CharField(max_length=16, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=100)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "title"]
        indexes = [
            models.Index(fields=["status", "category"]),
            models.Index(fields=["status", "is_featured"]),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def is_playable(self) -> bool:
        return self.status == GameStatus.LIVE


class FavoriteGame(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="favorite_games")
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "game"], name="unique_favorite")]
