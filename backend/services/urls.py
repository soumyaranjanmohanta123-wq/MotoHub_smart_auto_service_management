from django.urls import path
from .views import (
    ServiceListView,
    ServiceAdminView,
    ServiceDetailAdminView,
    MyAppointmentListView,
    CreateAppointmentView,
    GarageAppointmentListView,
    AppointmentStatusUpdateView,
    AdminAppointmentListView,
    CustomerRescheduleView,
    AdminGarageAssignView,
    GarageListView,
)

urlpatterns = [
    # Services
    path('', ServiceListView.as_view(), name='service-list'),
    path('manage/', ServiceAdminView.as_view(), name='service-admin-list'),
    path('manage/<int:pk>/', ServiceDetailAdminView.as_view(), name='service-admin-detail'),

    # Appointments — Customer
    path('appointments/', MyAppointmentListView.as_view(), name='my-appointments'),
    path('appointments/book/', CreateAppointmentView.as_view(), name='book-appointment'),
    path('appointments/<int:pk>/reschedule/', CustomerRescheduleView.as_view(), name='appointment-reschedule'),

    # Appointments — Garage
    path('appointments/garage/', GarageAppointmentListView.as_view(), name='garage-appointments'),

    # Appointments — Admin / Moderator
    path('appointments/admin/', AdminAppointmentListView.as_view(), name='admin-appointments'),
    path('appointments/<int:pk>/status/', AppointmentStatusUpdateView.as_view(), name='appointment-status'),
    path('appointments/<int:pk>/assign-garage/', AdminGarageAssignView.as_view(), name='appointment-assign-garage'),

    # Utility
    path('garages/', GarageListView.as_view(), name='garage-list'),
]
