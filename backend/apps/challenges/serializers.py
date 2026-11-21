from datetime import date

from apps.catalog.views import serialize_cards

from .models import DailyChallengeCompletion
from .services import challenge_for


def daily_challenge_payload(user, today: date) -> dict | None:
    challenge = challenge_for(today)
    if challenge is None:
        return None
    completion = DailyChallengeCompletion.objects.filter(user=user, challenge=challenge).first()
    return {
        "id": challenge.pk,
        "date": challenge.date.isoformat(),
        "title": challenge.title,
        "description": challenge.description,
        "requirements": challenge.requirements,
        "xp_reward": challenge.xp_reward,
        "coin_reward": challenge.coin_reward,
        "game": serialize_cards(user, [challenge.game])[0],
        "completed": completion is not None,
        "completed_at": completion.completed_at.isoformat() if completion else None,
    }
