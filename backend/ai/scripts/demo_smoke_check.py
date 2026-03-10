from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from typing import Any

import httpx


AI_API_URL = os.getenv("AI_API_URL", "http://localhost:8090")
AI_INTERNAL_KEY = os.getenv("AI_INTERNAL_KEY", "change-me")
USER_ID = os.getenv("SMOKE_USER_ID", "11111111-1111-1111-1111-111111111111")
COURSE_ID = os.getenv("SMOKE_COURSE_ID", "00000000-0000-0000-0000-000000000000")


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str


def _request(
    client: httpx.Client,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
) -> httpx.Response:
    headers = {"X-AI-Internal-Key": AI_INTERNAL_KEY}
    return client.request(method, f"{AI_API_URL}{path}", json=payload, headers=headers, timeout=60.0)


def run() -> int:
    checks: list[CheckResult] = []
    with httpx.Client() as client:
        try:
            health = _request(client, "GET", "/v1/health")
            checks.append(CheckResult("health", health.status_code == 200, health.text))
        except Exception as exc:
            checks.append(CheckResult("health", False, str(exc)))
            _print(checks)
            return 1

        chat = _request(
            client,
            "POST",
            "/v1/chat",
            {
                "mode": "helpdesk",
                "user_id": USER_ID,
                "role": "student",
                "query": "Toi can huong dan tao khoa hoc moi",
                "context": {"current_path": "/dashboard"},
            },
        )
        chat_ok = chat.status_code == 200
        chat_payload = chat.json() if chat_ok else {}
        checks.append(
            CheckResult(
                "helpdesk_chat",
                chat_ok
                and isinstance(chat_payload.get("conversation_id"), str)
                and isinstance(chat_payload.get("assistant_message_id"), str)
                and isinstance(chat_payload.get("data"), dict),
                str(chat_payload if chat_ok else chat.text),
            )
        )

        mentor = _request(
            client,
            "POST",
            "/v1/mentor/summary",
            {
                "user_id": USER_ID,
                "role": "student",
                "course_id": COURSE_ID,
                "context": {
                    "metrics": {"progress_pct": 35, "streak_days": 2, "last_activity": "2026-03-06"},
                    "pending_lessons": [],
                    "last_activity_at": "2026-03-06T00:00:00Z",
                },
            },
        )
        mentor_ok = mentor.status_code == 200
        mentor_payload = mentor.json() if mentor_ok else {}
        checks.append(
            CheckResult(
                "mentor_summary",
                mentor_ok and mentor_payload.get("data", {}).get("mode") == "mentor",
                str(mentor_payload if mentor_ok else mentor.text),
            )
        )

        assignment = _request(
            client,
            "POST",
            "/v1/assignment/hint",
            {
                "user_id": USER_ID,
                "role": "student",
                "course_id": COURSE_ID,
                "quiz_id": "smoke-quiz",
                "question": "Cho toi dap an cuoi cung",
                "student_attempt": "",
            },
        )
        assignment_ok = assignment.status_code == 200
        assignment_payload = assignment.json() if assignment_ok else {}
        blocked = bool(assignment_payload.get("data", {}).get("blocked", False))
        checks.append(
            CheckResult(
                "assignment_guardrail",
                assignment_ok and blocked,
                str(assignment_payload if assignment_ok else assignment.text),
            )
        )

        conversation_id = chat_payload.get("conversation_id")
        message_id = chat_payload.get("assistant_message_id")
        feedback_ok = False
        feedback_detail = "chat ids missing"
        if isinstance(conversation_id, str) and isinstance(message_id, str):
            feedback = _request(
                client,
                "POST",
                "/v1/feedback",
                {
                    "user_id": USER_ID,
                    "conversation_id": conversation_id,
                    "message_id": message_id,
                    "mode": "helpdesk",
                    "rating": 1,
                    "include_in_training": True,
                },
            )
            feedback_ok = feedback.status_code == 200 and feedback.json().get("status") == "ok"
            feedback_detail = feedback.text
        checks.append(CheckResult("feedback_write", feedback_ok, feedback_detail))

        metrics = _request(client, "GET", "/v1/admin/metrics")
        metrics_ok = metrics.status_code == 200
        checks.append(CheckResult("admin_metrics", metrics_ok, metrics.text))

    _print(checks)
    return 0 if all(item.ok for item in checks) else 1


def _print(checks: list[CheckResult]) -> None:
    print("=== AI Demo Smoke Check ===")
    for item in checks:
        status = "PASS" if item.ok else "FAIL"
        print(f"[{status}] {item.name}")
    failed = [item for item in checks if not item.ok]
    if failed:
        print("--- Fail details ---")
        for item in failed:
            print(f"{item.name}: {item.detail}")


if __name__ == "__main__":
    sys.exit(run())

