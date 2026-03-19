from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


RoleType = Literal["admin", "instructor", "student"]
MessageRole = Literal["user", "assistant", "system"]


class ReferenceItem(BaseModel):
    kind: Literal["course", "module", "lesson"]
    id: str
    title: str
    url: str
    subtitle: str | None = None
    description: str | None = None


class ChatResponse(BaseModel):
    answer: str
    references: list[ReferenceItem] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    user_id: str
    role: RoleType
    message: str = Field(min_length=1)
    conversation_id: str | None = None
    course_id: str | None = None
    current_path: str | None = None


class FeedbackRequest(BaseModel):
    user_id: str
    conversation_id: str
    message_id: str
    mode: Literal["chat"] = "chat"
    rating: Literal[-1, 1]
    comment: str | None = None
    include_in_training: bool = False


class FeedbackResponse(BaseModel):
    status: Literal["ok"]
    feedback_id: str
