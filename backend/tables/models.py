import secrets
from django.db import models

def generate_token():
    return secrets.token_urlsafe(8)[:10]

class Table(models.Model):
    SHAPE_CHOICES = [
        ('SQUARE', 'Square (4-Seats)'),
        ('ROUND', 'Round (2-Seats)'),
        ('RECTANGLE', 'Rectangle (6+ Seats)'),
    ]

    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('OCCUPIED', 'Occupied'),
        ('ORDERING', 'Customer Ordering'),
        ('PREPARING', 'Food Preparing'),
        ('SERVED', 'Food Served'),
        ('BILL_REQUESTED', 'Bill Requested'),
        ('CLEANING', 'Cleaning'),
    ]

    number = models.CharField(max_length=20, unique=True, help_text="e.g. Table 01, T-12")
    capacity = models.PositiveIntegerField(default=4)
    shape = models.CharField(max_length=20, choices=SHAPE_CHOICES, default='SQUARE')
    floor_section = models.CharField(max_length=50, default='Indoor Main Floor')
    public_token = models.CharField(max_length=32, unique=True, default=generate_token)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    waiter_called = models.BooleanField(default=False)
    waiter_called_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['number']

    def __str__(self):
        return f"{self.number} ({self.get_shape_display()}, {self.capacity} seats)"

    def regenerate_token(self):
        self.public_token = generate_token()
        self.save(update_fields=['public_token'])
        return self.public_token

    def get_current_session(self):
        return self.sessions.filter(status__in=['ACTIVE', 'BILL_REQUESTED', 'PAID']).order_by('-opened_at').first()

class TableSession(models.Model):
    SESSION_STATUS_CHOICES = [
        ('ACTIVE', 'Active Session'),
        ('BILL_REQUESTED', 'Bill Requested'),
        ('PAID', 'Paid'),
        ('CLOSED', 'Session Closed'),
    ]

    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='sessions')
    session_code = models.CharField(max_length=32, unique=True)
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='table_sessions')
    guest_count = models.PositiveIntegerField(default=2)
    status = models.CharField(max_length=20, choices=SESSION_STATUS_CHOICES, default='ACTIVE')
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_bill_issued = models.BooleanField(default=False)

    class Meta:
        ordering = ['-opened_at']

    def __str__(self):
        return f"Session #{self.session_code} on {self.table.number} ({self.status})"

import random
import string

def generate_booking_code():
    suffix = ''.join(random.choices('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', k=4))
    return f"VB-{suffix}"

class TableReservation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Confirmation'),
        ('CONFIRMED', 'Confirmed'),
        ('SEATED', 'Seated / Arrived'),
        ('CANCELLED', 'Cancelled'),
    ]

    booking_code = models.CharField(max_length=16, unique=True, blank=True, null=True)
    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    customer_name = models.CharField(max_length=120)
    customer_phone = models.CharField(max_length=20)
    customer_email = models.EmailField(blank=True, default='')
    guest_count = models.PositiveIntegerField(default=2)
    reservation_date = models.DateField()
    reservation_time = models.CharField(max_length=20, help_text="e.g. 19:30 or 07:30 PM")
    duration_minutes = models.PositiveIntegerField(default=120, help_text="Duration in minutes (e.g. 60, 90, 120, 180)")
    notes = models.TextField(blank=True, help_text="Special requests, e.g. celebration, window seat")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    is_alert_dismissed = models.BooleanField(default=False)
    client_reminder_sent = models.BooleanField(default=False)
    manager_15m_alert_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reservation_date', 'reservation_time', '-created_at']

    def save(self, *args, **kwargs):
        if not self.booking_code:
            code = generate_booking_code()
            while TableReservation.objects.filter(booking_code=code).exists():
                code = generate_booking_code()
            self.booking_code = code
        super().save(*args, **kwargs)

    def __str__(self):
        table_str = self.table.number if self.table else 'Any Table'
        return f"Booking #{self.booking_code} - {self.customer_name} ({table_str} on {self.reservation_date} at {self.reservation_time})"

