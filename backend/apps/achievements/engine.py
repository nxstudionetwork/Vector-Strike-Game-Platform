"""
Achievement engine.

Each ``criteria_type`` maps to an evaluator that returns the learner's current
progress value. An achievement unlocks when progress >= threshold. To add a
new kind of achievement, register an evaluator and create an Achievement row.
"""

from __future__ import annotations

from collections.abc import Callable

from django.db import transaction
from django.utils import timezone

from apps.notifications.models import NotificationKind, notify

from .models import Achievement, UserAchievement

Evaluator = Callable[["EvalContext", Achievement], int]
_EVALUATORS: dict[str, Evaluator] = {}


def evaluator(criteria_type: str):
    def decorator(func: Evaluator) -> Evaluator:
        _EVALUATORS[criteria_type] = func
        return func

    return decorator


def registered_criteria() -> list[str]:
    return sorted(_EVALUATORS)


class EvalContext:
    """Lazily computed, per-evaluation cache of learner facts."""

    def __init__(self, user, extra: dict | None = None):
        self.user = user
        self.extra = extra or {}
        self._stats = None

    @property
    def stats(self):
        if self._stats is None:
            from apps.progression.services import get_stats

            self._stats = get_stats(self.user)
        return self._stats


def _stat(name: str) -> Evaluator:
    return lambda ctx, _a: int(getattr(ctx.stats, name))


for _criteria, _field in {
    "sessions_completed": "sessions_completed",
    "games_completed": "games_completed",
    "total_xp": "total_xp",
    "level_reached": "level",
    "streak_days": "longest_streak",
    "perfect_scores": "perfect_scores",
    "daily_challenges_completed": "daily_challenges_completed",
    "comebacks": "comebacks",
}.items():
    _EVALUATORS[_criteria] = _stat(_field)


@evaluator("categories_played")
def _categories_played(ctx: EvalContext, _a: Achievement) -> int:
    from apps.progression.models import GameSession, SessionStatus

    return (
        GameSession.objects.filter(user=ctx.user, status=SessionStatus.COMPLETED)
        .values("game__category")
        .distinct()
        .count()
    )


@evaluator("category_games_completed")
def _category_games_completed(ctx: EvalContext, achievement: Achievement) -> int:
    from apps.progression.models import GameProgress, ProgressStatus

    if achievement.category_id is None:
        return 0
    return GameProgress.objects.filter(
        user=ctx.user,
        game__category_id=achievement.category_id,
        status__in=[ProgressStatus.COMPLETED, ProgressStatus.MASTERED],
    ).count()


@evaluator("games_mastered")
def _games_mastered(ctx: EvalContext, _a: Achievement) -> int:
    from apps.progression.models import GameProgress, ProgressStatus

    return GameProgress.objects.filter(user=ctx.user, status=ProgressStatus.MASTERED).count()


@transaction.atomic
def evaluate_achievements(user, context: dict | None = None) -> list[UserAchievement]:
    """Update progress on every locked achievement; unlock and reward any that are met."""
    ctx = EvalContext(user, context)
    unlocked_ids = set(
        UserAchievement.objects.filter(user=user, unlocked_at__isnull=False).values_list("achievement_id", flat=True)
    )
    newly_unlocked: list[UserAchievement] = []
    for achievement in Achievement.objects.filter(is_active=True).exclude(pk__in=unlocked_ids):
        func = _EVALUATORS.get(achievement.criteria_type)
        if func is None:
            continue
        value = min(func(ctx, achievement), achievement.threshold)
        ua, _ = UserAchievement.objects.get_or_create(user=user, achievement=achievement)
        changed = value != ua.progress
        ua.progress = value
        if value >= achievement.threshold:
            ua.unlocked_at = timezone.now()
            changed = True
            newly_unlocked.append(ua)
        if changed:
            ua.save()

    if newly_unlocked:
        from apps.progression.models import RewardSource
        from apps.progression.services import grant_reward

        for ua in newly_unlocked:
            a = ua.achievement
            if a.xp_reward or a.coin_reward:
                grant_reward(
                    user,
                    xp=a.xp_reward,
                    coins=a.coin_reward,
                    source=RewardSource.ACHIEVEMENT,
                    source_ref=a.slug,
                    description=a.title,
                )
            notify(
                user,
                NotificationKind.ACHIEVEMENT,
                title=f"Achievement unlocked: {a.title}",
                body=a.description,
                link="/achievements",
                data={"slug": a.slug, "rarity": a.rarity},
            )
        # Rewards may have pushed XP/level past other thresholds.
        newly_unlocked += evaluate_achievements(user, context)
    return newly_unlocked
