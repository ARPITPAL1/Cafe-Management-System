from django.db import models
from decimal import Decimal

class Coupon(models.Model):
    DISCOUNT_TYPES = [
        ('PERCENT', 'Percentage Discount'),
        ('FLAT', 'Flat Amount Discount'),
    ]

    code = models.CharField(max_length=30, unique=True, db_index=True)
    description = models.CharField(max_length=150, blank=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPES, default='PERCENT')
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0.00'))
    max_discount_amount = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('500.00'), null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} ({self.discount_value}{'%' if self.discount_type == 'PERCENT' else ' ₹'})"

    def calculate_discount(self, subtotal):
        if subtotal < self.min_order_amount:
            return Decimal('0.00')
        if self.discount_type == 'PERCENT':
            disc = (subtotal * self.discount_value) / Decimal('100.00')
            if self.max_discount_amount:
                disc = min(disc, self.max_discount_amount)
            return round(disc, 2)
        else:
            return min(subtotal, self.discount_value)

class Bill(models.Model):
    BILL_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PARTIALLY_PAID', 'Partially Paid (Split Payment)'),
        ('PAID', 'Fully Paid'),
        ('REFUNDED', 'Refunded'),
    ]

    session = models.ForeignKey('tables.TableSession', on_delete=models.CASCADE, related_name='bills')
    bill_number = models.CharField(max_length=50, unique=True, db_index=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_reason = models.CharField(max_length=150, blank=True)
    coupon_code = models.CharField(max_length=30, blank=True)
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    service_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tip_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    round_off = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=BILL_STATUS_CHOICES, default='UNPAID')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Bill {self.bill_number} - ₹{self.grand_total} ({self.status})"

    @property
    def total_paid(self):
        return sum(payment.amount for payment in self.payments.filter(status='SUCCESS'))

    @property
    def amount_remaining(self):
        return max(Decimal('0.00'), self.grand_total - self.total_paid)

    @property
    def is_settled(self):
        return self.total_paid >= self.grand_total

class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI (GPay, PhonePe, Paytm)'),
        ('CARD', 'Credit / Debit Card'),
        ('OTHER', 'Other / Digital Wallet'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('SUCCESS', 'Successful'),
        ('PENDING', 'Processing'),
        ('FAILED', 'Failed'),
    ]

    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='payments')
    method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='UPI')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference_id = models.CharField(max_length=100, blank=True, help_text="Transaction or UTR number")
    payer_name = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='SUCCESS')
    processed_by = models.CharField(max_length=100, default='Cashier')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_method_display()} - ₹{self.amount} for {self.bill.bill_number}"

class CashierShift(models.Model):
    SHIFT_STATUS_CHOICES = [
        ('OPEN', 'Active Shift'),
        ('CLOSED', 'Closed & Reconciled'),
    ]

    cashier_name = models.CharField(max_length=100, default='Cashier')
    cashier_user = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='shifts')
    shift_number = models.PositiveIntegerField(unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=SHIFT_STATUS_CHOICES, default='OPEN')
    opening_float = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('2000.00'), help_text="Starting cash in drawer")
    
    # Reconciled numbers on shift closing
    closing_cash_actual = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Counted drawer cash by cashier")
    closing_cash_expected = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    cash_variance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Positive = Excess, Negative = Shortage")
    
    # Financial snapshots
    total_cash_sales = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_upi_sales = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_card_sales = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_other_sales = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_tips = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_discounts = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_tax_collected = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    bills_count = models.PositiveIntegerField(default=0)
    
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-opened_at']

    def __str__(self):
        return f"Shift #{self.shift_number} ({self.cashier_name}) - {self.status}"

    @property
    def total_petty_cash(self):
        return sum(exp.amount for exp in self.expenses.all())

class PettyCashExpense(models.Model):
    shift = models.ForeignKey(CashierShift, on_delete=models.CASCADE, related_name='expenses')
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    reason = models.CharField(max_length=200, help_text="e.g. Emergency mint leaves, Ice bag, cleaning supplies")
    approved_by = models.CharField(max_length=100, default='Manager')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"₹{self.amount} - {self.reason} (Shift #{self.shift.shift_number})"
