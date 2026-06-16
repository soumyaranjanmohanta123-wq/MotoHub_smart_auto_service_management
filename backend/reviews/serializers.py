from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ('id', 'user', 'author_name', 'product', 'service',
                  'rating', 'comment', 'status', 'created_at')
        read_only_fields = ('user', 'status', 'created_at')

    def get_author_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def validate(self, attrs):
        if not attrs.get('product') and not attrs.get('service'):
            raise serializers.ValidationError("Specify either a product or a service.")
        if attrs.get('product') and attrs.get('service'):
            raise serializers.ValidationError("Review can only be for a product OR a service, not both.")
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
