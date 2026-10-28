from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Project backend root directory
BASE_DIR = Path(__file__).resolve().parents[2]

# Common backend .env file
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    # JWT Configuration
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # Service URLs
    AUTH_SERVICE_URL: str = "http://127.0.0.1:8001"
    TICKET_SERVICE_URL: str = "http://127.0.0.1:8002"

    # Assignment database variable in your existing .env
    ASSIGNMENT_DATABASE_URL: str

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def DATABASE_URL(self) -> str:
        return self.ASSIGNMENT_DATABASE_URL


settings = Settings()