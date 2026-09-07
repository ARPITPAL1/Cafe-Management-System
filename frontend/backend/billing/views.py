from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Bill, Payment, Coupon, CashierShift, PettyCashExpense
from .serializers import (
    BillSerializer,
    PaymentSerializer,
    CouponSerializer,
    CashierShiftSerializer,
    PettyCashExpenseSerializer
)
from tables.models import TableSession
from core.models import CafeProfile, AuditLog
from communications.models import WhatsAppMessage

@api_view(['GET'])
def bill_preview_view(request, session_id):
    try:
        session = TableSession.objects.select_related('table', 'customer').get(pk=session_id)
    except TableSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    cafe = CafeProfile.objects.first() or CafeProfile.objects.create()

    # Calculate subtotal across all uncancelled orders and group by guest
    orders = session.orders.exclude(status='CANCELLED').prefetch_related('items__menu_item')
    items_list = []
    subtotal = Decimal('0.00')
    guests_breakdown = {}

    for order in orders:
        c_name = (order.customer.name if order.customer else '') or (order.notes.replace('Ordered by ', '') if 'Ordered by ' in (order.notes or '') else 'Guest 1')
        if not c_name:
            c_name = 'Table Diner'

        if c_name not in guests_breakdown:
            guests_breakdown[c_name] = {
                'guest_name': c_name,
                'items': [],
                'subtotal': Decimal('0.00'),
                'order_numbers': []
            }
        guests_breakdown[c_name]['order_numbers'].append(order.order_number)

        for item in order.items.exclude(status='CANCELLED'):
            item_total = Decimal(str(item.total_price))
            subtotal += item_total
            items_list.append({
                'id': item.id,
                'order_number': order.order_number,
                'guest_name': c_name,
                'name': item.menu_item.name,
                'variant': item.variant_name,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'addons': item.addons_json,
                'total_price': float(item_total)
            })
            guests_breakdown[c_name]['subtotal'] += item_total
            guests_breakdown[c_name]['items'].append({
                'name': item.menu_item.name,
                'quantity': item.quantity,
                'total_price': float(item_total)
            })

    # Taxes
    cgst_pct = cafe.tax_rate_cgst
    sgst_pct = cafe.tax_rate_sgst
    cgst_amt = round((subtotal * cgst_pct) / Decimal('100.00'), 2)
    sgst_amt = round((subtotal * sgst_pct) / Decimal('100.00'), 2)
    total_tax = cgst_amt + sgst_amt

    # Format guests summary list with estimated taxes
    guests_summary = []
    for g_name, g_data in guests_breakdown.items():
        g_sub = g_data['subtotal']
        g_cgst = round((g_sub * cgst_pct) / Decimal('100.00'), 2)
        g_sgst = round((g_sub * sgst_pct) / Decimal('100.00'), 2)
        g_total = round(g_sub + g_cgst + g_sgst)
        guests_summary.append({
            'guest_name': g_name,
            'orders_count': len(set(g_data['order_numbers'])),
            'items': g_data['items'],
            'subtotal': float(g_sub),
            'estimated_tax': float(g_cgst + g_sgst),
            'estimated_grand_total': float(g_total)
        })

    # Existing bill if already generated
    existing_bill = session.bills.order_by('-created_at').first()
    bill_data = BillSerializer(existing_bill).data if existing_bill else None

    return Response({
        'session_id': session.id,
        'session_code': session.session_code,
        'table_number': session.table.number,
        'customer_name': session.customer.name if session.customer else 'Guest',
        'customer_phone': session.customer.phone if session.customer else '',
        'items': items_list,
        'items_count': len(items_list),
        'guests_summary': guests_summary,
        'subtotal': float(subtotal),
        'cgst_pct': float(cgst_pct),
        'cgst_amount': float(cgst_amt),
        'sgst_pct': float(sgst_pct),
        'sgst_amount': float(sgst_amt),
        'total_tax': float(total_tax),
        'estimated_grand_total': float(subtotal + total_tax),
        'existing_bill': bill_data
    })


