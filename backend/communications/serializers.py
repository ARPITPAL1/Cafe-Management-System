from rest_framework import serializers
from .models import WhatsAppMessage

class WhatsAppMessageSerializer(serializers.ModelSerializer):
    time_display = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppMessage
        fields = '__all__'

    def get_time_display(self, obj):
        return obj.sent_at.strftime('%d %b, %I:%M %p')
