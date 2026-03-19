from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"

    pg_host: str = "database"
    pg_port: int = 5432
    pg_db: str = "elearning"
    pg_user: str = "directus"
    pg_password: str = ""

    redis_url: str = "redis://redis:6379/0"
    ai_internal_key: str = "change-me"

    openai_api_key: str = ""
    openai_model: str = "gpt-5.4-mini"
    openai_reasoning_effort: str = "low"
    openai_timeout_ms: int = 30000

    ai_max_tool_calls: int = 6
    rate_limit_per_min: int = 20

    @property
    def pg_dsn(self) -> str:
        return (
            f"postgresql://{self.pg_user}:{self.pg_password}@"
            f"{self.pg_host}:{self.pg_port}/{self.pg_db}"
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
