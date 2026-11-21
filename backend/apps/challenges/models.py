"""
Daily challenges: one curated activity per day, defined by content staff.

A challenge points at a live game and declares requirements (for example a
minimum score). It is completed automatically when a validated game session
for that game meets the requirements on the learner's local date.
"""

from django.db import models


class DailyChallenge(models.Model):
    date = models.DateField(unique=True)
    game = models.ForeignKey("catalog.Game", on_delete=models.PROTECT, related_name="daily_challenges")
    title = models.CharField(max_length=80)
    description = models.CharField(max_length=200)
    requirements = models.JSONField(
        default=dict, blank=True, help_text='Supported keys: "min_score", "min_accuracy" (0–1)'
    )
    xp_reward = models.PositiveIntegerField(default=100)
    coin_reward = models.PositiveIntegerField(default=25)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.date}: {self.title}"

    def is_met_by(self, score: int, accuracy: float | None) -> bool:
        min_score = self.requirements.get("min_score")
        min_accuracy = self.requirements.get("min_accuracy")
        if min_score is not None and score < int(min_score):
            return False
        if min_accuracy is not None and (accuracy is None or accuracy < float(min_accuracy)):
            return False
        return True


class DailyChallengeCompletion(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="daily_challenge_completions")
    challenge = models.ForeignKey(DailyChallenge, on_delete=models.CASCADE, related_name="completions")
    session = models.ForeignKey("progression.GameSession", null=True, on_delete=models.SET_NULL)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "challenge"], name="unique_challenge_completion")]
