from datetime import timedelta

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progression.models import GameProgress, ProgressStatus, SessionStatus
from apps.progression.services import get_stats

from .discovery import categories_with_counts, recommend_games, visible_games
from .models import Difficulty, FavoriteGame, GameStatus
from .serializers import CategorySerializer, GameCardSerializer, GameDetailSerializer

POPULAR_WINDOW = timedelta(days=30)
NEW_WINDOW = timedelta(days=30)
DONE = [ProgressStatus.COMPLETED, ProgressStatus.MASTERED]


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


def category_progress(user, category) -> dict:
    """How much of a world the learner has completed. Based only on live games."""
    completed = GameProgress.objects.filter(
        user=user, game__category=category, game__status=GameStatus.LIVE, status__in=DONE
    ).count()
    played = GameProgress.objects.filter(user=user, game__category=category).count()
    live = getattr(category, "live_games", 0)
    return {
        "live_games": live,
        "completed_games": completed,
        "played_games": played,
        "percent": round(completed / live, 4) if live else 0,
    }


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return categories_with_counts()


class CategoryDetailView(APIView):
    """A world plus the learner's progress in it."""

    def get(self, request, slug):
        category = get_object_or_404(categories_with_counts(), slug=slug)
        data = CategorySerializer(category).data
        data["progress"] = category_progress(request.user, category)
        return Response(data)


class GameListView(generics.ListAPIView):
    """
    Query params:
      category=<slug>  difficulty=<key>  q=<text>  status=live|coming_soon
      filter=recommended|new|popular|completed|in_progress|favorites
      sort=featured|new|title   (filters with their own order ignore it)
    Legacy: favorites=1, played=1
    """

    serializer_class = GameCardSerializer

    def get_queryset(self):
        params = self.request.query_params
        user = self.request.user
        self._rank = None
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
            qs = qs.filter(favorited_by__user=user)
        if params.get("played") == "1":
            qs = qs.filter(player_progress__user=user)

        ordering = {
            "featured": ["-is_featured", "sort_order", "title"],
            "new": ["-published_at", "-created_at"],
            "title": ["title"],
        }.get(params.get("sort", "featured"), ["sort_order", "title"])

        flt = params.get("filter")
        if flt == "favorites":
            qs = qs.filter(favorited_by__user=user)
        elif flt == "completed":
            qs = qs.filter(player_progress__user=user, player_progress__status__in=DONE)
        elif flt == "in_progress":
            qs = qs.filter(
                player_progress__user=user,
                player_progress__progress_percent__gt=0,
                player_progress__progress_percent__lt=100,
            )
        elif flt == "new":
            qs = qs.filter(status=GameStatus.LIVE, published_at__gte=timezone.now() - NEW_WINDOW)
            ordering = ["-published_at"]
        elif flt == "popular":
            # Real platform activity: completed sessions by all players in the last 30 days.
            qs = qs.filter(status=GameStatus.LIVE).annotate(
                recent_plays=Count(
                    "sessions",
                    filter=Q(
                        sessions__status=SessionStatus.COMPLETED,
                        sessions__ended_at__gte=timezone.now() - POPULAR_WINDOW,
                    ),
                )
            )
            ordering = ["-recent_plays", "sort_order", "title"]
        elif flt == "recommended":
            games, _ = recommend_games(user, get_stats(user).level, limit=48)
            self._rank = {g.pk: i for i, g in enumerate(games)}
            qs = qs.filter(pk__in=self._rank.keys())
        return qs.distinct().order_by(*ordering)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if self._rank is not None:
            queryset = sorted(queryset, key=lambda g: self._rank.get(g.pk, 0))
        page = self.paginate_queryset(queryset)
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


class SearchView(APIView):
    """
    Global search. Grouped results: games (live + announced), categories, and
    daily challenges from the last 30 days (never future ones).
    """

    throttle_scope = "search"

    def get(self, request):
        from apps.challenges.models import DailyChallenge, DailyChallengeCompletion
        from apps.progression.services import local_today

        q = request.query_params.get("q", "").strip()[:64]
        if len(q) < 2:
            return Response({"query": q, "games": [], "categories": [], "challenges": []})
        games = (
            visible_games()
            .filter(Q(title__icontains=q) | Q(short_description__icontains=q) | Q(category__name__icontains=q))
            .order_by("-is_featured", "sort_order")[:6]
        )
        categories = categories_with_counts().filter(Q(name__icontains=q) | Q(tagline__icontains=q))[:5]
        today = local_today(request.user)
        challenges = list(
            DailyChallenge.objects.select_related("game")
            .filter(date__lte=today, date__gte=today - timedelta(days=30))
            .filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(game__title__icontains=q))
            .order_by("-date")[:5]
        )
        done = set(
            DailyChallengeCompletion.objects.filter(user=request.user, challenge__in=challenges).values_list(
                "challenge_id", flat=True
            )
        )
        return Response(
            {
                "query": q,
                "games": serialize_cards(request.user, games),
                "categories": CategorySerializer(categories, many=True).data,
                "challenges": [
                    {
                        "id": c.pk,
                        "date": c.date.isoformat(),
                        "title": c.title,
                        "game_slug": c.game.slug,
                        "is_today": c.date == today,
                        "completed": c.pk in done,
                    }
                    for c in challenges
                ],
            }
        )
