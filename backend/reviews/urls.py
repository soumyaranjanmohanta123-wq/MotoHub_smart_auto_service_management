from django.urls import path
from .views import (
    ProductReviewListView,
    ServiceReviewListView,
    CreateReviewView,
    MyReviewListView,
    AdminReviewListView,
    ReviewModerationView,
)

urlpatterns = [
    path('', CreateReviewView.as_view(), name='create-review'),
    path('mine/', MyReviewListView.as_view(), name='my-reviews'),
    path('product/<int:product_id>/', ProductReviewListView.as_view(), name='product-reviews'),
    path('service/<int:service_id>/', ServiceReviewListView.as_view(), name='service-reviews'),
    path('admin/', AdminReviewListView.as_view(), name='admin-reviews'),
    path('<int:pk>/moderate/', ReviewModerationView.as_view(), name='review-moderate'),
]
