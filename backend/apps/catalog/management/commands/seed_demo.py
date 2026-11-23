"""
Development-only demo data so the platform can be explored before real games exist.

    python manage.py seed_demo           # create demo account, demo games, sessions, a daily challenge
    python manage.py seed_demo --clear   # remove everything this command created

Demo games are clearly labelled "(demo)" and use module keys starting with
"demo-", which have no registered frontend module: their pages show
"not available in this version" instead of fake gameplay. All progress is
produced by the real progression engine (sessions → XP → achievements).

Refuses to run when DEBUG is False.
"""

from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import PlayerProfile, PlayerSettings, User
from apps.catalog.models import Category, Game, GameStatus
from apps.challenges.models import DailyChallenge
from apps.progression.models import GameSession
from apps.progression.services import complete_session, local_today, save_checkpoint, start_session

DEMO_EMAIL = "demo@vectorstrike.test"
DEMO_PREFIX = "demo-"

# slug, title, category, difficulty, base_xp, required_level, skills, days_ago_published
GAMES = [
    ("orbit-sums", "Orbit Sums", "mathematics", "beginner", 100, 1, ["Mental arithmetic", "Number sense"], 3),
    ("bridge-ratios", "Bridge Ratios", "mathematics", "intermediate", 140, 1, ["Ratios", "Geometry"], 45),
    ("loop-lab", "Loop Lab", "coding", "beginner", 90, 1, ["Loops", "Debugging"], 10),
    ("cell-quest", "Cell Quest", "science", "beginner", 100, 1, ["Biology", "Observation"], 60),
    ("market-day", "Market Day", "finance", "intermediate", 120, 1, ["Budgeting", "Profit & loss"], 5),
    ("vault-logic", "Vault Logic", "logic", "advanced", 160, 8, ["Deduction", "Patterns"], 20),
]


class Command(BaseCommand):
    help = "Create (or --clear) development demo data."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Remove demo data")
        parser.add_argument("--password", default=None, help="Demo account password (default: DEMO_PASSWORD env)")

    def handle(self, *args, clear=False, password=None, **opts):
        if not settings.DEBUG:
            raise CommandError("seed_demo only runs with DEBUG=True.")
        if clear:
            self._clear()
            return
        import os

        password = password or os.environ.get("DEMO_PASSWORD")
        if not password:
            raise CommandError("Set DEMO_PASSWORD in backend/.env (see .env.example) or pass --password.")
        self._seed(password)

    @transaction.atomic
    def _clear(self):
        users = User.objects.filter(email=DEMO_EMAIL).delete()[0]
        DailyChallenge.objects.filter(game__module_key__startswith=DEMO_PREFIX).delete()
        games = Game.objects.filter(module_key__startswith=DEMO_PREFIX).delete()[0]
        self.stdout.write(self.style.SUCCESS(f"Removed demo data ({users} account rows, {games} game rows)."))

    def _seed(self, password):
        self._clear()
        now = timezone.now()
        games = {}
        for i, (slug, title, cat, diff, xp, lvl, skills, ago) in enumerate(GAMES):
            games[slug] = Game.objects.create(
                slug=f"{DEMO_PREFIX}{slug}",
                title=f"{title} (demo)",
                short_description="Demo entry for exploring the platform. Gameplay arrives in a later phase.",
                description="This demo game exists so you can explore Vector Strike's pages before real games launch.",
                category=Category.objects.get(slug=cat),
                difficulty=diff,
                status=GameStatus.LIVE,
                module_key=f"{DEMO_PREFIX}{slug}",
                base_xp=xp,
                base_coins=10,
                max_score=1000,
                min_duration_seconds=1,
                required_level=lvl,
                skills=skills,
                is_featured=i < 3,
                sort_order=i,
                published_at=now - timedelta(days=ago),
            )

        user = User.objects.create_user(DEMO_EMAIL, password)
        profile = PlayerProfile.objects.create(
            user=user,
            display_name="Demo Player",
            avatar="nova",
            onboarding_completed_at=now,
            date_of_birth=now.date().replace(year=now.year - 14),
        )
        profile.interests.set(Category.objects.filter(slug__in=["mathematics", "coding", "finance"]))
        PlayerSettings.objects.create(user=user)

        def play(slug, score, accuracy, seconds=150):
            session = start_session(user, games[slug])
            GameSession.objects.filter(pk=session.pk).update(started_at=timezone.now() - timedelta(seconds=seconds))
            complete_session(session, score=score, accuracy=accuracy)

        today = local_today(user)
        DailyChallenge.objects.create(
            date=today,
            game=games["market-day"],
            title="Profit Sprint",
            description="Run the market stall and finish with a strong score.",
            requirements={"min_score": 700},
            xp_reward=150,
            coin_reward=30,
        )
        DailyChallenge.objects.create(
            date=today - timedelta(days=1),
            game=games["orbit-sums"],
            title="Sum Storm",
            description="Score 600 or more in Orbit Sums.",
            requirements={"min_score": 600},
        )

        play("orbit-sums", 1000, 1.0)
        play("orbit-sums", 820, 0.85)
        play("loop-lab", 640, 0.7)
        play("cell-quest", 520, 0.6)
        play("bridge-ratios", 300, 0.5)
        play("bridge-ratios", 260, 0.45)
        play("bridge-ratios", 480, 0.6)  # personal best after 3 attempts → "Persistent Player"
        unfinished = start_session(user, games["loop-lab"])
        save_checkpoint(unfinished, progress_percent=55, resume_state={"stage": 3})
        user.favorite_games.create(game=games["market-day"])
        user.favorite_games.create(game=games["vault-logic"])

        self.stdout.write(self.style.SUCCESS(f"Demo data ready. Log in as {DEMO_EMAIL} with DEMO_PASSWORD."))
