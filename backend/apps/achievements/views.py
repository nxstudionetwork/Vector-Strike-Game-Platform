from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .engine import evaluate_achievements
from .models import Achievement, UserAchievement
from .serializers import achievement_payload


class AchievementListView(APIView):
    def get(self, request):
        # Bring progress up to date (cheap; also covers achievements added after the last session).
        evaluate_achievements(request.user)
        mine = {
            ua.achievement_id: ua for ua in UserAchievement.objects.filter(user=request.user)
        }
        items = [
            achievement_payload(a, mine.get(a.pk))
            for a in Achievement.objects.filter(is_active=True).select_related("category")
        ]
        unlocked = sum(1 for i in items if i["is_unlocked"])
        return Response({"total": len(items), "unlocked": unlocked, "achievements": items})


class MarkAchievementsSeenView(APIView):
    def post(self, request):
        UserAchievement.objects.filter(user=request.user, unlocked_at__isnull=False, seen_at__isnull=True).update(
            seen_at=timezone.now()
        )
        return Response({"ok": True})
