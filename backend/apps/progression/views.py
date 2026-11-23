from datetime import timedelta

from django.db.models import Count, Max, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import StatsSummarySerializer
from apps.catalog.discovery import categories_with_counts, recommend_games, visible_games
from apps.catalog.models import Game, GameStatus
from apps.catalog.views import serialize_cards

from .models import DailyActivity, GameProgress, GameSession, ProgressStatus, RewardLedger, SessionStatus
from .serializers import (
    CheckpointSerializer,
    CompleteSessionSerializer,
    GameSessionSerializer,
    RewardLedgerSerializer,
    StartSessionSerializer,
)
from .services import (
    SessionRejected,
    abandon_session,
    complete_session,
    get_stats,
    local_today,
    save_checkpoint,
    start_session,
)


def _own_session(request, pk) -> GameSession:
    return get_object_or_404(GameSession.objects.select_related("game"), pk=pk, user=request.user)


class StartSessionView(APIView):
    throttle_scope = "play"

    def post(self, request):
        serializer = StartSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        game = get_object_or_404(Game, slug=serializer.validated_data["game"])
        try:
            session = start_session(request.user, game)
        except SessionRejected as exc:
            raise ValidationError({"game": [str(exc)]}) from exc
        progress = GameProgress.objects.get(user=request.user, game=game)
        return Response(
            {"session": GameSessionSerializer(session).data, "resume_state": progress.resume_state},
            status=status.HTTP_201_CREATED,
        )


class CheckpointView(APIView):
    throttle_scope = "play"

    def patch(self, request, pk):
        session = _own_session(request, pk)
        serializer = CheckpointSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            progress = save_checkpoint(session, **serializer.validated_data)
        except SessionRejected as exc:
            raise ValidationError({"session": [str(exc)]}) from exc
        return Response({"progress_percent": progress.progress_percent})


class CompleteSessionView(APIView):
    throttle_scope = "play"

    def post(self, request, pk):
        session = _own_session(request, pk)
        serializer = CompleteSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = complete_session(session, **serializer.validated_data)
        except SessionRejected as exc:
            raise ValidationError({"session": [str(exc)]}) from exc
        return Response(
            {
                "session": GameSessionSerializer(result.session).data,
                "xp_awarded": result.xp_awarded,
                "coins_awarded": result.coins_awarded,
                "is_personal_best": result.is_personal_best,
                "is_first_completion": result.is_first_completion,
                "leveled_up": result.leveled_up,
                "previous_level": result.previous_level,
                "level": result.level,
                "daily_challenge_completed": result.daily_challenge_completed,
                "daily_challenge_xp": result.daily_challenge_xp,
                "achievements_unlocked": [
                    {
                        "slug": ua.achievement.slug,
                        "title": ua.achievement.title,
                        "description": ua.achievement.description,
                        "icon": ua.achievement.icon,
                        "rarity": ua.achievement.rarity,
                        "xp_reward": ua.achievement.xp_reward,
                    }
                    for ua in result.achievements_unlocked
                ],
                "stats": StatsSummarySerializer(request.user).data,
            }
        )


class AbandonSessionView(APIView):
    def post(self, request, pk):
        abandon_session(_own_session(request, pk))
        return Response(status=status.HTTP_204_NO_CONTENT)


