from django.contrib import admin
from .models import Service, Appointment


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'service_type', 'price', 'duration_minutes', 'is_active')
    list_filter = ('service_type', 'is_active')
    search_fields = ('name',)
    list_editable = ('is_active',)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'service', 'garage', 'appointment_date',
                    'appointment_time', 'status')
    list_filter = ('status', 'service__service_type', 'appointment_date')
    search_fields = ('customer__username', 'vehicle_reg_number')
    list_editable = ('status',)
    readonly_fields = ('created_at', 'updated_at')
