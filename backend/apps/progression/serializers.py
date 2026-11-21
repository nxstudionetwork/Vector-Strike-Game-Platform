from rest_framework import serializers

from .models import GameSession, RewardLedger


class StartSessionSerializer(serializers.Serializer):
    game = serializers.SlugField()


class CheckpointSerializer(serializers.Serializer):
    progress_percent = serializers.IntegerField(min_value=0, max_value=100)
    resume_state = serializers.JSONField(required=False, default=dict)

    def validate_resume_state(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("resume_state must be an object.")
        if len(str(value)) > 20_000:
            raise serializers.ValidationError("resume_state is too large.")
        return value


class CompleteSessionSerializer(serializers.Serializer):
    """What a game may report. XP, coins and duration are never accepted from clients."""

    score = serializers.IntegerField(min_value=0)
    accuracy = serializers.FloatField(min_value=0.0, max_value=1.0, required=False, allow_null=True)
    completed = serializers.BooleanField(default=True)
    metrics = serializers.JSONField(required=False, default=dict)

    def validate_metrics(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("metrics must be an object.")
        if len(str(value)) > 20_000:
            raise serializers.ValidationError("metrics payload is too large.")
        return value


class GameSessionSerializer(serializers.ModelSerializer):
    game = serializers.SlugRelatedField(slug_field="slug", read_only=True)

    class Meta:
        model = GameSession
        fields = [
            "id",
            "game",
            "status",
            "started_at",
            "ended_at",
            "score",
            "accuracy",
            "duration_seconds",
            "is_perfect",
            "xp_awarded",
            "coins_awarded",
        ]


class RewardLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardLedger
        fields = ["kind", "amount", "source", "description", "created_at"]
