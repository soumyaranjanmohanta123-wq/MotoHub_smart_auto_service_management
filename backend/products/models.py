from django.db import models
from django.conf import settings


class Category(models.Model):
    """
    Product category (e.g., Engine Parts, Tyres, Accessories).
    Supports parent-child nesting for sub-categories.
    """

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='subcategories'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Core product listing for the marketplace.
    Supports dynamic specs via JSONField.
    """

    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('out_of_stock', 'Out of Stock'),
        ('discontinued', 'Discontinued'),
    )

    # Relationships
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name='products'
    )

    # Core info
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, unique=True, verbose_name="SKU")
    brand = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    # Media
    image = models.ImageField(upload_to='products/', blank=True, null=True)

    # Pricing & Inventory
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    stock = models.PositiveIntegerField(default=0)
    low_stock_alert = models.PositiveIntegerField(default=5)

    # Vehicle compatibility
    compatibility_type = models.CharField(max_length=50, blank=True, null=True,
        help_text="Car / Bike / Truck / Universal")
    compatibility_tags = models.CharField(max_length=500, blank=True, null=True,
        help_text="Comma-separated vehicle models, e.g. BMW 3 Series, Honda City")

    # Policy fields
    warranty = models.CharField(max_length=50, blank=True, null=True, default='No Warranty')
    return_policy = models.CharField(max_length=50, blank=True, null=True, default='Non-returnable')

    # Publish status (published / draft)
    publish_status = models.CharField(max_length=20, default='published')

    # Dynamic specs: {"lightType": "LED", "power": "55W"}
    specifications = models.JSONField(
        default=dict, blank=True,
        help_text="Category-specific dynamic specifications as key-value pairs."
    )

    # Status & Metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def effective_price(self):
        """Returns discounted price if available, else full price."""
        return self.discount_price if self.discount_price else self.price


class ProductImage(models.Model):
    """Additional images for a product (gallery support)."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/gallery/')
    alt_text = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"Image for {self.product.name}"


class Wishlist(models.Model):
    """A customer's saved / wishlisted product."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wishlist_items',
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='wishlisted_by',
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')   # prevent duplicate wishlist entries
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user} ♥ {self.product.name}"

class Banner(models.Model):
    """Homepage slider banners"""
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    image = models.CharField(max_length=255, blank=True, null=True) # Storing local path or URL since static images are used
    image_file = models.ImageField(upload_to='banners/', blank=True, null=True)
    button_text = models.CharField(max_length=50, default='SHOP NOW')
    button_link = models.CharField(max_length=255, default='coming-soon.html')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title


class Ad(models.Model):
    """Homepage service banner and promo ads"""
    TYPE_CHOICES = [
        ('service', 'Service Banner'),
        ('promo_1', 'Promo Banner 1'),
        ('promo_2', 'Promo Banner 2'),
        ('widget_product', 'Sidebar Product Widget'),
        ('widget_vertical', 'Sidebar Vertical Banner'),
    ]
    banner_type = models.CharField(max_length=20, choices=TYPE_CHOICES, unique=True)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    image = models.CharField(max_length=255, blank=True, null=True)
    image_file = models.ImageField(upload_to='ads/', blank=True, null=True)
    button_text = models.CharField(max_length=50, default='SHOP NOW')
    button_link = models.CharField(max_length=255, default='coming-soon.html')
    # Extra fields for product widget
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    old_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, help_text='Rating out of 5')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['banner_type']

    def __str__(self):
        return f"{self.get_banner_type_display()} — {self.title}"