class HomeFeedView(APIView):
    """Everything the Home page needs, in one request."""

    def get(self, request):
        user = request.user
        stats = get_stats(user)
        today = local_today(user)

        continue_qs = (
            # An unfinished run (checkpointed, not completed) — even on a game finished before.
            GameProgress.objects.filter(
                user=user, game__status=GameStatus.LIVE, progress_percent__gt=0, progress_percent__lt=100
            )
            .select_related("game", "game__category")
            .order_by("-last_played_at")[:6]
        )
        recently_played = (
            GameProgress.objects.filter(user=user, game__status=GameStatus.LIVE)
            .select_related("game", "game__category")
            .order_by("-last_played_at")[:6]
        )
        recommended, reason = recommend_games(user, stats.level)
        featured = visible_games().filter(is_featured=True)[:6]
        new_games = visible_games().filter(status=GameStatus.LIVE).order_by("-published_at", "-created_at")[:6]

        from apps.achievements.serializers import recent_unlocks
        from apps.challenges.serializers import daily_challenge_payload

        today_row = DailyActivity.objects.filter(user=user, date=today).first()
        completed_by_cat = {
            row["game__category"]: row["n"]
            for row in GameProgress.objects.filter(
                user=user,
                game__status=GameStatus.LIVE,
                status__in=[ProgressStatus.COMPLETED, ProgressStatus.MASTERED],
            )
            .values("game__category")
            .annotate(n=Count("id"))
        }

        return Response(
            {
                "stats": StatsSummarySerializer(user).data,
                "continue_playing": serialize_cards(user, [p.game for p in continue_qs]),
                "recently_played": serialize_cards(user, [p.game for p in recently_played]),
                "recommended": {"reason": reason, "games": serialize_cards(user, recommended)},
                "featured": serialize_cards(user, featured),
                "new_games": serialize_cards(user, new_games),
                "daily_challenge": daily_challenge_payload(user, today),
                "recent_achievements": recent_unlocks(user, limit=4),
                "categories": [
                    {
                        "slug": c.slug,
                        "name": c.name,
                        "icon": c.icon,
                        "color": c.color,
                        "tagline": c.tagline,
                        "live_games": c.live_games,
                        "upcoming_games": c.upcoming_games,
                        "completed_games": completed_by_cat.get(c.pk, 0),
                    }
                    for c in categories_with_counts()
                ],
                "today": {
                    "xp": today_row.xp if today_row else 0,
                    "play_seconds": today_row.play_seconds if today_row else 0,
                    "goal_minutes": user.profile.session_goal_minutes,
                },
                "catalog": {
                    "live_games": Game.objects.filter(status=GameStatus.LIVE).count(),
                    "upcoming_games": Game.objects.filter(status=GameStatus.COMING_SOON).count(),
                },
            }
        )


class ProgressOverviewView(APIView):
    """Data for the Progress page. All values are derived from stored activity."""

    def get(self, request):
        user = request.user
        today = local_today(user)
        try:
            days = max(7, min(int(request.query_params.get("days", 14)), 90))
        except ValueError:
            days = 14
        start = today - timedelta(days=days - 1)
        rows = {a.date: a for a in DailyActivity.objects.filter(user=user, date__gte=start)}
        activity = []
        for offset in range(days):
            day = start + timedelta(days=offset)
            row = rows.get(day)
            activity.append(
                {
                    "date": day.isoformat(),
                    "xp": row.xp if row else 0,
                    "sessions": row.sessions if row else 0,
                    "play_seconds": row.play_seconds if row else 0,
                }
            )

        completed = GameSession.objects.filter(user=user, status=SessionStatus.COMPLETED)
        per_category = {
            row["game__category"]: row
            for row in completed.values("game__category").annotate(
                sessions=Count("id"), xp=Sum("xp_awarded"), best=Max("score")
            )
        }
        completed_games = {
            row["game__category"]: row["n"]
            for row in GameProgress.objects.filter(
                user=user, status__in=[ProgressStatus.COMPLETED, ProgressStatus.MASTERED]
            )
            .values("game__category")
            .annotate(n=Count("id"))
        }
        categories = []
        for cat in categories_with_counts():
            row = per_category.get(cat.pk)
            categories.append(
                {
                    "slug": cat.slug,
                    "name": cat.name,
                    "icon": cat.icon,
                    "color": cat.color,
                    "live_games": cat.live_games,
                    "games_completed": completed_games.get(cat.pk, 0),
                    "sessions": row["sessions"] if row else 0,
                    "xp": (row["xp"] or 0) if row else 0,
                }
            )

        records = (
            GameProgress.objects.filter(user=user, best_score__gt=0)
            .select_related("game", "game__category")
            .order_by("-best_score")[:5]
        )
        recent = completed.select_related("game").order_by("-ended_at")[:10]
        week_start = today - timedelta(days=6)
        week = DailyActivity.objects.filter(user=user, date__gte=week_start).aggregate(
            week_xp=Sum("xp"),
            week_sessions=Sum("sessions"),
            week_seconds=Sum("play_seconds"),
            active_days=Count("id", filter=Q(sessions__gt=0) | Q(xp__gt=0)),
        )
        return Response(
            {
                "stats": StatsSummarySerializer(user).data,
                "activity": activity,
                "this_week": {
                    "xp": week["week_xp"] or 0,
                    "sessions": week["week_sessions"] or 0,
                    "play_seconds": week["week_seconds"] or 0,
                    "active_days": week["active_days"] or 0,
                },
                "categories": categories,
                "personal_records": [
                    {
                        "game": {"slug": p.game.slug, "title": p.game.title, "category": p.game.category.name},
                        "best_score": p.best_score,
                        "best_accuracy": p.best_accuracy,
                        "completions": p.completions,
                        "status": p.status,
                    }
                    for p in records
                ],
                "recent_sessions": [
                    {**GameSessionSerializer(s).data, "game_title": s.game.title} for s in recent
                ],
            }
        )