@api_view(['POST'])
def bill_generate_view(request, session_id):
    try:
        session = TableSession.objects.select_related('table', 'customer').get(pk=session_id)
    except TableSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    cafe = CafeProfile.objects.first() or CafeProfile.objects.create()

    # Calculate actual subtotal
    subtotal = Decimal('0.00')
    for order in session.orders.exclude(status='CANCELLED'):
        for item in order.items.exclude(status='CANCELLED'):
            subtotal += Decimal(str(item.total_price))

    coupon_code = request.data.get('coupon_code', '').strip().upper()
    discount_amount = Decimal(str(request.data.get('discount_amount', 0.00)))
    discount_reason = request.data.get('discount_reason', '')

    if coupon_code and discount_amount == Decimal('0.00'):
        try:
            coupon = Coupon.objects.get(code__iexact=coupon_code, is_active=True)
            discount_amount = coupon.calculate_discount(subtotal)
            discount_reason = f"Coupon: {coupon.code}"
        except Coupon.DoesNotExist:
            pass

    discounted_subtotal = max(Decimal('0.00'), subtotal - discount_amount)

    cgst_amt = round((discounted_subtotal * cafe.tax_rate_cgst) / Decimal('100.00'), 2)
    sgst_amt = round((discounted_subtotal * cafe.tax_rate_sgst) / Decimal('100.00'), 2)
    service_charge = Decimal(str(request.data.get('service_charge', 0.00)))
    tip_amount = Decimal(str(request.data.get('tip_amount', 0.00)))

    calculated_total = discounted_subtotal + cgst_amt + sgst_amt + service_charge + tip_amount
    round_off = Decimal(str(round(calculated_total) - float(calculated_total)))
    grand_total = Decimal(str(round(calculated_total)))

    bill = session.bills.order_by('-created_at').first()
    if not bill:
        bill_num = f"INV-{session.table.number.replace(' ', '')}-{session.id:04d}"
        bill = Bill.objects.create(
            session=session,
            bill_number=bill_num,
            subtotal=subtotal,
            discount_amount=discount_amount,
            discount_reason=discount_reason,
            coupon_code=coupon_code,
            cgst_amount=cgst_amt,
            sgst_amount=sgst_amt,
            service_charge=service_charge,
            tip_amount=tip_amount,
            round_off=round_off,
            grand_total=grand_total,
            status='UNPAID'
        )
    else:
        bill.subtotal = subtotal
        bill.discount_amount = discount_amount
        bill.discount_reason = discount_reason
        bill.coupon_code = coupon_code
        bill.cgst_amount = cgst_amt
        bill.sgst_amount = sgst_amt
        bill.service_charge = service_charge
        bill.tip_amount = tip_amount
        bill.round_off = round_off
        bill.grand_total = grand_total
        bill.save()

    session.table.status = 'BILL_REQUESTED'
    session.table.save(update_fields=['status'])
    session.status = 'BILL_REQUESTED'
    session.is_bill_issued = True
    session.save(update_fields=['status', 'is_bill_issued'])

    AuditLog.objects.create(
        user_name=request.data.get('cashier_name', 'Cashier'),
        role='CASHIER',
        action='Generated Bill',
        entity_type='Bill',
        entity_id=bill.bill_number,
        details=f"Generated bill for {session.table.number}: ₹{grand_total} (Subtotal ₹{subtotal}, Discount ₹{discount_amount})"
    )

    return Response(BillSerializer(bill).data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def bill_record_payment_view(request, bill_id):
    """
    Processes payment (full or split tender).
    """
    try:
        bill = Bill.objects.select_related('session__table', 'session__customer').get(pk=bill_id)
    except Bill.DoesNotExist:
        return Response({'error': 'Bill not found'}, status=status.HTTP_404_NOT_FOUND)

    method = request.data.get('method', 'UPI')
    amount = Decimal(str(request.data.get('amount', bill.amount_remaining)))
    reference_id = request.data.get('reference_id', '')
    payer_name = request.data.get('payer_name', '')
    processed_by = request.data.get('processed_by', 'Cashier')

    if amount <= Decimal('0.00'):
        return Response({'error': 'Payment amount must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

    remaining = bill.amount_remaining
    if remaining <= Decimal('0.00'):
        return Response({'error': 'This bill has already been fully settled.'}, status=status.HTTP_400_BAD_REQUEST)

    if amount > remaining:
        return Response({
            'error': f"Payment amount of ₹{amount} exceeds the remaining balance of ₹{remaining}. Please enter a valid partial amount."
        }, status=status.HTTP_400_BAD_REQUEST)

    payment = Payment.objects.create(
        bill=bill,
        method=method,
        amount=amount,
        reference_id=reference_id,
        payer_name=payer_name,
        processed_by=processed_by,
        status='SUCCESS'
    )

    # Check settlement status
    if bill.is_settled:
        bill.status = 'PAID'
        bill.paid_at = timezone.now()
        bill.save(update_fields=['status', 'paid_at'])
        
        # Mark table session as PAID and bill as issued
        bill.session.status = 'PAID'
        bill.session.is_bill_issued = True
        bill.session.save(update_fields=['status', 'is_bill_issued'])

        # Auto-dispatch WhatsApp invoice if enabled
        cafe = CafeProfile.objects.first()
        if cafe and cafe.whatsapp_enabled and bill.session.customer and bill.session.customer.phone:
            WhatsAppMessage.objects.create(
                customer=bill.session.customer,
                phone=bill.session.customer.phone,
                message_type='INVOICE',
                template_name='cafe_invoice_receipt',
                payload_json={
                    'bill_number': bill.bill_number,
                    'table': bill.session.table.number,
                    'grand_total': float(bill.grand_total),
                    'customer_name': bill.session.customer.name
                },
                preview_text=f"Thank you for dining at {cafe.name}! Invoice {bill.bill_number} for ₹{bill.grand_total} is confirmed.",
                status='DELIVERED'
            )
    else:
        bill.status = 'PARTIALLY_PAID'
        bill.save(update_fields=['status'])

    AuditLog.objects.create(
        user_name=processed_by,
        role='CASHIER',
        action=f"Payment Received: {method}",
        entity_type='Payment',
        entity_id=str(payment.id),
        details=f"₹{amount} via {method} for {bill.bill_number} ({bill.session.table.number}). Status: {bill.status}"
    )

    return Response({
        'message': f"Payment of ₹{amount} recorded successfully",
        'payment': PaymentSerializer(payment).data,
        'bill': BillSerializer(bill).data
    })

@api_view(['POST'])
def bill_send_whatsapp_view(request, bill_id):
    import urllib.parse
    try:
        bill = Bill.objects.select_related('session__table', 'session__customer').get(pk=bill_id)
    except Bill.DoesNotExist:
        return Response({'error': 'Bill not found'}, status=status.HTTP_404_NOT_FOUND)

    phone = request.data.get('phone') or (bill.session.customer.phone if bill.session.customer else None)
    if not phone:
        return Response({'error': 'Customer mobile number is required to send WhatsApp invoice'}, status=status.HTTP_400_BAD_REQUEST)

    cafe = CafeProfile.objects.first() or CafeProfile.objects.create()
    customer_name = bill.session.customer.name if bill.session.customer else 'Valued Guest'

    # Build detailed itemized receipt text
    items_lines = []
    for order in bill.session.orders.exclude(status='CANCELLED'):
        for item in order.items.exclude(status='CANCELLED'):
            v_text = f" ({item.variant_name})" if item.variant_name else ""
            items_lines.append(f"• {item.menu_item.name}{v_text} x{item.quantity} - ₹{float(item.total_price):.2f}")

    items_str = "\n".join(items_lines) if items_lines else "• Gourmet Cafe Dine-in"

    header = cafe.receipt_header if cafe.receipt_header else f"🧾 *TAX INVOICE & RECEIPT*\n*{cafe.name.upper()}*"
    footer = cafe.receipt_footer if cafe.receipt_footer else "Thank you for dining with us! We look forward to serving you again. ☕✨"
    fssai_str = f" | FSSAI: {cafe.fssai_license}" if cafe.fssai_license else ""
    sender_str = f"\nOfficial Dispatch: {cafe.sender_mobile}" if cafe.sender_mobile else ""

    receipt_text = (
        f"{header}\n"
        f"{cafe.address}\n"
        f"Phone: {cafe.phone}{fssai_str} | GST: {cafe.gstin}{sender_str}\n"
        f"------------------------------------\n"
        f"Invoice: #{bill.bill_number}\n"
        f"Table: {bill.session.table.number}\n"
        f"Date: {bill.created_at.strftime('%d %b %Y, %I:%M %p')}\n"
        f"Guest: {customer_name}\n"
        f"------------------------------------\n"
        f"{items_str}\n"
        f"------------------------------------\n"
        f"Subtotal: ₹{float(bill.subtotal):.2f}\n"
        f"CGST ({cafe.tax_rate_cgst}%): ₹{float(bill.cgst_amount):.2f}\n"
        f"SGST ({cafe.tax_rate_sgst}%): ₹{float(bill.sgst_amount):.2f}\n"
        f"*GRAND TOTAL: ₹{float(bill.grand_total):.2f}* [PAID]\n"
        f"------------------------------------\n"
        f"{footer}"
    )

    clean_phone = ''.join(filter(str.isdigit, str(phone)))
    if len(clean_phone) == 10:
        clean_phone = '91' + clean_phone

    whatsapp_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(receipt_text)}"

    msg = WhatsAppMessage.objects.create(
        customer=bill.session.customer,
        phone=phone,
        message_type='INVOICE',
        template_name='cafe_invoice_receipt',
        payload_json={
            'bill_number': bill.bill_number,
            'table': bill.session.table.number,
            'grand_total': float(bill.grand_total),
            'customer_name': customer_name,
            'cafe_name': cafe.name
        },
        preview_text=receipt_text,
        status='DELIVERED'
    )

    AuditLog.objects.create(
        user_name=request.data.get('user_name', 'Cashier'),
        role='CASHIER',
        action='Sent WhatsApp Invoice',
        entity_type='Bill',
        entity_id=str(bill.id),
        details=f"Invoice #{bill.bill_number} sent via WhatsApp to {phone}"
    )

    return Response({
        'message': f"WhatsApp invoice sent to {phone}",
        'message_id': msg.id,
        'phone': phone,
        'preview_text': receipt_text,
        'whatsapp_url': whatsapp_url
    })

@api_view(['POST'])
def request_bill_view(request, session_id):
    """
    Triggered by Customer mobile screen or Waiter.
    """
    try:
        session = TableSession.objects.select_related('table').get(pk=session_id)
    except TableSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    session.table.status = 'BILL_REQUESTED'
    session.table.save(update_fields=['status'])
    session.status = 'BILL_REQUESTED'
    session.save(update_fields=['status'])

    AuditLog.objects.create(
        user_name=request.data.get('requested_by', 'Customer'),
        role='CUSTOMER',
        action='Requested Bill',
        entity_type='TableSession',
        entity_id=str(session.id),
        details=f"Table {session.table.number} requested final bill"
    )

    return Response({
        'message': f"Bill requested for Table {session.table.number}",
        'status': 'BILL_REQUESTED'
    })

@api_view(['POST'])
def merge_bills_view(request, session_id):
    """
    Merges all individual guest orders for the table session into a single consolidated Bill.
    """
    try:
        session = TableSession.objects.select_related('table', 'customer').get(pk=session_id)
    except TableSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    cafe = CafeProfile.objects.first() or CafeProfile.objects.create()

    # Re-calculate subtotal across ALL uncancelled orders in this session
    subtotal = Decimal('0.00')
    for order in session.orders.exclude(status='CANCELLED'):
        for item in order.items.exclude(status='CANCELLED'):
            subtotal += Decimal(str(item.total_price))

    discount_amount = Decimal(str(request.data.get('discount_amount', 0.00)))
    discount_reason = request.data.get('discount_reason', '')
    discounted_subtotal = max(Decimal('0.00'), subtotal - discount_amount)

    cgst_amt = round((discounted_subtotal * cafe.tax_rate_cgst) / Decimal('100.00'), 2)
    sgst_amt = round((discounted_subtotal * cafe.tax_rate_sgst) / Decimal('100.00'), 2)
    service_charge = Decimal(str(request.data.get('service_charge', 0.00)))

    calculated_total = discounted_subtotal + cgst_amt + sgst_amt + service_charge
    round_off = Decimal(str(round(calculated_total) - float(calculated_total)))
    grand_total = Decimal(str(round(calculated_total)))

    bill = session.bills.order_by('-created_at').first()
    if not bill:
        bill_num = f"INV-{session.table.number.replace(' ', '')}-{session.id:04d}"
        bill = Bill.objects.create(
            session=session,
            bill_number=bill_num,
            subtotal=subtotal,
            discount_amount=discount_amount,
            discount_reason=discount_reason,
            cgst_amount=cgst_amt,
            sgst_amount=sgst_amt,
            service_charge=service_charge,
            round_off=round_off,
            grand_total=grand_total,
            status='UNPAID'
        )
    else:
        bill.subtotal = subtotal
        bill.discount_amount = discount_amount
        bill.discount_reason = discount_reason
        bill.cgst_amount = cgst_amt
        bill.sgst_amount = sgst_amt
        bill.service_charge = service_charge
        bill.round_off = round_off
        bill.grand_total = grand_total
        if bill.status != 'PAID':
            bill.status = 'UNPAID' if bill.total_paid == Decimal('0.00') else 'PARTIALLY_PAID'
        bill.save()

    session.is_bill_issued = True
    session.save(update_fields=['is_bill_issued'])

    AuditLog.objects.create(
        user_name=request.data.get('cashier_name', 'Cashier'),
        role='CASHIER',
        action='Merged Table Bills',
        entity_type='Bill',
        entity_id=bill.bill_number,
        details=f"Merged all orders for {session.table.number} into unified Bill #{bill.bill_number}: ₹{grand_total}"
    )

    return Response({
        'message': f"All orders for {session.table.number} successfully merged into a single bill! 🔀",
        'bill': BillSerializer(bill).data
    })


# ---------------------------------------------------------------------------
# CASHIER SHIFT MANAGEMENT & DAY-END Z-REPORT
# ---------------------------------------------------------------------------

@api_view(['GET'])
def current_shift_view(request):
    """
    Returns the active shift with live tender totals and current expected cash in drawer.
    """
    shift = CashierShift.objects.filter(status='OPEN').order_by('-opened_at').first()
    if not shift:
        return Response({'active': False, 'shift': None})

    payments = Payment.objects.filter(created_at__gte=shift.opened_at, status='SUCCESS')
    bills = Bill.objects.filter(paid_at__gte=shift.opened_at, status='PAID')

    cash_sales = sum(p.amount for p in payments.filter(method='CASH'))
    upi_sales = sum(p.amount for p in payments.filter(method='UPI'))
    card_sales = sum(p.amount for p in payments.filter(method='CARD'))
    other_sales = sum(p.amount for p in payments.filter(method='OTHER'))

    total_tips = sum(b.tip_amount for b in bills)
    total_discounts = sum(b.discount_amount for b in bills)
    petty_total = sum(e.amount for e in shift.expenses.all())

    expected_drawer_cash = shift.opening_float + cash_sales - petty_total

    serializer = CashierShiftSerializer(shift)
    data = serializer.data
    data['live_stats'] = {
        'cash_sales': float(cash_sales),
        'upi_sales': float(upi_sales),
        'card_sales': float(card_sales),
        'other_sales': float(other_sales),
        'total_sales': float(cash_sales + upi_sales + card_sales + other_sales),
        'total_tips': float(total_tips),
        'total_discounts': float(total_discounts),
        'petty_cash_total': float(petty_total),
        'opening_float': float(shift.opening_float),
        'expected_drawer_cash': float(expected_drawer_cash),
        'transactions_count': payments.count()
    }
    return Response({'active': True, 'shift': data})


@api_view(['POST'])
def open_shift_view(request):
    """
    Opens a new cashier shift with a declared opening drawer cash float.
    """
    open_shift = CashierShift.objects.filter(status='OPEN').first()
    if open_shift:
        return Response({
            'error': f"Shift #{open_shift.shift_number} is already active (Cashier: {open_shift.cashier_name}). Please close it first."
        }, status=status.HTTP_400_BAD_REQUEST)

    opening_float = Decimal(str(request.data.get('opening_float', 2000.00)))
    cashier_name = request.data.get('cashier_name', 'Cashier')
    notes = request.data.get('notes', '')

    last_shift = CashierShift.objects.order_by('-shift_number').first()
    shift_number = (last_shift.shift_number + 1) if last_shift else 1

    shift = CashierShift.objects.create(
        cashier_name=cashier_name,
        shift_number=shift_number,
        opening_float=opening_float,
        status='OPEN',
        notes=notes
    )

    AuditLog.objects.create(
        user_name=cashier_name,
        role='CASHIER',
        action='Opened Cashier Shift',
        entity_type='CashierShift',
        entity_id=str(shift_number),
        details=f"Opened Shift #{shift_number} with starting drawer float of ₹{opening_float}"
    )

    return Response(CashierShiftSerializer(shift).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def record_petty_cash_view(request):
    """
    Logs an emergency cash outlay from drawer (e.g. mint leaves, ice bag, cleaning supplies).
    """
    shift = CashierShift.objects.filter(status='OPEN').order_by('-opened_at').first()
    if not shift:
        return Response({'error': 'No active shift found. Please open a shift first.'}, status=status.HTTP_400_BAD_REQUEST)

    amount = Decimal(str(request.data.get('amount', 0.00)))
    reason = request.data.get('reason', 'Petty Cash Outlay')
    approved_by = request.data.get('approved_by', shift.cashier_name)

    if amount <= Decimal('0.00'):
        return Response({'error': 'Expense amount must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

    expense = PettyCashExpense.objects.create(
        shift=shift,
        amount=amount,
        reason=reason,
        approved_by=approved_by
    )

    AuditLog.objects.create(
        user_name=shift.cashier_name,
        role='CASHIER',
        action='Petty Cash Outlay',
        entity_type='PettyCash',
        entity_id=str(expense.id),
        details=f"Paid ₹{amount} from drawer for: {reason} (Shift #{shift.shift_number})"
    )

    return Response(PettyCashExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


def build_z_report_payload(shift):
    cafe = CafeProfile.objects.first() or CafeProfile.objects.create()
    net_sales = shift.total_cash_sales + shift.total_upi_sales + shift.total_card_sales + shift.total_other_sales
    gross_sales = net_sales + shift.total_discounts

    return {
        'cafe_name': cafe.name,
        'cafe_address': cafe.address,
        'cafe_phone': cafe.phone,
        'gstin': cafe.gstin,
        'shift_number': shift.shift_number,
        'cashier_name': shift.cashier_name,
        'opened_at': shift.opened_at.strftime('%d %b %Y, %I:%M %p') if shift.opened_at else '',
        'closed_at': shift.closed_at.strftime('%d %b %Y, %I:%M %p') if shift.closed_at else 'In Progress',
        'opening_float': float(shift.opening_float),
        'total_cash_sales': float(shift.total_cash_sales),
        'total_upi_sales': float(shift.total_upi_sales),
        'total_card_sales': float(shift.total_card_sales),
        'total_other_sales': float(shift.total_other_sales),
        'petty_cash_expenses': [
            {'reason': e.reason, 'amount': float(e.amount), 'time': e.created_at.strftime('%I:%M %p')}
            for e in shift.expenses.all()
        ],
        'total_petty_cash': float(shift.total_petty_cash),
        'expected_cash_in_drawer': float(shift.closing_cash_expected),
        'actual_cash_in_drawer': float(shift.closing_cash_actual),
        'cash_variance': float(shift.cash_variance),
        'variance_status': 'MATCHED' if shift.cash_variance == 0 else ('EXCESS / SURPLUS' if shift.cash_variance > 0 else 'SHORTAGE'),
        'total_tips': float(shift.total_tips),
        'total_discounts': float(shift.total_discounts),
        'total_tax_collected': float(shift.total_tax_collected),
        'bills_count': shift.bills_count,
        'net_sales': float(net_sales),
        'gross_sales': float(gross_sales)
    }


@api_view(['POST'])
def close_shift_view(request):
    """
    Closes the active shift, reconciles drawer cash, computes variances, and generates Z-Report.
    """
    shift = CashierShift.objects.filter(status='OPEN').order_by('-opened_at').first()
    if not shift:
        return Response({'error': 'No active shift to close.'}, status=status.HTTP_400_BAD_REQUEST)

    closing_cash_actual = Decimal(str(request.data.get('closing_cash_actual', 0.00)))
    notes = request.data.get('notes', '')

    payments = Payment.objects.filter(created_at__gte=shift.opened_at, status='SUCCESS')
    bills = Bill.objects.filter(paid_at__gte=shift.opened_at, status='PAID')

    cash_sales = sum(p.amount for p in payments.filter(method='CASH'))
    upi_sales = sum(p.amount for p in payments.filter(method='UPI'))
    card_sales = sum(p.amount for p in payments.filter(method='CARD'))
    other_sales = sum(p.amount for p in payments.filter(method='OTHER'))

    total_tips = sum(b.tip_amount for b in bills)
    total_discounts = sum(b.discount_amount for b in bills)
    total_tax = sum(b.cgst_amount + b.sgst_amount for b in bills)
    petty_total = sum(e.amount for e in shift.expenses.all())

    expected_cash = shift.opening_float + cash_sales - petty_total
    cash_variance = closing_cash_actual - expected_cash

    shift.closing_cash_actual = closing_cash_actual
    shift.closing_cash_expected = expected_cash
    shift.cash_variance = cash_variance
    shift.total_cash_sales = cash_sales
    shift.total_upi_sales = upi_sales
    shift.total_card_sales = card_sales
    shift.total_other_sales = other_sales
    shift.total_tips = total_tips
    shift.total_discounts = total_discounts
    shift.total_tax_collected = total_tax
    shift.bills_count = bills.count()
    shift.status = 'CLOSED'
    shift.closed_at = timezone.now()
    if notes:
        shift.notes = f"{shift.notes}\n{notes}".strip()
    shift.save()

    AuditLog.objects.create(
        user_name=shift.cashier_name,
        role='CASHIER',
        action='Closed Shift & Reconciled Z-Report',
        entity_type='CashierShift',
        entity_id=str(shift.shift_number),
        details=f"Shift #{shift.shift_number} closed. Expected: ₹{expected_cash}, Counted: ₹{closing_cash_actual}, Variance: ₹{cash_variance}"
    )

    return Response({
        'message': f"Shift #{shift.shift_number} successfully closed and reconciled! 🧾",
        'shift': CashierShiftSerializer(shift).data,
        'z_report': build_z_report_payload(shift)
    })


@api_view(['GET'])
def z_report_view(request, shift_id):
    try:
        shift = CashierShift.objects.prefetch_related('expenses').get(pk=shift_id)
    except CashierShift.DoesNotExist:
        return Response({'error': 'Shift not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(build_z_report_payload(shift))


@api_view(['GET'])
def list_shifts_view(request):
    shifts = CashierShift.objects.all()[:30]
    return Response(CashierShiftSerializer(shifts, many=True).data)


@api_view(['GET', 'POST'])
def coupons_view(request):
    if request.method == 'GET':
        coupons = Coupon.objects.filter(is_active=True)
        return Response(CouponSerializer(coupons, many=True).data)

    code = request.data.get('code', '').strip().upper()
    subtotal = Decimal(str(request.data.get('subtotal', 0.00)))
    try:
        coupon = Coupon.objects.get(code__iexact=code, is_active=True)
        if subtotal < coupon.min_order_amount:
            return Response({
                'valid': False,
                'message': f"Coupon requires minimum order of ₹{coupon.min_order_amount}"
            }, status=status.HTTP_400_BAD_REQUEST)
        discount = coupon.calculate_discount(subtotal)
        return Response({
            'valid': True,
            'code': coupon.code,
            'discount_amount': float(discount),
            'discount_type': coupon.discount_type,
            'message': f"Coupon applied! You saved ₹{discount} 🎉"
        })
    except Coupon.DoesNotExist:
        return Response({
            'valid': False,
            'message': f"Invalid or expired coupon code: '{code}'"
        }, status=status.HTTP_404_NOT_FOUND)


