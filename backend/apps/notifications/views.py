from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "body", "link", "data", "is_read", "created_at"]

    def get_is_read(self, obj):
        return obj.read_at is not None


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data["unread"] = Notification.objects.filter(user=request.user, read_at__isnull=True).count()
        return response


class MarkReadView(APIView):
    def post(self, request):
        ids = request.data.get("ids")
        qs = Notification.objects.filter(user=request.user, read_at__isnull=True)
        if isinstance(ids, list):
            qs = qs.filter(pk__in=[i for i in ids if isinstance(i, int)])
        qs.update(read_at=timezone.now())
        return Response({"unread": Notification.objects.filter(user=request.user, read_at__isnull=True).count()})
