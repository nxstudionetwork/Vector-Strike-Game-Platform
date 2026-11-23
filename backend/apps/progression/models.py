"""
Progression: the single, central engine every game reports into.

Games never award XP or coins themselves. A game asks the server to start a
``GameSession`` and later submits a result; the server validates the result,
computes rewards (see ``services.py``), writes them to the ``RewardLedger`` and
updates the denormalised ``PlayerStats`` / ``GameProgress`` rows.
"""

import uuid

from django.db import models


class PlayerStats(models.Model):
    """Denormalised totals for fast reads. The ledger is the source of truth."""

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="stats")
    total_xp = models.PositiveIntegerField(default=0)
    coins = models.PositiveIntegerField(default=0)
    level = models.PositiveSmallIntegerField(default=1)
    sessions_completed = models.PositiveIntegerField(default=0)
    games_completed = models.PositiveIntegerField(default=0, help_text="Distinct games completed at least once")
    perfect_scores = models.PositiveIntegerField(default=0)
    daily_challenges_completed = models.PositiveIntegerField(default=0)
    comebacks = models.PositiveIntegerField(
        default=0, help_text="Personal bests set after three or more attempts (rewards persistence)"
    )
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    total_play_seconds = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "player stats"


class RewardKind(models.TextChoices):
    XP = "xp", "XP"
    COINS = "coins", "Coins"


class RewardSource(models.TextChoices):
    GAME_SESSION = "game_session", "Game session"
    ACHIEVEMENT = "achievement", "Achievement"
    DAILY_CHALLENGE = "daily_challenge", "Daily challenge"
    ADJUSTMENT = "adjustment", "Staff adjustment"


class RewardLedger(models.Model):
    """Append-only record of every XP / coin change."""

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="rewards")
    kind = models.CharField(max_length=8, choices=RewardKind.choices)
    amount = models.IntegerField()
    source = models.CharField(max_length=24, choices=RewardSource.choices)
    source_ref = models.CharField(max_length=64, blank=True)
    description = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "kind", "created_at"])]


class SessionStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    ABANDONED = "abandoned", "Abandoned"
    REJECTED = "rejected", "Rejected"


class GameSession(models.Model):
    """One server-issued attempt at a game."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="game_sessions")
    game = models.ForeignKey("catalog.Game", on_delete=models.CASCADE, related_name="sessions")
    status = models.CharField(max_length=12, choices=SessionStatus.choices, default=SessionStatus.ACTIVE)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    score = models.PositiveIntegerField(default=0)
    accuracy = models.FloatField(null=True, blank=True, help_text="0.0–1.0 where the game measures it")
    duration_seconds = models.PositiveIntegerField(default=0)
    is_perfect = models.BooleanField(default=False)
    xp_awarded = models.PositiveIntegerField(default=0)
    coins_awarded = models.PositiveIntegerField(default=0)
    metrics = models.JSONField(default=dict, blank=True, help_text="Game-specific learning signals (mistakes, hints…)")
    rejection_reason = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["user", "status", "started_at"]),
            models.Index(fields=["user", "game", "started_at"]),
        ]


class ProgressStatus(models.TextChoices):
    IN_PROGRESS = "in_progress", "In progress"
    COMPLETED = "completed", "Completed"
    MASTERED = "mastered", "Mastered"


class GameProgress(models.Model):
    """A learner's long-running relationship with one game."""

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="game_progress")
    game = models.ForeignKey("catalog.Game", on_delete=models.CASCADE, related_name="player_progress")
    status = models.CharField(max_length=12, choices=ProgressStatus.choices, default=ProgressStatus.IN_PROGRESS)
    attempts = models.PositiveIntegerField(default=0)
    completions = models.PositiveIntegerField(default=0)
    best_score = models.PositiveIntegerField(default=0)
    last_score = models.PositiveIntegerField(default=0)
    best_accuracy = models.FloatField(null=True, blank=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    total_xp = models.PositiveIntegerField(default=0)
    resume_state = models.JSONField(default=dict, blank=True, help_text="Opaque game state for Continue Playing")
    first_played_at = models.DateTimeField(auto_now_add=True)
    last_played_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_played_at"]
        constraints = [models.UniqueConstraint(fields=["user", "game"], name="unique_game_progress")]
        indexes = [models.Index(fields=["user", "status", "last_played_at"])]


class DailyActivity(models.Model):
    """Per-learner, per-local-day rollup used by streaks and activity charts."""

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="daily_activity")
    date = models.DateField()
    xp = models.PositiveIntegerField(default=0)
    sessions = models.PositiveIntegerField(default=0)
    play_seconds = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-date"]
        constraints = [models.UniqueConstraint(fields=["user", "date"], name="unique_daily_activity")]
        verbose_name_plural = "daily activity"
