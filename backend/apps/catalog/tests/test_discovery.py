"""Phase 2 discovery endpoints: filters, category progress, search, stats, challenges."""

from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import PlayerProfile, PlayerSettings, User
from apps.catalog.models import Category, Game, GameStatus
from apps.challenges.models import DailyChallenge
from apps.progression.models import GameSession
from apps.progression.services import local_today


def make_user(email):
    user = User.objects.create_user(email, "Orbit-Strike-42")
    PlayerProfile.objects.create(user=user, display_name="Nova")
    PlayerSettings.objects.create(user=user)
    return user


class DiscoveryTests(APITestCase):
    def setUp(self):
        self.user = make_user("p@example.com")
        self.client.force_authenticate(self.user)
        maths = Category.objects.get(slug="mathematics")
        science = Category.objects.get(slug="science")
        common = dict(status=GameStatus.LIVE, max_score=1000, min_duration_seconds=1, base_xp=100)
        self.a = Game.objects.create(slug="alpha", title="Alpha Sums", short_description="a", category=maths,
                                     module_key="alpha", published_at=timezone.now(), **common)
        self.b = Game.objects.create(slug="beta", title="Beta Cells", short_description="b", category=science,
                                     module_key="beta", published_at=timezone.now() - timedelta(days=90), **common)
        self.user.profile.interests.set([science])

    def play(self, game, score):
        sid = self.client.post("/api/play/sessions/", {"game": game.slug}, format="json").data["session"]["id"]
        GameSession.objects.filter(pk=sid).update(started_at=timezone.now() - timedelta(seconds=60))
        return self.client.post(f"/api/play/sessions/{sid}/complete/", {"score": score, "accuracy": 0.5}, format="json")

    def slugs(self, query):
        return [g["slug"] for g in self.client.get(f"/api/games/?{query}").data["results"]]

    def test_filters(self):
        self.assertEqual(self.slugs("filter=recommended")[0], "beta")  # interest first
        self.assertEqual(self.slugs("filter=new"), ["alpha"])  # beta published 90 days ago
        self.assertEqual(self.slugs("filter=completed"), [])
        self.play(self.a, 600)
        self.play(self.a, 700)
        self.assertEqual(self.slugs("filter=completed"), ["alpha"])
        self.assertEqual(self.slugs("filter=popular")[0], "alpha")

    def test_category_progress(self):
        data = self.client.get("/api/categories/mathematics/").data
        self.assertEqual(data["progress"]["percent"], 0)
        self.play(self.a, 600)
        data = self.client.get("/api/categories/mathematics/").data
        self.assertEqual(data["progress"], {"live_games": 1, "completed_games": 1, "played_games": 1, "percent": 1.0})

    def test_search(self):
        self.assertEqual(self.client.get("/api/search/?q=a").data["games"], [])  # too short
        res = self.client.get("/api/search/?q=cells").data
        self.assertEqual([g["slug"] for g in res["games"]], ["beta"])
        res = self.client.get("/api/search/?q=math").data
        self.assertEqual([c["slug"] for c in res["categories"]], ["mathematics"])
        today = local_today(self.user)
        DailyChallenge.objects.create(date=today, game=self.a, title="Sum sprint", description="d")
        DailyChallenge.objects.create(date=today + timedelta(days=1), game=self.a, title="Sum future", description="d")
        titles = [c["title"] for c in self.client.get("/api/search/?q=sum").data["challenges"]]
        self.assertEqual(titles, ["Sum sprint"])  # future challenges stay hidden

    def test_stats(self):
        data = self.client.get("/api/me/stats/").data
        self.assertIsNone(data["highest_score"])
        self.assertIsNone(data["totals"]["completion_rate"])
        self.play(self.a, 900)
        self.play(self.a, 500)
        self.play(self.b, 300)
        data = self.client.get("/api/me/stats/").data
        self.assertEqual(data["totals"]["sessions"], 3)
        self.assertEqual(data["highest_score"]["score"], 900)
        self.assertEqual(data["favorite_category"]["slug"], "mathematics")
        self.assertEqual(data["strongest_category"]["slug"], "mathematics")
        self.assertEqual(data["totals"]["completion_rate"], 1.0)

    def test_challenge_overview(self):
        today = local_today(self.user)
        DailyChallenge.objects.create(date=today - timedelta(days=1), game=self.a, title="Yesterday", description="d")
        DailyChallenge.objects.create(date=today + timedelta(days=1), game=self.a, title="Tomorrow", description="d")
        data = self.client.get("/api/challenges/").data
        self.assertIsNone(data["today"])
        self.assertEqual([c["title"] for c in data["history"]], ["Yesterday"])
