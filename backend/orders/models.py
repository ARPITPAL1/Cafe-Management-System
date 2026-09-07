from django.db import models
from decimal import Decimal

class Order(models.Model):
    SOURCE_CHOICES = [
        ('QR', 'Customer QR Scan'),
        ('WAITER_MANUAL', 'Staff / Waiter POS'),
    ]

    STATUS_CHOICES = [
        ('PLACED', 'Order Placed'),
        ('CONFIRMED', 'Confirmed by Staff'),
        ('PREPARING', 'Preparing in Kitchen'),
        ('READY', 'Ready for Pickup / Serving'),
        ('SERVED', 'Served to Table'),
        ('BILL_REQUESTED', 'Bill Requested'),
        ('BILL_GENERATED', 'Bill Generated'),
        ('PAID', 'Payment Received'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    session = models.ForeignKey('tables.TableSession', on_delete=models.CASCADE, related_name='orders')
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    order_number = models.PositiveIntegerField(unique=True, db_index=True)
    order_source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='QR')
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='PLACED')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order_number} ({self.session.table.number}) - {self.status}"

    @property
    def subtotal(self):
        return sum(item.total_price for item in self.items.exclude(status='CANCELLED'))

    @property
    def total_food_cost(self):
        return sum(item.total_cost for item in self.items.exclude(status='CANCELLED'))

class OrderItem(models.Model):
    ITEM_STATUS_CHOICES = [
        ('PENDING', 'Pending Kitchen Acceptance'),
        ('PREPARING', 'In Preparation'),
        ('READY', 'Prepared & Ready'),
        ('SERVED', 'Served'),
        ('CANCELLED', 'Cancelled'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey('menu.MenuItem', on_delete=models.CASCADE)
    variant_name = models.CharField(max_length=60, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    addons_json = models.JSONField(default=list, blank=True) # [{'name': 'Extra Cheese', 'price': 40, 'cost': 15}]
    special_instructions = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=ITEM_STATUS_CHOICES, default='PENDING')
    cancelled_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} (#{self.order.order_number})"

    @property
    def addons_total(self):
        return sum(Decimal(str(addon.get('price', 0))) for addon in self.addons_json)

    @property
    def addons_cost_total(self):
        return sum(Decimal(str(addon.get('cost', 0))) for addon in self.addons_json)

    @property
    def total_price(self):
        return (self.unit_price + self.addons_total) * self.quantity

    @property
    def total_cost(self):
        return (self.unit_cost + self.addons_cost_total) * self.quantity

class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=25)
    to_status = models.CharField(max_length=25)
    changed_by = models.CharField(max_length=100, default='System')
    notes = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Order #{self.order.order_number}: {self.from_status} -> {self.to_status} by {self.changed_by}"
