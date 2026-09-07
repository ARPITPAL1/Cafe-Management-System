from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, F, Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from orders.models import Order, OrderItem
from billing.models import Bill, Payment
from tables.models import Table, TableSession
from menu.models import MenuItem

@api_view(['GET'])
def dashboard_analytics_view(request):
    today = timezone.now().date()
    
    # Orders today
    today_orders = Order.objects.filter(created_at__date=today)
    orders_count = today_orders.count()
    completed_orders = today_orders.filter(status='COMPLETED').count()
    preparing_orders = today_orders.filter(status__in=['PLACED', 'CONFIRMED', 'PREPARING']).count()
    ready_orders = today_orders.filter(status='READY').count()
    cancelled_orders = today_orders.filter(status='CANCELLED').count()

    # Sales today from settled bills or active orders
    today_bills = Bill.objects.filter(created_at__date=today)
    today_sales = sum(float(b.grand_total) for b in today_bills.filter(status__in=['PAID', 'PARTIALLY_PAID']))
    if today_sales == 0:
        # Fallback to subtotal of today's orders if bills haven't been generated yet in demo
        today_sales = sum(float(o.subtotal) for o in today_orders.exclude(status='CANCELLED'))

    # Average Order Value
    valid_orders_count = today_orders.exclude(status='CANCELLED').count()
    aov = round(today_sales / valid_orders_count, 2) if valid_orders_count > 0 else 0.0

    # Food cost and gross margin
    today_items = OrderItem.objects.filter(order__created_at__date=today).exclude(status='CANCELLED')
    total_food_cost = sum(float(i.total_cost) for i in today_items)
    gross_profit = round(today_sales - total_food_cost, 2)
    margin_pct = round((gross_profit / today_sales) * 100, 1) if today_sales > 0 else 0.0

    # Tables overview
    total_tables = Table.objects.filter(is_active=True).count()
    occupied_tables = Table.objects.filter(is_active=True, status__in=['OCCUPIED', 'ORDERING', 'PREPARING', 'SERVED', 'BILL_REQUESTED']).count()
    available_tables = total_tables - occupied_tables

    # Delayed orders > 15 minutes
    threshold_15m = timezone.now() - timezone.timedelta(minutes=15)
    delayed_orders_count = Order.objects.filter(
        created_at__lte=threshold_15m,
        status__in=['PLACED', 'CONFIRMED', 'PREPARING', 'READY']
    ).count()

    # Hourly distribution (9 AM to 10 PM)
    hourly_data = []
    for hour in range(9, 23):
        hour_orders = today_orders.filter(created_at__hour=hour).exclude(status='CANCELLED')
        hour_sales = sum(float(o.subtotal) for o in hour_orders)
        hour_label = f"{hour % 12 or 12} {'AM' if hour < 12 else 'PM'}"
        hourly_data.append({
            'hour': hour_label,
            'orders': hour_orders.count(),
            'sales': round(hour_sales, 2)
        })

    # Top selling dishes
    top_items_qs = OrderItem.objects.filter(order__created_at__date=today).exclude(status='CANCELLED') \
        .values('menu_item__id', 'menu_item__name', 'menu_item__price', 'menu_item__food_cost') \
        .annotate(total_qty=Sum('quantity'), total_revenue=Sum(F('quantity') * F('unit_price'))) \
        .order_by('-total_qty')[:5]

    top_dishes = []
    for item in top_items_qs:
        price = float(item['menu_item__price'])
        cost = float(item['menu_item__food_cost'])
        qty = item['total_qty']
        revenue = float(item['total_revenue'] or (qty * price))
        margin = revenue - (qty * cost)
        top_dishes.append({
            'id': item['menu_item__id'],
            'name': item['menu_item__name'],
            'quantity': qty,
            'revenue': round(revenue, 2),
            'margin': round(margin, 2)
        })

    return Response({
        'kpis': {
            'today_sales': round(today_sales, 2),
            'today_revenue': round(today_sales, 2),  # alias for frontend compatibility
            'today_orders': orders_count,
            'occupied_tables': occupied_tables,
            'available_tables': available_tables,
            'total_tables': total_tables,
            'avg_order_value': aov,
            'gross_profit': gross_profit,
            'margin_percentage': margin_pct,
            'pending_orders': preparing_orders,
            'ready_orders': ready_orders,
            'delayed_orders': delayed_orders_count,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
        },
        'hourly_sales': hourly_data,
        'top_dishes': top_dishes,
    })

