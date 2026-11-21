from django.contrib import admin

from .models import Category, Game


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "sort_order", "is_active"]
    list_editable = ["sort_order", "is_active"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "difficulty", "status", "module_key", "base_xp", "is_featured"]
    list_filter = ["status", "category", "difficulty", "is_featured"]
    search_fields = ["title", "slug", "module_key"]
    prepopulated_fields = {"slug": ["title"]}
    filter_horizontal = ["secondary_categories"]
