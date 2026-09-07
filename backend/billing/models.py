from django.db import models
from decimal import Decimal

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
    cgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    sgst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    service_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
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
