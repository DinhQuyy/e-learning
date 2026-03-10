from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .store import list_feedback_training_examples, upsert_daily_metrics

MODES = ('helpdesk', 'references', 'mentor', 'assignment')
NOISE_KEYS = {'fallback_used', 'retrieved_count', 'cache_hit'}
DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parent.parent / 'generated' / 'few_shot_feedback.json'


def _sanitize_example(mode: str, raw_content: str) -> dict[str, Any] | None:
    try:
        data = json.loads(raw_content)
    except json.JSONDecodeError:
        return None

    if not isinstance(data, dict):
        return None
    if data.get('mode') != mode:
        return None

    cleaned: dict[str, Any] = dict(data)
    for key in NOISE_KEYS:
        cleaned.pop(key, None)
    return cleaned


def build_feedback_snapshot(
    output_path: Path | None = None,
    per_mode_limit: int = 12,
) -> dict[str, int]:
    target = output_path or DEFAULT_OUTPUT_PATH
    target.parent.mkdir(parents=True, exist_ok=True)

    payload: dict[str, list[dict[str, Any]]] = {}
    counts: dict[str, int] = {}

    for mode in MODES:
        rows = list_feedback_training_examples(mode=mode, limit=max(per_mode_limit * 3, 12))
        examples: list[dict[str, Any]] = []

        for row in rows:
            parsed = _sanitize_example(mode=mode, raw_content=str(row.get('assistant_content', '')))
            if not parsed:
                continue
            examples.append(parsed)
            if len(examples) >= per_mode_limit:
                break

        payload[mode] = examples
        counts[mode] = len(examples)

    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return counts


def run_daily_training_cycle(metric_date: str, per_mode_limit: int = 12) -> dict[str, int]:
    upsert_daily_metrics(metric_date)
    return build_feedback_snapshot(per_mode_limit=per_mode_limit)

