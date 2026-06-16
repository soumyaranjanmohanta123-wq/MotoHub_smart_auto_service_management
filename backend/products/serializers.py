import json
from rest_framework import serializers
from .models import Category, Product, ProductImage, Wishlist, Banner, Ad


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'alt_text')


class BannerSerializer(serializers.ModelSerializer):
    display_image = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = '__all__'

    def get_display_image(self, obj):
        if obj.image_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_file.url)
            return obj.image_file.url
        return obj.image


class AdSerializer(serializers.ModelSerializer):
    display_image = serializers.SerializerMethodField()

    class Meta:
        model = Ad
        fields = '__all__'

    def get_display_image(self, obj):
        if obj.image_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_file.url)
            return obj.image_file.url
        return obj.image


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'description', 'parent')


class ProductListSerializer(serializers.ModelSerializer):
    """Compact serializer for product listing pages."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'sku', 'brand', 'category', 'category_name',
            'image', 'price', 'discount_price', 'effective_price',
            'stock', 'status', 'publish_status',
        )


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer with specifications and gallery."""
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Product
        fields = '__all__'


class ProductWriteSerializer(serializers.ModelSerializer):
    """JSON-based create/update (Admin/Moderator) — no file uploads."""
    class Meta:
        model = Product
        fields = (
            'name', 'sku', 'brand', 'category', 'description',
            'image', 'price', 'discount_price', 'stock',
            'low_stock_alert', 'compatibility_type', 'compatibility_tags',
            'warranty', 'return_policy', 'publish_status',
            'specifications', 'status',
        )


class ProductWriteWithImagesSerializer(serializers.ModelSerializer):
    """
    Multipart/form-data serializer for product create & update.
    - Accepts `specifications` as a JSON string (FormData limitation).
    - Accepts optional `gallery_images` as multiple file fields (handled by view).
    """

    # Override the JSONField with a plain CharField so DRF does NOT try to
    # validate the raw FormData string as JSON. We parse it ourselves below.
    specifications = serializers.CharField(
        required=False, allow_blank=True, default='{}'
    )

    class Meta:
        model = Product
        fields = (
            'name', 'sku', 'brand', 'category', 'description',
            'image', 'price', 'discount_price', 'stock',
            'low_stock_alert', 'compatibility_type', 'compatibility_tags',
            'warranty', 'return_policy', 'publish_status',
            'specifications', 'status',
        )

    def validate_specifications(self, value):
        """Accept either a JSON string or an already-parsed dict/list."""
        if isinstance(value, (dict, list)):
            return value
        if not value or not str(value).strip():
            return {}
        try:
            return json.loads(value)
        except (json.JSONDecodeError, ValueError):
            return {}


class WishlistSerializer(serializers.ModelSerializer):
    """Serializer for wishlist entries — nests product details for the frontend."""
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = Wishlist
        fields = ('id', 'product', 'product_id', 'added_at')
        read_only_fields = ('id', 'added_at')
