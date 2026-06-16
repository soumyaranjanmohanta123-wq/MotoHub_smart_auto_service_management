from django.urls import path
from .views import update_banner

urlpatterns = [
    path('banners/update/<int:pk>/', update_banner, name='update_marketing_banner'),
]
