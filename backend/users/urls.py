from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, ProfileView, GarageListView, UserListView,
    AdminUserDetailView, ChangePasswordView, UserVehicleViewSet, UserAddressViewSet,
    AdminGarageView, AdminGarageDetailView
)

router = DefaultRouter()
router.register(r'vehicles', UserVehicleViewSet, basename='user-vehicle')
router.register(r'addresses', UserAddressViewSet, basename='user-address')

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    # Profile
    path('profile/', ProfileView.as_view(), name='auth-profile'),
    path('profile/password/', ChangePasswordView.as_view(), name='auth-password'),
    # Listings
    path('garages/', GarageListView.as_view(), name='garage-list'),
    path('garages/admin/', AdminGarageView.as_view(), name='admin-garage-list'),
    path('garages/admin/<int:pk>/', AdminGarageDetailView.as_view(), name='admin-garage-detail'),
    path('users/', UserListView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    
    # Routers
    path('', include(router.urls)),
]
