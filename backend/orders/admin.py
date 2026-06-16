from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('price', 'subtotal')

    def subtotal(self, obj):
        return obj.subtotal
    subtotal.short_description = 'Subtotal'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_price', 'status', 'payment_method',
                    'payment_status', 'created_at')
    list_filter = ('status', 'payment_method', 'payment_status')
    search_fields = ('user__username', 'tracking_number')
    readonly_fields = ('created_at', 'updated_at', 'total_price')
    list_editable = ('status', 'payment_status')
    inlines = [OrderItemInline]
