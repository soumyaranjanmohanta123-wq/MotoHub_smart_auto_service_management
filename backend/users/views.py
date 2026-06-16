from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import (
    RegisterSerializer, UserProfileSerializer, GarageListSerializer,
    UserVehicleSerializer, UserAddressSerializer, ChangePasswordSerializer,
    AdminUserUpdateSerializer, AdminGarageSerializer,
    AdminGarageCreateSerializer, AdminGarageUpdateSerializer
)
from .models import UserVehicle, UserAddress, GarageProfile

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — Public registration."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/profile/ — Authenticated user profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class GarageListView(generics.ListAPIView):
    """GET /api/auth/garages/?city=Bhubaneswar — Publicly list garages for booking."""
    serializer_class = GarageListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = User.objects.filter(role='garage', garage_profile__is_verified=True)
        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(garage_profile__city__iexact=city)
        return qs


class UserListView(generics.ListCreateAPIView):
    """GET/POST /api/auth/users/ — Admin manage user list."""
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.all().order_by('-date_joined')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            from .serializers import AdminUserCreateSerializer
            return AdminUserCreateSerializer
        return UserProfileSerializer

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/users/<id>/ — Admin manage users."""
    queryset = User.objects.all()
    serializer_class = AdminUserUpdateSerializer
    permission_classes = [permissions.IsAdminUser]

    # overriding update to handle blocking or role changes
    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class ChangePasswordView(generics.UpdateAPIView):
    """PUT /api/auth/profile/password/ — Change user password."""
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            if not self.object.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            self.object.set_password(serializer.data.get("new_password"))
            self.object.save()
            # Invalidate all sessions/tokens in production here if needed
            return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserVehicleViewSet(viewsets.ModelViewSet):
    """CRUD /api/auth/vehicles/ — Manage customer vehicles."""
    serializer_class = UserVehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserVehicle.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserAddressViewSet(viewsets.ModelViewSet):
    """CRUD /api/auth/addresses/ — Manage saved addresses."""
    serializer_class = UserAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # If set to default, remove default from others
        if serializer.validated_data.get('is_default', False):
            UserAddress.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        # If set to default, remove default from others
        if serializer.validated_data.get('is_default', False):
            UserAddress.objects.filter(user=self.request.user).exclude(pk=self.get_object().pk).update(is_default=False)
        serializer.save()


class AdminGarageView(generics.ListCreateAPIView):
    """GET /api/auth/garages/admin/  — List all garages with full profile info.
       POST /api/auth/garages/admin/ — Create a new garage account + profile."""
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return User.objects.filter(role='garage').select_related('garage_profile').order_by('id')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminGarageCreateSerializer
        return AdminGarageSerializer

    def create(self, request, *args, **kwargs):
        serializer = AdminGarageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminGarageSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminGarageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/garages/admin/<id>/ — Manage a single garage."""
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.filter(role='garage').select_related('garage_profile')

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return AdminGarageUpdateSerializer
        return AdminGarageSerializer

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        instance = self.get_object()
        serializer = AdminGarageUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminGarageSerializer(user).data)
