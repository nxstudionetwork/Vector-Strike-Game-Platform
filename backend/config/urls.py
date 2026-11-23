from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

from apps.accounts import views as accounts
from apps.achievements import views as achievements
from apps.catalog import views as catalog
from apps.challenges import views as challenges
from apps.notifications import views as notifications
from apps.progression import views as progression


def health(_request):
    return JsonResponse({"status": "ok"})


api = [
    path("health/", health),
    # Auth
    path("auth/signup/", accounts.SignupView.as_view()),
    path("auth/login/", accounts.LoginView.as_view()),
    path("auth/refresh/", accounts.RefreshView.as_view()),
    path("auth/logout/", accounts.LogoutView.as_view()),
    path("auth/password-reset/", accounts.PasswordResetRequestView.as_view()),
    path("auth/password-reset/confirm/", accounts.PasswordResetConfirmView.as_view()),
    path("avatars/", accounts.AvatarListView.as_view()),
    # Current learner
    path("me/", accounts.MeView.as_view()),
    path("me/profile/", accounts.ProfileView.as_view()),
    path("me/settings/", accounts.SettingsView.as_view()),
    path("me/onboarding/", accounts.OnboardingView.as_view()),
    path("me/password/", accounts.ChangePasswordView.as_view()),
    path("me/home/", progression.HomeFeedView.as_view()),
    path("me/progress/", progression.ProgressOverviewView.as_view()),
    path("me/rewards/", progression.RewardHistoryView.as_view()),
    path("me/stats/", progression.StatsView.as_view()),
    path("search/", catalog.SearchView.as_view()),
    path("me/achievements/", achievements.AchievementListView.as_view()),
    path("me/achievements/seen/", achievements.MarkAchievementsSeenView.as_view()),
    path("me/notifications/", notifications.NotificationListView.as_view()),
    path("me/notifications/read/", notifications.MarkReadView.as_view()),
    # Catalog / Game Zone
    path("categories/", catalog.CategoryListView.as_view()),
    path("categories/<slug:slug>/", catalog.CategoryDetailView.as_view()),
    path("games/", catalog.GameListView.as_view()),
    path("games/<slug:slug>/", catalog.GameDetailView.as_view()),
    path("games/<slug:slug>/favorite/", catalog.FavoriteView.as_view()),
    # Play (central progression engine)
    path("play/sessions/", progression.StartSessionView.as_view()),
    path("play/sessions/<uuid:pk>/checkpoint/", progression.CheckpointView.as_view()),
    path("play/sessions/<uuid:pk>/complete/", progression.CompleteSessionView.as_view()),
    path("play/sessions/<uuid:pk>/abandon/", progression.AbandonSessionView.as_view()),
    # Daily challenge
    path("challenges/", challenges.ChallengeOverviewView.as_view()),
    path("challenges/today/", challenges.TodayChallengeView.as_view()),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api)),
]
