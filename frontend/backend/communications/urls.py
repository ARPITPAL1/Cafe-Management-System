from django.urls import path
from .views import whatsapp_logs_view

urlpatterns = [
    path('whatsapp-logs/', whatsapp_logs_view, name='whatsapp_logs'),
]
