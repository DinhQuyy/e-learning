from __future__ import annotations

from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from app.training import DEFAULT_OUTPUT_PATH, build_feedback_snapshot


def main() -> None:
    counts = build_feedback_snapshot(per_mode_limit=12)
    parts = ', '.join(f'{mode}={counts.get(mode, 0)}' for mode in ('helpdesk', 'references', 'mentor', 'assignment'))
    print(f'Wrote {DEFAULT_OUTPUT_PATH} ({parts})')


if __name__ == '__main__':
    main()

