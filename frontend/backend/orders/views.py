import random
import string
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Order, OrderItem, OrderStatusHistory
from .serializers import OrderSerializer, OrderItemSerializer
from tables.models import Table, TableSession
from menu.models import MenuItem, StockAdjustmentLog
from customers.models import Customer
from core.models import AuditLog

def get_next_order_number():
    last_order = Order.objects.order_by('-order_number').first()
    return (last_order.order_number + 1) if last_order else 1001

@api_view(['GET', 'POST'])
def order_list_create_view(request):
    if request.method == 'GET':
        qs = Order.objects.select_related('session__table', 'customer').prefetch_related('items__menu_item', 'status_history').all()
        
        status_filter = request.GET.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        active_only = request.GET.get('active_only', 'false').lower() == 'true'
        if active_only:
            qs = qs.exclude(status__in=['COMPLETED', 'CANCELLED'])

        table_id = request.GET.get('table_id')
        if table_id:
            qs = qs.filter(session__table_id=table_id)

        session_id = request.GET.get('session_id')
        if session_id:
            qs = qs.filter(session_id=session_id)

        serializer = OrderSerializer(qs[:100], many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        # Create Order (from Customer QR or Staff Waiter)
        data = request.data
        table_token = data.get('table_token')
        table_id = data.get('table_id')
        session_id = data.get('session_id')
        customer_id = data.get('customer_id')
        customer_phone = data.get('customer_phone')
        customer_name = data.get('customer_name', 'Guest')
        order_source = data.get('order_source', 'QR')
        items_data = data.get('items', [])
        notes = data.get('notes', '')

        if not items_data:
            return Response({'error': 'Order must contain at least one item'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve Table & Session
        table = None
        if session_id:
            try:
                session = TableSession.objects.get(pk=session_id)
                table = session.table
            except TableSession.DoesNotExist:
                return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        elif table_token:
            table = Table.objects.filter(public_token=table_token, is_active=True).first()
            if not table:
                return Response({'error': 'Invalid table token'}, status=status.HTTP_404_NOT_FOUND)
            session = table.get_current_session()
        elif table_id:
            table = Table.objects.filter(pk=table_id, is_active=True).first()
            if not table:
                return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)
            session = table.get_current_session()
        else:
            return Response({'error': 'Table or Session identifier is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if session has a final bill issued and settled
        if session and (session.status in ['PAID', 'CLOSED'] or (getattr(session, 'is_bill_issued', False) and session.status in ['PAID', 'CLOSED'])):
            return Response({
                'error': 'Final bill has been settled for this session. Your dining session has concluded. Please scan the QR code again and register to start a new session.'
            }, status=status.HTTP_403_FORBIDDEN)

        # If customer adds items while bill was requested, smoothly re-activate session to ACTIVE
        if session and session.status == 'BILL_REQUESTED':
            session.status = 'ACTIVE'
            session.is_bill_issued = False
            session.save(update_fields=['status', 'is_bill_issued'])

        # Open session if none active
        if not session or session.status == 'CLOSED':
            code = f"{table.id}-{''.join(random.choices(string.digits, k=4))}"
            session = TableSession.objects.create(
                table=table,
                session_code=code,
                guest_count=data.get('guest_count', 2),
                status='ACTIVE'
            )

        # Resolve Customer
        customer = None
        if customer_id:
            customer = Customer.objects.filter(pk=customer_id).first()
        elif customer_phone:
            customer, _ = Customer.objects.get_or_create(
                phone=customer_phone,
                defaults={'name': customer_name, 'whatsapp': customer_phone}
            )

        if customer and not session.customer:
            session.customer = customer
            session.save(update_fields=['customer'])

        with transaction.atomic():
            order_num = get_next_order_number()
            order = Order.objects.create(
                session=session,
                customer=customer,
                order_number=order_num,
                order_source=order_source,
                status='PLACED',
                notes=notes
            )

            for item_info in items_data:
                menu_item_id = item_info.get('menu_item_id') or item_info.get('id')
                try:
                    m_item = MenuItem.objects.get(pk=menu_item_id)
                except MenuItem.DoesNotExist:
                    continue

                qty = int(item_info.get('quantity', 1))
                price = float(item_info.get('unit_price', m_item.price))
                cost = float(m_item.food_cost)
                addons = item_info.get('addons', [])
                instructions = item_info.get('special_instructions', '')
                variant = item_info.get('variant_name', '')

                OrderItem.objects.create(
                    order=order,
                    menu_item=m_item,
                    variant_name=variant,
                    quantity=qty,
                    unit_price=price,
                    unit_cost=cost,
                    addons_json=addons,
                    special_instructions=instructions,
                    status='PENDING'
                )

                # Automatic inventory deduction via recipe Bill of Materials (BOM)
                for recipe in m_item.recipe_items.select_related('ingredient').all():
                    ing = recipe.ingredient
                    used_qty = recipe.quantity * Decimal(str(qty))
                    ing.current_stock = max(Decimal('0.00'), ing.current_stock - used_qty)
                    ing.save(update_fields=['current_stock', 'updated_at'])
                    StockAdjustmentLog.objects.create(
                        ingredient=ing,
                        change_type='ORDER_CONSUMED',
                        quantity=-used_qty,
                        stock_after=ing.current_stock,
                        reference=f"Order #{order.order_number}",
                        notes=f"Auto-deducted {used_qty} {ing.unit} for {qty}x {m_item.name}",
                        performed_by='Kitchen Engine'
                    )

            # Update table status
            table.status = 'PREPARING'
            table.save(update_fields=['status', 'updated_at'])

            # Record Status History
            OrderStatusHistory.objects.create(
                order=order,
                from_status='NONE',
                to_status='PLACED',
                changed_by=f"{'Customer ' + customer.name if customer else 'Staff'}",
                notes=f"Order #{order.order_number} placed with {len(items_data)} dishes"
            )

            # Audit log
            AuditLog.objects.create(
                user_name=customer.name if customer else 'Staff Waiter',
                role='CUSTOMER' if order_source == 'QR' else 'WAITER',
                action='Placed Order',
                entity_type='Order',
                entity_id=str(order.order_number),
                details=f"Table {table.number}: Order #{order.order_number} (₹{order.subtotal})"
            )

            # Customer visit/order stats update
            if customer:
                customer.total_orders += 1
                customer.total_spend += order.subtotal
                customer.save(update_fields=['total_orders', 'total_spend', 'last_visit'])

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
def order_detail_view(request, pk):
    try:
        order = Order.objects.select_related('session__table', 'customer').prefetch_related('items__menu_item', 'status_history').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response(OrderSerializer(order).data)

@api_view(['POST'])
def order_update_status_view(request, pk):
    try:
        order = Order.objects.select_related('session__table').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    changed_by = request.data.get('changed_by', 'Kitchen Staff')
    notes = request.data.get('notes', '')

    if new_status not in dict(Order.STATUS_CHOICES):
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    old_status = order.status
    order.status = new_status
    order.save(update_fields=['status', 'updated_at'])

    # Update item statuses accordingly
    if new_status == 'PREPARING':
        order.items.filter(status='PENDING').update(status='PREPARING')
        order.session.table.status = 'PREPARING'
        order.session.table.save(update_fields=['status'])
    elif new_status == 'READY':
        order.items.filter(status__in=['PENDING', 'PREPARING']).update(status='READY')
    elif new_status == 'SERVED':
        order.items.filter(status__in=['PENDING', 'PREPARING', 'READY']).update(status='SERVED')
        order.session.table.status = 'SERVED'
        order.session.table.save(update_fields=['status'])

    # Record history
    OrderStatusHistory.objects.create(
        order=order,
        from_status=old_status,
        to_status=new_status,
        changed_by=changed_by,
        notes=notes or f"Transitioned from {old_status} to {new_status}"
    )

    AuditLog.objects.create(
        user_name=changed_by,
        role='KITCHEN' if 'Kitchen' in changed_by else 'STAFF',
        action=f"Order Status: {new_status}",
        entity_type='Order',
        entity_id=str(order.order_number),
        details=f"Order #{order.order_number} ({order.session.table.number}) moved to {new_status}"
    )

    return Response(OrderSerializer(order).data)

@api_view(['POST'])
def order_add_items_view(request, pk):
    """
    Append dishes to an existing active order (e.g. customer wants dessert/drink later).
    """
    try:
        order = Order.objects.select_related('session__table').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

    if order.session.status in ['PAID', 'CLOSED'] or (getattr(order.session, 'is_bill_issued', False) and order.session.status in ['PAID', 'CLOSED']):
        return Response({'error': 'Final bill has already been settled for this session. Cannot add items.'}, status=status.HTTP_403_FORBIDDEN)

    if order.session.status == 'BILL_REQUESTED':
        order.session.status = 'ACTIVE'
        order.session.is_bill_issued = False
        order.session.save(update_fields=['status', 'is_bill_issued'])

    added_by = request.data.get('added_by', 'Staff')
    items_data = request.data.get('items', [])
    if not items_data:
        return Response({'error': 'No items provided'}, status=status.HTTP_400_BAD_REQUEST)

    created_items = []
    for item_info in items_data:
        menu_item_id = item_info.get('menu_item_id') or item_info.get('id')
        try:
            m_item = MenuItem.objects.get(pk=menu_item_id)
        except MenuItem.DoesNotExist:
            continue

        qty = int(item_info.get('quantity', 1))
        price = float(item_info.get('unit_price', m_item.price))
        cost = float(m_item.food_cost)
        addons = item_info.get('addons', [])
        instructions = item_info.get('special_instructions', '')
        variant = item_info.get('variant_name', '')

        item = OrderItem.objects.create(
            order=order,
            menu_item=m_item,
            variant_name=variant,
            quantity=qty,
            unit_price=price,
            unit_cost=cost,
            addons_json=addons,
            special_instructions=instructions,
            status='PENDING'
        )
        created_items.append(f"{qty}x {m_item.name}")

        # Automatic inventory deduction via recipe Bill of Materials (BOM)
        for recipe in m_item.recipe_items.select_related('ingredient').all():
            ing = recipe.ingredient
            used_qty = recipe.quantity * Decimal(str(qty))
            ing.current_stock = max(Decimal('0.00'), ing.current_stock - used_qty)
            ing.save(update_fields=['current_stock', 'updated_at'])
            StockAdjustmentLog.objects.create(
                ingredient=ing,
                change_type='ORDER_CONSUMED',
                quantity=-used_qty,
                stock_after=ing.current_stock,
                reference=f"Order #{order.order_number}",
                notes=f"Auto-deducted {used_qty} {ing.unit} for added {qty}x {m_item.name}",
                performed_by='Kitchen Engine'
            )

    order.session.table.status = 'PREPARING'
    order.session.table.save(update_fields=['status'])

    summary_str = ", ".join(created_items)
    OrderStatusHistory.objects.create(
        order=order,
        from_status=order.status,
        to_status=order.status,
        changed_by=added_by,
        notes=f"Added items: {summary_str}"
    )

    AuditLog.objects.create(
        user_name=added_by,
        role='WAITER',
        action='Added Items to Order',
        entity_type='Order',
        entity_id=str(order.order_number),
        details=f"Order #{order.order_number}: Added {summary_str}"
    )

    return Response({
        'message': f"Added {len(created_items)} items to Order #{order.order_number}",
        'order': OrderSerializer(order).data
    })

@api_view(['POST'])
def order_cancel_item_view(request, item_id):
    try:
        item = OrderItem.objects.select_related('order__session__table').get(pk=item_id)
    except OrderItem.DoesNotExist:
        return Response({'error': 'Order item not found'}, status=status.HTTP_404_NOT_FOUND)

    reason = request.data.get('reason', 'Customer requested cancellation')
    cancelled_by = request.data.get('cancelled_by', 'Cashier')

    item.status = 'CANCELLED'
    item.cancelled_reason = reason
    item.save(update_fields=['status', 'cancelled_reason'])

    AuditLog.objects.create(
        user_name=cancelled_by,
        role='CASHIER',
        action='Cancelled Order Item',
        entity_type='OrderItem',
        entity_id=str(item.id),
        details=f"Cancelled {item.quantity}x {item.menu_item.name} from #{item.order.order_number}. Reason: {reason}"
    )

    return Response({
        'message': f"Cancelled {item.menu_item.name}",
        'item': OrderItemSerializer(item).data
    })

@api_view(['GET'])
def kitchen_display_view(request):
    """
    Returns active orders for the Kitchen Display System (KDS):
    Statuses: PLACED, CONFIRMED, PREPARING, READY
    """
    orders = Order.objects.filter(
        status__in=['PLACED', 'CONFIRMED', 'PREPARING', 'READY']
    ).select_related('session__table', 'customer').prefetch_related('items__menu_item').order_by('created_at')

    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def delta_sync_view(request):
    """
    Sub-second delta synchronization endpoint for KDS, Tables, and Live Orders.
    Returns changed orders, table statuses, and waiter calls since 'since' timestamp.
    """
    since_str = request.GET.get('since')
    now = timezone.now()

    orders_qs = Order.objects.select_related('session__table', 'customer').prefetch_related('items__menu_item')
    tables_qs = Table.objects.filter(is_active=True)

    if since_str:
        try:
            from datetime import datetime
            # Parse ISO or standard timestamp
            clean_str = since_str.replace('Z', '+00:00')
            since_dt = datetime.fromisoformat(clean_str)
            orders_qs = orders_qs.filter(updated_at__gte=since_dt)
            tables_qs = tables_qs.filter(updated_at__gte=since_dt)
        except Exception:
            pass

    return Response({
        'server_time': now.isoformat(),
        'updated_orders': OrderSerializer(orders_qs[:50], many=True).data,
        'waiter_calls': [
            {'table_id': t.id, 'table_number': t.number, 'called_at': t.waiter_called_at}
            for t in Table.objects.filter(waiter_called=True)
        ],
        'pending_kds_count': Order.objects.filter(status__in=['PLACED', 'CONFIRMED', 'PREPARING']).count(),
        'active_tables_count': Table.objects.filter(status__in=['OCCUPIED', 'ORDERING', 'PREPARING', 'SERVED', 'BILL_REQUESTED']).count()
    })

