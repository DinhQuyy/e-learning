from __future__ import annotations

from datetime import date


def risk_band_from_score(score: float) -> str:
    if score >= 65:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def compute_risk_score(
    *,
    inactive_days: int,
    failed_quiz_attempts_7d: int,
    weekly_completed_lessons: int,
    progress_pct: float,
    pending_lessons: int = 0,
    has_recent_activity: bool = True,
) -> tuple[float, str]:
    score = 0.0

    if inactive_days >= 14:
        score += 42
    elif inactive_days >= 7:
        score += 32
    elif inactive_days >= 3:
        score += 22
    elif inactive_days >= 1:
        score += 10

    if failed_quiz_attempts_7d >= 3:
        score += 28
    elif failed_quiz_attempts_7d >= 2:
        score += 20
    elif failed_quiz_attempts_7d >= 1:
        score += 10

    if weekly_completed_lessons == 0 and pending_lessons > 0:
        score += 12
    elif weekly_completed_lessons == 1 and pending_lessons > 2:
        score += 6

    if progress_pct < 15:
        score += 12
    elif progress_pct < 40:
        score += 8
    elif progress_pct < 65:
        score += 4

    if not has_recent_activity and progress_pct < 30:
        score += 8

    score = max(0.0, min(100.0, round(score, 2)))
    return score, risk_band_from_score(score)


def compute_streak_days(activity_dates: list[date], today: date) -> int:
    if not activity_dates:
        return 0

    unique_dates = sorted(set(activity_dates), reverse=True)
    first = unique_dates[0]
    gap = (today - first).days
    if gap > 1:
        return 0

    streak = 1
    previous = first
    for current in unique_dates[1:]:
        if (previous - current).days == 1:
            streak += 1
            previous = current
            continue
        break

    return streak
