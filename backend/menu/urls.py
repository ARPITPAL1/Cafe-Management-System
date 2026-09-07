from django.urls import path
from .views import (
    menu_full_catalog_view,
    category_list_create_view,
    menu_item_list_create_view,
    menu_item_detail_view,
    menu_item_toggle_stock_view,
)

urlpatterns = [
    path('', menu_full_catalog_view, name='menu_catalog'),
    path('categories/', category_list_create_view, name='category_list_create'),
    path('items/', menu_item_list_create_view, name='item_list_create'),
    path('items/<int:pk>/', menu_item_detail_view, name='item_detail'),
    path('items/<int:pk>/toggle-stock/', menu_item_toggle_stock_view, name='item_toggle_stock'),
]
