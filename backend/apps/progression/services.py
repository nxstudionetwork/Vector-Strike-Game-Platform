"""
Progression services — the only code allowed to change XP, coins, levels,
streaks and game progress.

Typical game flow::

    session = start_session(user, game)                 # POST /api/play/sessions/
    save_checkpoint(session, progress, resume_state)    # PATCH (optional, any number of times)
    result = complete_session(session, score=…, …)      # POST  /api/play/sessions/<id>/complete/

``complete_session`` validates the submission against the game's server-side
rules, computes rewards, and returns a ``SessionResult`` describing everything
the client should celebrate (XP, level-up, achievements, daily challenge).
"""

from __future__ import annotations

import logging
import zoneinfo
from dataclasses import dataclass, field
from datetime import date, timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.catalog.models import Game

from .levels import level_for_xp
from .models import (
    DailyActivity,
    GameProgress,
    GameSession,
    PlayerStats,
    ProgressStatus,
    RewardKind,
    RewardLedger,
    RewardSource,
    SessionStatus,
)

logger = logging.getLogger(__name__)

# Anti-farming: after this many rewarded sessions of the same game in one local
# day, further sessions earn a reduced share of XP. Learners can always keep
# playing; they just can't grind one game for unlimited XP.
DAILY_FULL_REWARD_SESSIONS = 5
REDUCED_REWARD_FACTOR = 0.25
FIRST_COMPLETION_BONUS = 0.25
PERSONAL_BEST_BONUS = 0.10
MASTERY_ACCURACY = 0.9
MASTERY_COMPLETIONS = 3
SESSION_MAX_AGE = timedelta(hours=6)


class SessionRejected(Exception):
    """Raised when a submitted result fails server-side validation."""


@dataclass
class SessionResult:
    session: GameSession
    xp_awarded: int
    coins_awarded: int
    previous_level: int
    level: int
    is_personal_best: bool
    is_first_completion: bool
    achievements_unlocked: list = field(default_factory=list)
    daily_challenge_completed: bool = False
    daily_challenge_xp: int = 0

    @property
    def leveled_up(self) -> bool:
        return self.level > self.previous_level


# --- helpers ----------------------------------------------------------------


def local_today(user) -> date:
    """The learner's current calendar date in their own timezone."""
    tz_name = getattr(getattr(user, "settings", None), "timezone", None) or "UTC"
    try:
        tz = zoneinfo.ZoneInfo(tz_name)
    except (zoneinfo.ZoneInfoNotFoundError, ValueError):
        tz = zoneinfo.ZoneInfo("UTC")
    return timezone.now().astimezone(tz).date()


def get_stats(user) -> PlayerStats:
    stats, _ = PlayerStats.objects.get_or_create(user=user)
    return stats


def _locked_stats(user) -> PlayerStats:
    get_stats(user)
    return PlayerStats.objects.select_for_update().get(user=user)


@transaction.atomic
def grant_reward(user, *, xp: int = 0, coins: int = 0, source: str, source_ref: str = "", description: str = ""):
    """Write ledger rows and update totals. Returns (previous_level, new_level)."""
    stats = _locked_stats(user)
    previous_level = stats.level
    if xp:
        RewardLedger.objects.create(
            user=user, kind=RewardKind.XP, amount=xp, source=source, source_ref=source_ref, description=description
        )
        stats.total_xp += xp
        stats.level = level_for_xp(stats.total_xp)
        activity, _ = DailyActivity.objects.get_or_create(user=user, date=local_today(user))
        DailyActivity.objects.filter(pk=activity.pk).update(xp=F("xp") + xp)
    if coins:
        RewardLedger.objects.create(
            user=user,
            kind=RewardKind.COINS,
            amount=coins,
            source=source,
            source_ref=source_ref,
            description=description,
        )
        stats.coins += coins
    stats.save()
    if stats.level > previous_level:
        from apps.notifications.models import NotificationKind, notify

        notify(
            user,
            NotificationKind.LEVEL_UP,
            title=f"Level {stats.level} reached",
            body="Your skills are growing. New challenges await.",
            link="/progress",
            data={"level": stats.level},
        )
    return previous_level, stats.level


