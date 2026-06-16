from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from products.models import Product
from services.models import Service


class Review(models.Model):
    """
    A user review attached to either a product or a service.
    Exactly one of product/service must be set (enforced in clean()).
    Status: pending by default until moderated.
    """

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    # Author
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews'
    )

    # Target (product OR service — one must be set, not both)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE,
        null=True, blank=True, related_name='reviews'
    )
    service = models.ForeignKey(
        Service, on_delete=models.CASCADE,
        null=True, blank=True, related_name='reviews'
    )

    # Review content
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 (worst) to 5 (best)."
    )
    comment = models.TextField(blank=True, null=True)

    # Moderation
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        # Prevent duplicate reviews: one review per user per product/service
        unique_together = [
            ['user', 'product'],
            ['user', 'service'],
        ]

    def __str__(self):
        target = self.product or self.service
        return f"Review by {self.user} on {target} ({self.rating}★)"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.product and not self.service:
            raise ValidationError("A review must be for a product or a service.")
        if self.product and self.service:
            raise ValidationError("A review cannot be for both a product and a service.")
