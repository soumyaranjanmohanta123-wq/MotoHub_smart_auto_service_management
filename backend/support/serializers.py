from rest_framework import serializers
from .models import SupportTicket, TicketMessage


class TicketMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketMessage
        fields = ('id', 'ticket', 'sender', 'sender_name', 'message',
                  'is_staff_reply', 'attachment', 'created_at')
        read_only_fields = ('sender', 'is_staff_reply', 'created_at')

    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return "Unknown"

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['sender'] = user
        validated_data['is_staff_reply'] = user.role in ('admin', 'moderator')
        return super().create(validated_data)


class SupportTicketSerializer(serializers.ModelSerializer):
    messages = TicketMessageSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = SupportTicket
        fields = ('id', 'user', 'user_email', 'subject', 'category',
                  'status', 'related_order_id', 'created_at', 'updated_at', 'messages')
        read_only_fields = ('user', 'status', 'created_at', 'updated_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
