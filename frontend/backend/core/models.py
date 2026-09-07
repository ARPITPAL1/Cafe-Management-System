from django.db import models
from django.contrib.auth.models import User

class CafeProfile(models.Model):
    name = models.CharField(max_length=150, default="The Roasted Bean & Co.")
    tagline = models.CharField(max_length=255, default="Artisan Coffee & Gourmet Bistro")
    logo_url = models.CharField(max_length=500, blank=True, default="")
    address = models.TextField(default="42 Heritage Boulevard, Downtown, Mumbai 400001")
    phone = models.CharField(max_length=20, default="+91 98201 23456")
    sender_mobile = models.CharField(max_length=20, default="+91 98201 55667", help_text="Designated mobile number from which WhatsApp/SMS receipts and alerts are sent")
    email = models.EmailField(default="contact@roastedbean.cafe")
    gstin = models.CharField(max_length=20, default="27AABCU9603R1ZN")
    fssai_license = models.CharField(max_length=30, default="11521018000452", blank=True, help_text="FSSAI Food Safety License Number")
    currency = models.CharField(max_length=10, default="₹")
    tax_rate_cgst = models.DecimalField(max_digits=5, decimal_places=2, default=2.5) # 2.5%
    tax_rate_sgst = models.DecimalField(max_digits=5, decimal_places=2, default=2.5) # 2.5%
    service_charge_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    receipt_header = models.CharField(max_length=255, default="Welcome to Musafirr Cafe & Bistro!", blank=True)
    receipt_footer = models.CharField(max_length=255, default="Thank you for dining with us! Please visit again.", blank=True)
    auto_accept_orders = models.BooleanField(default=True)
    whatsapp_enabled = models.BooleanField(default=True)
    advance_booking_enabled = models.BooleanField(default=True)
    waiter_call_alerts_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class StaffProfile(models.Model):
    ROLE_CHOICES = [
        ('OWNER', 'Owner / Admin'),
        ('MANAGER', 'Cafe Manager'),
        ('CASHIER', 'Cashier / Billing'),
        ('KITCHEN', 'Kitchen Staff'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CASHIER')
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.get_role_display()})"

class AuditLog(models.Model):
    user_name = models.CharField(max_length=100, default="System")
    role = models.CharField(max_length=50, default="System")
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=100) # 'Order', 'Table', 'Bill', 'Menu'
    entity_id = models.CharField(max_length=100, blank=True)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.created_at.strftime('%H:%M:%S')}] {self.user_name} ({self.role}): {self.action}"
