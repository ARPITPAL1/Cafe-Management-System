from django.urls import path
from .views import (
    customer_list_view,
    customer_detail_view,
    send_otp_view,
    verify_otp_view,
    feedback_view,
)

urlpatterns = [
    path('', customer_list_view, name='customer_list'),
    path('<int:pk>/', customer_detail_view, name='customer_detail'),
    path('send-otp/', send_otp_view, name='customer_send_otp'),
    path('verify-otp/', verify_otp_view, name='customer_verify_otp'),
    path('feedback/', feedback_view, name='customer_feedback'),
]