@api_view(['GET'])
def margin_analysis_view(request):
    """
    Returns dish-level margin intelligence across all menu items:
    Selling Price, Food Cost, Packaging Cost, Gross Margin (₹), Margin (%)
    """
    items = MenuItem.objects.select_related('category').all()
    results = []

    # Map quantity sold
    sales_map = {}
    for entry in OrderItem.objects.exclude(status='CANCELLED').values('menu_item_id').annotate(qty_sold=Sum('quantity')):
        sales_map[entry['menu_item_id']] = entry['qty_sold']

    for item in items:
        price = float(item.price)
        cost = float(item.food_cost)
        pkg = float(item.packaging_cost)
        total_cost = cost + pkg + float(item.other_cost)
        margin = price - total_cost
        margin_pct = round((margin / price) * 100, 1) if price > 0 else 0.0
        qty_sold = sales_map.get(item.id, 0)
        total_revenue = round(qty_sold * price, 2)
        total_margin = round(qty_sold * margin, 2)

        results.append({
            'id': item.id,
            'name': item.name,
            'category': item.category.name,
            'price': price,
            'food_cost': cost,
            'packaging_cost': pkg,
            'total_cost': round(total_cost, 2),
            'gross_margin': round(margin, 2),
            'margin_percentage': margin_pct,
            'quantity_sold': qty_sold,
            'total_revenue': total_revenue,
            'total_profit': total_margin,
            'is_veg': item.is_veg,
            'is_available': item.is_available
        })

    # Sort parameter: revenue, margin, qty, margin_pct
    sort_by = request.GET.get('sort_by', 'quantity_sold')
    reverse = True
    if sort_by in ['margin_percentage', 'gross_margin', 'total_revenue', 'quantity_sold', 'total_profit']:
        results.sort(key=lambda x: x[sort_by], reverse=reverse)

    return Response(results)

@api_view(['GET'])
def daily_sales_report_view(request):
    """
    Returns daily breakdown of sales, taxes, discounts, and payment methods.
    """
    bills = Bill.objects.all().prefetch_related('payments')
    date_map = {}

    for bill in bills:
        d = bill.created_at.date().strftime('%Y-%m-%d')
        if d not in date_map:
            date_map[d] = {
                'date': d,
                'gross_sales': 0.0,
                'discount_total': 0.0,
                'tax_total': 0.0,
                'net_sales': 0.0,
                'orders_count': 0,
                'cash_sales': 0.0,
                'upi_sales': 0.0,
                'card_sales': 0.0,
            }
        
        date_map[d]['gross_sales'] += float(bill.subtotal)
        date_map[d]['discount_total'] += float(bill.discount_amount)
        date_map[d]['tax_total'] += float(bill.cgst_amount + bill.sgst_amount)
        date_map[d]['net_sales'] += float(bill.grand_total)
        date_map[d]['orders_count'] += 1

        for p in bill.payments.filter(status='SUCCESS'):
            if p.method == 'CASH':
                date_map[d]['cash_sales'] += float(p.amount)
            elif p.method == 'UPI':
                date_map[d]['upi_sales'] += float(p.amount)
            elif p.method == 'CARD':
                date_map[d]['card_sales'] += float(p.amount)

    report_list = sorted(list(date_map.values()), key=lambda x: x['date'], reverse=True)
    return Response(report_list)
