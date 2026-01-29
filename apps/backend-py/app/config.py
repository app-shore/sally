"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import List

from pydantic import Field, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    environment: str = Field(default="development", description="Environment name")
    debug: bool = Field(default=False, description="Debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    project_name: str = Field(default="SALLY Backend", description="Project name")
    api_v1_prefix: str = Field(default="/api/v1", description="API v1 prefix")

    # Security
    secret_key: str = Field(..., min_length=32, description="Secret key for JWT")
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=30, description="Access token expiration in minutes"
    )

    # Database
    database_url: PostgresDsn = Field(..., description="PostgreSQL database URL")

    # Redis
    redis_url: RedisDsn = Field(..., description="Redis URL")

    # CORS
    cors_origins: str = Field(
        default="http://localhost:3000", description="Allowed CORS origins (comma-separated)"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list."""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return self.cors_origins

    # HOS Constants (FMCSA regulations)
    max_drive_hours: float = Field(default=11.0, description="Maximum driving hours per day")
    max_duty_hours: float = Field(default=14.0, description="Maximum on-duty hours per day")
    required_break_minutes: int = Field(
        default=30, description="Required break duration in minutes"
    )
    break_trigger_hours: float = Field(
        default=8.0, description="Hours after which break is required"
    )
    min_rest_hours: float = Field(default=10.0, description="Minimum rest period in hours")
    sleeper_berth_split_long: float = Field(
        default=8.0, description="Long sleeper berth split duration"
    )
    sleeper_berth_split_short: float = Field(
        default=2.0, description="Short sleeper berth split duration"
    )

    @property
    def database_url_str(self) -> str:
        """Get database URL as string."""
        return str(self.database_url)

    @property
    def redis_url_str(self) -> str:
        """Get Redis URL as string."""
        return str(self.redis_url)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience export
settings = get_settings()
)
