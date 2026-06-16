from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Service, Appointment
from .serializers import (
    ServiceSerializer,
    AppointmentSerializer,
    AppointmentCreateSerializer,
    AppointmentStatusUpdateSerializer,
    AppointmentRescheduleSerializer,
    AppointmentGarageAssignSerializer,
    GarageSerializer,
)
from django.contrib.auth import get_user_model

User = get_user_model()


class IsAdminOrModerator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'moderator')


class IsGarage(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'garage'


class ServiceListView(generics.ListAPIView):
    """GET /api/services/ — Public list of active services."""
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]


class ServiceAdminView(generics.ListCreateAPIView):
    """GET/POST /api/services/manage/ — Admin CRUD for services."""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrModerator]


class ServiceDetailAdminView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrModerator]


class MyAppointmentListView(generics.ListAPIView):
    """GET /api/appointments/ — Customer sees their own appointments."""
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(customer=self.request.user).select_related('service', 'garage')


class CreateAppointmentView(generics.CreateAPIView):
    """POST /api/appointments/book/ — Customer books an appointment."""
    serializer_class = AppointmentCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class GarageAppointmentListView(generics.ListAPIView):
    """GET /api/appointments/garage/ — Garage sees appointments assigned to them."""
    serializer_class = AppointmentSerializer
    permission_classes = [IsGarage]

    def get_queryset(self):
        return Appointment.objects.filter(garage=self.request.user).select_related('service', 'customer')


class AppointmentStatusUpdateView(generics.UpdateAPIView):
    """PATCH /api/appointments/<id>/status/ — Garage or Admin updates status."""
    serializer_class = AppointmentStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['patch']

    def get_queryset(self):
        user = self.request.user
        if user.role in ('admin', 'moderator'):
            return Appointment.objects.all()
        if user.role == 'garage':
            return Appointment.objects.filter(garage=user)
        return Appointment.objects.none()


class AdminAppointmentListView(generics.ListAPIView):
    """GET /api/appointments/admin/ — Admin sees all appointments."""
    serializer_class = AppointmentSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = Appointment.objects.all().select_related('service', 'customer', 'garage')


# ─────────────────────────────────────────────────────────────
#  NEW: Customer Reschedule
# ─────────────────────────────────────────────────────────────
class CustomerRescheduleView(generics.UpdateAPIView):
    """
    PATCH /api/services/appointments/<id>/reschedule/
    Customer changes date & time of their own appointment.
    Only allowed when status is 'pending' or 'approved'.
    """
    serializer_class = AppointmentRescheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['patch']

    def get_queryset(self):
        return Appointment.objects.filter(customer=self.request.user)

    def perform_update(self, serializer):
        appt = self.get_object()
        if appt.status not in ('pending', 'approved'):
            raise PermissionDenied(
                "Only pending or approved appointments can be rescheduled."
            )
        serializer.save()


# ─────────────────────────────────────────────────────────────
#  NEW: Admin Garage Assignment
# ─────────────────────────────────────────────────────────────
class AdminGarageAssignView(generics.UpdateAPIView):
    """
    PATCH /api/services/appointments/<id>/assign-garage/
    Admin/moderator assigns or changes the garage for an appointment.
    Auto-sets status → 'assigned' when a garage is chosen.
    """
    serializer_class = AppointmentGarageAssignSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = Appointment.objects.all()
    http_method_names = ['patch']


# ─────────────────────────────────────────────────────────────
#  NEW: Garage List for Admin Dropdown
# ─────────────────────────────────────────────────────────────
class GarageListView(generics.ListAPIView):
    """
    GET /api/services/garages/
    Returns all users with role='garage' for the admin assign-garage dropdown.
    """
    serializer_class = GarageSerializer
    permission_classes = [IsAdminOrModerator]

    def get_queryset(self):
        return User.objects.filter(role='garage', is_active=True).order_by('username')
