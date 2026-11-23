"""
End-to-end tests of the central progression engine using a test-only game.
(No real game content exists yet — games arrive in later phases.)
"""

from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import PlayerProfile, PlayerSettings, User
from apps.catalog.models import Category, Game, GameStatus
from apps.challenges.models import DailyChallenge
from apps.progression.levels import level_for_xp, xp_for_level
from apps.progression.models import GameSession, PlayerStats
from apps.progression.services import local_today


def make_user(email):
    user = User.objects.create_user(email, "Orbit-Strike-42")
    PlayerProfile.objects.create(user=user, display_name="Nova")
    PlayerSettings.objects.create(user=user)
    return user


class LevelCurveTests(APITestCase):
    def test_curve(self):
        self.assertEqual(xp_for_level(1), 0)
        self.assertEqual(xp_for_level(2), 100)
        self.assertEqual(level_for_xp(99), 1)
        self.assertEqual(level_for_xp(100), 2)
        self.assertEqual(level_for_xp(1000), 5)


class PlayFlowTests(APITestCase):
    def setUp(self):
        self.user = make_user("p@example.com")
        self.client.force_authenticate(self.user)
        self.game = Game.objects.create(
            slug="test-game",
            title="Test Game",
            short_description="t",
            category=Category.objects.get(slug="mathematics"),
            status=GameStatus.LIVE,
            module_key="test-game",
            base_xp=100,
            base_coins=10,
            max_score=1000,
            min_duration_seconds=5,
        )

    def start(self, game="test-game"):
        return self.client.post("/api/play/sessions/", {"game": game}, format="json")

    def age(self, session_id, seconds=60):
        GameSession.objects.filter(pk=session_id).update(started_at=timezone.now() - timedelta(seconds=seconds))

    def play(self, score=800, accuracy=0.8, seconds=60):
        sid = self.start().data["session"]["id"]
        self.age(sid, seconds)
        return self.client.post(
            f"/api/play/sessions/{sid}/complete/", {"score": score, "accuracy": accuracy}, format="json"
        )

    def test_full_session_awards_server_computed_rewards(self):
        res = self.play(score=1000, accuracy=1.0)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["xp_awarded"], 125)  # 100 * 1.0 * 1.25 first-completion bonus
        self.assertTrue(res.data["is_first_completion"])
        slugs = {a["slug"] for a in res.data["achievements_unlocked"]}
        self.assertTrue({"first-mission", "first-clear", "problem-solver"} <= slugs)
        stats = PlayerStats.objects.get(user=self.user)
        self.assertEqual(stats.sessions_completed, 1)
        self.assertEqual(stats.current_streak, 1)
        self.assertEqual(stats.total_xp, 250)  # 125 + 25 + 25 + 75 achievement XP
        self.assertEqual(stats.level, 2)
        self.assertTrue(res.data["leveled_up"])

    def test_client_cannot_inject_xp_or_duration(self):
        sid = self.start().data["session"]["id"]
        self.age(sid)
        res = self.client.post(
            f"/api/play/sessions/{sid}/complete/",
            {"score": 0, "xp_awarded": 99999, "duration_seconds": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["xp_awarded"], 50)  # 100 * 0.4 * 1.25
        self.assertGreaterEqual(res.data["session"]["duration_seconds"], 59)

    def test_rejects_implausible_results(self):
        sid = self.start().data["session"]["id"]
        too_fast = self.client.post(f"/api/play/sessions/{sid}/complete/", {"score": 10}, format="json")
        self.assertEqual(too_fast.status_code, 400)
        self.assertEqual(GameSession.objects.get(pk=sid).status, "rejected")
        again = self.client.post(f"/api/play/sessions/{sid}/complete/", {"score": 10}, format="json")
        self.assertEqual(again.status_code, 400)
        sid = self.start().data["session"]["id"]
        self.age(sid)
        over = self.client.post(f"/api/play/sessions/{sid}/complete/", {"score": 5000}, format="json")
        self.assertEqual(over.status_code, 400)

    def test_cannot_touch_other_players_sessions(self):
        sid = self.start().data["session"]["id"]
        self.client.force_authenticate(make_user("o@example.com"))
        self.age(sid)
        res = self.client.post(f"/api/play/sessions/{sid}/complete/", {"score": 10}, format="json")
        self.assertEqual(res.status_code, 404)

    def test_non_live_games_cannot_be_played(self):
        self.game.status = GameStatus.COMING_SOON
        self.game.save()
        self.assertEqual(self.start().status_code, 400)

    def test_locked_games_cannot_be_played(self):
        self.game.required_level = 3
        self.game.save()
        self.assertEqual(self.start().status_code, 400)
        self.assertTrue(self.client.get("/api/games/test-game/").data["is_locked"])

    def test_checkpoint_feeds_continue_playing(self):
        sid = self.start().data["session"]["id"]
        res = self.client.patch(
            f"/api/play/sessions/{sid}/checkpoint/",
            {"progress_percent": 40, "resume_state": {"stage": 2}},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        home = self.client.get("/api/me/home/")
        self.assertEqual([g["slug"] for g in home.data["continue_playing"]], ["test-game"])
        self.assertEqual(home.data["continue_playing"][0]["progress"]["progress_percent"], 40)
        self.assertEqual(self.start().data["resume_state"], {"stage": 2})

    def test_replay_of_completed_game_can_be_continued(self):
        self.play()
        sid = self.start().data["session"]["id"]
        self.client.patch(f"/api/play/sessions/{sid}/checkpoint/", {"progress_percent": 30}, format="json")
        home = self.client.get("/api/me/home/")
        self.assertEqual([g["slug"] for g in home.data["continue_playing"]], ["test-game"])

    def test_repeat_farming_is_reduced(self):
        for _ in range(5):
            self.play(score=500)
        res = self.play(score=500)
        self.assertEqual(res.data["coins_awarded"], 0)
        self.assertEqual(res.data["xp_awarded"], round(100 * 0.7 * 0.25))

    def test_persistence_achievement(self):
        self.play(score=100)
        self.play(score=50)
        res = self.play(score=300)
        self.assertIn("persistent", {a["slug"] for a in res.data["achievements_unlocked"]})

    def test_daily_challenge_completion(self):
        DailyChallenge.objects.create(
            date=local_today(self.user),
            game=self.game,
            title="Hit 600",
            description="d",
            requirements={"min_score": 600},
            xp_reward=100,
        )
        self.assertFalse(self.client.get("/api/challenges/today/").data["challenge"]["completed"])
        self.assertFalse(self.play(score=500).data["daily_challenge_completed"])
        self.assertTrue(self.play(score=700).data["daily_challenge_completed"])
        self.assertTrue(self.client.get("/api/challenges/today/").data["challenge"]["completed"])
        self.assertFalse(self.play(score=900).data["daily_challenge_completed"])  # once per day

    def test_streak_continues_and_resets(self):
        self.play()
        PlayerStats.objects.filter(user=self.user).update(last_active_date=local_today(self.user) - timedelta(days=1))
        self.play()
        self.assertEqual(PlayerStats.objects.get(user=self.user).current_streak, 2)
        PlayerStats.objects.filter(user=self.user).update(last_active_date=local_today(self.user) - timedelta(days=3))
        self.assertEqual(self.client.get("/api/me/").data["stats"]["current_streak"], 0)
        self.play()
        self.assertEqual(PlayerStats.objects.get(user=self.user).current_streak, 1)

    def test_progress_overview_and_catalog(self):
        self.play()
        progress = self.client.get("/api/me/progress/").data
        self.assertEqual(len(progress["activity"]), 14)
        self.assertEqual(progress["this_week"]["sessions"], 1)
        maths = next(c for c in progress["categories"] if c["slug"] == "mathematics")
        self.assertEqual(maths["games_completed"], 1)
        self.assertEqual(self.client.get("/api/games/?category=mathematics&q=test").data["count"], 1)
        self.assertEqual(self.client.get("/api/games/?category=physics").data["count"], 0)
        self.assertTrue(self.client.post("/api/games/test-game/favorite/").data["is_favorite"])
        self.assertEqual(self.client.get("/api/games/?favorites=1").data["count"], 1)

    def test_achievements_and_notifications(self):
        data = self.client.get("/api/me/achievements/").data
        self.assertEqual(data["unlocked"], 0)
        self.assertGreater(data["total"], 10)
        self.play()
        data = self.client.get("/api/me/achievements/").data
        first = next(a for a in data["achievements"] if a["slug"] == "first-mission")
        self.assertTrue(first["is_unlocked"])
        self.assertGreater(self.client.get("/api/me/notifications/").data["unread"], 0)
        self.assertEqual(self.client.post("/api/me/notifications/read/", {}, format="json").data["unread"], 0)
