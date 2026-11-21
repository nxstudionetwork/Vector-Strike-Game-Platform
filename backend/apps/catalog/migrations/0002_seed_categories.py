"""Seed the Game Universe categories. Games themselves are added in later phases."""

from django.db import migrations

CATEGORIES = [
    # slug, name, tagline, icon, color
    ("mathematics", "Mathematics", "Numbers, shapes, patterns and problem solving", "sigma", "#38bdf8"),
    ("physics", "Physics", "Forces, motion, energy and electricity in action", "atom", "#a78bfa"),
    ("science", "Science", "Biology, chemistry, earth and space", "flask", "#34d399"),
    ("coding", "Coding & Technology", "Algorithms, debugging and computational thinking", "code", "#22d3ee"),
    ("languages", "Languages", "Words, grammar, reading and communication", "languages", "#f472b6"),
    ("logic", "Logic & Puzzles", "Reasoning, patterns and strategy", "puzzle", "#facc15"),
    ("memory", "Memory & Focus", "Recall, attention and concentration", "brain", "#fb7185"),
    ("history", "History & Civilization", "People, places and the decisions that shaped the world", "landmark", "#f59e0b"),
    ("geography", "Geography", "Maps, places, cultures and our planet", "globe", "#2dd4bf"),
    ("finance", "Finance", "Budgeting, business and smart money decisions", "coins", "#4ade80"),
    ("environment", "Environment", "Ecosystems, climate and sustainability", "leaf", "#86efac"),
    ("life-skills", "Life Skills", "Time, safety, organisation and everyday problem solving", "compass", "#fdba74"),
    ("creativity", "Creativity", "Design, art, music and imagination", "palette", "#c084fc"),
    ("general-knowledge", "General Knowledge", "Curious facts about everything", "sparkles", "#93c5fd"),
]


def seed(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    for order, (slug, name, tagline, icon, color) in enumerate(CATEGORIES):
        Category.objects.update_or_create(
            slug=slug,
            defaults={"name": name, "tagline": tagline, "icon": icon, "color": color, "sort_order": order * 10},
        )


def unseed(apps, schema_editor):
    apps.get_model("catalog", "Category").objects.filter(slug__in=[c[0] for c in CATEGORIES]).delete()


class Migration(migrations.Migration):
    dependencies = [("catalog", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
