from rest_framework import serializers
from .models import Order, OrderItem
from products.serializers import ProductListSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product_detail = ProductListSerializer(source='product', read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_detail', 'quantity', 'price', 'subtotal')
        read_only_fields = ('price', 'subtotal')


class OrderItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ('product', 'quantity')


class OrderSerializer(serializers.ModelSerializer):
    """Full order with items — for reading."""
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'user', 'user_email', 'total_price', 'discount_amount',
                  'status', 'payment_method', 'payment_status',
                  'shipping_address', 'tracking_number', 'notes',
                  'created_at', 'updated_at', 'items')
        read_only_fields = ('user', 'total_price', 'status', 'payment_status',
                            'tracking_number', 'created_at', 'updated_at')


class OrderCreateSerializer(serializers.ModelSerializer):
    """Used by customers to place a new order."""
    items = OrderItemCreateSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = ('payment_method', 'shipping_address', 'notes', 'items')

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        total = 0

        order = Order.objects.create(user=user, total_price=0, **validated_data)

        for item_data in items_data:
            product = item_data['product']
            qty = item_data['quantity']
            price = product.effective_price
            OrderItem.objects.create(order=order, product=product, quantity=qty, price=price)
            total += price * qty

        order.total_price = total
        order.save()
        return order


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Admin/Moderator status update."""
    class Meta:
        model = Order
        fields = ('status', 'tracking_number', 'payment_status')
