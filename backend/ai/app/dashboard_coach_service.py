from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .db import fetch_all
from .models import DashboardCoachResponse

DEFAULT_TARGET_SECONDS = 7200


def _int(value: Any) -> int:
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _build_continue_href(course_slug: str, next_lesson_slug: str | None) -> str:
    if next_lesson_slug:
        return f"/learn/{course_slug}/{next_lesson_slug}"
    return f"/learn/{course_slug}"


def _fetch_enrollment_rows(user_id: str) -> list[dict[str, Any]]:
    return fetch_all(
        """
        WITH latest_enrollments AS (
            SELECT *
            FROM (
                SELECT
                    e.id,
                    e.user_id,
                    e.course_id,
                    e.status,
                    COALESCE(e.progress_percentage, 0) AS progress_percentage,
                    e.last_lesson_id,
                    e.enrolled_at,
                    e.date_created,
                    ROW_NUMBER() OVER (
                        PARTITION BY e.course_id
                        ORDER BY COALESCE(e.enrolled_at, e.date_created) DESC, e.id DESC
                    ) AS course_rank
                FROM enrollments e
                WHERE e.user_id = %s
            ) ranked
            WHERE ranked.course_rank = 1
        ),
        progress_rollup AS (
            SELECT
                p.enrollment_id,
                COALESCE(MAX(p.date_updated), MAX(p.completed_at), MAX(p.date_created)) AS last_activity_at
            FROM progress p
            GROUP BY p.enrollment_id
        )
        SELECT
            e.id AS enrollment_id,
            e.status AS enrollment_status,
            ROUND(COALESCE(e.progress_percentage, 0))::int AS progress_percent,
            e.enrolled_at,
            e.date_created,
            c.id AS course_id,
            c.title AS course_title,
            c.slug AS course_slug,
            ll.id AS last_lesson_id,
            ll.title AS last_lesson_title,
            ll.slug AS last_lesson_slug,
            nl.id AS next_lesson_id,
            nl.title AS next_lesson_title,
            nl.slug AS next_lesson_slug,
            COALESCE(pr.last_activity_at, e.enrolled_at, e.date_created) AS last_activity_at
        FROM latest_enrollments e
        JOIN courses c ON c.id = e.course_id
        LEFT JOIN lessons ll ON ll.id = e.last_lesson_id
        LEFT JOIN progress_rollup pr ON pr.enrollment_id = e.id
        LEFT JOIN LATERAL (
            SELECT
                l.id,
                l.title,
                l.slug
            FROM modules m
            JOIN lessons l ON l.module_id = m.id
            LEFT JOIN progress p
                ON p.enrollment_id = e.id
               AND p.lesson_id = l.id
            WHERE m.course_id = c.id
              AND COALESCE(l.status, 'published') = 'published'
              AND COALESCE(p.completed, FALSE) = FALSE
            ORDER BY m.sort ASC, l.sort ASC
            LIMIT 1
        ) nl ON TRUE
        ORDER BY COALESCE(pr.last_activity_at, e.enrolled_at, e.date_created) DESC NULLS LAST, c.title ASC
        """,
        (user_id,),
    )


def _fetch_weekly_progress(user_id: str) -> dict[str, int]:
    since = datetime.now(tz=timezone.utc) - timedelta(days=7)
    row = fetch_all(
        """
        SELECT
            COALESCE(SUM(LEAST(GREATEST(COALESCE(p.video_position, 0), 0), GREATEST(COALESCE(l.duration, 0), 0))), 0) AS studied_seconds_7d,
            COUNT(DISTINCT DATE(COALESCE(p.date_updated, p.completed_at, p.date_created)))::int AS active_days_7d
        FROM progress p
        JOIN enrollments e ON e.id = p.enrollment_id
        LEFT JOIN lessons l ON l.id = p.lesson_id
        WHERE e.user_id = %s
          AND COALESCE(p.date_updated, p.completed_at, p.date_created) >= %s
        """,
        (user_id, since),
    )
    if not row:
        return {"studied_seconds_7d": 0, "active_days_7d": 0}
    return {
        "studied_seconds_7d": _int(row[0].get("studied_seconds_7d")),
        "active_days_7d": _int(row[0].get("active_days_7d")),
    }


