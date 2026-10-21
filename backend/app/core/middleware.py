"""Middleware transversal: request-id, access log y cabeceras de seguridad.

Las cabeceras replican la política de IndexUNI en producción. HSTS no va acá:
lo pone Nginx, que es quien termina TLS (en HTTP plano no significa nada).
"""

import logging
import re
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import request_id_ctx

log = logging.getLogger("flowtask.access")

# Solo se acepta un X-Request-ID entrante si es inofensivo: evita inyección de
# líneas falsas en los logs vía cabecera controlada por el cliente.
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9\-]{8,64}$")

# Swagger/ReDoc cargan JS y CSS de un CDN: con la CSP estricta de la API no renderizan.
_DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
}
# Una API JSON nunca necesita cargar nada: la CSP más estricta posible.
API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        incoming = request.headers.get("X-Request-ID", "")
        request_id = incoming if _SAFE_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        request.state.request_id = request_id
        token = request_id_ctx.set(request_id)

        start = time.perf_counter()
        try:
            response = await call_next(request)
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

            response.headers["X-Request-ID"] = request_id
            response.headers.update(SECURITY_HEADERS)
            if not request.url.path.startswith(_DOCS_PATHS):
                response.headers["Content-Security-Policy"] = API_CSP
                # Datos de tareas: que ningún proxy/navegador los guarde en caché compartida.
                response.headers.setdefault("Cache-Control", "no-store")

            log.log(
                logging.WARNING if response.status_code >= 500 else logging.INFO,
                "%s %s %s",
                request.method,
                request.url.path,
                response.status_code,
                extra={
                    "status": response.status_code,
                    "duration_ms": elapsed_ms,
                    "client_ip": request.client.host if request.client else "-",
                },
            )
            return response
        finally:
            request_id_ctx.reset(token)
