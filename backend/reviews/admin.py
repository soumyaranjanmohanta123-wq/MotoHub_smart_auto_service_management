from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product', 'service', 'rating', 'status', 'created_at')
    list_filter = ('status', 'rating')
    search_fields = ('user__username', 'comment')
    list_editable = ('status',)
    readonly_fields = ('created_at', 'updated_at')