class RewardHistoryView(generics.ListAPIView):
    serializer_class = RewardLedgerSerializer

    def get_queryset(self):
        return RewardLedger.objects.filter(user=self.request.user)


class StatsView(APIView):
    """
    Deeper statistics for the Stats page. Everything is derived from stored
    sessions/progress; values are null when there is not enough data yet.
    """

    MIN_SESSIONS_FOR_STRENGTH = 2

    def get(self, request):
        user = request.user
        sessions = list(
            GameSession.objects.filter(user=user, status=SessionStatus.COMPLETED)
            .select_related("game", "game__category")
            .order_by("-ended_at")[:500]
        )

        def performance(s: GameSession) -> float:
            return min(s.score / s.game.max_score, 1.0) if s.game.max_score else 0.0

        progress = GameProgress.objects.filter(user=user)
        started = progress.count()
        finished = progress.filter(status__in=[ProgressStatus.COMPLETED, ProgressStatus.MASTERED]).count()

        best = max(sessions, key=lambda s: (performance(s), s.score), default=None)
        per_cat: dict[int, dict] = {}
        for s in sessions:
            cat = s.game.category
            row = per_cat.setdefault(
                cat.pk, {"slug": cat.slug, "name": cat.name, "icon": cat.icon, "color": cat.color, "n": 0, "perf": 0.0}
            )
            row["n"] += 1
            row["perf"] += performance(s)

        def cat_out(row):
            return {k: row[k] for k in ("slug", "name", "icon", "color")} | {
                "sessions": row["n"],
                "average_performance": round(row["perf"] / row["n"], 4),
            }

        favorite = max(per_cat.values(), key=lambda r: r["n"], default=None)
        eligible = [r for r in per_cat.values() if r["n"] >= self.MIN_SESSIONS_FOR_STRENGTH]
        strongest = max(eligible, key=lambda r: r["perf"] / r["n"], default=None)
        accuracies = [s.accuracy for s in sessions if s.accuracy is not None]
        total_seconds = sum(s.duration_seconds for s in sessions)

        return Response(
            {
                "stats": StatsSummarySerializer(user).data,
                "totals": {
                    "sessions": len(sessions),
                    "games_played": started,
                    "games_completed": finished,
                    "completion_rate": round(finished / started, 4) if started else None,
                    "play_seconds": total_seconds,
                    "average_performance": round(sum(map(performance, sessions)) / len(sessions), 4)
                    if sessions
                    else None,
                    "average_accuracy": round(sum(accuracies) / len(accuracies), 4) if accuracies else None,
                    "average_session_seconds": round(total_seconds / len(sessions)) if sessions else None,
                },
                "highest_score": {
                    "score": best.score,
                    "max_score": best.game.max_score,
                    "game": {"slug": best.game.slug, "title": best.game.title},
                    "date": best.ended_at,
                }
                if best
                else None,
                "favorite_category": cat_out(favorite) if favorite else None,
                "strongest_category": cat_out(strongest) if strongest else None,
                "categories": sorted((cat_out(r) for r in per_cat.values()), key=lambda r: -r["sessions"]),
                "recent_activity": [
                    {**GameSessionSerializer(s).data, "game_title": s.game.title, "category": s.game.category.name}
                    for s in sessions[:12]
                ],
            }
        )
