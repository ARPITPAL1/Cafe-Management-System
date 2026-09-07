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
