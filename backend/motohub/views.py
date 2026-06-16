from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

# Import the models we need stats for
from orders.models import Order
from services.models import Appointment
from django.contrib.auth import get_user_model
from products.models import Product
from support.models import SupportTicket
from reviews.models import Review

User = get_user_model()

class IsAdminOrModerator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'moderator')

class DashboardStatsView(APIView):
    """GET /api/stats/ — Aggregated system statistics for the admin dashboard"""
    permission_classes = [IsAdminOrModerator]

    def get(self, request, *args, **kwargs):
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Revenue this month
        revenue_this_month = Order.objects.filter(
            created_at__gte=start_of_month,
            status__in=['delivered', 'completed'],
            payment_status='paid'
        ).aggregate(Sum('total_price'))['total_price__sum'] or 0

        # Also get total lifetime revenue as fallback
        total_revenue = Order.objects.filter(
            status__in=['delivered', 'completed'],
        ).aggregate(Sum('total_price'))['total_price__sum'] or 0
        
        if revenue_this_month == 0 and total_revenue > 0:
            revenue_this_month = total_revenue  # fallback for demo purposes

        # Order stats
        pending_orders = Order.objects.filter(status='pending').count()
        total_orders = Order.objects.count()
        delivered_orders = Order.objects.filter(status='delivered').count()
        cancelled_orders = Order.objects.filter(status='cancelled').count()

        # Appointment stats
        total_appointments = Appointment.objects.count()
        pending_appointments = Appointment.objects.filter(status='pending').count()
        confirmed_appointments = Appointment.objects.filter(status__in=['approved', 'assigned']).count()
        cancelled_appointments = Appointment.objects.filter(status='cancelled').count()

        # Users and Garages
        active_garages = User.objects.filter(role='garage', garage_profile__is_verified=True).count()
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        blocked_users = total_users - active_users
        new_users_month = User.objects.filter(date_joined__gte=start_of_month).count()

        # Products
        total_products = Product.objects.count()
        in_stock_products = Product.objects.filter(stock__gt=10).count()
        low_stock_products = Product.objects.filter(stock__gt=0, stock__lte=10).count()
        out_of_stock_products = Product.objects.filter(stock=0).count()

        # Support and Reviews
        open_support_tickets = SupportTicket.objects.exclude(status__in=['resolved', 'closed']).count()
        pending_reviews = Review.objects.filter(status='pending').count()

        return Response({
            "revenue_this_month": float(revenue_this_month),
            "pending_orders": pending_orders,
            "total_orders": total_orders,
            "delivered_orders": delivered_orders,
            "cancelled_orders": cancelled_orders,
            
            "total_appointments": total_appointments,
            "pending_appointments": pending_appointments,
            "confirmed_appointments": confirmed_appointments,
            "cancelled_appointments": cancelled_appointments,
            
            "active_garages": active_garages,
            "total_users": total_users,
            "active_users": active_users,
            "blocked_users": blocked_users,
            "new_users_month": new_users_month,
            
            "total_products": total_products,
            "in_stock_products": in_stock_products,
            "low_stock_products": low_stock_products,
            "out_of_stock_products": out_of_stock_products,

            "open_support_tickets": open_support_tickets,
            "pending_reviews": pending_reviews,
        })
