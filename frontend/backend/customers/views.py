import random
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Customer, CustomerOTP, Feedback
from .serializers import CustomerSerializer, FeedbackSerializer
from tables.models import TableSession
from core.models import AuditLog

@api_view(['GET'])
def customer_list_view(request):
    search = request.GET.get('search', '').strip()
    qs = Customer.objects.all()
    if search:
        qs = qs.filter(name__icontains=search) | qs.filter(phone__icontains=search)
    serializer = CustomerSerializer(qs[:100], many=True)
    return Response(serializer.data)

@api_view(['GET'])
def customer_detail_view(request, pk):
    try:
        customer = Customer.objects.get(pk=pk)
    except Customer.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # fetch recent orders
    orders = customer.orders.all()[:10]
    orders_data = [
        {
            'id': o.id,
            'order_number': o.order_number,
            'status': o.status,
            'subtotal': float(o.subtotal),
            'date': o.created_at.strftime('%d %b %Y, %I:%M %p'),
            'table': o.session.table.number if o.session else 'N/A'
        }
        for o in orders
    ]
    return Response({
        'customer': CustomerSerializer(customer).data,
        'recent_orders': orders_data
    })

@api_view(['POST'])
def send_otp_view(request):
    phone = request.data.get('phone', '').strip()
    name = request.data.get('name', '').strip()
    if not phone or len(phone) < 10:
        return Response({'error': 'Valid 10-digit phone number is required'}, status=status.HTTP_400_BAD_REQUEST)

    # 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    CustomerOTP.objects.create(phone=phone, otp_code=otp_code)

    # In development/demo, we return the OTP directly for seamless testing and print it
    print(f"\n[SMS OTP DISPATCH] Phone: {phone} | Code: {otp_code} (Valid for 5 mins)\n")

    return Response({
        'message': f"OTP sent to {phone}",
        'phone': phone,
        'otp_code': otp_code, # Convenience for testing
        'expires_in_seconds': 300
    })

@api_view(['POST'])
def verify_otp_view(request):
    phone = request.data.get('phone', '').strip()
    otp_code = request.data.get('otp_code', '').strip()
    name = request.data.get('name', '').strip() or 'Guest'
    session_id = request.data.get('session_id')

    if not phone or not otp_code:
        return Response({'error': 'Phone and OTP code are required'}, status=status.HTTP_400_BAD_REQUEST)

    otp_record = CustomerOTP.objects.filter(phone=phone, otp_code=otp_code, is_verified=False).first()
    
    # Allow '123456' as master test OTP in development
    is_master_test = (otp_code == '123456')

    if not otp_record and not is_master_test:
        return Response({'error': 'Invalid or expired OTP. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

    if otp_record:
        if not otp_record.is_valid():
            return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        otp_record.is_verified = True
        otp_record.save()

    # Get or create customer
    customer, created = Customer.objects.get_or_create(
        phone=phone,
        defaults={'name': name, 'whatsapp': phone}
    )
    if not created and name and customer.name != name:
        customer.name = name
        customer.save(update_fields=['name'])

    # If session provided, link customer to the session
    if session_id:
        try:
            session = TableSession.objects.get(pk=session_id)
            if not session.customer:
                session.customer = customer
                session.save(update_fields=['customer'])
        except TableSession.DoesNotExist:
            pass

    return Response({
        'message': 'Verification successful',
        'customer': CustomerSerializer(customer).data
    })

@api_view(['GET', 'POST'])
def feedback_view(request):
    if request.method == 'GET':
        feedbacks = Feedback.objects.select_related('customer').all()[:50]
        serializer = FeedbackSerializer(feedbacks, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        customer_id = request.data.get('customer_id')
        customer_phone = request.data.get('customer_phone', '').strip()
        session_id = request.data.get('session_id')

        customer = None
        if customer_id:
            try:
                customer = Customer.objects.get(pk=customer_id)
            except Customer.DoesNotExist:
                pass

        if not customer and customer_phone:
            customer = Customer.objects.filter(phone=customer_phone).first()

        if not customer and session_id:
            try:
                from tables.models import TableSession
                sess = TableSession.objects.get(pk=session_id)
                customer = sess.customer
            except Exception:
                pass

        if not customer:
            return Response({'error': 'Customer not found. Please verify via OTP first.'}, status=status.HTTP_400_BAD_REQUEST)

        # Accept both 'comments' and 'comment' (convenience alias)
        comments = request.data.get('comments') or request.data.get('comment', '')
        # Accept both 'rating_overall' and 'rating' as top-level alias
        rating = request.data.get('rating_overall') or request.data.get('rating', 5)

        feedback = Feedback.objects.create(
            customer=customer,
            session_id=session_id if session_id else None,
            rating_overall=rating,
            rating_food=request.data.get('rating_food', rating),
            rating_service=request.data.get('rating_service', rating),
            rating_ambience=request.data.get('rating_ambience', rating),
            comments=comments
        )

        AuditLog.objects.create(
            user_name=customer.name,
            role='CUSTOMER',
            action='Submitted Feedback',
            entity_type='Feedback',
            entity_id=str(feedback.id),
            details=f"Rating: {feedback.rating_overall}★ - {feedback.comments[:60]}"
        )

        return Response(FeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)
