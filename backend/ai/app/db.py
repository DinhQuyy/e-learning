from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from .config import get_settings


@contextmanager
def get_db() -> Iterator[psycopg.Connection]:
    settings = get_settings()
    conn = psycopg.connect(settings.pg_dsn, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetch_one(query: str, params: tuple | None = None) -> dict | None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            return cur.fetchone()


def fetch_all(query: str, params: tuple | None = None) -> list[dict]:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            return list(cur.fetchall())


def execute(query: str, params: tuple | None = None) -> None:
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())