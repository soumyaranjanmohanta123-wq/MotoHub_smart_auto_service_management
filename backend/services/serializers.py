from rest_framework import serializers
from .models import Service, Appointment
from django.contrib.auth import get_user_model

User = get_user_model()


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ('id', 'name', 'service_type', 'description',
                  'price', 'duration_minutes', 'is_active')


class AppointmentSerializer(serializers.ModelSerializer):
    """Full appointment with nested service info — for reading."""
    service_detail = ServiceSerializer(source='service', read_only=True)
    customer_name = serializers.SerializerMethodField()
    garage_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = ('id', 'customer', 'customer_name', 'service', 'service_detail',
                  'garage', 'garage_name', 'appointment_date', 'appointment_time',
                  'vehicle_make', 'vehicle_model', 'vehicle_year',
                  'vehicle_reg_number', 'status', 'customer_notes',
                  'garage_notes', 'created_at', 'updated_at')
        read_only_fields = ('customer', 'status', 'garage_notes',
                            'created_at', 'updated_at')

    def get_customer_name(self, obj):
        return f"{obj.customer.first_name} {obj.customer.last_name}".strip() or obj.customer.username

    def get_garage_name(self, obj):
        if obj.garage and hasattr(obj.garage, 'garage_profile'):
            return obj.garage.garage_profile.garage_name
        if obj.garage:
            return f"{obj.garage.first_name} {obj.garage.last_name}".strip() or obj.garage.username
        return None


class AppointmentCreateSerializer(serializers.ModelSerializer):
    """Used by customers to book an appointment."""
    class Meta:
        model = Appointment
        fields = ('service', 'garage', 'appointment_date', 'appointment_time',
                  'vehicle_make', 'vehicle_model', 'vehicle_year',
                  'vehicle_reg_number', 'customer_notes')

    def create(self, validated_data):
        validated_data['customer'] = self.context['request'].user
        return super().create(validated_data)


class AppointmentStatusUpdateSerializer(serializers.ModelSerializer):
    """Garage/Admin status update."""
    class Meta:
        model = Appointment
        fields = ('status', 'garage_notes')


class AppointmentRescheduleSerializer(serializers.ModelSerializer):
    """Customer reschedules an existing appointment (date + time only)."""

    class Meta:
        model = Appointment
        fields = ('appointment_date', 'appointment_time')

    def validate(self, data):
        instance = self.instance
        if instance and instance.status not in ('pending', 'approved'):
            raise serializers.ValidationError(
                "Appointments can only be rescheduled when status is Pending or Approved."
            )
        return data


class AppointmentGarageAssignSerializer(serializers.ModelSerializer):
    """Admin assigns or changes a garage for an appointment."""

    class Meta:
        model = Appointment
        fields = ('garage', 'status')
        extra_kwargs = {
            'status': {'required': False},
        }

    def validate_garage(self, value):
        if value and value.role != 'garage':
            raise serializers.ValidationError("Selected user is not a garage.")
        return value

    def update(self, instance, validated_data):
        # Auto-set status to 'assigned' if a garage is being set and no explicit status given
        if 'garage' in validated_data and validated_data['garage'] is not None:
            validated_data.setdefault('status', 'assigned')
        return super().update(instance, validated_data)


class GarageSerializer(serializers.ModelSerializer):
    """Lightweight garage user info for admin dropdown."""
    garage_display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'garage_display_name')

    def get_garage_display_name(self, obj):
        if hasattr(obj, 'garage_profile'):
            return obj.garage_profile.garage_name
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
