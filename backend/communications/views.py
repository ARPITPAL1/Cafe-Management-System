from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import WhatsAppMessage
from .serializers import WhatsAppMessageSerializer

@api_view(['GET'])
def whatsapp_logs_view(request):
    messages = WhatsAppMessage.objects.select_related('customer').all()[:100]
    serializer = WhatsAppMessageSerializer(messages, many=True)
    return Response(serializer.data)
