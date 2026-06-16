from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve as static_serve
from .views import DashboardStatsView

# ── Frontend page helper ───────────────────────────────────────────────────────
def frontend_page(template_name):
    """Return a TemplateView for a frontend HTML file."""
    return TemplateView.as_view(template_name=template_name)


urlpatterns = [
    # ── Django Admin ────────────────────────────────────────────────────────
    path('admin/', admin.site.urls),

    # ── REST API Endpoints ───────────────────────────────────────────────────
    path('api/auth/',     include('users.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/',   include('orders.urls')),
    path('api/services/', include('services.urls')),
    path('api/reviews/',  include('reviews.urls')),
    path('api/support/',  include('support.urls')),
    path('api/marketing/', include('marketing.urls')),
    path('api/stats/',    DashboardStatsView.as_view(), name='dashboard-stats'),

    # ── Frontend Static Assets (css / js / images / components) ─────────────
    re_path(r'^css/(?P<path>.*)$',        static_serve, {'document_root': settings.FRONTEND_DIR / 'css'}),
    re_path(r'^js/(?P<path>.*)$',         static_serve, {'document_root': settings.FRONTEND_DIR / 'js'}),
    re_path(r'^assets/(?P<path>.*)$',     static_serve, {'document_root': settings.FRONTEND_DIR / 'assets'}),
    re_path(r'^components/(?P<path>.*)$', static_serve, {'document_root': settings.FRONTEND_DIR / 'components'}),

    # ── Frontend HTML Pages ──────────────────────────────────────────────────
    path('',                          frontend_page('index.html')),
    path('index.html',                frontend_page('index.html')),
    path('login.html',                frontend_page('login.html')),
    path('products.html',             frontend_page('products.html')),
    path('product-detail.html',       frontend_page('product-detail.html')),
    path('cart.html',                 frontend_page('cart.html')),
    path('checkout.html',             frontend_page('checkout.html')),
    path('tracking.html',             frontend_page('tracking.html')),
    path('services.html',             frontend_page('services.html')),
    path('service-appointment.html',  frontend_page('service-appointment.html')),
    path('dashboard-customer.html',   frontend_page('dashboard-customer.html')),
    path('dashboard-admin.html',      frontend_page('dashboard-admin.html')),
    path('dashboard-moderator.html',  frontend_page('dashboard-moderator.html')),
    path('dashboard-garage.html',     frontend_page('dashboard-garage.html')),
    path('about.html',                frontend_page('about.html')),
    path('contact.html',              frontend_page('contact.html')),
    path('blog.html',                 frontend_page('blog.html')),
    path('blog-single.html',          frontend_page('blog-single.html')),
    path('faq.html',                  frontend_page('faq.html')),
    path('legal.html',                frontend_page('legal.html')),
    path('coming-soon.html',          frontend_page('coming-soon.html')),
    path('gateway-paytm.html',        frontend_page('gateway-paytm.html')),
    path('gateway-billdesk.html',     frontend_page('gateway-billdesk.html')),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# ── Custom Admin Branding ───────────────────────────────────────────────────
admin.site.site_header = "MOTOHUB Admin"
admin.site.site_title  = "MOTOHUB"
admin.site.index_title = "Platform Management"
