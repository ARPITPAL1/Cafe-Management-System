from rest_framework import serializers
from .models import Bill, Payment

class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    created_display = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'

    def get_created_display(self, obj):
        return obj.created_at.strftime('%I:%M %p')

class BillSerializer(serializers.ModelSerializer):
    table_number = serializers.CharField(source='session.table.number', read_only=True)
    customer_name = serializers.CharField(source='session.customer.name', read_only=True, default='')
    customer_phone = serializers.CharField(source='session.customer.phone', read_only=True, default='')
    payments = PaymentSerializer(many=True, read_only=True)
    total_paid = serializers.FloatField(read_only=True)
    amount_remaining = serializers.FloatField(read_only=True)
    is_settled = serializers.BooleanField(read_only=True)
    created_display = serializers.SerializerMethodField()
    items_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = '__all__'

    def get_created_display(self, obj):
        return obj.created_at.strftime('%d %b %Y, %I:%M %p')

    def get_items_breakdown(self, obj):
        breakdown = []
        for order in obj.session.orders.exclude(status='CANCELLED'):
            for item in order.items.exclude(status='CANCELLED'):
                breakdown.append({
                    'item_name': item.menu_item.name,
                    'variant': item.variant_name,
                    'quantity': item.quantity,
                    'unit_price': float(item.unit_price),
                    'addons': item.addons_json,
                    'total_price': float(item.total_price),
                    'order_number': order.order_number
                })
        return breakdown
