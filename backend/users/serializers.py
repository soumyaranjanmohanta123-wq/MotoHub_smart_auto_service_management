from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from .models import GarageProfile, UserVehicle, UserAddress

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Handles user registration with password confirmation."""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label="Confirm Password")

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                  'phone', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Read/update user profile."""
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                  'phone', 'role', 'profile_picture', 'is_active', 'date_joined')
        read_only_fields = ('id', 'role', 'date_joined')


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Admin full user creation including role, is_active, and password."""
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                  'phone', 'role', 'is_active', 'password')

    def create(self, validated_data):
        password = validated_data.pop('password')
        # auto-generate a username if not provided
        if 'username' not in validated_data or not validated_data['username']:
            validated_data['username'] = validated_data['email']
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AdminUserUpdateSerializer(UserProfileSerializer):
    """Admin full update including role and is_active."""
    class Meta(UserProfileSerializer.Meta):
        read_only_fields = ('id', 'date_joined')


class GarageProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)

    class Meta:
        model = GarageProfile
        fields = '__all__'


class GarageListSerializer(serializers.ModelSerializer):
    """Lightweight garage listing for appointment booking dropdown."""
    garage_name = serializers.CharField(source='garage_profile.garage_name')
    city = serializers.CharField(source='garage_profile.city')

    class Meta:
        model = User
        fields = ('id', 'username', 'garage_name', 'city')


class UserVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserVehicle
        fields = '__all__'
        read_only_fields = ('user', 'created_at')


class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = '__all__'
        read_only_fields = ('user', 'created_at')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs


class AdminGarageSerializer(serializers.ModelSerializer):
    """Full garage details for admin listing. Reads nested GarageProfile."""
    garage_name = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    pincode = serializers.SerializerMethodField()
    gstin = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'phone',
                  'is_active', 'date_joined',
                  'garage_name', 'address', 'city', 'state', 'pincode', 'gstin', 'is_verified')

    def _profile(self, obj):
        return getattr(obj, 'garage_profile', None)

    def get_garage_name(self, obj):
        p = self._profile(obj)
        return p.garage_name if p else ''

    def get_address(self, obj):
        p = self._profile(obj)
        return p.address if p else ''

    def get_city(self, obj):
        p = self._profile(obj)
        return p.city if p else ''

    def get_state(self, obj):
        p = self._profile(obj)
        return p.state if p else ''

    def get_pincode(self, obj):
        p = self._profile(obj)
        return p.pincode if p else ''

    def get_gstin(self, obj):
        p = self._profile(obj)
        return p.gstin if p else ''

    def get_is_verified(self, obj):
        p = self._profile(obj)
        return p.is_verified if p else False


class AdminGarageCreateSerializer(serializers.Serializer):
    """Create a garage user account + GarageProfile in one atomic request."""
    # User fields
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(default='')
    phone = serializers.CharField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, required=True)
    is_active = serializers.BooleanField(default=True)

    # GarageProfile fields
    garage_name = serializers.CharField(required=True)
    address = serializers.CharField(required=True)
    city = serializers.CharField(required=True)
    state = serializers.CharField(required=True)
    pincode = serializers.CharField(required=True)
    gstin = serializers.CharField(required=False, allow_blank=True, default='')
    is_verified = serializers.BooleanField(default=False)

    @transaction.atomic
    def create(self, validated_data):
        profile_fields = ('garage_name', 'address', 'city', 'state', 'pincode', 'gstin', 'is_verified')
        profile_data = {k: validated_data.pop(k) for k in profile_fields}
        password = validated_data.pop('password')
        validated_data['role'] = 'garage'
        validated_data['username'] = validated_data['email']
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        GarageProfile.objects.create(user=user, **profile_data)
        return user


class AdminGarageUpdateSerializer(serializers.Serializer):
    """Update garage user + profile fields."""
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    garage_name = serializers.CharField(required=False)
    address = serializers.CharField(required=False)
    city = serializers.CharField(required=False)
    state = serializers.CharField(required=False)
    pincode = serializers.CharField(required=False)
    gstin = serializers.CharField(required=False, allow_blank=True)
    is_verified = serializers.BooleanField(required=False)

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_fields = ('garage_name', 'address', 'city', 'state', 'pincode', 'gstin', 'is_verified')
        profile_data = {k: validated_data.pop(k) for k in profile_fields if k in validated_data}
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        profile, _ = GarageProfile.objects.get_or_create(user=instance, defaults={'garage_name': instance.username, 'address': '', 'city': '', 'state': '', 'pincode': ''})
        for attr, val in profile_data.items():
            setattr(profile, attr, val)
        profile.save()
        return instance
