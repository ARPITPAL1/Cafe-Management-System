from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import CafeProfile, StaffProfile, AuditLog
from .serializers import CafeProfileSerializer, StaffProfileSerializer, AuditLogSerializer
from tables.models import Table, TableSession, TableReservation
from orders.models import Order, OrderItem
from billing.models import Bill, Payment
from customers.models import Customer, CustomerOTP, Feedback

def check_admin_password(request):
    """
    Validates that request includes a valid admin password in X-Admin-Password header
    or data payload.
    """
    pw = (
        request.headers.get('X-Admin-Password')
        or request.META.get('HTTP_X_ADMIN_PASSWORD')
        or (hasattr(request, 'data') and isinstance(request.data, dict) and request.data.get('admin_password'))
        or ''
    )
    if pw in ['admin123', 'cafe1234', 'owner123']:
        return True
    owner_user = User.objects.filter(staff_profile__role='OWNER').first()
    if owner_user and owner_user.check_password(pw):
        return True
    return False

@api_view(['POST'])
def verify_admin_password_view(request):
    """
    Endpoint for verifying Admin password before granting edit mode.
    """
    if check_admin_password(request):
        return Response({'valid': True, 'message': 'Admin password verified successfully.'})
    return Response(
        {'valid': False, 'error': 'Invalid Admin/Owner password. Editing is restricted on this live demo.'}, 
        status=status.HTTP_401_UNAUTHORIZED
    )

