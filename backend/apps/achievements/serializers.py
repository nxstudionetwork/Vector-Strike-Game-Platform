from .models import Achievement, UserAchievement


def achievement_payload(a: Achievement, ua: UserAchievement | None) -> dict:
    unlocked = ua is not None and ua.unlocked_at is not None
    hidden = a.is_hidden and not unlocked
    return {
        "slug": a.slug,
        "title": "Hidden achievement" if hidden else a.title,
        "description": "Keep playing to discover this one." if hidden else a.description,
        "icon": "lock" if hidden else a.icon,
        "group": a.group,
        "rarity": a.rarity,
        "threshold": a.threshold,
        "progress": ua.progress if ua else 0,
        "xp_reward": a.xp_reward,
        "coin_reward": a.coin_reward,
        "is_hidden": hidden,
        "is_unlocked": unlocked,
        "unlocked_at": ua.unlocked_at.isoformat() if unlocked else None,
        "category": a.category.slug if a.category_id else None,
    }


def recent_unlocks(user, limit: int = 4) -> list[dict]:
    rows = (
        UserAchievement.objects.filter(user=user, unlocked_at__isnull=False)
        .select_related("achievement", "achievement__category")
        .order_by("-unlocked_at")[:limit]
    )
    return [achievement_payload(ua.achievement, ua) for ua in rows]