def _touch_streak(stats: PlayerStats, today: date) -> None:
    if stats.last_active_date == today:
        return
    if stats.last_active_date == today - timedelta(days=1):
        stats.current_streak += 1
    else:
        stats.current_streak = 1
    stats.longest_streak = max(stats.longest_streak, stats.current_streak)
    stats.last_active_date = today


def effective_streak(stats: PlayerStats, today: date) -> int:
    """A streak only counts if the learner played today or yesterday."""
    if stats.last_active_date in (today, today - timedelta(days=1)):
        return stats.current_streak
    return 0


# --- session lifecycle -------------------------------------------------------


@transaction.atomic
def start_session(user, game: Game) -> GameSession:
    if not game.is_playable:
        raise SessionRejected("This game is not available to play yet.")
    stats = get_stats(user)
    if stats.level < game.required_level:
        raise SessionRejected(f"Reach level {game.required_level} to unlock this game.")
    # Abandon any stale active sessions for this game so only one is open at a time.
    GameSession.objects.filter(user=user, game=game, status=SessionStatus.ACTIVE).update(
        status=SessionStatus.ABANDONED, ended_at=timezone.now()
    )
    progress, _ = GameProgress.objects.get_or_create(user=user, game=game)
    GameProgress.objects.filter(pk=progress.pk).update(attempts=F("attempts") + 1, last_played_at=timezone.now())
    return GameSession.objects.create(user=user, game=game)


@transaction.atomic
def save_checkpoint(session: GameSession, *, progress_percent: int, resume_state: dict) -> GameProgress:
    if session.status != SessionStatus.ACTIVE:
        raise SessionRejected("This session has already ended.")
    progress = GameProgress.objects.select_for_update().get(user=session.user, game=session.game)
    progress.progress_percent = max(0, min(int(progress_percent), 100))
    progress.resume_state = resume_state or {}
    progress.save(update_fields=["progress_percent", "resume_state", "last_played_at"])
    return progress


def _validate(session: GameSession, score: int, accuracy: float | None, now) -> int:
    game = session.game
    if session.status != SessionStatus.ACTIVE:
        raise SessionRejected("This session has already ended.")
    elapsed = (now - session.started_at).total_seconds()
    if elapsed > SESSION_MAX_AGE.total_seconds():
        raise SessionRejected("This session expired. Start a new one.")
    if elapsed < game.min_duration_seconds:
        raise SessionRejected("Result submitted too quickly to be valid.")
    if score < 0 or score > game.max_score:
        raise SessionRejected("Score is outside the allowed range for this game.")
    if accuracy is not None and not (0.0 <= accuracy <= 1.0):
        raise SessionRejected("Accuracy must be between 0 and 1.")
    from .validators import run_game_validator

    run_game_validator(session, score=score, accuracy=accuracy)
    # Duration is measured by the server, never trusted from the client.
    return int(elapsed)


def compute_session_xp(game: Game, *, score: int, is_first_completion: bool, is_personal_best: bool, farmed: bool):
    performance = max(0.0, min(score / game.max_score, 1.0)) if game.max_score else 0.0
    xp = game.base_xp * (0.4 + 0.6 * performance)
    if is_first_completion:
        xp *= 1 + FIRST_COMPLETION_BONUS
    elif is_personal_best:
        xp *= 1 + PERSONAL_BEST_BONUS
    coins = game.base_coins * performance
    if farmed:
        xp *= REDUCED_REWARD_FACTOR
        coins = 0
    return int(round(xp)), int(round(coins))


def complete_session(
    session: GameSession, *, score: int, accuracy: float | None = None, completed: bool = True, metrics: dict | None = None
) -> SessionResult:
    try:
        return _complete_session(session, score=score, accuracy=accuracy, completed=completed, metrics=metrics)
    except SessionRejected as exc:
        # Recorded outside the rolled-back transaction so rejected attempts stay auditable.
        GameSession.objects.filter(pk=session.pk, status=SessionStatus.ACTIVE).update(
            status=SessionStatus.REJECTED, rejection_reason=str(exc)[:120], ended_at=timezone.now()
        )
        logger.info("Rejected session %s: %s", session.pk, exc)
        raise


