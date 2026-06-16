from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model extended with role-based access control.
    Supports four roles: Admin, Moderator, Garage, Customer.
    """

    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('moderator', 'Moderator'),
        ('garage', 'Garage'),
        ('customer', 'Customer'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=15, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)

    # Granular permission overrides for Moderators
    # e.g. {"can_edit_products": True, "can_manage_orders": False}
    permissions_config = models.JSONField(
        default=dict, blank=True, null=True,
        help_text="Custom permission map for moderators."
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_moderator(self):
        return self.role == 'moderator'

    @property
    def is_garage(self):
        return self.role == 'garage'

    @property
    def is_customer(self):
        return self.role == 'customer'


class GarageProfile(models.Model):
    """
    Extended profile for users with the 'garage' role.
    Stores garage-specific business details.
    """

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='garage_profile'
    )
    garage_name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    gstin = models.CharField(max_length=20, blank=True, null=True, verbose_name="GSTIN")
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.garage_name} ({self.user.username})"


class UserVehicle(models.Model):
    """Stores customer vehicles for the 'My Garage' section."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='vehicles'
    )
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    license_plate = models.CharField(max_length=50)
    vin = models.CharField(max_length=100, blank=True, null=True, verbose_name="VIN")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.year} {self.make} {self.model} ({self.user.username})"


class UserAddress(models.Model):
    """Stores saved customer addresses."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='addresses'
    )
    title = models.CharField(max_length=50, default='Home', help_text="e.g., Home, Work")
    name = models.CharField(max_length=100, help_text="Recipient Name")
    address_lines = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=20)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.city} ({self.user.username})"
