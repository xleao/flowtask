"""Configuración tipada, leída de variables de entorno / .env (12-factor)."""

import re
from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Un origen es esquema + host (+ puerto), sin ruta. "http://localhost:5180/" con barra
# final no coincide nunca con la cabecera Origin del navegador: CORS fallaría en silencio.
_ORIGIN = re.compile(r"^https?://[^/\s]+$")

# En desarrollo se acepta cualquier puerto, pero SOLO de la propia máquina: el
# frontend local puede correr en 5180, 5173, 3000 o 4200 sin tocar el .env.
LOCAL_DEV_ORIGIN_REGEX = r"^http://(localhost|127\.0\.0\.1)(:\d{1,5})?$"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "production", "test"] = "development"
    # SQLite por defecto: funciona sin instalar nada (lo que recomienda el enunciado).
    # PostgreSQL: postgresql+psycopg://usuario:clave@host:5432/base (Docker ya lo usa).
    database_url: str = "sqlite:///./flowtask.db"
    # PostgreSQL: corta consultas colgadas antes de que agoten el pool.
    # SQLite: cuánto espera una escritura a que se libere la base.
    db_statement_timeout_ms: int = 5000

    # Listas separadas por coma: más fácil de escribir en un .env que JSON.
    cors_origins: str = "http://localhost:5180,http://127.0.0.1:5180"
    allowed_hosts: str = "*"

    rate_limit: str = "120/minute"
    rate_limit_enabled: bool = True
    # memory:// cuenta por proceso. Con varios workers/servidores: redis://host:6379
    rate_limit_storage_uri: str = "memory://"

    # Aplica migraciones Alembic y siembra categorías al arrancar (idempotente).
    # Equivale a `python seed.py`. Con varios workers conviene apagarlo y correr
    # seed.py una sola vez antes de arrancar (así lo hace el Dockerfile).
    init_db_on_startup: bool = True

    log_level: str = "INFO"
    log_format: Literal["text", "json"] = "text"

    @field_validator("cors_origins")
    @classmethod
    def _normalize_origins(cls, value: str) -> str:
        origins = [o.strip().rstrip("/") for o in value.split(",") if o.strip()]
        invalid = [o for o in origins if o != "*" and not _ORIGIN.match(o)]
        if invalid:
            raise ValueError(f"CORS_ORIGINS inválido: {invalid}. Formato: http(s)://host[:puerto], sin ruta")
        return ",".join(origins)

    @property
    def cors_origin_list(self) -> list[str]:
        return self.cors_origins.split(",") if self.cors_origins else []

    @property
    def cors_origin_regex(self) -> str | None:
        """Comodín de puertos locales: solo en desarrollo, nunca en test ni producción."""
        return LOCAL_DEV_ORIGIN_REGEX if self.environment == "development" else None

    @property
    def allowed_host_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @model_validator(mode="after")
    def _production_guardrails(self) -> "Settings":
        # Falla al arrancar en vez de salir a producción con una config permisiva.
        if self.is_production:
            if "*" in self.allowed_host_list:
                raise ValueError("En producción ALLOWED_HOSTS debe listar los dominios reales, no '*'")
            if "*" in self.cors_origin_list:
                raise ValueError("En producción CORS_ORIGINS no puede ser '*'")
            if self.database_url.startswith("sqlite"):
                raise ValueError("En producción se requiere PostgreSQL")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
