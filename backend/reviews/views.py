from rest_framework import generics, permissions
from .models import Review
from .serializers import ReviewSerializer


class IsAdminOrModerator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'moderator')


class ProductReviewListView(generics.ListAPIView):
    """GET /api/reviews/product/<product_id>/ — Public reviews for a product."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Review.objects.filter(
            product_id=self.kwargs['product_id'], status='approved'
        ).select_related('user')


class ServiceReviewListView(generics.ListAPIView):
    """GET /api/reviews/service/<service_id>/ — Public reviews for a service."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Review.objects.filter(
            service_id=self.kwargs['service_id'], status='approved'
        ).select_related('user')


class CreateReviewView(generics.CreateAPIView):
    """POST /api/reviews/ — Authenticated user submits a review."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]


class MyReviewListView(generics.ListAPIView):
    """GET /api/reviews/mine/ — Authenticated user sees their own reviews."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user)


class AdminReviewListView(generics.ListAPIView):
    """GET /api/reviews/admin/ — Admin/Moderator sees all pending reviews."""
    serializer_class = ReviewSerializer
    permission_classes = [IsAdminOrModerator]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status', 'pending')
        return Review.objects.filter(status=status_filter).select_related('user', 'product', 'service')


class ReviewModerationView(generics.UpdateAPIView):
    """PATCH /api/reviews/<id>/moderate/ — Moderator approves or rejects a review."""
    serializer_class = ReviewSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = Review.objects.all()
    http_method_names = ['patch']

    def get_serializer(self, *args, **kwargs):
        kwargs['fields'] = ['status']
        return super().get_serializer(*args, **kwargs)
