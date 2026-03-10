from __future__ import annotations

import json
import re
from typing import Any, NamedTuple

from openai import OpenAI

from .config import get_settings


class LlmResult(NamedTuple):
    content: str
    prompt_tokens: int | None
    completion_tokens: int | None


def _get_client() -> OpenAI:
    settings = get_settings()
    api_key = settings.llm_api_key or "ollama"
    kwargs: dict[str, Any] = {"api_key": api_key}
    if settings.llm_base_url:
        kwargs["base_url"] = settings.llm_base_url
    return OpenAI(**kwargs)


def _resize_embedding(vector: list[float], target_dim: int) -> list[float]:
    current = len(vector)
    if current == target_dim:
        return vector
    if current > target_dim:
        return vector[:target_dim]
    return vector + ([0.0] * (target_dim - current))


def generate_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int | None = None,
) -> LlmResult:
    settings = get_settings()
    client = _get_client()

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    request_kwargs: dict[str, Any] = {
        "model": settings.llm_chat_model,
        "temperature": temperature,
        "messages": messages,
    }
    if max_tokens is not None:
        request_kwargs["max_tokens"] = max_tokens

    try:
        response = client.chat.completions.create(
            response_format={"type": "json_object"},
            **request_kwargs,
        )
    except Exception:
        response = client.chat.completions.create(**request_kwargs)

    usage = response.usage
    content = response.choices[0].message.content or "{}"
    return LlmResult(
        content=content.strip(),
        prompt_tokens=usage.prompt_tokens if usage else None,
        completion_tokens=usage.completion_tokens if usage else None,
    )


def repair_json(system_prompt: str, broken_output: str, schema_name: str) -> LlmResult:
    settings = get_settings()
    repair_prompt = (
        "Fix this JSON so it is valid for schema "
        f"{schema_name}. Return only valid JSON, no extra text:\n{broken_output}"
    )
    return generate_json(
        system_prompt,
        repair_prompt,
        temperature=0,
        max_tokens=settings.llm_max_tokens_repair,
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    if not texts:
        return []

    client = _get_client()
    resp = client.embeddings.create(
        model=settings.llm_embedding_model,
        input=texts,
    )
    return [_resize_embedding(item.embedding, settings.llm_embedding_dim) for item in resp.data]


def parse_json_str(content: str) -> dict[str, Any]:
    normalized = content.strip()
    if normalized.startswith("```"):
        normalized = re.sub(r"^```(?:json)?", "", normalized, flags=re.IGNORECASE).strip()
        normalized = re.sub(r"```$", "", normalized).strip()

    try:
        return json.loads(normalized)
    except json.JSONDecodeError:
        pass

    start = normalized.find("{")
    end = normalized.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = normalized[start : end + 1]
        return json.loads(candidate)

    return json.loads(normalized)
