from django.urls import path
from .views import (
    menu_full_catalog_view,
    category_list_create_view,
    menu_item_list_create_view,
    menu_item_detail_view,
    menu_item_toggle_stock_view,
    ingredients_list_create_view,
    ingredient_detail_view,
    ingredient_restock_view,
    menu_item_recipe_view,
)

urlpatterns = [
    path('', menu_full_catalog_view, name='menu_catalog'),
    path('categories/', category_list_create_view, name='category_list_create'),
    path('items/', menu_item_list_create_view, name='item_list_create'),
    path('items/<int:pk>/', menu_item_detail_view, name='item_detail'),
    path('items/<int:pk>/toggle-stock/', menu_item_toggle_stock_view, name='item_toggle_stock'),
    path('items/<int:pk>/recipe/', menu_item_recipe_view, name='item_recipe'),
    
    # Raw Ingredients & Stock
    path('inventory/', ingredients_list_create_view, name='inventory_list_create'),
    path('inventory/<int:pk>/', ingredient_detail_view, name='inventory_detail'),
    path('inventory/<int:pk>/restock/', ingredient_restock_view, name='inventory_restock'),
]
