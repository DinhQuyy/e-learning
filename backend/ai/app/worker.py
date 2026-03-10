from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta, timezone

from .config import get_settings
from .indexing import index_document
from .migrate import run_migrations
from .redis_client import get_redis
from .store import refresh_recent_learning_progress
from .training import run_daily_training_cycle

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('ai-worker')


def run() -> None:
    run_migrations()
    settings = get_settings()
    redis = get_redis()

    logger.info('AI worker started. queue=%s', settings.queue_index_name)

    last_aggregate = 0.0
    last_daily_run_date: str | None = None

    def maybe_run_daily_training(now_utc: datetime) -> None:
        nonlocal last_daily_run_date
        if now_utc.hour < settings.daily_training_hour_utc:
            return

        run_key = now_utc.date().isoformat()
        if last_daily_run_date == run_key:
            return

        metric_date = (now_utc - timedelta(days=1)).date().isoformat()
        try:
            counts = run_daily_training_cycle(metric_date=metric_date, per_mode_limit=12)
            logger.info('Daily training done for %s (%s)', metric_date, counts)
            last_daily_run_date = run_key
        except Exception as exc:
            logger.exception('Daily training failed: %s', exc)

    while True:
        now = time.time()
        now_utc = datetime.now(tz=timezone.utc)

        if now - last_aggregate > 300:
            try:
                refresh_recent_learning_progress(window_minutes=15)
            except Exception as exc:
                logger.exception('Failed to refresh learning_progress: %s', exc)
            last_aggregate = now

        maybe_run_daily_training(now_utc)

        job = redis.blpop(settings.queue_index_name, timeout=5)
        if not job:
            continue

        _, payload = job
        try:
            data = json.loads(payload)
            document_id = str(data['document_id'])
            chunk_count = index_document(document_id, embedding_dim=settings.llm_embedding_dim)
            logger.info('Indexed document %s with %s chunks', document_id, chunk_count)
        except Exception as exc:
            logger.exception('Indexing failed: %s', exc)


if __name__ == '__main__':
    run()
