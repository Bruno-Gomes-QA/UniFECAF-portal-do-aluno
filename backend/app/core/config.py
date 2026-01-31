"""
UniFECAF Portal do Aluno - Backend Configuration
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql://unifecaf:unifecaf@db:5432/unifecaf_dev"

    # JWT
    jwt_secret: str = "changeme-super-secret-key-min-32-chars"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60
    cookie_name: str = "access_token"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"  # "lax" | "strict" | "none"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # App
    app_name: str = "UniFECAF Portal do Aluno"
    debug: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
