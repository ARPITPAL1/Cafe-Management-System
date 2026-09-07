from rest_framework import serializers
from .models import Table, TableSession, TableReservation

class TableSessionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    table_number = serializers.CharField(source='table.number', read_only=True)
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = TableSession
        fields = '__all__'

    def get_duration_minutes(self, obj):
        from django.utils import timezone
        end = obj.closed_at or timezone.now()
        diff = end - obj.opened_at
        return int(diff.total_seconds() // 60)

class TableSerializer(serializers.ModelSerializer):
    active_session = serializers.SerializerMethodField()
    qr_url = serializers.SerializerMethodField()
    current_amount = serializers.SerializerMethodField()
    orders_summary = serializers.SerializerMethodField()
    has_delayed_order = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = '__all__'

    def get_qr_url(self, obj):
        return f"/t/{obj.public_token}"

    def get_active_session(self, obj):
        session = obj.get_current_session()
        if not session:
            return None
        return TableSessionSerializer(session).data

    def get_current_amount(self, obj):
        session = obj.get_current_session()
        if not session:
            return 0.0
        total = 0.0
        for order in session.orders.exclude(status='CANCELLED'):
            total += float(order.subtotal)
        return round(total, 2)

    def get_has_delayed_order(self, obj):
        session = obj.get_current_session()
        if not session:
            return False
        from django.utils import timezone
        for order in session.orders.exclude(status__in=['SERVED', 'COMPLETED', 'CANCELLED']):
            diff = timezone.now() - order.created_at
            if (diff.total_seconds() // 60) >= 15:
                return True
        return False

    def get_orders_summary(self, obj):
        session = obj.get_current_session()
        if not session:
            return []
        orders = session.orders.exclude(status='CANCELLED')
        return [
            {
                'id': o.id,
                'order_number': o.order_number,
                'status': o.status,
                'items_count': o.items.exclude(status='CANCELLED').count(),
                'subtotal': float(o.subtotal)
            }
            for o in orders
        ]

class TableReservationSerializer(serializers.ModelSerializer):
    table_number = serializers.CharField(source='table.number', read_only=True)
    table_capacity = serializers.IntegerField(source='table.capacity', read_only=True)
    floor_section = serializers.CharField(source='table.floor_section', read_only=True)

    class Meta:
        model = TableReservation
        fields = '__all__'
