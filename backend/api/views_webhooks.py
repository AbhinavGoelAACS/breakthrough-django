import logging
from datetime import datetime

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PaperCorrespondence
from .serializers import WebhookPayloadSerializer

logger = logging.getLogger(__name__)


class EmailDeliveryWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = WebhookPayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        logger.info(f"Received email webhook: {payload['event_type']} for {payload['webhook_id']}")

        try:
            correspondence = PaperCorrespondence.objects.get(webhook_id=payload["webhook_id"])
        except PaperCorrespondence.DoesNotExist:
            logger.warning(f"Correspondence not found for webhook_id: {payload['webhook_id']}")
            return Response(
                {
                    "success": False,
                    "message": f"Correspondence not found for webhook_id: {payload['webhook_id']}",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        event_to_status = {
            "delivered": "delivered",
            "bounced": "bounced",
            "failed": "failed",
            "opened": "delivered",
            "sent": "sent",
        }

        new_status = event_to_status.get(payload["event_type"].lower())

        if not new_status:
            logger.warning(f"Unknown event type: {payload['event_type']}")
            return Response(
                {"success": False, "message": f"Unknown event type: {payload['event_type']}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        correspondence.delivery_status = new_status
        correspondence.webhook_received_at = payload.get("timestamp") or datetime.utcnow()

        if payload["event_type"].lower() in ["bounced", "failed"]:
            error_parts = []
            if payload.get("error_code"):
                error_parts.append(f"Code: {payload['error_code']}")
            if payload.get("error_message"):
                error_parts.append(payload["error_message"])
            correspondence.error_message = (
                " - ".join(error_parts) if error_parts else f"Email {payload['event_type']}"
            )

        correspondence.save()

        logger.info(f"Updated correspondence {correspondence.id} status to {new_status}")

        return Response(
            {
                "success": True,
                "message": f"Delivery status updated to {new_status}",
                "correspondence_id": correspondence.id,
            },
            status=status.HTTP_200_OK,
        )


class EmailDeliveryStatusView(APIView):
    def get(self, request, webhook_id):
        try:
            correspondence = PaperCorrespondence.objects.get(webhook_id=webhook_id)
        except PaperCorrespondence.DoesNotExist:
            return Response(
                {"detail": "Correspondence not found"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {
                "webhook_id": webhook_id,
                "correspondence_id": correspondence.id,
                "paper_id": correspondence.paper_id,
                "delivery_status": correspondence.delivery_status,
                "sent_at": correspondence.sent_at.isoformat() if correspondence.sent_at else None,
                "webhook_received_at": correspondence.webhook_received_at.isoformat()
                if correspondence.webhook_received_at
                else None,
                "error_message": correspondence.error_message,
            },
            status=status.HTTP_200_OK,
        )
