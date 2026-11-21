from django import forms
from django.contrib import admin

from .engine import registered_criteria
from .models import Achievement, UserAchievement


class AchievementForm(forms.ModelForm):
    criteria_type = forms.ChoiceField(choices=[])

    class Meta:
        model = Achievement
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["criteria_type"].choices = [(c, c) for c in registered_criteria()]


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    form = AchievementForm
    list_display = ["title", "group", "rarity", "criteria_type", "threshold", "xp_reward", "is_active"]
    list_filter = ["group", "rarity", "is_active"]
    prepopulated_fields = {"slug": ["title"]}


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ["user", "achievement", "progress", "unlocked_at"]
    list_filter = ["achievement"]
