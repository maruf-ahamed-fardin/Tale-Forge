from functools import lru_cache
from typing import Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TaleForge API"
    environment: str = "development"
    log_level: str = "INFO"

    database_url: str = (
        "postgresql+psycopg://taleforge:taleforge_dev_password@localhost:5432/taleforge"
    )

    jwt_secret: str = "replace-with-a-long-random-secret"
    jwt_expires_minutes: int = 1440  # 24 hours

    allow_anonymous_dev_mode: bool = False

    storage_provider: str = "local"
    storage_path: str = "./storage"
    max_upload_mb: int = 50

    model_name: str = ""
    model_adapter_path: str = ""
    # Shared secret for /api/v1/generate/local (called server-side by the web app).
    # The endpoint is disabled while this is empty.
    local_model_token: str = ""
    generation_config_path: str = "./configs/generation.yaml"
    training_config_path: str = "./configs/training.yaml"

    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production_security(self) -> Self:
        if self.environment == "production":
            if (
                not self.jwt_secret
                or self.jwt_secret == "replace-with-a-long-random-secret"
                or len(self.jwt_secret) < 32
            ):
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: A secure, strong JWT_SECRET "
                    "(at least 32 characters) must be configured in production environment."
                )
            if self.allow_anonymous_dev_mode:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: allow_anonymous_dev_mode "
                    "MUST NOT be enabled in production."
                )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip() and origin.strip() != "*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

