from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Category, Product, ProductImage, Wishlist, Banner, Ad
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductWriteSerializer,
    ProductWriteWithImagesSerializer,
    WishlistSerializer,
    BannerSerializer,
    AdSerializer,
)


class IsAdminOrModerator(permissions.BasePermission):
    """Allow safe methods for anyone; write only for admin/moderator."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.role in ('admin', 'moderator')


# ── Category ──────────────────────────────────────────────────────────────────

class CategoryListView(generics.ListCreateAPIView):
    """GET /api/products/categories/ — List all categories."""
    queryset = Category.objects.filter(parent=None).prefetch_related('subcategories')
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrModerator]


class BannerListView(generics.ListCreateAPIView):
    """GET /api/products/banners/ — List all banners (admin sees all; public sees active only)."""
    serializer_class = BannerSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        # Admin/Moderator see all banners; public sees only active
        if user.is_authenticated and user.role in ('admin', 'moderator'):
            return Banner.objects.all().order_by('order', '-created_at')
        return Banner.objects.filter(is_active=True).order_by('order', '-created_at')

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


class BannerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET, PUT, PATCH, DELETE for a specific banner."""
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


class AdListView(generics.ListCreateAPIView):
    """GET /api/products/ads/ — List all ads (admin sees all; public sees active only)."""
    serializer_class = AdSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        # Admin/Moderator see all ads; public sees only active
        if user.is_authenticated and user.role in ('admin', 'moderator'):
            return Ad.objects.all()
        return Ad.objects.filter(is_active=True)

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


class AdDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET, PATCH, DELETE a specific ad by pk."""
    queryset = Ad.objects.all()
    serializer_class = AdSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [IsAdminOrModerator()]


# ── Product List / Create (JSON) ──────────────────────────────────────────────

class ProductListView(generics.ListCreateAPIView):
    """
    GET  /api/products/           — Public product listing with search & filter
    POST /api/products/           — Admin/Moderator create product (JSON body)
    """
    permission_classes = [IsAdminOrModerator]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'brand', 'sku', 'description']
    ordering_fields = ['price', 'created_at', 'name', 'stock']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Product.objects.select_related('category').filter(status='active')
        category = self.request.query_params.get('category')
        brand    = self.request.query_params.get('brand')
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if category:
            qs = qs.filter(category__slug=category)
        if brand:
            qs = qs.filter(brand__iexact=brand)
        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductWriteSerializer
        return ProductListSerializer


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/products/<id>/   — Product detail with specs & reviews
    PATCH  /api/products/<id>/   — Admin/Moderator update (JSON)
    DELETE /api/products/<id>/   — Admin delete
    """
    queryset = Product.objects.all()
    permission_classes = [IsAdminOrModerator]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProductWriteSerializer
        return ProductDetailSerializer


class AdminProductListView(generics.ListAPIView):
    """GET /api/products/admin/ — Admin sees ALL products regardless of status."""
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductListSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'sku', 'brand']


# ── Product Create with Images (multipart/form-data) ─────────────────────────

class ProductCreateView(APIView):
    """
    POST /api/products/create/
    Accepts multipart/form-data — handles primary image + up to 4 gallery images.
    The `specifications` field should be sent as a JSON string.
    The `category` field should be the category ID (integer).
    """
    permission_classes = [IsAdminOrModerator]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        serializer = ProductWriteWithImagesSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        product = serializer.save()

        # Save additional gallery images
        gallery = request.FILES.getlist('gallery_images')
        for img_file in gallery:
            ProductImage.objects.create(product=product, image=img_file)

        return Response(
            ProductDetailSerializer(product, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ProductUploadView(APIView):
    """
    PATCH /api/products/<pk>/upload/
    Updates a product via multipart/form-data (image + gallery support).
    """
    permission_classes = [IsAdminOrModerator]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk, *args, **kwargs):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductWriteWithImagesSerializer(product, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        product = serializer.save()

        # Append new gallery images (does not clear existing ones)
        gallery = request.FILES.getlist('gallery_images')
        for img_file in gallery:
            ProductImage.objects.create(product=product, image=img_file)

        return Response(
            ProductDetailSerializer(product, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


# ── Wishlist ──────────────────────────────────────────────────────────────────

class WishlistView(APIView):
    """
    GET  /api/products/wishlist/  — Return the current user's wishlist.
    POST /api/products/wishlist/  — Add a product to the wishlist.
                                    Body: { "product_id": <int> }
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = Wishlist.objects.filter(user=request.user).select_related('product', 'product__category')
        serializer = WishlistSerializer(items, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = WishlistSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            product = serializer.validated_data['product']
            obj, created = Wishlist.objects.get_or_create(user=request.user, product=product)
            return Response(
                WishlistSerializer(obj, context={'request': request}).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WishlistDeleteView(APIView):
    """DELETE /api/products/wishlist/<id>/  — Remove an item from the wishlist."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            item = Wishlist.objects.get(pk=pk, user=request.user)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Wishlist.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
