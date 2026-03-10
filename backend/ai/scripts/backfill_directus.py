from __future__ import annotations

import os

import httpx

AI_API_URL = os.getenv('AI_API_URL', 'http://localhost:8090')
AI_INTERNAL_KEY = os.getenv('AI_INTERNAL_KEY', 'change-me')
DIRECTUS_URL = os.getenv('DIRECTUS_URL', 'http://localhost:8055')
DIRECTUS_STATIC_TOKEN = os.getenv('DIRECTUS_STATIC_TOKEN', '')


def _directus_get(path: str) -> list[dict]:
    headers = {'Authorization': f'Bearer {DIRECTUS_STATIC_TOKEN}'} if DIRECTUS_STATIC_TOKEN else {}
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(f'{DIRECTUS_URL}{path}', headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data.get('data', [])


def push_document(client: httpx.Client, payload: dict) -> None:
    headers = {'X-AI-Internal-Key': AI_INTERNAL_KEY}
    resp = client.post(f'{AI_API_URL}/v1/index/document', json=payload, headers=headers)
    resp.raise_for_status()


def main() -> None:
    if not DIRECTUS_STATIC_TOKEN:
        raise RuntimeError('DIRECTUS_STATIC_TOKEN is required for backfill script.')

    lessons = _directus_get('/items/lessons?fields=id,title,content,module_id.course_id.id,status&limit=-1')
    modules = _directus_get('/items/modules?fields=id,title,description,course_id.id&limit=-1')
    quizzes = _directus_get('/items/quizzes?fields=id,title,description,lesson_id.module_id.course_id.id,questions.question_text,questions.explanation&limit=-1')

    with httpx.Client(timeout=30.0) as client:
        for lesson in lessons:
            course_id = lesson.get('module_id', {}).get('course_id', {}).get('id')
            visibility = 'public' if lesson.get('status') == 'published' else 'instructor_only'
            push_document(
                client,
                {
                    'source_type': 'course_lesson',
                    'source_id': str(lesson['id']),
                    'title': lesson.get('title') or 'Lesson',
                    'content': lesson.get('content') or lesson.get('title') or '',
                    'course_id': course_id,
                    'visibility': visibility,
                },
            )

        for module in modules:
            push_document(
                client,
                {
                    'source_type': 'course_module',
                    'source_id': str(module['id']),
                    'title': module.get('title') or 'Module',
                    'content': module.get('description') or module.get('title') or '',
                    'course_id': module.get('course_id', {}).get('id'),
                    'visibility': 'enrolled_only',
                },
            )

        for quiz in quizzes:
            questions = quiz.get('questions') or []
            question_text = '\n'.join(
                f"{q.get('question_text', '')}\n{q.get('explanation', '')}" for q in questions
            )
            course_id = (
                quiz.get('lesson_id', {})
                .get('module_id', {})
                .get('course_id', {})
                .get('id')
            )
            push_document(
                client,
                {
                    'source_type': 'quiz',
                    'source_id': str(quiz['id']),
                    'title': quiz.get('title') or 'Quiz',
                    'content': (quiz.get('description') or '') + '\n' + question_text,
                    'course_id': course_id,
                    'visibility': 'enrolled_only',
                },
            )

    print('Backfill queued for lessons/modules/quizzes.')


if __name__ == '__main__':
    main()