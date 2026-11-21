"""
Achievements: data-driven milestones evaluated by ``engine.py``.

An achievement is defined by a ``criteria_type`` (a key in the engine's
evaluator registry) and a numeric ``threshold``. New kinds of achievement are
added by registering a new evaluator — no schema change required.
"""

from django.db import models


class Rarity(models.TextChoices):
    COMMON = "common", "Common"
    RARE = "rare", "Rare"
    EPIC = "epic", "Epic"
    LEGENDARY = "legendary", "Legendary"


class AchievementGroup(models.TextChoices):
    MILESTONE = "milestone", "Milestone"
    EXPLORATION = "exploration", "Exploration"
    MASTERY = "mastery", "Mastery"
    CONSISTENCY = "consistency", "Consistency"
    GROWTH = "growth", "Growth"
    CHALLENGE = "challenge", "Challenge"


class Achievement(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=64)
    description = models.CharField(max_length=200)
    icon = models.CharField(max_length=32)
    group = models.CharField(max_length=16, choices=AchievementGroup.choices, default=AchievementGroup.MILESTONE)
    rarity = models.CharField(max_length=12, choices=Rarity.choices, default=Rarity.COMMON)
    criteria_type = models.CharField(max_length=48)
    threshold = models.PositiveIntegerField(default=1)
    criteria_params = models.JSONField(default=dict, blank=True)
    category = models.ForeignKey(
        "catalog.Category", null=True, blank=True, on_delete=models.SET_NULL, related_name="achievements"
    )
    xp_reward = models.PositiveIntegerField(default=0)
    coin_reward = models.PositiveIntegerField(default=0)
    is_hidden = models.BooleanField(default=False, help_text="Hidden until unlocked")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=100)

    class Meta:
        ordering = ["sort_order", "title"]

    def __str__(self) -> str:
        return self.title


class UserAchievement(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="achievements")
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="holders")
    progress = models.PositiveIntegerField(default=0)
    unlocked_at = models.DateTimeField(null=True, blank=True)
    seen_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "achievement"], name="unique_user_achievement")]
        indexes = [models.Index(fields=["user", "unlocked_at"])]

    @property
    def is_unlocked(self) -> bool:
        return self.unlocked_at is not None
