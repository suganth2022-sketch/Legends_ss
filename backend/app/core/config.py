"""App-wide settings, loaded from environment variables / `.env`.

Import `settings` from here wherever a config value is needed — never read
`os.environ` directly elsewhere. Secrets have NO defaults on purpose: the app
refuses to start without them rather than silently running with a guessable one.
"""

import re
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "Legends MLM API"
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Supabase Postgres, transaction-mode pooler (port 6543) — used by the running app.
    DATABASE_URL: str
    # Supabase Postgres, session-mode pooler / direct (port 5432) — used only by
    # Alembic (transaction-mode pooling doesn't reliably support DDL).
    DIRECT_URL: str = ""

    # Browser origins allowed to call the API directly. Empty by default: the
    # Next.js frontend calls this API server-side, so no CORS is needed.
    CORS_ORIGINS: list[str] = []

    # Two different secrets so an access token can never be replayed as a refresh token.
    JWT_SECRET: str
    JWT_REFRESH_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRES_IN: int = 15 * 60  # seconds
    REFRESH_TOKEN_EXPIRES_IN: int = 7 * 24 * 60 * 60  # seconds

    # 64 hex chars = 32 bytes. AES-256-GCM key for Aadhaar / PAN / bank account numbers.
    ENCRYPTION_KEY: str

    RATE_LIMIT_ENABLED: bool = True

    @field_validator("JWT_SECRET", "JWT_REFRESH_SECRET")
    @classmethod
    def _strong_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("must be at least 32 characters")
        return v

    @field_validator("ENCRYPTION_KEY")
    @classmethod
    def _valid_key(cls, v: str) -> str:
        if not re.fullmatch(r"[0-9a-fA-F]{64}", v):
            raise ValueError("must be exactly 64 hex characters (32 bytes)")
        return v

    @model_validator(mode="after")
    def _distinct_secrets(self) -> "Settings":
        if self.JWT_SECRET == self.JWT_REFRESH_SECRET:
            raise ValueError("JWT_SECRET and JWT_REFRESH_SECRET must differ")
        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()  # type: ignore[call-arg]  # values come from the environment
