import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Newtonite Operations"
    API_V1_STR: str = "/api/v1"
    
    # Security: Use a robust 64-char default secret for dev, override via env in prod
    SECRET_KEY: str = "newtonite_secret_key_production_grade_5f8a9e2b1c4d7e6f8a0b2c3d4e5f6a7b"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database: defaults to SQLite for zero-dependency local testing and development;
    # in Docker/Production, set to PostgreSQL e.g. postgresql+psycopg://postgres:postgres@db:5432/newtonite
    DATABASE_URL: str = "sqlite:///./newtonite.db"
    
    # First admin bootstrap token (can also be supplied in env)
    ADMIN_BOOTSTRAP_SECRET: str = "newtonite-initial-bootstrap-secret-key-2026"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []

    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
