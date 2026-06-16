from django.db import models
from django.conf import settings


class Service(models.Model):
    """
    A service offered on the platform.
    Types: home (doorstep), garage (in-garage), inspection (vehicle check).
    """

    SERVICE_TYPE_CHOICES = (
        ('home', 'Home Service'),
        ('garage', 'Garage Service'),
        ('inspection', 'Inspection'),
    )

    name = models.CharField(max_length=200)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_minutes = models.PositiveIntegerField(
        default=60, help_text="Estimated duration in minutes."
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_service_type_display()})"


class Appointment(models.Model):
    """
    A service booking made by a customer.
    Status flows: Pending → Approved → Assigned → In Progress → Completed → Cancelled
    """

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    # Who booked
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='appointments'
    )

    # Which service and which garage handles it
    service = models.ForeignKey(
        Service, on_delete=models.SET_NULL, null=True, related_name='appointments'
    )
    garage = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='garage_appointments',
        limit_choices_to={'role': 'garage'}
    )

    # Appointment timing
    appointment_date = models.DateField()
    appointment_time = models.TimeField()

    # Vehicle details
    vehicle_make = models.CharField(max_length=100, blank=True, null=True)
    vehicle_model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_year = models.PositiveIntegerField(blank=True, null=True)
    vehicle_reg_number = models.CharField(
        max_length=20, blank=True, null=True, verbose_name="Registration Number"
    )

    # Status & notes
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    customer_notes = models.TextField(blank=True, null=True)
    garage_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-appointment_date', '-appointment_time']

    def __str__(self):
        return (
            f"Appt #{self.pk} — {self.customer} | "
            f"{self.service} on {self.appointment_date}"
        )
