from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from bancada.core.health import run_all_checks


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        checks = run_all_checks()
        healthy = all(check.ok for check in checks)
        payload = {
            "status": "ok" if healthy else "degraded",
            "checks": {check.name: {"ok": check.ok, "detail": check.detail} for check in checks},
        }
        code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(payload, status=code)
