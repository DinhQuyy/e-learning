from __future__ import annotations

import os
from collections import defaultdict

import httpx

from app.text_utils import normalize_text


AI_API_URL = os.getenv("AI_API_URL", "http://localhost:8090")
AI_INTERNAL_KEY = os.getenv("AI_INTERNAL_KEY", "change-me")
DIRECTUS_URL = os.getenv("DIRECTUS_URL", "http://localhost:8055")
DIRECTUS_STATIC_TOKEN = os.getenv("DIRECTUS_STATIC_TOKEN", "")


def _directus_get(path: str) -> list[dict]:
    headers = {"Authorization": f"Bearer {DIRECTUS_STATIC_TOKEN}"} if DIRECTUS_STATIC_TOKEN else {}
    with httpx.Client(timeout=60.0) as client:
        response = client.get(f"{DIRECTUS_URL}{path}", headers=headers)
        response.raise_for_status()
        payload = response.json()
        return payload.get("data", [])


def _push_document(client: httpx.Client, payload: dict) -> None:
    headers = {"X-AI-Internal-Key": AI_INTERNAL_KEY}
    response = client.post(f"{AI_API_URL}/v1/index/document", json=payload, headers=headers)
    response.raise_for_status()


def _clean(value: str | None) -> str:
    return normalize_text(value or "")


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique_values: list[str] = []
    for item in values:
        normalized = " ".join(item.split()).strip()
        if not normalized:
            continue
        key = normalized.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique_values.append(normalized)
    return unique_values


def _build_reference_content(
    course: dict,
    modules: list[dict],
    lessons: list[dict],
    quizzes: list[dict],
) -> str:
    title = str(course.get("title") or "Course").strip()
    category = str(course.get("category_id", {}).get("name") or "").strip()
    level = str(course.get("level") or "").strip()
    description = _clean(str(course.get("description") or ""))
    slug = str(course.get("slug") or "").strip()

    module_titles = _unique([str(item.get("title") or "") for item in modules])
    lesson_titles = _unique([str(item.get("title") or "") for item in lessons])
    quiz_titles = _unique([str(item.get("title") or "") for item in quizzes])
    module_links = _unique(
        [
            f"{str(item.get('title') or '').strip()} => /courses/{slug}?from=ai-references&module={item.get('id')}#module-{item.get('id')}"
            for item in modules
            if str(item.get("title") or "").strip() and slug and item.get("id")
        ]
    )
    lesson_links = _unique(
        [
            f"{str(item.get('title') or '').strip()} => /learn/{slug}/{item.get('slug')}?from=ai-references"
            for item in lessons
            if str(item.get("title") or "").strip() and slug and item.get("slug")
        ]
    )

    topics = _unique([title, category, *module_titles, *lesson_titles, *quiz_titles])

    lines = [f"Course: {title}"]
    if category:
        lines.append(f"Category: {category}")
    if level:
        lines.append(f"Level: {level}")
    if description:
        lines.append(f"Description: {description}")
    if slug:
        lines.append(f"Deep link: /courses/{slug}?from=ai-references")
    if topics:
        lines.append(f"Topics: {' | '.join(topics)}")
    if module_titles:
        lines.append(f"Modules: {' | '.join(module_titles)}")
    if module_links:
        lines.append(f"Module links: {' | '.join(module_links)}")
    if lesson_titles:
        lines.append(f"Lessons: {' | '.join(lesson_titles)}")
    if lesson_links:
        lines.append(f"Lesson links: {' | '.join(lesson_links)}")
    if quiz_titles:
        lines.append(f"Quizzes: {' | '.join(quiz_titles)}")

    return "\n".join(lines)


def main() -> None:
    if not DIRECTUS_STATIC_TOKEN:
        raise RuntimeError("DIRECTUS_STATIC_TOKEN is required.")

    courses = _directus_get(
        "/items/courses"
        "?filter[status][_eq]=published"
        "&fields=id,title,slug,description,level,category_id.name"
        "&limit=-1"
    )
    modules = _directus_get(
        "/items/modules"
        "?filter[course_id][status][_eq]=published"
        "&fields=id,title,description,course_id.id"
        "&limit=-1"
    )
    lessons = _directus_get(
        "/items/lessons"
        "?filter[status][_eq]=published"
        "&filter[module_id][course_id][status][_eq]=published"
        "&fields=id,title,slug,module_id.id,module_id.course_id.id"
        "&limit=-1"
    )
    quizzes = _directus_get(
        "/items/quizzes"
        "?filter[lesson_id][module_id][course_id][status][_eq]=published"
        "&fields=id,title,description,lesson_id.module_id.course_id.id"
        "&limit=-1"
    )

    modules_by_course: dict[str, list[dict]] = defaultdict(list)
    for module in modules:
        course_id = str(module.get("course_id", {}).get("id") or "").strip()
        if course_id:
            modules_by_course[course_id].append(module)

    lessons_by_course: dict[str, list[dict]] = defaultdict(list)
    for lesson in lessons:
        course_id = str(lesson.get("module_id", {}).get("course_id", {}).get("id") or "").strip()
        if course_id:
            lessons_by_course[course_id].append(lesson)

    quizzes_by_course: dict[str, list[dict]] = defaultdict(list)
    for quiz in quizzes:
        course_id = str(
            quiz.get("lesson_id", {})
            .get("module_id", {})
            .get("course_id", {})
            .get("id")
            or ""
        ).strip()
        if course_id:
            quizzes_by_course[course_id].append(quiz)

    queued = 0
    with httpx.Client(timeout=60.0) as client:
        for course in courses:
            course_id = str(course.get("id") or "").strip()
            if not course_id:
                continue

            payload = {
                "source_type": "references",
                "source_id": f"course-ref:{course_id}",
                "title": str(course.get("title") or "Course").strip() or "Course",
                "content": _build_reference_content(
                    course,
                    modules_by_course.get(course_id, []),
                    lessons_by_course.get(course_id, []),
                    quizzes_by_course.get(course_id, []),
                ),
                "course_id": None,
                "visibility": "public",
            }
            _push_document(client, payload)
            queued += 1

    print(
        f"Synced {queued} reference documents from "
        f"{len(courses)} published courses, {len(modules)} modules, {len(lessons)} lessons, {len(quizzes)} quizzes."
    )


if __name__ == "__main__":
    main()
