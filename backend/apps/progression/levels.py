"""
Level curve.

Reaching level ``n`` requires ``50 * n * (n - 1)`` total XP:
L2 = 100, L3 = 300, L4 = 600, L5 = 1 000, L10 = 4 500, L20 = 19 000 …
Early levels arrive quickly; later levels need sustained play.
"""

MAX_LEVEL = 100


def xp_for_level(level: int) -> int:
    level = max(1, min(level, MAX_LEVEL))
    return 50 * level * (level - 1)


def level_for_xp(total_xp: int) -> int:
    level = 1
    while level < MAX_LEVEL and total_xp >= xp_for_level(level + 1):
        level += 1
    return level


def level_progress(total_xp: int) -> dict:
    level = level_for_xp(total_xp)
    floor = xp_for_level(level)
    ceiling = xp_for_level(level + 1) if level < MAX_LEVEL else floor
    span = max(ceiling - floor, 1)
    return {
        "level": level,
        "total_xp": total_xp,
        "level_floor_xp": floor,
        "next_level_xp": ceiling,
        "xp_into_level": total_xp - floor,
        "xp_to_next_level": max(ceiling - total_xp, 0),
        "progress": 1.0 if level >= MAX_LEVEL else round((total_xp - floor) / span, 4),
    }
