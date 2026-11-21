"""In-app notifications (achievement unlocks, level-ups, challenge results)."""

from django.db import models


class NotificationKind(models.TextChoices):
    ACHIEVEMENT = "achievement", "Achievement unlocked"
    LEVEL_UP = "level_up", "Level up"
    DAILY_CHALLENGE = "daily_challenge", "Daily challenge"
    SYSTEM = "system", "System"


class Notification(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=20, choices=NotificationKind.choices)
    title = models.CharField(max_length=100)
    body = models.CharField(max_length=240, blank=True)
    link = models.CharField(max_length=200, blank=True, help_text="Frontend route to open")
    data = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "read_at"])]


def notify(user, kind: str, title: str, body: str = "", link: str = "", data: dict | None = None) -> Notification:
    return Notification.objects.create(user=user, kind=kind, title=title, body=body, link=link, data=data or {})
