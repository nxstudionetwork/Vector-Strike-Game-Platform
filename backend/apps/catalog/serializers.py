from rest_framework import serializers

from .models import Category, Game


class CategorySerializer(serializers.ModelSerializer):
    live_games = serializers.IntegerField(read_only=True, default=0)
    upcoming_games = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["slug", "name", "tagline", "description", "icon", "color", "live_games", "upcoming_games"]


class CategoryRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["slug", "name", "icon", "color"]


class GameProgressRefSerializer(serializers.Serializer):
    status = serializers.CharField()
    progress_percent = serializers.IntegerField()
    best_score = serializers.IntegerField()
    attempts = serializers.IntegerField()
    completions = serializers.IntegerField()
    last_played_at = serializers.DateTimeField()


class GameCardSerializer(serializers.ModelSerializer):
    """Lightweight representation for grids and rails."""

    category = CategoryRefSerializer(read_only=True)
    is_locked = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = [
            "slug",
            "title",
            "short_description",
            "category",
            "difficulty",
            "status",
            "module_key",
            "estimated_minutes",
            "base_xp",
            "required_level",
            "thumbnail",
            "accent_color",
            "skills",
            "mechanics",
            "is_featured",
            "is_locked",
            "is_favorite",
            "progress",
        ]

    def _ctx(self, key, default):
        return self.context.get(key, default)

    def get_is_locked(self, game):
        return self._ctx("player_level", 1) < game.required_level

    def get_is_favorite(self, game):
        return game.pk in self._ctx("favorite_ids", set())

    def get_progress(self, game):
        progress = self._ctx("progress_by_game", {}).get(game.pk)
        return GameProgressRefSerializer(progress).data if progress else None


class GameDetailSerializer(GameCardSerializer):
    secondary_categories = CategoryRefSerializer(many=True, read_only=True)

    class Meta(GameCardSerializer.Meta):
        fields = GameCardSerializer.Meta.fields + [
            "description",
            "secondary_categories",
            "min_age",
            "base_coins",
            "max_score",
            "metadata",
            "published_at",
        ]
