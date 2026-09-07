from django.db import models
from django.utils import timezone
from datetime import timedelta

class Customer(models.Model):
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    first_visit = models.DateTimeField(auto_now_add=True)
    last_visit = models.DateTimeField(auto_now=True)
    total_orders = models.PositiveIntegerField(default=0)
    total_spend = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-last_visit']

    def __str__(self):
        return f"{self.name} ({self.phone}) - {self.total_orders} orders"

class CustomerOTP(models.Model):
    phone = models.CharField(max_length=20, db_index=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        # 5 minutes expiry
        return (not self.is_verified) and (timezone.now() - self.created_at < timedelta(minutes=5))

    def __str__(self):
        return f"OTP {self.otp_code} for {self.phone} (Verified: {self.is_verified})"

class Feedback(models.Model):
    session = models.ForeignKey('tables.TableSession', on_delete=models.CASCADE, related_name='feedbacks', null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='feedbacks')
    rating_overall = models.PositiveSmallIntegerField(default=5) # 1 to 5
    rating_food = models.PositiveSmallIntegerField(default=5)
    rating_service = models.PositiveSmallIntegerField(default=5)
    rating_ambience = models.PositiveSmallIntegerField(default=5)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback {self.rating_overall}★ by {self.customer.name}"
