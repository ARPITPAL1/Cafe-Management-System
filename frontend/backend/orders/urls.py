from django.urls import path
from .views import (
    order_list_create_view,
    order_detail_view,
    order_update_status_view,
    order_add_items_view,
    order_cancel_item_view,
    kitchen_display_view,
)

urlpatterns = [
    path('', order_list_create_view, name='order_list_create'),
    path('<int:pk>/', order_detail_view, name='order_detail'),
    path('<int:pk>/status/', order_update_status_view, name='order_update_status'),
    path('<int:pk>/add-items/', order_add_items_view, name='order_add_items'),
    path('items/<int:item_id>/cancel/', order_cancel_item_view, name='order_cancel_item'),
    path('kitchen/', kitchen_display_view, name='kitchen_display'),
]