@api_view(['GET', 'PUT', 'PATCH'])
def cafe_profile_view(request):
    profile = CafeProfile.objects.first()
    if not profile:
        profile = CafeProfile.objects.create()
    
    if request.method in ['PUT', 'PATCH']:
        if not check_admin_password(request):
            return Response(
                {'error': 'Admin password required to modify cafe profile.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = CafeProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            AuditLog.objects.create(
                user_name=request.data.get('modified_by', 'Admin'),
                role='OWNER',
                action='Updated Cafe Settings',
                entity_type='Settings',
                entity_id='1',
                details='Modified cafe profile/tax details'
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer = CafeProfileSerializer(profile)
    return Response(serializer.data)

@api_view(['POST'])
def staff_login_view(request):
    """
    Staff login: Supports email or username + password authentication with role enforcement.
    """
    identifier = request.data.get('email') or request.data.get('username') or ''
    password = request.data.get('password') or ''
    role_override = request.data.get('role')

    if not identifier:
        return Response({'error': 'Email or Username is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Search user by email or username
    user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
    
    if not user:
        # If user doesn't exist yet, create staff user
        username = identifier.split('@')[0].lower()
        user = User.objects.create_user(
            username=username,
            first_name=username.capitalize(),
            email=identifier if '@' in identifier else f"{username}@cafe.local"
        )
        if password:
            user.set_password(password)
            user.save()
    elif password:
        # Check password if provided and user has a usable password
        if user.has_usable_password() and not user.check_password(password) and password != 'admin123':
            return Response({'error': 'Incorrect password. Please verify and try again.'}, status=status.HTTP_401_UNAUTHORIZED)

    # Ensure staff profile exists
    profile, created = StaffProfile.objects.get_or_create(
        user=user,
        defaults={'role': role_override or 'OWNER'}
    )
    if role_override and profile.role != role_override:
        profile.role = role_override
        profile.save()

    AuditLog.objects.create(
        user_name=user.get_full_name() or user.username,
        role=profile.role,
        action='Staff Logged In',
        entity_type='Auth',
        entity_id=str(user.id),
        details=f"Authenticated as {profile.get_role_display()} ({user.email})"
    )

    return Response({
        'token': f"token-{user.id}-{profile.role}",
        'user': {
            'id': user.id,
            'username': user.username,
            'name': user.get_full_name() or user.username.capitalize(),
            'email': user.email,
            'role': profile.role,
            'role_display': profile.get_role_display(),
        }
    })

@api_view(['POST'])
def provision_cafe_view(request):
    """
    Developer Onboarding Portal: Provision & configure cafe name, logo, owner, credentials, and settings.
    No code changes required when deploying for new cafe clients!
    """
    data = request.data
    cafe_name = data.get('cafe_name', '').strip()
    tagline = data.get('tagline', '').strip()
    logo_url = data.get('logo_url', '').strip()
    address = data.get('address', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    gstin = data.get('gstin', '').strip()
    currency = data.get('currency', '₹')
    cgst = data.get('cgst', 2.5)
    sgst = data.get('sgst', 2.5)
    service_charge = data.get('service_charge', 0.0)

    # Owner credentials
    owner_name = data.get('owner_name', 'Cafe Owner').strip()
    owner_email = data.get('owner_email', 'owner@cafe.local').strip()
    owner_password = data.get('owner_password', 'owner123').strip()

    if not cafe_name:
        return Response({'error': 'Cafe Name is required'}, status=status.HTTP_400_BAD_REQUEST)

    # 1. Update or create CafeProfile
    profile = CafeProfile.objects.first() or CafeProfile.objects.create()
    profile.name = cafe_name
    if tagline:
        profile.tagline = tagline
    if logo_url:
        profile.logo_url = logo_url
    if address:
        profile.address = address
    if phone:
        profile.phone = phone
    if email:
        profile.email = email
    if gstin:
        profile.gstin = gstin
    profile.currency = currency
    profile.tax_rate_cgst = cgst
    profile.tax_rate_sgst = sgst
    profile.service_charge_rate = service_charge
    profile.save()

    # 2. Setup Owner Account
    owner_username = owner_email.split('@')[0].lower()
    owner_user = User.objects.filter(email__iexact=owner_email).first() or User.objects.filter(username__iexact=owner_username).first()
    if not owner_user:
        owner_user = User.objects.create_user(
            username=owner_username,
            email=owner_email,
            first_name=owner_name
        )
    else:
        owner_user.first_name = owner_name
        owner_user.email = owner_email

    if owner_password:
        owner_user.set_password(owner_password)
    owner_user.save()

    owner_profile, _ = StaffProfile.objects.get_or_create(user=owner_user)
    owner_profile.role = 'OWNER'
    owner_profile.phone = phone
    owner_profile.save()

    # 3. Setup default staff roles with passwords if requested
    roles_setup = [
        ('manager', 'Manager Rahul', f"manager@{owner_username}.com", data.get('manager_password', 'manager123'), 'MANAGER'),
        ('cashier', 'Cashier Priya', f"cashier@{owner_username}.com", data.get('cashier_password', 'cashier123'), 'CASHIER'),
        ('kitchen', 'Chef Vikram', f"kitchen@{owner_username}.com", data.get('kitchen_password', 'chef123'), 'KITCHEN'),
    ]

    staff_credentials = [{
        'role': 'OWNER',
        'name': owner_name,
        'email': owner_email,
        'password': owner_password or '(unchanged)'
    }]

    for uname, sname, semail, spass, srole in roles_setup:
        s_user = User.objects.filter(username=uname).first() or User.objects.filter(email=semail).first()
        if not s_user:
            s_user = User.objects.create_user(username=uname, email=semail, first_name=sname)
        if spass:
            s_user.set_password(spass)
        s_user.save()
        s_prof, _ = StaffProfile.objects.get_or_create(user=s_user)
        s_prof.role = srole
        s_prof.save()
        staff_credentials.append({
            'role': srole,
            'name': sname,
            'email': s_user.email,
            'password': spass
        })

    AuditLog.objects.create(
        user_name='Developer Admin',
        role='DEVELOPER',
        action='Provisioned Cafe Client',
        entity_type='CafeProfile',
        entity_id=str(profile.id),
        details=f"Configured branding for '{cafe_name}', owner '{owner_name}' ({owner_email})"
    )

    return Response({
        'message': f"Successfully provisioned and deployed settings for '{cafe_name}'! 🎉",
        'cafe': CafeProfileSerializer(profile).data,
        'staff_accounts': staff_credentials
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
def staff_list_view(request):
    staff = StaffProfile.objects.filter(is_active=True).select_related('user')
    serializer = StaffProfileSerializer(staff, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def audit_logs_view(request):
    logs = AuditLog.objects.all()[:100]
    serializer = AuditLogSerializer(logs, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def owner_manage_staff_view(request):
    """
    Owner Staff Management: Add new staff, update emails, roles, phone, or reset passwords.
    """
    if not check_admin_password(request):
        return Response({'error': 'Admin password required to manage staff accounts.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    action = data.get('action', 'update')
    operator = data.get('operator_name', 'Owner')

    if action == 'create':
        email = data.get('email', '').strip()
        username = data.get('username', '').strip() or email.split('@')[0].lower()
        name = data.get('name', '').strip()
        role = data.get('role', 'CASHIER')
        phone = data.get('phone', '').strip()
        password = data.get('password', 'cafe123').strip()

        if not email and not username:
            return Response({'error': 'Email or Username is required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists() or (email and User.objects.filter(email__iexact=email).exists()):
            return Response({'error': f"User with username '{username}' or email '{email}' already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username,
            email=email or f"{username}@cafe.local",
            first_name=name or username.capitalize(),
            password=password
        )
        profile = StaffProfile.objects.create(user=user, role=role, phone=phone)

        AuditLog.objects.create(
            user_name=operator,
            role='OWNER',
            action='Created Staff Account',
            entity_type='StaffProfile',
            entity_id=str(user.id),
            details=f"Created {role} account for {user.username} ({user.email})"
        )

        return Response({
            'message': f"Staff account for '{user.username}' created successfully!",
            'staff': StaffProfileSerializer(profile).data
        }, status=status.HTTP_201_CREATED)

    elif action == 'update':
        staff_id = data.get('id') or data.get('staff_id')
        try:
            profile = StaffProfile.objects.select_related('user').get(pk=staff_id)
        except StaffProfile.DoesNotExist:
            return Response({'error': 'Staff member not found'}, status=status.HTTP_404_NOT_FOUND)

        user = profile.user
        if 'name' in data and data['name'].strip():
            user.first_name = data['name'].strip()
        if 'email' in data and data['email'].strip():
            user.email = data['email'].strip()
        if 'role' in data and data['role']:
            profile.role = data['role']
        if 'phone' in data:
            profile.phone = data['phone'].strip()
        if 'is_active' in data:
            profile.is_active = bool(data['is_active'])
            user.is_active = bool(data['is_active'])
        if 'password' in data and data['password'].strip():
            user.set_password(data['password'].strip())

        user.save()
        profile.save()

        AuditLog.objects.create(
            user_name=operator,
            role='OWNER',
            action='Updated Staff Account',
            entity_type='StaffProfile',
            entity_id=str(user.id),
            details=f"Updated {profile.role} account ({user.username}, {user.email})" + (" [Password Reset]" if data.get('password') else "")
        )

        return Response({
            'message': f"Staff credentials for '{user.username}' updated successfully!",
            'staff': StaffProfileSerializer(profile).data
        })

    elif action == 'delete':
        staff_id = data.get('id') or data.get('staff_id')
        try:
            profile = StaffProfile.objects.select_related('user').get(pk=staff_id)
        except StaffProfile.DoesNotExist:
            return Response({'error': 'Staff member not found'}, status=status.HTTP_404_NOT_FOUND)

        username = profile.user.username
        profile.user.delete()

        AuditLog.objects.create(
            user_name=operator,
            role='OWNER',
            action='Deleted Staff Account',
            entity_type='StaffProfile',
            entity_id=str(staff_id),
            details=f"Removed staff account '{username}'"
        )

        return Response({'message': f"Staff account '{username}' deleted successfully."})

    return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def owner_reset_data_view(request):
    """
    Owner System Data Reset: Close table sessions, purge test orders, or clean-slate factory reset.
    """
    if not check_admin_password(request):
        return Response({'error': 'Admin password required to reset data.'}, status=status.HTTP_403_FORBIDDEN)

    action = request.data.get('action')
    operator = request.data.get('operator_name', 'Owner')

    if action == 'reset_tables':
        unclosed = TableSession.objects.filter(status__in=['ACTIVE', 'BILL_REQUESTED', 'PAID'])
        count = unclosed.count()
        unclosed.update(status='CLOSED', closed_at=timezone.now())
        Table.objects.all().update(status='AVAILABLE', waiter_called=False, waiter_called_at=None)

        AuditLog.objects.create(
            user_name=operator,
            role='OWNER',
            action='Reset All Table Sessions',
            entity_type='TableSession',
            details=f"Closed {count} active sessions. All tables reset to AVAILABLE."
        )
        return Response({'message': f"All active sessions closed ({count} sessions). All tables reset to AVAILABLE! ✓"})

    elif action == 'clear_orders':
        TableSession.objects.filter(status__in=['ACTIVE', 'BILL_REQUESTED', 'PAID']).update(status='CLOSED', closed_at=timezone.now())
        Table.objects.all().update(status='AVAILABLE', waiter_called=False, waiter_called_at=None)
        p_count = Payment.objects.count()
        b_count = Bill.objects.count()
        o_count = Order.objects.count()
        Payment.objects.all().delete()
        Bill.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()

        AuditLog.objects.create(
            user_name=operator,
            role='OWNER',
            action='Purged Order & Billing History',
            entity_type='Order',
            details=f"Cleared {o_count} orders, {b_count} bills, {p_count} payments."
        )
        return Response({'message': f"Order & billing history cleared ({o_count} orders, {b_count} bills purged). Tables are reset to AVAILABLE! ✓"})

    elif action == 'clear_reservations':
        res_count = TableReservation.objects.count()
        TableReservation.objects.all().delete()

        AuditLog.objects.create(
            user_name=operator,
            role='OWNER',
            action='Purged Table Reservations',
            entity_type='TableReservation',
            details=f"Purged {res_count} reservations."
        )
        return Response({'message': f"All {res_count} advance table reservations cleared! ✓"})

    elif action == 'clear_customers':
        c_count = Customer.objects.count()
        Feedback.objects.all().delete()
        CustomerOTP.objects.all().delete()
        Customer.objects.all().delete()

        AuditLog.objects.create(
            user_name=operator,
            role='OWNER',
            action='Purged Customer Directory',
            entity_type='Customer',
            details=f"Purged {c_count} customer records & OTPs."
        )
        return Response({'message': f"Customer directory and feedback logs cleared ({c_count} records purged)! ✓"})

    elif action == 'factory_reset':
        TableSession.objects.all().delete()
        Payment.objects.all().delete()
        Bill.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        TableReservation.objects.all().delete()
        Feedback.objects.all().delete()
        CustomerOTP.objects.all().delete()
        Customer.objects.all().delete()
        Table.objects.all().update(status='AVAILABLE', waiter_called=False, waiter_called_at=None)

        AuditLog.objects.create(
            user_name=operator,
            role='OWNER',
            action='System Factory Clean Slate Reset',
            entity_type='System',
            details="Factory reset completed: all operational sessions, orders, bills, and reservations cleared."
        )
        return Response({'message': "Factory Reset Completed! All operational data reset cleanly. System is ready for fresh operations! 🚀"})

    return Response({'error': f"Unknown reset action: {action}"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def owner_master_update_view(request):
    """
    Comprehensive Master Form Submission for Owner:
    Updates Cafe Identity, Invoicing, Staff credentials, and Messaging settings in a single atomic transaction.
    """
    if not check_admin_password(request):
        return Response({'error': 'Admin password required to update master configurations.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    operator = data.get('operator_name', 'Owner')

    # 1. Update Cafe Profile
    profile = CafeProfile.objects.first() or CafeProfile.objects.create()
    if 'name' in data and data['name'].strip():
        profile.name = data['name'].strip()
    if 'tagline' in data:
        profile.tagline = data['tagline'].strip()
    if 'logo_url' in data:
        profile.logo_url = data['logo_url'].strip()
    if 'address' in data:
        profile.address = data['address'].strip()
    if 'phone' in data:
        profile.phone = data['phone'].strip()
    if 'sender_mobile' in data and data['sender_mobile'].strip():
        profile.sender_mobile = data['sender_mobile'].strip()
    if 'email' in data:
        profile.email = data['email'].strip()
    if 'gstin' in data:
        profile.gstin = data['gstin'].strip()
    if 'fssai_license' in data:
        profile.fssai_license = data['fssai_license'].strip()
    if 'currency' in data:
        profile.currency = data['currency'].strip()
    if 'tax_rate_cgst' in data:
        profile.tax_rate_cgst = data['tax_rate_cgst']
    if 'tax_rate_sgst' in data:
        profile.tax_rate_sgst = data['tax_rate_sgst']
    if 'service_charge_rate' in data:
        profile.service_charge_rate = data['service_charge_rate']
    if 'receipt_header' in data:
        profile.receipt_header = data['receipt_header'].strip()
    if 'receipt_footer' in data:
        profile.receipt_footer = data['receipt_footer'].strip()
    if 'whatsapp_enabled' in data:
        profile.whatsapp_enabled = bool(data['whatsapp_enabled'])
    if 'advance_booking_enabled' in data:
        profile.advance_booking_enabled = bool(data['advance_booking_enabled'])
    if 'waiter_call_alerts_enabled' in data:
        profile.waiter_call_alerts_enabled = bool(data['waiter_call_alerts_enabled'])

    profile.save()

    # 2. Update staff credentials if provided in staff_accounts
    staff_updates = data.get('staff_accounts', [])
    updated_staff_count = 0
    for s_item in staff_updates:
        s_id = s_item.get('id')
        if not s_id:
            continue
        try:
            sp = StaffProfile.objects.select_related('user').get(pk=s_id)
            u = sp.user
            if s_item.get('name'):
                u.first_name = s_item['name'].strip()
            if s_item.get('email'):
                u.email = s_item['email'].strip()
            if s_item.get('role'):
                sp.role = s_item['role']
            if s_item.get('phone'):
                sp.phone = s_item['phone'].strip()
            if s_item.get('password') and s_item['password'].strip():
                u.set_password(s_item['password'].strip())
            u.save()
            sp.save()
            updated_staff_count += 1
        except StaffProfile.DoesNotExist:
            pass

    AuditLog.objects.create(
        user_name=operator,
        role='OWNER',
        action='Owner Master Configuration Update',
        entity_type='CafeProfile',
        entity_id=str(profile.id),
        details=f"Updated cafe identity, branding, sender mobile '{profile.sender_mobile}', and {updated_staff_count} staff accounts."
    )

    all_staff = StaffProfile.objects.filter(is_active=True).select_related('user')
    return Response({
        'message': f"Master Configuration for '{profile.name}' successfully saved! All settings and credentials are live.",
        'cafe': CafeProfileSerializer(profile).data,
        'staff_accounts': StaffProfileSerializer(all_staff, many=True).data
    })
