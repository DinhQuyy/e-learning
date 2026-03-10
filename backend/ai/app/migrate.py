from __future__ import annotations

from pathlib import Path

from .db import get_db

MIGRATION_LOCK_KEY = 735275189

def run_migrations() -> None:
    migration_dir = Path(__file__).resolve().parent.parent / 'migrations'
    files = sorted(migration_dir.glob('*.sql'))

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute('SELECT pg_advisory_lock(%s)', (MIGRATION_LOCK_KEY,))
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            for file in files:
                version = file.stem
                cur.execute(
                    'SELECT 1 FROM ai_schema_migrations WHERE version = %s LIMIT 1',
                    (version,),
                )
                already = cur.fetchone()
                if already:
                    continue

                sql = file.read_text(encoding='utf-8')
                cur.execute(sql)
                cur.execute(
                    'INSERT INTO ai_schema_migrations (version) VALUES (%s)',
                    (version,),
                )
            cur.execute('SELECT pg_advisory_unlock(%s)', (MIGRATION_LOCK_KEY,))


if __name__ == '__main__':
    run_migrations()
    print('AI migrations completed.')
