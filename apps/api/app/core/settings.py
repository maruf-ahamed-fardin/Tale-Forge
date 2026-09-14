from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TaleForge API"
    environment: str = "development"
    log_level: str = "INFO"

    database_url: str = (
        "postgresql+psycopg://taleforge:taleforge_dev_password@localhost:5432/taleforge"
    )

    jwt_secret: str = "replace-with-a-long-random-secret"
    jwt_expires_minutes: int = 10080

    storage_provider: str = "local"
    storage_path: str = "./storage"
    max_upload_mb: int = 50

    model_name: str = ""
    model_adapter_path: str = ""
    generation_config_path: str = "./configs/generation.yaml"
    training_config_path: str = "./configs/training.yaml"

    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
