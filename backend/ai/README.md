# AI Service

FastAPI + worker service for RAG, mentor and assignment hint-only flows.

## Local Free Setup (Ollama)

This service supports a fully local setup with no per-token API cost.

- Chat model default: `qwen2.5:3b`
- Embedding model default: `nomic-embed-text`
- Base URL default: `http://ollama:11434/v1`

After `docker compose up -d`, pull models once:

```bash
docker compose exec ollama ollama pull qwen2.5:3b
docker compose exec ollama ollama pull nomic-embed-text
```

Then run seed/backfill to "train" the assistant via RAG data:

```bash
docker compose exec ai-api python scripts/seed_system_docs.py
docker compose exec -e DIRECTUS_STATIC_TOKEN=<token> -e DIRECTUS_URL=http://directus:8055 ai-api python scripts/backfill_directus.py
```

## Custom QA Set + Strict QA-Only Mode

Use this when you want AI to answer only from your approved question set.

1. Prepare QA JSON file:

`backend/ai/data/custom_qa.sample.json`

2. Import QA into vector store:

```bash
docker compose exec -T ai-api python scripts/import_custom_qa.py \
  --file data/custom_qa.sample.json \
  --set-name my-qa \
  --source-type custom_qa \
  --visibility public \
  --replace-set
```

3. Enable strict QA-only mode in `backend/.env`:

```env
STRICT_QA_ONLY=true
STRICT_QA_MODES=helpdesk,references
STRICT_QA_SOURCE_TYPES=custom_qa
STRICT_QA_MIN_CHUNKS=1
STRICT_QA_MAX_DISTANCE=0.45
STRICT_QA_MIN_TOKEN_OVERLAP=0.4
STRICT_QA_REFUSE_MESSAGE=Cau hoi nam ngoai bo du lieu da duoc phe duyet. Vui long lien he admin de bo sung.
```

4. Restart AI services:

```bash
docker compose up -d --build ai-api ai-worker
```

When strict mode is on:
- In-scope question (found in `custom_qa`) -> normal answer.
- Out-of-scope question -> refuse response inside valid JSON schema.

Internal API endpoint for admin import:

- `POST /v1/admin/custom-qa/import` (requires `X-AI-Internal-Key`)

## Style Training Loop (feedback -> few-shot)

Collect feedback from frontend by calling `POST /api/ai/feedback` with:

- `conversation_id`
- `assistant_message_id`
- `mode`
- `rating` (`1` helpful, `-1` not helpful)

Build few-shot set from positive feedback:

```bash
docker compose exec ai-api python scripts/build_feedback_few_shots.py
```

Generated snapshot file:

`backend/ai/generated/few_shot_feedback.json`

The AI service reads positive feedback directly from DB at runtime.
The file above is for audit/export/versioning of style examples.

## Run migration

```bash
python -m app.migrate
```

## Run API

```bash
uvicorn app.main:app --reload --port 8090
```

## Run worker

```bash
python -m app.worker
```
