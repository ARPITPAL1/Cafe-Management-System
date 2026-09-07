from rest_framework import serializers
from django.contrib.auth.models import User
from .models import CafeProfile, StaffProfile, AuditLog

class CafeProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CafeProfile
        fields = '__all__'

class StaffProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = StaffProfile
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'role_display', 'phone', 'is_active']

class AuditLogSerializer(serializers.ModelSerializer):
    time_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = '__all__'

    def get_time_display(self, obj):
        return obj.created_at.strftime('%d %b %Y, %I:%M %p')
