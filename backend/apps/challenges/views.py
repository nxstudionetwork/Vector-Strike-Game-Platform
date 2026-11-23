from datetime import timedelta

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progression.services import local_today

from .models import DailyChallenge, DailyChallengeCompletion
from .serializers import daily_challenge_payload

HISTORY_DAYS = 14


class TodayChallengeView(APIView):
    def get(self, request):
        return Response({"challenge": daily_challenge_payload(request.user, local_today(request.user))})


class ChallengeOverviewView(APIView):
    """Today's challenge plus the recent history (never future challenges)."""

    def get(self, request):
        today = local_today(request.user)
        recent = list(
            DailyChallenge.objects.select_related("game")
            .filter(date__lt=today, date__gte=today - timedelta(days=HISTORY_DAYS))
            .order_by("-date")
        )
        done = {
            c.challenge_id: c.completed_at
            for c in DailyChallengeCompletion.objects.filter(user=request.user, challenge__in=recent)
        }
        return Response(
            {
                "today": daily_challenge_payload(request.user, today),
                "history": [
                    {
                        "id": c.pk,
                        "date": c.date.isoformat(),
                        "title": c.title,
                        "xp_reward": c.xp_reward,
                        "game": {"slug": c.game.slug, "title": c.game.title},
                        "completed": c.pk in done,
                    }
                    for c in recent
                ],
                "total_completed": DailyChallengeCompletion.objects.filter(user=request.user).count(),
            }
        )
