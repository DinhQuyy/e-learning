from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_env: str = 'development'

    pg_host: str = 'database'
    pg_port: int = 5432
    pg_db: str = 'elearning'
    pg_user: str = 'directus'
    pg_password: str = ''

    redis_url: str = 'redis://redis:6379/0'

    ai_internal_key: str = 'change-me'

    llm_base_url: str | None = 'http://ollama:11434/v1'
    llm_api_key: str = 'ollama'
    llm_chat_model: str = 'qwen2.5:3b'
    llm_embedding_model: str = 'nomic-embed-text'
    llm_embedding_dim: int = 1536
    llm_max_tokens_helpdesk: int = 320
    llm_max_tokens_references: int = 360
    llm_max_tokens_mentor: int = 260
    llm_max_tokens_assignment: int = 320
    llm_max_tokens_repair: int = 420

    retrieval_top_k: int = 6
    retrieval_cache_ttl_sec: int = 180
    retrieval_max_distance: float = 0.85
    response_cache_ttl_sec: int = 300
    style_examples_cache_ttl_sec: int = 300

    rate_limit_per_min: int = 20

    queue_index_name: str = 'ai:index:documents'

    mentor_overdue_days: int = 3
    feedback_style_example_limit: int = 2

    daily_training_hour_utc: int = 2

    strict_qa_only: bool = False
    strict_qa_modes: str = 'helpdesk,references'
    strict_qa_source_types: str = 'custom_qa'
    strict_qa_min_chunks: int = 1
    strict_qa_max_distance: float = 0.45
    strict_qa_min_token_overlap: float = 0.4
    strict_qa_lookup_ttl_sec: int = 300
    strict_qa_refuse_message: str = (
        'Câu hỏi nằm ngoài bộ dữ liệu đã được phê duyệt. '
        'Vui lòng liên hệ quản trị viên để bổ sung câu hỏi này vào hệ thống.'
    )

    @property
    def pg_dsn(self) -> str:
        return (
            f"postgresql://{self.pg_user}:{self.pg_password}@"
            f"{self.pg_host}:{self.pg_port}/{self.pg_db}"
        )

    @property
    def strict_qa_modes_set(self) -> tuple[str, ...]:
        values = [item.strip().lower() for item in self.strict_qa_modes.split(',') if item.strip()]
        return tuple(values)

    @property
    def strict_qa_source_types_set(self) -> tuple[str, ...]:
        values = [item.strip() for item in self.strict_qa_source_types.split(',') if item.strip()]
        return tuple(values)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
