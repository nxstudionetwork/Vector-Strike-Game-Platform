"""
Discovery & recommendations (rule-based).

This is intentionally transparent, deterministic logic — not AI. The function
signature is the integration point for a future "Vector Feed Engine": replace
``recommend_games`` with a smarter ranker without touching callers.

Current rules:
1. Live games in the learner's chosen interest categories come first.
2. Games the learner has not completed are preferred over completed ones.
3. Difficulty is matched to experience (level) so new learners see beginner games.
4. Locked games (required_level above the learner) are excluded.
"""

from django.db.models import Count, Q

from apps.progression.models import GameProgress, ProgressStatus

from .models import Category, Difficulty, Game, GameStatus

DIFFICULTY_FOR_LEVEL = [
    (1, [Difficulty.BEGINNER]),
    (5, [Difficulty.BEGINNER, Difficulty.INTERMEDIATE]),
    (12, [Difficulty.INTERMEDIATE, Difficulty.ADVANCED]),
    (25, [Difficulty.ADVANCED, Difficulty.EXPERT]),
]


def preferred_difficulties(level: int) -> list[str]:
    chosen = DIFFICULTY_FOR_LEVEL[0][1]
    for min_level, difficulties in DIFFICULTY_FOR_LEVEL:
        if level >= min_level:
            chosen = difficulties
    return list(chosen)


def visible_games():
    """Games learners may see in the catalogue (live + announced)."""
    return Game.objects.filter(status__in=[GameStatus.LIVE, GameStatus.COMING_SOON]).select_related("category")


def categories_with_counts():
    return Category.objects.filter(is_active=True).annotate(
        live_games=Count("games", filter=Q(games__status=GameStatus.LIVE), distinct=True),
        upcoming_games=Count("games", filter=Q(games__status=GameStatus.COMING_SOON), distinct=True),
    )


def recommend_games(user, level: int, limit: int = 8) -> tuple[list[Game], str]:
    """Returns (games, reason_key). reason_key lets the UI explain *why* honestly."""
    interest_ids = list(user.profile.interests.values_list("pk", flat=True))
    completed_ids = set(
        GameProgress.objects.filter(
            user=user, status__in=[ProgressStatus.COMPLETED, ProgressStatus.MASTERED]
        ).values_list("game_id", flat=True)
    )
    pool = list(
        Game.objects.filter(status=GameStatus.LIVE, required_level__lte=level).select_related("category")[:200]
    )
    if not pool:
        return [], "none"
    difficulties = set(preferred_difficulties(level))

    def rank(game: Game):
        return (
            0 if game.category_id in interest_ids else 1,
            1 if game.pk in completed_ids else 0,
            0 if game.difficulty in difficulties else 1,
            game.sort_order,
        )

    pool.sort(key=rank)
    reason = "interests" if interest_ids and pool[0].category_id in interest_ids else "level"
    return pool[:limit], reason
