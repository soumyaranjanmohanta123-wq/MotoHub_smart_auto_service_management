from django.contrib import admin
from .models import Category, Product, ProductImage, Wishlist


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'created_at')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'category', 'brand', 'price', 'stock', 'status')
    list_filter = ('status', 'category')
    search_fields = ('name', 'sku', 'brand')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'sku', 'category', 'brand', 'status')
        }),
        ('Description & Media', {
            'fields': ('description', 'image')
        }),
        ('Pricing & Inventory', {
            'fields': ('price', 'discount_price', 'stock')
        }),
        ('Technical Details', {
            'fields': ('specifications',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'alt_text')


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'added_at')
    list_filter = ('added_at',)
    search_fields = ('user__email', 'product__name')
    readonly_fields = ('added_at',)
