from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, GarageProfile


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = UserAdmin.fieldsets + (
        ('Motohub Profile', {'fields': ('role', 'phone', 'profile_picture', 'permissions_config')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Motohub Profile', {'fields': ('role', 'phone')}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    list_filter = UserAdmin.list_filter + ('role',)
    search_fields = ('username', 'email', 'phone')


@admin.register(GarageProfile)
class GarageProfileAdmin(admin.ModelAdmin):
    list_display = ('garage_name', 'user', 'city', 'state', 'is_verified')
    list_filter = ('is_verified', 'city')
    search_fields = ('garage_name', 'user__username', 'city')
    list_editable = ('is_verified',)
