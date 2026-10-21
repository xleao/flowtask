FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Nunca correr como root dentro del contenedor.
RUN useradd --system --uid 10001 flowtask
USER flowtask

EXPOSE 8010
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8010/health')"

# 1) seed.py aplica migraciones Alembic + categorías (idempotente, una sola vez).
# 2) uvicorn: --proxy-headers para ver la IP real detrás de Nginx (rate limit),
#    --no-access-log porque la app ya registra cada request con su request_id.
CMD ["sh", "-c", "python seed.py && exec uvicorn main:app --host 0.0.0.0 --port 8010 --no-server-header --no-access-log --proxy-headers --forwarded-allow-ips='*'"]
