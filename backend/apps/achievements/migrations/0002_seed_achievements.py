"""Seed platform-wide achievements. Game-specific achievements arrive with each game."""

from django.db import migrations

ACHIEVEMENTS = [
    # slug, title, description, icon, group, rarity, criteria, threshold, xp
    ("first-mission", "First Mission", "Complete your first game session.", "rocket", "milestone", "common", "sessions_completed", 1, 25),
    ("warming-up", "Warming Up", "Complete 10 game sessions.", "flame", "milestone", "common", "sessions_completed", 10, 50),
    ("dedicated", "Dedicated Player", "Complete 50 game sessions.", "medal", "milestone", "rare", "sessions_completed", 50, 150),
    ("century", "Centurion", "Complete 100 game sessions.", "trophy", "milestone", "epic", "sessions_completed", 100, 300),
    ("first-clear", "First Clear", "Finish a game for the first time.", "flag", "milestone", "common", "games_completed", 1, 25),
    ("collector", "Collector", "Complete 10 different games.", "layers", "exploration", "rare", "games_completed", 10, 150),
    ("explorer", "Explorer", "Play games from 3 different categories.", "compass", "exploration", "common", "categories_played", 3, 75),
    ("world-traveller", "Universe Traveller", "Play games from 8 different categories.", "globe", "exploration", "epic", "categories_played", 8, 250),
    ("problem-solver", "Problem Solver", "Earn a perfect score.", "target", "mastery", "rare", "perfect_scores", 1, 75),
    ("flawless", "Flawless", "Earn 10 perfect scores.", "gem", "mastery", "epic", "perfect_scores", 10, 250),
    ("mastery", "Mastery", "Master a game: complete it 3 times with 90%+ accuracy.", "crown", "mastery", "epic", "games_mastered", 1, 200),
    ("persistent", "Persistent Player", "Beat your personal best after 3 or more attempts.", "trending-up", "growth", "rare", "comebacks", 1, 100),
    ("comeback-kid", "Never Give Up", "Beat your personal best after retrying, 10 times.", "mountain", "growth", "epic", "comebacks", 10, 250),
    ("streak-3", "On a Roll", "Play on 3 days in a row.", "zap", "consistency", "common", "streak_days", 3, 50),
    ("streak-7", "Week Warrior", "Play on 7 days in a row.", "calendar", "consistency", "rare", "streak_days", 7, 150),
    ("streak-30", "Unstoppable", "Play on 30 days in a row.", "star", "consistency", "legendary", "streak_days", 30, 500),
    ("daily-1", "Challenge Accepted", "Complete a daily challenge.", "swords", "challenge", "common", "daily_challenges_completed", 1, 50),
    ("daily-10", "Challenge Hunter", "Complete 10 daily challenges.", "shield", "challenge", "rare", "daily_challenges_completed", 10, 200),
    ("level-5", "Rising Star", "Reach level 5.", "sparkles", "milestone", "common", "level_reached", 5, 0),
    ("level-10", "Vector Veteran", "Reach level 10.", "award", "milestone", "rare", "level_reached", 10, 0),
    ("level-25", "Strike Legend", "Reach level 25.", "crown", "milestone", "legendary", "level_reached", 25, 0),
]


def seed(apps, schema_editor):
    Achievement = apps.get_model("achievements", "Achievement")
    for order, (slug, title, desc, icon, group, rarity, criteria, threshold, xp) in enumerate(ACHIEVEMENTS):
        Achievement.objects.update_or_create(
            slug=slug,
            defaults={
                "title": title, "description": desc, "icon": icon, "group": group, "rarity": rarity,
                "criteria_type": criteria, "threshold": threshold, "xp_reward": xp, "sort_order": order * 10,
            },
        )


def unseed(apps, schema_editor):
    apps.get_model("achievements", "Achievement").objects.filter(slug__in=[a[0] for a in ACHIEVEMENTS]).delete()


class Migration(migrations.Migration):
    dependencies = [("achievements", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
