from django.urls import path
from .views import (
    bill_preview_view,
    bill_generate_view,
    bill_record_payment_view,
    bill_send_whatsapp_view,
    request_bill_view,
    merge_bills_view,
)

urlpatterns = [
    path('session/<int:session_id>/preview/', bill_preview_view, name='bill_preview'),
    path('session/<int:session_id>/generate/', bill_generate_view, name='bill_generate'),
    path('session/<int:session_id>/request-bill/', request_bill_view, name='request_bill'),
    path('session/<int:session_id>/merge-bills/', merge_bills_view, name='merge_bills'),
    path('<int:bill_id>/payment/', bill_record_payment_view, name='bill_payment'),
    path('<int:bill_id>/send-whatsapp/', bill_send_whatsapp_view, name='bill_send_whatsapp'),
]
