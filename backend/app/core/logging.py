"""Logging de la app: texto legible en desarrollo, JSON de una línea en producción
(listo para Loki / CloudWatch / journald). Cada línea lleva el request_id del
request en curso, así un error del cliente se rastrea hasta su traza en el log."""

import json
import logging
from contextvars import ContextVar
from datetime import datetime, timezone

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

# Atributos que trae todo LogRecord; el resto vino por `extra=` y va al JSON.
_STANDARD_ATTRS = set(vars(logging.makeLogRecord({}))) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": request_id_ctx.get(),
        }
        payload |= {k: v for k, v in vars(record).items() if k not in _STANDARD_ATTRS}
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


class TextFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        extras = " ".join(f"{k}={v}" for k, v in vars(record).items() if k not in _STANDARD_ATTRS)
        rid = request_id_ctx.get()[:8]
        base = f"{self.formatTime(record, '%H:%M:%S')} {record.levelname:<7} [{rid}] {record.getMessage()}"
        text = f"{base} {extras}".rstrip()
        return f"{text}\n{self.formatException(record.exc_info)}" if record.exc_info else text


def configure_logging(level: str, fmt: str) -> None:
    # Handler propio en el logger "flowtask": uvicorn reconfigura el root al
    # arrancar y un basicConfig() quedaría sin efecto.
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter() if fmt == "json" else TextFormatter())
    logger = logging.getLogger("flowtask")
    logger.handlers = [handler]
    logger.setLevel(level.upper())
    logger.propagate = False
