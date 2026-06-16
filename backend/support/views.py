from rest_framework import generics, permissions
from .models import SupportTicket, TicketMessage
from .serializers import SupportTicketSerializer, TicketMessageSerializer


class IsAdminOrModerator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'moderator')


class MyTicketListView(generics.ListCreateAPIView):
    """
    GET  /api/support/tickets/      — Customer sees their own tickets
    POST /api/support/tickets/      — Customer opens a new ticket
    """
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('admin', 'moderator'):
            return SupportTicket.objects.all().prefetch_related('messages')
        return SupportTicket.objects.filter(user=user).prefetch_related('messages')


class TicketDetailView(generics.RetrieveAPIView):
    """GET /api/support/tickets/<id>/ — View a specific ticket with full thread."""
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('admin', 'moderator'):
            return SupportTicket.objects.all()
        return SupportTicket.objects.filter(user=user)


class TicketStatusUpdateView(generics.UpdateAPIView):
    """PATCH /api/support/tickets/<id>/status/ — Admin updates ticket status."""
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = SupportTicket.objects.all()
    http_method_names = ['patch']


class AddTicketMessageView(generics.CreateAPIView):
    """POST /api/support/tickets/<ticket_id>/messages/ — Add a reply to a ticket."""
    serializer_class = TicketMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        ticket_id = self.kwargs['ticket_id']
        serializer.save(ticket_id=ticket_id)
