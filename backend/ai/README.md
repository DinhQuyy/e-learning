# AI Service

FastAPI service for the authenticated Kognify chat assistant.

## Scope

- Uses OpenAI Responses API with server-side tools
- Supports multi-turn chat with `previous_response_id`
- Answers course, module, and lesson questions from live database data
- Stores conversations, messages, feedback, tool traces, and OpenAI response IDs
- Caches structured `lesson-study` output in Postgres using lesson content hash + model + prompt version
- Serves deterministic lesson references from internal platform content
- Caches structured `quiz-mistake-review` output in Postgres by immutable attempt ID + model + prompt version

## Environment

Required variables:

```env
AI_INTERNAL_KEY=change-me
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REASONING_EFFORT=low
OPENAI_TIMEOUT_MS=30000
AI_MAX_TOOL_CALLS=6
RATE_LIMIT_PER_MIN=20
PG_HOST=database
PG_PORT=5432
PG_DB=elearning
PG_USER=directus
PG_PASSWORD=...
REDIS_URL=redis://redis:6379/0
```

## API

- `GET /v1/health`
- `GET /v1/dashboard-coach`
- `GET /v1/lesson-references`
- `POST /v1/chat`
- `POST /v1/lesson-study`
- `POST /v1/quiz-mistake-review`
- `POST /v1/feedback`

All requests require `X-AI-Internal-Key`.

## Local Run

```bash
python -m app.migrate
uvicorn app.main:app --reload --port 8090
```

## Tooling

Current server-side tools:

- `search_courses`
- `get_course_details`
- `get_course_outline`

Add new tools in `app/tool_registry.py`.
