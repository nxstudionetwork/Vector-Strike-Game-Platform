from django.contrib import admin

from .models import DailyActivity, GameProgress, GameSession, PlayerStats, RewardLedger


@admin.register(PlayerStats)
class PlayerStatsAdmin(admin.ModelAdmin):
    list_display = ["user", "level", "total_xp", "coins", "sessions_completed", "current_streak"]
    search_fields = ["user__email"]
    readonly_fields = [f.name for f in PlayerStats._meta.fields]


@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "game", "status", "score", "xp_awarded", "started_at"]
    list_filter = ["status", "game"]
    readonly_fields = [f.name for f in GameSession._meta.fields]


@admin.register(GameProgress)
class GameProgressAdmin(admin.ModelAdmin):
    list_display = ["user", "game", "status", "attempts", "best_score", "last_played_at"]
    list_filter = ["status"]


@admin.register(RewardLedger)
class RewardLedgerAdmin(admin.ModelAdmin):
    list_display = ["user", "kind", "amount", "source", "description", "created_at"]
    list_filter = ["kind", "source"]
    readonly_fields = [f.name for f in RewardLedger._meta.fields]


admin.site.register(DailyActivity)
