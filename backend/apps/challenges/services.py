from datetime import date

from django.db import IntegrityError, transaction
from django.db.models import F

from apps.notifications.models import NotificationKind, notify
from apps.progression.models import PlayerStats, RewardSource

from .models import DailyChallenge, DailyChallengeCompletion


def challenge_for(day: date) -> DailyChallenge | None:
    return DailyChallenge.objects.select_related("game", "game__category").filter(date=day).first()


def apply_daily_challenge(user, session, today: date) -> int | None:
    """Complete today's challenge if this session satisfies it. Returns XP granted or None."""
    challenge = challenge_for(today)
    if challenge is None or challenge.game_id != session.game_id:
        return None
    if not challenge.is_met_by(session.score, session.accuracy):
        return None
    try:
        with transaction.atomic():
            DailyChallengeCompletion.objects.create(user=user, challenge=challenge, session=session)
    except IntegrityError:
        return None  # Already completed today.

    from apps.progression.services import grant_reward

    PlayerStats.objects.filter(user=user).update(
        daily_challenges_completed=F("daily_challenges_completed") + 1
    )
    grant_reward(
        user,
        xp=challenge.xp_reward,
        coins=challenge.coin_reward,
        source=RewardSource.DAILY_CHALLENGE,
        source_ref=str(challenge.pk),
        description=challenge.title,
    )
    notify(
        user,
        NotificationKind.DAILY_CHALLENGE,
        title="Daily challenge complete",
        body=f"{challenge.title}: +{challenge.xp_reward} XP",
        link="/home",
    )
    return challenge.xp_reward

