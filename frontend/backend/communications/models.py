from django.db import models

class WhatsAppMessage(models.Model):
    MESSAGE_TYPES = [
        ('INVOICE', 'Invoice PDF Dispatch'),
        ('FEEDBACK_REQUEST', 'Feedback Survey Request'),
        ('ORDER_CONFIRMATION', 'Order Status Alert'),
    ]

    STATUS_CHOICES = [
        ('QUEUED', 'Queued'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered to WhatsApp'),
        ('READ', 'Read by Customer'),
        ('FAILED', 'Failed Delivery'),
    ]

    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='whatsapp_messages')
    phone = models.CharField(max_length=20)
    message_type = models.CharField(max_length=30, choices=MESSAGE_TYPES)
    template_name = models.CharField(max_length=100)
    payload_json = models.JSONField(default=dict)
    preview_text = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DELIVERED')
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.message_type} -> {self.phone} ({self.status})"
