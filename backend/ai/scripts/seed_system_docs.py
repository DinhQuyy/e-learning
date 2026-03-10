from __future__ import annotations

import os

import httpx

AI_API_URL = os.getenv("AI_API_URL", "http://localhost:8090")
AI_INTERNAL_KEY = os.getenv("AI_INTERNAL_KEY", "change-me")

FAQS = [
    (
        "Where to create a course?",
        "Open Instructor Portal and click Create Course at /instructor/courses/new.",
    ),
    (
        "How to edit a lesson?",
        "Open your course, then open lesson editor to update lesson content.",
    ),
    (
        "Where to submit a quiz?",
        "On lesson page, scroll to Quiz section and click submit.",
    ),
    (
        "Where to view learning progress?",
        "Open student dashboard or My Courses to view progress.",
    ),
    (
        "Where to view certificates?",
        "Open /my-certificates to view and download certificates.",
    ),
    (
        "How to add a module?",
        "Open course module management page and create a new module.",
    ),
    (
        "Where to change password?",
        "Open profile settings and use the password change form.",
    ),
    (
        "How to reset forgotten password?",
        "Use Forgot Password on the login page.",
    ),
    (
        "Where to manage students?",
        "Instructor can manage students inside each course page.",
    ),
    (
        "Where to review courses as admin?",
        "Admin can review courses in admin management pages.",
    ),
    (
        "Where to moderate reviews?",
        "Admin can moderate reviews in admin reviews page.",
    ),
    (
        "Where to view orders?",
        "Students use /orders. Admin uses admin orders page.",
    ),
    (
        "How does wishlist work?",
        "Add courses to wishlist and manage items at /wishlist.",
    ),
    (
        "How does cart work?",
        "Add courses to cart and checkout at /cart.",
    ),
    (
        "How to become instructor?",
        "Submit your instructor application from Become Instructor page.",
    ),
    (
        "Where to edit quiz?",
        "Open quiz editor in instructor portal.",
    ),
    (
        "Where to see notifications?",
        "Open notifications page to see all notifications.",
    ),
    (
        "Where is admin dashboard?",
        "Login as admin and open /admin/dashboard.",
    ),
    (
        "Where is instructor dashboard?",
        "Login as instructor and open /instructor/dashboard.",
    ),
    (
        "Where are my courses?",
        "Students can open /my-courses.",
    ),
]


def main() -> None:
    headers = {"X-AI-Internal-Key": AI_INTERNAL_KEY}

    with httpx.Client(timeout=20.0) as client:
        for idx, (title, content) in enumerate(FAQS, start=1):
            payload = {
                "source_type": "system_docs",
                "source_id": f"system-faq-{idx}",
                "title": title,
                "content": content,
                "visibility": "public",
                "operation": "upsert",
            }
            resp = client.post(
                f"{AI_API_URL}/v1/index/document",
                json=payload,
                headers=headers,
            )
            resp.raise_for_status()
            print(f"Indexed FAQ #{idx}: {title}")


if __name__ == "__main__":
    main()
