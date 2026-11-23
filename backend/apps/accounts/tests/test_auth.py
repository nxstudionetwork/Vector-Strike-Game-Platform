from django.core import mail
from rest_framework.test import APITestCase

SIGNUP = {
    "email": "Player@Example.com",
    "password": "Orbit-Strike-42",
    "display_name": "Nova",
    "date_of_birth": "2015-05-01",
    "country": "in",
    "timezone": "Asia/Kolkata",
    "accept_terms": True,
}


class AuthFlowTests(APITestCase):
    def signup(self, **overrides):
        return self.client.post("/api/auth/signup/", {**SIGNUP, **overrides}, format="json")

    def test_signup_creates_profile_and_sets_httponly_refresh_cookie(self):
        res = self.signup()
        self.assertEqual(res.status_code, 201)
        self.assertIn("access", res.data)
        user = res.data["user"]
        self.assertEqual(user["email"], "player@example.com")
        self.assertTrue(user["profile"]["player_tag"].startswith("VS-"))
        self.assertEqual(user["profile"]["country"], "IN")
        self.assertFalse(user["profile"]["onboarding_completed"])
        self.assertEqual(user["stats"]["level"], 1)
        cookie = res.cookies["vs_refresh"]
        self.assertTrue(cookie["httponly"])
        self.assertNotIn("refresh", res.data)

    def test_signup_validation(self):
        self.signup()
        dup = self.signup(email="player@example.com")
        self.assertEqual(dup.status_code, 400)
        self.assertIn("email", dup.data["error"]["fields"])
        weak = self.signup(email="b@example.com", password="12345678")
        self.assertEqual(weak.status_code, 400)
        terms = self.signup(email="c@example.com", accept_terms=False)
        self.assertIn("accept_terms", terms.data["error"]["fields"])
        future = self.signup(email="d@example.com", date_of_birth="2999-01-01")
        self.assertIn("date_of_birth", future.data["error"]["fields"])

    def test_login_refresh_logout(self):
        self.signup()
        self.client.cookies.clear()
        bad = self.client.post("/api/auth/login/", {"email": SIGNUP["email"], "password": "nope-nope"}, format="json")
        self.assertEqual(bad.status_code, 401)
        self.assertEqual(bad.data["error"]["message"], "Email or password is incorrect.")

        ok = self.client.post(
            "/api/auth/login/", {"email": "PLAYER@example.com", "password": SIGNUP["password"]}, format="json"
        )
        self.assertEqual(ok.status_code, 200)
        first_refresh = ok.cookies["vs_refresh"].value

        refreshed = self.client.post("/api/auth/refresh/")
        self.assertEqual(refreshed.status_code, 200)
        self.assertNotEqual(refreshed.cookies["vs_refresh"].value, first_refresh)

        # The rotated-out token is blacklisted and can't be replayed.
        self.client.cookies["vs_refresh"] = first_refresh
        self.assertEqual(self.client.post("/api/auth/refresh/").status_code, 401)

        self.client.cookies["vs_refresh"] = refreshed.cookies["vs_refresh"].value
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        # Logged out: no cookie, so refresh reports "no session" without an error.
        self.assertEqual(self.client.post("/api/auth/refresh/").status_code, 204)

    def test_protected_routes_require_auth(self):
        for url in ["/api/me/", "/api/me/home/", "/api/games/", "/api/me/achievements/", "/api/me/progress/"]:
            self.assertEqual(self.client.get(url).status_code, 401, url)

    def test_password_reset(self):
        self.signup()
        res = self.client.post("/api/auth/password-reset/", {"email": "unknown@example.com"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.client.post("/api/auth/password-reset/", {"email": SIGNUP["email"]}, format="json")
        self.assertEqual(len(mail.outbox), 1)
        link = next(line for line in mail.outbox[0].body.splitlines() if "reset-password" in line)
        query = dict(p.split("=", 1) for p in link.split("?", 1)[1].split("&"))
        bad = self.client.post(
            "/api/auth/password-reset/confirm/", {**query, "token": "x", "password": "New-Strike-77"}, format="json"
        )
        self.assertEqual(bad.status_code, 400)
        garbage = self.client.post(
            "/api/auth/password-reset/confirm/", {"uid": "!!", "token": "x", "password": "New-Strike-77"}, format="json"
        )
        self.assertEqual(garbage.status_code, 400)
        good = self.client.post(
            "/api/auth/password-reset/confirm/", {**query, "password": "New-Strike-77"}, format="json"
        )
        self.assertEqual(good.status_code, 200)
        login = self.client.post(
            "/api/auth/login/", {"email": SIGNUP["email"], "password": "New-Strike-77"}, format="json"
        )
        self.assertEqual(login.status_code, 200)


class AccountTests(APITestCase):
    def setUp(self):
        res = self.client.post("/api/auth/signup/", SIGNUP, format="json")
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + res.data["access"])

    def test_onboarding_saves_interests_and_can_be_skipped(self):
        res = self.client.post(
            "/api/me/onboarding/",
            {"interests": ["mathematics", "coding"], "play_preference": "quick", "avatar": "nova"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        profile = res.data["profile"]
        self.assertTrue(profile["onboarding_completed"])
        self.assertEqual(sorted(profile["interests"]), ["coding", "mathematics"])
        self.assertEqual(profile["avatar"], "nova")
        self.assertEqual(self.client.post("/api/me/onboarding/", {}, format="json").status_code, 200)
        bad = self.client.post("/api/me/onboarding/", {"interests": ["not-a-category"]}, format="json")
        self.assertEqual(bad.status_code, 400)

    def test_profile_and_settings_updates(self):
        res = self.client.patch("/api/me/profile/", {"display_name": "  Nova   Prime "}, format="json")
        self.assertEqual(res.data["profile"]["display_name"], "Nova Prime")
        self.assertEqual(self.client.patch("/api/me/profile/", {"avatar": "../evil"}, format="json").status_code, 400)
        res = self.client.patch("/api/me/settings/", {"motion": "reduced", "text_size": "large"}, format="json")
        self.assertEqual(res.data["settings"]["motion"], "reduced")
        # Under-13 learners can't make their profile public.
        res = self.client.patch("/api/me/settings/", {"profile_visible": True}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_change_password_and_delete_account(self):
        bad = self.client.post(
            "/api/me/password/", {"current_password": "wrong", "new_password": "Another-Strike-9"}, format="json"
        )
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post(
            "/api/me/password/",
            {"current_password": SIGNUP["password"], "new_password": "Another-Strike-9"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(self.client.delete("/api/me/", {"password": "wrong"}, format="json").status_code, 400)
        self.assertEqual(
            self.client.delete("/api/me/", {"password": "Another-Strike-9"}, format="json").status_code, 204
        )