@transaction.atomic
def _complete_session(session: GameSession, *, score, accuracy, completed, metrics) -> SessionResult:
    session = GameSession.objects.select_for_update().select_related("game", "user").get(pk=session.pk)
    user, game = session.user, session.game
    now = timezone.now()
    duration = _validate(session, score, accuracy, now)

    today = local_today(user)
    progress = GameProgress.objects.select_for_update().get(user=user, game=game)
    is_first_completion = completed and progress.completions == 0
    previous_best = progress.best_score
    is_personal_best = score > previous_best
    is_perfect = score >= game.max_score or (accuracy is not None and accuracy >= 1.0)
    recent_sessions = GameSession.objects.filter(
        user=user, game=game, status=SessionStatus.COMPLETED, ended_at__gte=now - timedelta(hours=24)
    ).count()
    farmed = recent_sessions >= DAILY_FULL_REWARD_SESSIONS

    xp, coins = compute_session_xp(
        game, score=score, is_first_completion=is_first_completion, is_personal_best=is_personal_best, farmed=farmed
    )

    # Session record
    session.status = SessionStatus.COMPLETED
    session.ended_at = now
    session.score = score
    session.accuracy = accuracy
    session.duration_seconds = duration
    session.is_perfect = is_perfect
    session.metrics = metrics or {}
    session.xp_awarded = xp
    session.coins_awarded = coins
    session.save()

    # Per-game progress
    progress.last_score = score
    progress.best_score = max(progress.best_score, score)
    if accuracy is not None:
        progress.best_accuracy = max(progress.best_accuracy or 0.0, accuracy)
    progress.total_xp += xp
    if completed:
        progress.completions += 1
        progress.progress_percent = 100
        progress.resume_state = {}
        progress.completed_at = progress.completed_at or now
        mastered = progress.completions >= MASTERY_COMPLETIONS and (progress.best_accuracy or 0) >= MASTERY_ACCURACY
        progress.status = ProgressStatus.MASTERED if mastered else ProgressStatus.COMPLETED
    progress.save()

    # Player totals + streak
    stats = _locked_stats(user)
    stats.sessions_completed += 1
    stats.total_play_seconds += duration
    if is_first_completion:
        stats.games_completed += 1
    if is_perfect:
        stats.perfect_scores += 1
    if is_personal_best and previous_best > 0 and progress.attempts >= 3:
        stats.comebacks += 1
    _touch_streak(stats, today)
    stats.save()

    activity, _ = DailyActivity.objects.get_or_create(user=user, date=today)
    DailyActivity.objects.filter(pk=activity.pk).update(
        sessions=F("sessions") + 1, play_seconds=F("play_seconds") + duration
    )

    previous_level, level = grant_reward(
        user, xp=xp, coins=coins, source=RewardSource.GAME_SESSION, source_ref=str(session.pk), description=game.title
    )

    result = SessionResult(
        session=session,
        xp_awarded=xp,
        coins_awarded=coins,
        previous_level=previous_level,
        level=level,
        is_personal_best=is_personal_best,
        is_first_completion=is_first_completion,
    )

    from apps.challenges.services import apply_daily_challenge

    challenge_xp = apply_daily_challenge(user, session, today)
    if challenge_xp is not None:
        result.daily_challenge_completed = True
        result.daily_challenge_xp = challenge_xp

    from apps.achievements.engine import evaluate_achievements

    result.achievements_unlocked = evaluate_achievements(user, context={"session": session, "progress": progress})
    result.level = get_stats(user).level  # achievements may grant XP too
    return result


def abandon_session(session: GameSession) -> None:
    if session.status == SessionStatus.ACTIVE:
        session.status = SessionStatus.ABANDONED
        session.ended_at = timezone.now()
        session.save(update_fields=["status", "ended_at"])
