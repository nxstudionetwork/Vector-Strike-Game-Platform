from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progression.services import local_today

from .serializers import daily_challenge_payload


class TodayChallengeView(APIView):
    def get(self, request):
        return Response({"challenge": daily_challenge_payload(request.user, local_today(request.user))})
