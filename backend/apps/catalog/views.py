from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progression.models import GameProgress
from apps.progression.services import get_stats

from .discovery import categories_with_counts, visible_games
from .models import Difficulty, FavoriteGame, Game, GameStatus
from .serializers import CategorySerializer, GameCardSerializer, GameDetailSerializer


def player_context(user, games=None) -> dict:
    """Per-learner data the game serializers need, fetched in bulk (no N+1)."""
    progress_qs = GameProgress.objects.filter(user=user)
    favorites_qs = FavoriteGame.objects.filter(user=user)
    if games is not None:
        ids = [g.pk for g in games]
        progress_qs = progress_qs.filter(game_id__in=ids)
        favorites_qs = favorites_qs.filter(game_id__in=ids)
    return {
        "player_level": get_stats(user).level,
        "progress_by_game": {p.game_id: p for p in progress_qs},
        "favorite_ids": set(favorites_qs.values_list("game_id", flat=True)),
    }


def serialize_cards(user, games) -> list:
    games = list(games)
    return GameCardSerializer(games, many=True, context=player_context(user, games)).data


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return categories_with_counts()


class CategoryDetailView(generics.RetrieveAPIView):
    serializer_class = CategorySerializer
    lookup_field = "slug"

    def get_queryset(self):
        return categories_with_counts()


class GameListView(generics.ListAPIView):
    """
    Query params:
      category=<slug>  difficulty=<key>  q=<text>  status=live|coming_soon
      favorites=1  played=1  sort=featured|new|title
    """

    serializer_class = GameCardSerializer

    def get_queryset(self):
        params = self.request.query_params
        qs = visible_games()
        if slug := params.get("category"):
            qs = qs.filter(Q(category__slug=slug) | Q(secondary_categories__slug=slug))
        if (difficulty := params.get("difficulty")) in Difficulty.values:
            qs = qs.filter(difficulty=difficulty)
        if (game_status := params.get("status")) in (GameStatus.LIVE, GameStatus.COMING_SOON):
            qs = qs.filter(status=game_status)
        if q := params.get("q", "").strip()[:64]:
            qs = qs.filter(Q(title__icontains=q) | Q(short_description__icontains=q) | Q(category__name__icontains=q))
        if params.get("favorites") == "1":
            qs = qs.filter(favorited_by__user=self.request.user)
        if params.get("played") == "1":
            qs = qs.filter(player_progress__user=self.request.user)
        sort = params.get("sort", "featured")
        ordering = {
            "featured": ["-is_featured", "sort_order", "title"],
            "new": ["-published_at", "-created_at"],
            "title": ["title"],
        }.get(sort, ["sort_order", "title"])
        return qs.distinct().order_by(*ordering)

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response(serialize_cards(request.user, page))


class GameDetailView(APIView):
    def get(self, request, slug):
        game = get_object_or_404(visible_games().prefetch_related("secondary_categories"), slug=slug)
        return Response(GameDetailSerializer(game, context=player_context(request.user, [game])).data)


class FavoriteView(APIView):
    def post(self, request, slug):
        game = get_object_or_404(visible_games(), slug=slug)
        FavoriteGame.objects.get_or_create(user=request.user, game=game)
        return Response({"is_favorite": True}, status=status.HTTP_200_OK)

    def delete(self, request, slug):
        FavoriteGame.objects.filter(user=request.user, game__slug=slug).delete()
        return Response({"is_favorite": False}, status=status.HTTP_200_OK)

