from django.urls import path
from .views import (
    MyOrderListView,
    CreateOrderView,
    OrderDetailView,
    OrderTrackingView,
    AdminOrderListView,
    OrderStatusUpdateView,
)

urlpatterns = [
    path('', MyOrderListView.as_view(), name='my-orders'),
    path('create/', CreateOrderView.as_view(), name='create-order'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('<int:pk>/tracking/', OrderTrackingView.as_view(), name='order-tracking'),
    path('admin/', AdminOrderListView.as_view(), name='admin-orders'),
    path('admin/<int:pk>/status/', OrderStatusUpdateView.as_view(), name='order-status-update'),
]
