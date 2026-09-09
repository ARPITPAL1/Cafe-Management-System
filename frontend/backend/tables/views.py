import random
import string
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Table, TableSession, TableReservation
from .serializers import TableSerializer, TableSessionSerializer, TableReservationSerializer
from core.models import CafeProfile, AuditLog

@api_view(['GET', 'POST'])
def table_list_create_view(request):
    if request.method == 'GET':
        tables = Table.objects.filter(is_active=True).prefetch_related('sessions__orders')
        serializer = TableSerializer(tables, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = TableSerializer(data=request.data)
        if serializer.is_valid():
            table = serializer.save()
            AuditLog.objects.create(
                user_name=request.data.get('user_name', 'Admin'),
                role=request.data.get('role', 'OWNER'),
                action='Created Table',
                entity_type='Table',
                entity_id=str(table.id),
                details=f"Added table {table.number} ({table.capacity} seats, {table.shape})"
            )
            return Response(TableSerializer(table).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PATCH', 'DELETE'])
def table_detail_view(request, pk):
    try:
        table = Table.objects.get(pk=pk)
    except Table.DoesNotExist:
        return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TableSerializer(table).data)

    if request.method == 'PATCH':
        serializer = TableSerializer(table, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        table.is_active = False
        table.save()
        AuditLog.objects.create(
            user_name=request.data.get('user_name', 'Admin'),
            role=request.data.get('role', 'OWNER'),
            action='Deactivated Table',
            entity_type='Table',
            entity_id=str(table.id),
            details=f"Deactivated table {table.number}"
        )
        return Response({'message': f"Table {table.number} deactivated"})

@api_view(['POST'])
def table_regenerate_token_view(request, pk):
    try:
        table = Table.objects.get(pk=pk)
    except Table.DoesNotExist:
        return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

    old_token = table.public_token
    new_token = table.regenerate_token()
    AuditLog.objects.create(
        user_name=request.data.get('user_name', 'Admin'),
        role='OWNER',
        action='Regenerated Table QR',
        entity_type='Table',
        entity_id=str(table.id),
        details=f"Table {table.number}: Token changed from {old_token} to {new_token}"
    )
    return Response({'public_token': new_token, 'qr_url': f"/t/{new_token}"})

@api_view(['POST'])
def table_update_status_view(request, pk):
    try:
        table = Table.objects.get(pk=pk)
    except Table.DoesNotExist:
        return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    if new_status not in dict(Table.STATUS_CHOICES):
        return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

    table.status = new_status
    table.save(update_fields=['status', 'updated_at'])
    return Response(TableSerializer(table).data)

@api_view(['POST'])
def table_open_session_view(request, pk):
    try:
        table = Table.objects.get(pk=pk)
    except Table.DoesNotExist:
        return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

    existing = table.get_current_session()
    if existing:
        if table.status != 'OCCUPIED':
            table.status = 'OCCUPIED'
            table.save(update_fields=['status', 'updated_at'])
        return Response(TableSessionSerializer(existing).data)

    # Check if table has a reservation for today and auto-seat if within reservation window
    now = timezone.localtime()
    today = now.date()
    now_mins = now.hour * 60 + now.minute
    upcoming_res = TableReservation.objects.filter(
        table=table,
        reservation_date=today,
        status__in=['PENDING', 'CONFIRMED']
    ).first()

    code = f"{table.id}-{''.join(random.choices(string.digits, k=4))}"
    session = TableSession.objects.create(
        table=table,
        session_code=code,
        guest_count=request.data.get('guest_count', 2),
        notes=request.data.get('notes', ''),
        status='ACTIVE'
    )
    table.status = 'OCCUPIED'
    table.save(update_fields=['status', 'updated_at'])

    # If this table had an upcoming reservation, mark it SEATED and dismiss alert
    if upcoming_res:
        upcoming_res.status = 'SEATED'
        upcoming_res.is_alert_dismissed = True
        upcoming_res.save(update_fields=['status', 'is_alert_dismissed'])

    AuditLog.objects.create(
        user_name=request.data.get('user_name', 'Staff'),
        role=request.data.get('role', 'WAITER'),
        action='Opened Table Session',
        entity_type='TableSession',
        entity_id=str(session.id),
        details=f"Session #{session.session_code} opened on {table.number}" + (f" (Pre-booking: {upcoming_res.customer_name})" if upcoming_res else "")
    )

    return Response(TableSessionSerializer(session).data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def table_close_session_view(request, pk):
    try:
        table = Table.objects.get(pk=pk)
    except Table.DoesNotExist:
        return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

    # Close any active or unclosed sessions on this table
    unclosed_sessions = table.sessions.filter(status__in=['ACTIVE', 'BILL_REQUESTED', 'PAID'])
    for sess in unclosed_sessions:
        sess.status = 'CLOSED'
        sess.closed_at = timezone.now()
        sess.save(update_fields=['status', 'closed_at'])
        # Mark orders as completed
        sess.orders.exclude(status__in=['COMPLETED', 'CANCELLED']).update(status='COMPLETED')

    # Reset table to AVAILABLE
    table.status = 'AVAILABLE'
    table.save(update_fields=['status', 'updated_at'])

    AuditLog.objects.create(
        user_name=request.data.get('user_name', 'Cashier'),
        role=request.data.get('role', 'CASHIER'),
        action='Closed Table Session',
        entity_type='TableSession',
        entity_id=str(table.id),
        details=f"All sessions closed. {table.number} reset to AVAILABLE."
    )

    return Response({
        'message': f"Table {table.number} session closed and reset to AVAILABLE.",
        'table': TableSerializer(table).data
    })

@api_view(['POST'])
def session_close_direct_view(request, session_id):
    try:
        session = TableSession.objects.select_related('table').get(pk=session_id)
    except TableSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    session.status = 'CLOSED'
    session.closed_at = timezone.now()
    session.save(update_fields=['status', 'closed_at'])
    session.orders.exclude(status__in=['COMPLETED', 'CANCELLED']).update(status='COMPLETED')

    table = session.table
    # If no other active sessions on this table, reset table to AVAILABLE
    if not table.sessions.filter(status__in=['ACTIVE', 'BILL_REQUESTED', 'PAID']).exists():
        table.status = 'AVAILABLE'
        table.save(update_fields=['status', 'updated_at'])

    AuditLog.objects.create(
        user_name=request.data.get('user_name', 'Cashier'),
        role=request.data.get('role', 'CASHIER'),
        action='Closed Table Session',
        entity_type='TableSession',
        entity_id=str(session.id),
        details=f"Session #{session.session_code} closed. {table.number} is now AVAILABLE."
    )

    return Response({
        'message': f"Session #{session.session_code} successfully closed. Table {table.number} reset to AVAILABLE.",
        'table': TableSerializer(table).data
    })

@api_view(['GET'])
def table_by_token_view(request, token):
    try:
        table = Table.objects.get(public_token=token, is_active=True)
    except Table.DoesNotExist:
        return Response({'error': 'Invalid QR Token or Table is inactive'}, status=status.HTTP_404_NOT_FOUND)

    session = table.get_current_session()

    # 15-minute lock check: If no active session, check if table is pre-booked within 15 mins
    is_locked = False
    locked_info = None
    if not session:
        now = timezone.localtime()
        today = now.date()
        now_mins = now.hour * 60 + now.minute
        upcoming = TableReservation.objects.filter(
            table=table,
            reservation_date=today,
            status__in=['PENDING', 'CONFIRMED']
        )
        for res in upcoming:
            res_start = parse_time_str_to_minutes(res.reservation_time)
            res_end = res_start + (res.duration_minutes or 120)
            if (res_start - 15) <= now_mins < res_end:
                is_locked = True
                locked_info = {
                    'reservation_time': res.reservation_time,
                    'customer_name': res.customer_name,
                    'booking_code': res.booking_code,
                    'message': f"This table is reserved for an advance booking at {res.reservation_time} ({res.customer_name}). New walk-in dining cannot be opened at this table within 15 minutes of reservation. Please contact the cafe host for another table."
                }
                break

    return Response({
        'table': TableSerializer(table).data,
        'has_active_session': session is not None,
        'active_session': TableSessionSerializer(session).data if session else None,
        'is_locked_for_prebooking': is_locked,
        'prebooking_locked_info': locked_info
    })

@api_view(['POST'])
def call_waiter_view(request, token):
    try:
        table = Table.objects.get(public_token=token, is_active=True)
    except Table.DoesNotExist:
        return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if final bill has been settled on the table's active session
    session = table.get_current_session()
    if session and (session.status in ['PAID', 'CLOSED'] or (getattr(session, 'is_bill_issued', False) and session.status in ['PAID', 'CLOSED'])):
        return Response({
            'error': 'Final bill has been settled for this session. Your dining session has concluded. You cannot call the waiter. Please scan the QR code again to start a new session.'
        }, status=status.HTTP_403_FORBIDDEN)

    table.waiter_called = True
    table.waiter_called_at = timezone.now()
    table.save(update_fields=['waiter_called', 'waiter_called_at'])

    AuditLog.objects.create(
        user_name=request.data.get('customer_name', 'Customer QR'),
        role='CUSTOMER',
        action='Called Waiter',
        entity_type='Table',
        entity_id=str(table.id),
        details=f"Assistance requested at {table.number} ({table.floor_section})"
    )

    return Response({
        'message': f"Staff has been alerted! A waiter is coming to {table.number}.",
        'table': TableSerializer(table).data
    })

@api_view(['POST'])
def dismiss_waiter_view(request, pk):
    try:
        table = Table.objects.get(pk=pk)
    except Table.DoesNotExist:
        return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

    table.waiter_called = False
    table.waiter_called_at = None
    table.save(update_fields=['waiter_called', 'waiter_called_at'])

    AuditLog.objects.create(
        user_name=request.data.get('staff_name', 'Staff'),
        role=request.data.get('role', 'WAITER'),
        action='Attended Waiter Call',
        entity_type='Table',
        entity_id=str(table.id),
        details=f"Waiter attended {table.number}"
    )

    return Response({
        'message': f"Waiter call dismissed for {table.number}.",
        'table': TableSerializer(table).data
    })

@api_view(['POST'])
def dismiss_all_waiter_calls_view(request):
    """
    Allows Manager/Owner to clear/dismiss all active waiter alerts in one click.
    """
    updated_count = Table.objects.filter(waiter_called=True).update(waiter_called=False, waiter_called_at=None)
    AuditLog.objects.create(
        user_name=request.data.get('staff_name', 'Manager'),
        role='MANAGER',
        action='Dismissed All Waiter Calls',
        entity_type='Table',
        entity_id='ALL',
        details=f"Cleared {updated_count} active waiter alerts."
    )
    return Response({
        'message': f"Cleared {updated_count} waiter alerts.",
        'cleared_count': updated_count
    })

@api_view(['POST'])
def request_essentials_view(request, token):
    """
    Handle complimentary quick requests: Water bottle (Chilled / Normal), Salt, Tissues.
    """
    try:
        table = Table.objects.get(public_token=token, is_active=True)
    except Table.DoesNotExist:
        return Response({'error': 'Table not found'}, status=status.HTTP_404_NOT_FOUND)

    session = table.get_current_session()
    if session and (session.status in ['PAID', 'CLOSED'] or (getattr(session, 'is_bill_issued', False) and session.status in ['PAID', 'CLOSED'])):
        return Response({
            'error': 'Final bill has been settled for this session. Your dining session has concluded. You cannot request items. Please scan the QR code again to start a new session.'
        }, status=status.HTTP_403_FORBIDDEN)

    items = request.data.get('items', [])
    customer_name = request.data.get('customer_name', 'Guest')
    
    if not items:
        return Response({'error': 'No items selected'}, status=status.HTTP_400_BAD_REQUEST)

    items_str = ", ".join(items)
    table.waiter_called = True
    table.waiter_called_at = timezone.now()
    table.save(update_fields=['waiter_called', 'waiter_called_at'])

    if session:
        session.notes = (session.notes + f"\n[Request: {items_str} by {customer_name}]").strip()
        session.save(update_fields=['notes'])

    AuditLog.objects.create(
        user_name=customer_name,
        role='CUSTOMER',
        action='Requested Table Essentials',
        entity_type='Table',
        entity_id=str(table.id),
        details=f"Essentials requested at {table.number}: {items_str}"
    )

    return Response({
        'message': f"Requested {items_str} for {table.number}! Our team will deliver them shortly. 🛎️",
        'items': items,
        'table': TableSerializer(table).data
    })


def parse_time_str_to_minutes(time_str):
    """
    Parses strings like '07:30 PM', '19:30', '7:30pm', '11:00 AM' into minutes from midnight (0-1439).
    """
    if not time_str:
        return 720
    clean = str(time_str).strip().upper()
    from datetime import datetime
    for fmt in ('%I:%M %p', '%I:%M%p', '%H:%M', '%I %p', '%I%p'):
        try:
            dt = datetime.strptime(clean, fmt)
            return dt.hour * 60 + dt.minute
        except ValueError:
            continue
    import re
    m = re.match(r'(\d+)(?::(\d+))?\s*(AM|PM)?', clean, re.I)
    if m:
        h = int(m.group(1))
        mins = int(m.group(2) or 0)
        meridiem = (m.group(3) or '').upper()
        if meridiem == 'PM' and h < 12:
            h += 12
        elif meridiem == 'AM' and h == 12:
            h = 0
        return h * 60 + mins
    return 720


# -------------------------------------------------------------
# ADVANCE TABLE RESERVATIONS & MANAGER POWER CONTROLS
# -------------------------------------------------------------

@api_view(['GET', 'POST'])
def reservation_list_create_view(request):
    cafe = CafeProfile.objects.first() or CafeProfile.objects.create()

    if request.method == 'GET':
        status_filter = request.GET.get('status')
        unhandled_only = request.GET.get('unhandled', 'false').lower() == 'true'
        date_filter = request.GET.get('date')

        # -------------------------------------------------------------
        # Automatic 3-Hour Client Alert & 15-Minute Manager Alert Logic
        # -------------------------------------------------------------
        now = timezone.localtime()
        today = now.date()
        now_mins = now.hour * 60 + now.minute

        today_bookings = TableReservation.objects.filter(
            reservation_date=today,
            status__in=['PENDING', 'CONFIRMED']
        )
        upcoming_15m_alerts = []

        for res in today_bookings:
            res_start = parse_time_str_to_minutes(res.reservation_time)
            diff_mins = res_start - now_mins

            # 3 hours before booking time: alert message to client mobile
            if 0 < diff_mins <= 180 and not res.client_reminder_sent:
                res.client_reminder_sent = True
                res.save(update_fields=['client_reminder_sent'])
                AuditLog.objects.create(
                    user_name="System Reminder",
                    role="SYSTEM",
                    action="Client 3-Hour Booking Reminder Alert",
                    entity_type="TableReservation",
                    entity_id=str(res.id),
                    details=f"Reminder alert sent to client {res.customer_name} ({res.customer_phone}): Your reservation for {res.table.number if res.table else 'table'} is today at {res.reservation_time}. Unique Check-In Code: {res.booking_code}"
                )

            # 15 minutes before booking time: alert manager & floor staff
            if 0 <= diff_mins <= 15:
                upcoming_15m_alerts.append({
                    'id': res.id,
                    'booking_code': res.booking_code,
                    'customer_name': res.customer_name,
                    'customer_phone': res.customer_phone,
                    'table_number': res.table.number if res.table else 'Unassigned Table',
                    'table_id': res.table.id if res.table else None,
                    'reservation_time': res.reservation_time,
                    'minutes_remaining': diff_mins,
                    'guest_count': res.guest_count
                })
                if not res.manager_15m_alert_sent:
                    res.manager_15m_alert_sent = True
                    res.save(update_fields=['manager_15m_alert_sent'])
                    AuditLog.objects.create(
                        user_name="System",
                        role="SYSTEM",
                        action="Manager 15-Minute Pre-Booking Alert",
                        entity_type="TableReservation",
                        entity_id=str(res.id),
                        details=f"Manager alert: Table {res.table.number if res.table else 'assigned table'} is reserved in {diff_mins} mins for {res.customer_name} (Code: {res.booking_code}). Prepare table!"
                    )

        qs = TableReservation.objects.select_related('table').all()
        if date_filter:
            qs = qs.filter(reservation_date=date_filter)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if unhandled_only:
            qs = qs.filter(is_alert_dismissed=False)

        serializer = TableReservationSerializer(qs[:150], many=True)
        return Response({
            'advance_booking_enabled': cafe.advance_booking_enabled,
            'reservations': serializer.data,
            'pending_alerts_count': TableReservation.objects.filter(is_alert_dismissed=False).count(),
            'upcoming_15m_alerts': upcoming_15m_alerts
        })

    if request.method == 'POST':
        # Check if booking is enabled
        if not cafe.advance_booking_enabled:
            return Response({
                'error': 'Advance table reservations are currently offline. Please call or visit our cafe directly.'
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        table_id = data.get('table_id')
        table = None
        if table_id:
            table = Table.objects.filter(pk=table_id, is_active=True).first()

        res_date = data.get('reservation_date')
        res_time = data.get('reservation_time')
        duration_mins = int(data.get('duration_minutes', 120) or 120)

        # Pre-booked conflict checking: ensure no overlapping booking on same table
        if table and res_date and res_time:
            req_start = parse_time_str_to_minutes(res_time)
            req_end = req_start + duration_mins

            existing_bookings = TableReservation.objects.filter(
                table=table,
                reservation_date=res_date,
                status__in=['PENDING', 'CONFIRMED', 'SEATED']
            )

            for ex in existing_bookings:
                ex_start = parse_time_str_to_minutes(ex.reservation_time)
                ex_end = ex_start + (ex.duration_minutes or 120)

                # Overlap check
                if max(req_start, ex_start) < min(req_end, ex_end):
                    return Response({
                        'error': f"{table.number} is already pre-booked on {res_date} for {ex.reservation_time} ({ex.duration_minutes} mins). Please choose another table or a different time slot."
                    }, status=status.HTTP_400_BAD_REQUEST)

        serializer = TableReservationSerializer(data=data)
        if serializer.is_valid():
            res = serializer.save(table=table)

            AuditLog.objects.create(
                user_name=res.customer_name,
                role='CUSTOMER',
                action='Booked Table in Advance',
                entity_type='TableReservation',
                entity_id=str(res.id),
                details=f"Advance booking for {res.customer_name} ({res.guest_count} guests, {res.duration_minutes} mins) on {res.reservation_date} at {res.reservation_time}. Table: {table.number if table else 'Unassigned'}"
            )

            return Response(TableReservationSerializer(res).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def dismiss_all_reservation_alerts_view(request):
    """
    Dismiss all unread reservation notification alerts.
    """
    updated_count = TableReservation.objects.filter(is_alert_dismissed=False).update(is_alert_dismissed=True)
    return Response({
        'message': f"All {updated_count} reservation notifications dismissed.",
        'pending_alerts_count': 0
    })

@api_view(['PATCH', 'DELETE'])
def reservation_detail_update_view(request, pk):
    try:
        reservation = TableReservation.objects.select_related('table').get(pk=pk)
    except TableReservation.DoesNotExist:
        return Response({'error': 'Reservation not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        serializer = TableReservationSerializer(reservation, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        reservation.delete()
        return Response({'message': 'Reservation deleted'})

@api_view(['POST'])
def toggle_advance_booking_view(request):
    """
    Manager/Owner power to put the advance reservation page ONLINE or OFFLINE.
    """
    cafe = CafeProfile.objects.first() or CafeProfile.objects.create()
    target_state = request.data.get('enabled')

    if target_state is not None:
        cafe.advance_booking_enabled = bool(target_state)
    else:
        cafe.advance_booking_enabled = not cafe.advance_booking_enabled

    cafe.save(update_fields=['advance_booking_enabled', 'updated_at'])

    action_text = "ONLINE" if cafe.advance_booking_enabled else "OFFLINE"
    AuditLog.objects.create(
        user_name=request.data.get('changed_by', 'Manager'),
        role='MANAGER',
        action=f"Toggled Advance Booking {action_text}",
        entity_type='CafeProfile',
        entity_id=str(cafe.id),
        details=f"Advance table booking system is now {action_text}."
    )

    return Response({
        'advance_booking_enabled': cafe.advance_booking_enabled,
        'message': f"Advance table booking is now {action_text}."
    })

@api_view(['POST'])
def toggle_waiter_alerts_view(request):
    """
    Manager/Owner power to turn ON or OFF waiter call alerts without sound effects.
    """
    cafe = CafeProfile.objects.first() or CafeProfile.objects.create()
    target_state = request.data.get('enabled')

    if target_state is not None:
        cafe.waiter_call_alerts_enabled = bool(target_state)
    else:
        cafe.waiter_call_alerts_enabled = not cafe.waiter_call_alerts_enabled

    cafe.save(update_fields=['waiter_call_alerts_enabled', 'updated_at'])

    action_text = "ENABLED" if cafe.waiter_call_alerts_enabled else "MUTED / DISABLED"
    return Response({
        'waiter_call_alerts_enabled': cafe.waiter_call_alerts_enabled,
        'message': f"Waiter call alerts are now {action_text} for manager side."
    })


@api_view(['POST'])
def check_in_reservation_view(request):
    """
    Check in a guest using their unique booking code or reservation ID,
    guide them to table and start their dining session.
    """
    booking_code = request.data.get('booking_code', '').strip().upper()
    reservation_id = request.data.get('reservation_id')

    if booking_code:
        reservation = TableReservation.objects.filter(booking_code__iexact=booking_code).first()
    elif reservation_id:
        reservation = TableReservation.objects.filter(pk=reservation_id).first()
    else:
        return Response({'error': 'Please provide a valid booking code (e.g. VB-XXXX).'}, status=status.HTTP_400_BAD_REQUEST)

    if not reservation:
        return Response({'error': f"No reservation found with check-in code '{booking_code}'."}, status=status.HTTP_404_NOT_FOUND)

    if reservation.status == 'CANCELLED':
        return Response({'error': 'This reservation was previously cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

    table = reservation.table
    if not table:
        table = Table.objects.filter(status='AVAILABLE', capacity__gte=reservation.guest_count, is_active=True).first()
        if table:
            reservation.table = table

    if not table:
        return Response({'error': 'No table is currently assigned or available for this party size. Please assign a table.'}, status=status.HTTP_400_BAD_REQUEST)

    reservation.status = 'SEATED'
    reservation.is_alert_dismissed = True
    reservation.save(update_fields=['status', 'is_alert_dismissed', 'table'])

    session = table.get_current_session()
    if not session:
        from customers.models import Customer
        customer = None
        if reservation.customer_phone:
            customer, _ = Customer.objects.get_or_create(
                phone=reservation.customer_phone,
                defaults={'name': reservation.customer_name, 'email': reservation.customer_email}
            )
        import string
        code = f"{table.id}-{''.join(random.choices(string.digits, k=4))}"
        session = TableSession.objects.create(
            table=table,
            session_code=code,
            customer=customer,
            guest_count=reservation.guest_count,
            status='ACTIVE',
            notes=f"[Advance Booking {reservation.booking_code}] {reservation.notes}".strip()
        )
        table.status = 'OCCUPIED'
        table.save(update_fields=['status', 'updated_at'])

    AuditLog.objects.create(
        user_name=request.data.get('staff_name', 'Host'),
        role='MANAGER',
        action='Checked In Advance Reservation',
        entity_type='TableReservation',
        entity_id=str(reservation.id),
        details=f"Guest {reservation.customer_name} arrived with code {reservation.booking_code}. Seated at {table.number}."
    )

    return Response({
        'message': f"Guest {reservation.customer_name} verified! Seated at {table.number}. Table session #{session.session_code} is now active.",
        'reservation': TableReservationSerializer(reservation).data,
        'table': TableSerializer(table).data,
        'session_id': session.id
    })


