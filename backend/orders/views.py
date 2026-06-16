from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Order
from .serializers import (
    OrderSerializer,
    OrderCreateSerializer,
    OrderStatusUpdateSerializer,
)


class IsAdminOrModerator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'moderator')


class MyOrderListView(generics.ListAPIView):
    """GET /api/orders/ — Authenticated customer sees their own orders."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items__product')


class CreateOrderView(generics.CreateAPIView):
    """POST /api/orders/create/ — Customer places a new order."""
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class OrderDetailView(generics.RetrieveAPIView):
    """GET /api/orders/<id>/ — Customer views own order; admin views any."""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('admin', 'moderator'):
            return Order.objects.all()
        return Order.objects.filter(user=user)


class OrderTrackingView(APIView):
    """GET /api/orders/<id>/tracking/ — Returns status + tracking number."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'order_id': order.pk,
            'status': order.status,
            'payment_status': order.payment_status,
            'tracking_number': order.tracking_number,
            'created_at': order.created_at,
        })


class AdminOrderListView(generics.ListAPIView):
    """GET /api/orders/admin/ — Admin sees all orders."""
    serializer_class = OrderSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = Order.objects.all().prefetch_related('items__product').order_by('-created_at')


class OrderStatusUpdateView(generics.UpdateAPIView):
    """PATCH /api/orders/admin/<id>/status/ — Admin updates order status."""
    serializer_class = OrderStatusUpdateSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = Order.objects.all()
    http_method_names = ['patch']
