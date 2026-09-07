from django.urls import path
from .views import (
    bill_preview_view,
    bill_generate_view,
    bill_record_payment_view,
    bill_send_whatsapp_view,
    request_bill_view,
    merge_bills_view,
    current_shift_view,
    open_shift_view,
    record_petty_cash_view,
    close_shift_view,
    z_report_view,
    list_shifts_view,
    coupons_view,
)

urlpatterns = [
    path('session/<int:session_id>/preview/', bill_preview_view, name='bill_preview'),
    path('session/<int:session_id>/generate/', bill_generate_view, name='bill_generate'),
    path('session/<int:session_id>/request-bill/', request_bill_view, name='request_bill'),
    path('session/<int:session_id>/merge-bills/', merge_bills_view, name='merge_bills'),
    path('<int:bill_id>/payment/', bill_record_payment_view, name='bill_payment'),
    path('<int:bill_id>/send-whatsapp/', bill_send_whatsapp_view, name='bill_send_whatsapp'),
    
    # Shifts & Z-Reports
    path('shifts/current/', current_shift_view, name='current_shift'),
    path('shifts/open/', open_shift_view, name='open_shift'),
    path('shifts/petty-cash/', record_petty_cash_view, name='record_petty_cash'),
    path('shifts/close/', close_shift_view, name='close_shift'),
    path('shifts/<int:shift_id>/z-report/', z_report_view, name='z_report'),
    path('shifts/', list_shifts_view, name='list_shifts'),

    # Coupons
    path('coupons/', coupons_view, name='coupons'),
]
