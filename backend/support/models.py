from django.db import models
from django.conf import settings


class SupportTicket(models.Model):
    """
    A customer support ticket.
    Status flows: Open → In Progress → Resolved → Closed
    """

    STATUS_CHOICES = (
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )

    CATEGORY_CHOICES = (
        ('order', 'Order Issue'),
        ('payment', 'Payment Issue'),
        ('product', 'Product Query'),
        ('service', 'Service Query'),
        ('account', 'Account Issue'),
        ('other', 'Other'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tickets'
    )

    # Ticket details
    subject = models.CharField(max_length=300)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')

    # Optional link to a related order
    related_order_id = models.PositiveIntegerField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Ticket #{self.pk}: {self.subject} [{self.status}]"


class TicketMessage(models.Model):
    """
    A message/reply thread entry within a support ticket.
    Both customers and staff can post messages.
    """

    ticket = models.ForeignKey(
        SupportTicket, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='ticket_messages'
    )
    message = models.TextField()
    is_staff_reply = models.BooleanField(
        default=False, help_text="True if the reply is from admin/moderator."
    )
    attachment = models.FileField(upload_to='support/attachments/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']  # Chronological thread

    def __str__(self):
        return f"Message in Ticket #{self.ticket.pk} by {self.sender}"