def build_dashboard_coach(*, user_id: str) -> dict[str, Any]:
    rows = _fetch_enrollment_rows(user_id)
    weekly_stats = _fetch_weekly_progress(user_id)

    in_progress_rows = [
        row
        for row in rows
        if str(row.get("enrollment_status") or "") == "active" and 0 < _int(row.get("progress_percent")) < 100
    ]
    not_started_rows = [
        row
        for row in rows
        if str(row.get("enrollment_status") or "") == "active" and _int(row.get("progress_percent")) <= 0
    ]

    next_action_row = None
    for row in in_progress_rows:
        if str(row.get("next_lesson_id") or "").strip():
            next_action_row = row
            break
    if next_action_row is None and not_started_rows:
        next_action_row = not_started_rows[0]

    if next_action_row:
        course_title = str(next_action_row.get("course_title") or "").strip()
        next_lesson_title = str(next_action_row.get("next_lesson_title") or "").strip()
        progress_percent = _int(next_action_row.get("progress_percent"))
        body = (
            f"Bạn đang ở {progress_percent}% của khóa {course_title}. "
            f"Bước tiếp theo phù hợp nhất là {next_lesson_title}."
            if next_lesson_title
            else f"Khóa {course_title} đã có tiến độ, đây là lúc hợp lý để quay lại học tiếp."
        )
        next_action = {
            "title": next_lesson_title or f"Tiếp tục khóa {course_title}",
            "body": body,
            "cta_label": "Tiếp tục học",
            "cta_href": _build_continue_href(
                str(next_action_row.get("course_slug") or "").strip(),
                str(next_action_row.get("next_lesson_slug") or "").strip() or None,
            ),
            "course_id": str(next_action_row.get("course_id") or "").strip() or None,
            "lesson_id": str(next_action_row.get("next_lesson_id") or "").strip() or None,
            "progress_percent": progress_percent,
        }
    else:
        next_action = {
            "title": "Khám phá khóa học mới",
            "body": "Bạn chưa có bài học tiếp theo đủ rõ ràng. Hãy mở danh sách khóa học để bắt đầu hoặc quay lại course đang quan tâm.",
            "cta_label": "Khám phá khóa học",
            "cta_href": "/courses",
            "course_id": None,
            "lesson_id": None,
            "progress_percent": None,
        }

    now = datetime.now(tz=timezone.utc)
    reminders: list[dict[str, Any]] = []

    inactive_row = next(
        (
            row
            for row in in_progress_rows
            if row.get("last_activity_at")
            and isinstance(row["last_activity_at"], datetime)
            and (now - row["last_activity_at"]).days >= 7
        ),
        None,
    )
    if inactive_row:
        reminders.append(
            {
                "type": "inactive_course",
                "title": f"Bạn đã bỏ dở {str(inactive_row.get('course_title') or '').strip()}",
                "body": f"Khóa này chưa có hoạt động mới trong {(now - inactive_row['last_activity_at']).days} ngày.",
                "cta_label": "Mở khóa học",
                "cta_href": _build_continue_href(
                    str(inactive_row.get("course_slug") or "").strip(),
                    str(inactive_row.get("next_lesson_slug") or "").strip() or None,
                ),
            }
        )

    unfinished_row = next((row for row in in_progress_rows if row is not inactive_row), None)
    if unfinished_row:
        reminders.append(
            {
                "type": "unfinished_course",
                "title": f"Khóa {str(unfinished_row.get('course_title') or '').strip()} vẫn đang dang dở",
                "body": f"Bạn đã hoàn thành {_int(unfinished_row.get('progress_percent'))}% và còn bài học chưa học xong.",
                "cta_label": "Tiếp tục học",
                "cta_href": _build_continue_href(
                    str(unfinished_row.get("course_slug") or "").strip(),
                    str(unfinished_row.get("next_lesson_slug") or "").strip() or None,
                ),
            }
        )

    not_started_row = not_started_rows[0] if not_started_rows else None
    if not_started_row:
        reminders.append(
            {
                "type": "not_started_course",
                "title": f"Bạn đã đăng ký {str(not_started_row.get('course_title') or '').strip()} nhưng chưa bắt đầu",
                "body": "Bắt đầu bài đầu tiên sẽ giúp hệ thống gợi ý lộ trình học tốt hơn cho bạn.",
                "cta_label": "Bắt đầu học",
                "cta_href": _build_continue_href(
                    str(not_started_row.get("course_slug") or "").strip(),
                    str(not_started_row.get("next_lesson_slug") or "").strip() or None,
                ),
            }
        )

    studied_seconds_7d = weekly_stats["studied_seconds_7d"]
    active_days_7d = weekly_stats["active_days_7d"]
    if studied_seconds_7d <= 0:
        weekly_status = "idle"
    elif studied_seconds_7d >= DEFAULT_TARGET_SECONDS:
        weekly_status = "on_track"
    else:
        weekly_status = "behind"

    response = DashboardCoachResponse(
        next_action=next_action,
        reminders=reminders[:3],
        weekly_progress={
            "studied_seconds_7d": studied_seconds_7d,
            "target_seconds": DEFAULT_TARGET_SECONDS,
            "active_days_7d": active_days_7d,
            "status": weekly_status,
        },
        help_prompts=[
            "Giải thích vì sao đây là bài học nên học tiếp theo.",
            "Tôi đang chậm ở khóa nào và nên ưu tiên gì trước?",
            "Nhắc tôi cách xem tiến độ học tập trong hệ thống.",
        ],
    )
    return response.model_dump(mode="json")
