from django.urls import path
from .views import (
    MyTicketListView,
    TicketDetailView,
    TicketStatusUpdateView,
    AddTicketMessageView,
)

urlpatterns = [
    path('tickets/', MyTicketListView.as_view(), name='tickets'),
    path('tickets/<int:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
    path('tickets/<int:pk>/status/', TicketStatusUpdateView.as_view(), name='ticket-status'),
    path('tickets/<int:ticket_id>/messages/', AddTicketMessageView.as_view(), name='ticket-messages'),
]
