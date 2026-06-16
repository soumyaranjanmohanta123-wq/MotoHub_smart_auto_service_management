"""
Standalone script to create the demo admin user with clear all previous operation.
Run from the backend/ directory with the venv Python.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'motohub.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Remove previous admins
deleted_superusers, _ = User.objects.filter(is_superuser=True).delete()
deleted_admins, _ = User.objects.filter(role='admin').delete()
print(f"[INFO] Cleared old admin accounts.")

USERNAME = 'admin@motohub.com'
EMAIL = 'admin@motohub.com'
PASSWORD = 'Admin@123'

u = User.objects.create_superuser(
    username=USERNAME,
    email=EMAIL,
    password=PASSWORD,
    role='admin',
    first_name='Admin',
    last_name='Motohub',
)
print(f"[OK] New admin user '{USERNAME}' created successfully.")

print(f"\n{'='*40}")
print(f"  Admin Panel  : http://127.0.0.1:8000/admin/")
print(f"  Email        : {EMAIL}")
print(f"  Password     : {PASSWORD}")
print(f"{'='*40}\n")

