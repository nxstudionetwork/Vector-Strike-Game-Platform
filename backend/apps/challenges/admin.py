from django.contrib import admin

from .models import DailyChallenge, DailyChallengeCompletion


@admin.register(DailyChallenge)
class DailyChallengeAdmin(admin.ModelAdmin):
    list_display = ["date", "title", "game", "xp_reward"]
    date_hierarchy = "date"
    autocomplete_fields = ["game"]


admin.site.register(DailyChallengeCompletion)
