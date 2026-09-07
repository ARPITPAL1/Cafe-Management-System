from rest_framework import serializers
from .models import Customer, CustomerOTP, Feedback

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class FeedbackSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    created_display = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = '__all__'

    def get_created_display(self, obj):
        return obj.created_at.strftime('%d %b %Y, %I:%M %p')
