from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Category, MenuItem, MenuItemVariant, MenuAddon
from .serializers import CategorySerializer, MenuItemSerializer, MenuItemVariantSerializer, MenuAddonSerializer
from core.models import AuditLog

@api_view(['GET'])
def menu_full_catalog_view(request):
    """
    Returns categories with items for menu rendering.
    Supports query param: ?for_customer=true to only show active/available dishes.
    """
    for_customer = request.GET.get('for_customer', 'false').lower() == 'true'
    categories = Category.objects.filter(is_active=True).prefetch_related('items__variants', 'items__addons')
    
    cat_data = CategorySerializer(categories, many=True).data

    # Cafe-wide global addons
    global_addons = MenuAddon.objects.filter(item__isnull=True, is_available=True)
    global_addons_data = MenuAddonSerializer(global_addons, many=True).data

    return Response({
        'categories': cat_data,
        'global_addons': global_addons_data
    })

@api_view(['GET', 'POST'])
def category_list_create_view(request):
    if request.method == 'GET':
        categories = Category.objects.all()
        return Response(CategorySerializer(categories, many=True).data)

    if request.method == 'POST':
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            cat = serializer.save()
            AuditLog.objects.create(
                user_name=request.data.get('user_name', 'Manager'),
                role='MANAGER',
                action='Created Menu Category',
                entity_type='Category',
                entity_id=str(cat.id),
                details=f"Category '{cat.name}' created"
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'POST'])
def menu_item_list_create_view(request):
    if request.method == 'GET':
        items = MenuItem.objects.select_related('category').prefetch_related('variants', 'addons').all()
        return Response(MenuItemSerializer(items, many=True).data)

    if request.method == 'POST':
        serializer = MenuItemSerializer(data=request.data)
        if serializer.is_valid():
            item = serializer.save()
            AuditLog.objects.create(
                user_name=request.data.get('user_name', 'Manager'),
                role='MANAGER',
                action='Added Menu Item',
                entity_type='MenuItem',
                entity_id=str(item.id),
                details=f"Dish '{item.name}' added at ₹{item.price} (Food Cost: ₹{item.food_cost})"
            )
            return Response(MenuItemSerializer(item).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH', 'DELETE'])
def menu_item_detail_view(request, pk):
    try:
        item = MenuItem.objects.get(pk=pk)
    except MenuItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(MenuItemSerializer(item).data)

    if request.method == 'PATCH':
        serializer = MenuItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            AuditLog.objects.create(
                user_name=request.data.get('user_name', 'Manager'),
                role='MANAGER',
                action='Updated Menu Item',
                entity_type='MenuItem',
                entity_id=str(updated.id),
                details=f"Updated details for '{updated.name}'"
            )
            return Response(MenuItemSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        name = item.name
        item.delete()
        AuditLog.objects.create(
            user_name=request.data.get('user_name', 'Manager'),
            role='MANAGER',
            action='Deleted Menu Item',
            entity_type='MenuItem',
            entity_id=str(pk),
            details=f"Removed '{name}' from menu"
        )
        return Response({'message': f"Item '{name}' deleted successfully"})

@api_view(['POST'])
def menu_item_toggle_stock_view(request, pk):
    try:
        item = MenuItem.objects.get(pk=pk)
    except MenuItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    item.is_available = not item.is_available
    item.save(update_fields=['is_available', 'updated_at'])

    status_str = "AVAILABLE" if item.is_available else "OUT OF STOCK"
    AuditLog.objects.create(
        user_name=request.data.get('user_name', 'Kitchen'),
        role='KITCHEN',
        action=f"Changed Stock Status to {status_str}",
        entity_type='MenuItem',
        entity_id=str(item.id),
        details=f"Item '{item.name}' marked as {status_str}"
    )

    return Response({
        'id': item.id,
        'name': item.name,
        'is_available': item.is_available,
        'message': f"'{item.name}' marked as {status_str}"
    })


# ---------------------------------------------------------------------------
# RAW MATERIAL INVENTORY & BILL OF MATERIALS (BOM) RECIPES
# ---------------------------------------------------------------------------

from decimal import Decimal
from .models import Ingredient, RecipeItem, StockAdjustmentLog
from .serializers import IngredientSerializer, RecipeItemSerializer, StockAdjustmentLogSerializer

@api_view(['GET', 'POST'])
def ingredients_list_create_view(request):
    """
    Lists all raw material inventory ingredients or registers a new ingredient.
    """
    if request.method == 'GET':
        ingredients = Ingredient.objects.all()
        serializer = IngredientSerializer(ingredients, many=True)
        low_stock_count = sum(1 for i in ingredients if i.is_low_stock)
        out_of_stock_count = sum(1 for i in ingredients if i.is_out_of_stock)
        return Response({
            'ingredients': serializer.data,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count,
            'total_count': len(ingredients)
        })

    if request.method == 'POST':
        serializer = IngredientSerializer(data=request.data)
        if serializer.is_valid():
            ingredient = serializer.save()
            StockAdjustmentLog.objects.create(
                ingredient=ingredient,
                change_type='RESTOCK',
                quantity=ingredient.current_stock,
                stock_after=ingredient.current_stock,
                reference='Initial Stock',
                notes='Initial stock on creation',
                performed_by=request.data.get('user_name', 'Manager')
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
def ingredient_detail_view(request, pk):
    try:
        ingredient = Ingredient.objects.get(pk=pk)
    except Ingredient.DoesNotExist:
        return Response({'error': 'Ingredient not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        logs = ingredient.adjustments.all()[:20]
        return Response({
            'ingredient': IngredientSerializer(ingredient).data,
            'recent_logs': StockAdjustmentLogSerializer(logs, many=True).data
        })

    if request.method == 'PATCH':
        serializer = IngredientSerializer(ingredient, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(IngredientSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        ingredient.delete()
        return Response({'message': 'Ingredient deleted successfully'})


@api_view(['POST'])
def ingredient_restock_view(request, pk):
    """
    Inward stock purchase / restock.
    """
    try:
        ingredient = Ingredient.objects.get(pk=pk)
    except Ingredient.DoesNotExist:
        return Response({'error': 'Ingredient not found'}, status=status.HTTP_404_NOT_FOUND)

    added_quantity = Decimal(str(request.data.get('quantity', 0.00)))
    if added_quantity <= Decimal('0.00'):
        return Response({'error': 'Restock quantity must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

    supplier = request.data.get('supplier', ingredient.supplier)
    reference = request.data.get('reference', 'Purchase Inward')
    notes = request.data.get('notes', '')
    user_name = request.data.get('user_name', 'Manager')

    new_stock = ingredient.current_stock + added_quantity
    ingredient.current_stock = new_stock
    if supplier:
        ingredient.supplier = supplier
    ingredient.save()

    log = StockAdjustmentLog.objects.create(
        ingredient=ingredient,
        change_type='RESTOCK',
        quantity=added_quantity,
        stock_after=new_stock,
        reference=reference,
        notes=notes,
        performed_by=user_name
    )

    AuditLog.objects.create(
        user_name=user_name,
        role='MANAGER',
        action='Restocked Ingredient',
        entity_type='Ingredient',
        entity_id=str(ingredient.id),
        details=f"Added +{added_quantity} {ingredient.unit} to '{ingredient.name}'. New stock: {new_stock} {ingredient.unit}"
    )

    return Response({
        'message': f"Successfully added {added_quantity} {ingredient.unit} to {ingredient.name}! 📦",
        'ingredient': IngredientSerializer(ingredient).data
    })


@api_view(['GET', 'POST'])
def menu_item_recipe_view(request, pk):
    """
    Gets or binds raw material recipe ingredients (Bill of Materials) to a MenuItem.
    """
    try:
        item = MenuItem.objects.get(pk=pk)
    except MenuItem.DoesNotExist:
        return Response({'error': 'Menu Item not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        recipe_items = item.recipe_items.select_related('ingredient').all()
        return Response({
            'item_id': item.id,
            'item_name': item.name,
            'recipe_items': RecipeItemSerializer(recipe_items, many=True).data,
            'calculated_food_cost': sum(r.estimated_cost for r in recipe_items)
        })

    if request.method == 'POST':
        # items array: [{'ingredient_id': 1, 'quantity': 18.0}, ...]
        ingredients_payload = request.data.get('ingredients', [])
        item.recipe_items.all().delete()

        total_recipe_cost = Decimal('0.00')
        for rec in ingredients_payload:
            ing_id = rec.get('ingredient_id')
            qty = Decimal(str(rec.get('quantity', 0.00)))
            if ing_id and qty > 0:
                try:
                    ingredient = Ingredient.objects.get(pk=ing_id)
                    RecipeItem.objects.create(
                        menu_item=item,
                        ingredient=ingredient,
                        quantity=qty
                    )
                    total_recipe_cost += qty * ingredient.cost_per_unit
                except Ingredient.DoesNotExist:
                    pass

        # Auto-update the dish food_cost based on actual recipe
        if total_recipe_cost > Decimal('0.00'):
            item.food_cost = round(total_recipe_cost, 2)
            item.save(update_fields=['food_cost', 'updated_at'])

        recipe_items = item.recipe_items.select_related('ingredient').all()
        return Response({
            'message': f"Recipe updated for '{item.name}'! Food cost recalibrated to ₹{item.food_cost} 🥗",
            'item': MenuItemSerializer(item).data,
            'recipe_items': RecipeItemSerializer(recipe_items, many=True).data
        })

