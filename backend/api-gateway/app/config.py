from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    GATEWAY_PORT: int = 8000

    SECRET_KEY: str
    ALGORITHM: str = "HS256"

    AUTH_SERVICE_URL: str
    TICKET_SERVICE_URL: str
    ASSIGNMENT_SERVICE_URL: str
    NOTIFICATION_SERVICE_URL: str
    ANALYTICS_SERVICE_URL: str

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()