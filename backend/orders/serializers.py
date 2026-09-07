from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusHistory

class OrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='menu_item.name', read_only=True)
    is_veg = serializers.BooleanField(source='menu_item.is_veg', read_only=True)
    total_price = serializers.FloatField(read_only=True)
    total_cost = serializers.FloatField(read_only=True)

    class Meta:
        model = OrderItem
        fields = '__all__'

class OrderStatusHistorySerializer(serializers.ModelSerializer):
    time_display = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = '__all__'

    def get_time_display(self, obj):
        return obj.timestamp.strftime('%I:%M %p')

class OrderSerializer(serializers.ModelSerializer):
    table_id = serializers.IntegerField(source='session.table.id', read_only=True)
    table_number = serializers.CharField(source='session.table.number', read_only=True)
    session_code = serializers.CharField(source='session.session_code', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='Walk-in Guest')
    customer_phone = serializers.CharField(source='customer.phone', read_only=True, default='')
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    subtotal = serializers.FloatField(read_only=True)
    total_food_cost = serializers.FloatField(read_only=True)
    elapsed_minutes = serializers.SerializerMethodField()
    is_delayed = serializers.SerializerMethodField()
    created_at_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'

    def get_elapsed_minutes(self, obj):
        from django.utils import timezone
        diff = timezone.now() - obj.created_at
        return int(diff.total_seconds() // 60)

    def get_is_delayed(self, obj):
        # Delayed if waiting more than 15 minutes and not yet served
        return obj.status in ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] and self.get_elapsed_minutes(obj) >= 15

    def get_created_at_display(self, obj):
        return obj.created_at.strftime('%I:%M %p')
