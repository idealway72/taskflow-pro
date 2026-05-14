from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from models import TaskStatus


class TaskCreate(BaseModel):
    title:       str           = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    status:      TaskStatus    = TaskStatus.todo
    due_at:      Optional[datetime] = None

    @field_validator("due_at", mode="before")
    @classmethod
    def require_time_component(cls, v):
        # 날짜만 입력("2026-05-20")은 허용하지 않음 — 시간까지 필수
        if isinstance(v, str) and len(v.strip()) <= 10:
            raise ValueError("due_at은 날짜+시간 형식이어야 합니다 (예: 2026-05-20T18:00:00Z)")
        return v


class TaskUpdate(BaseModel):
    title:       Optional[str]      = Field(default=None, min_length=1, max_length=200)
    description: Optional[str]      = None
    status:      Optional[TaskStatus] = None
    due_at:      Optional[datetime] = None

    @field_validator("due_at", mode="before")
    @classmethod
    def require_time_component(cls, v):
        if isinstance(v, str) and len(v.strip()) <= 10:
            raise ValueError("due_at은 날짜+시간 형식이어야 합니다 (예: 2026-05-20T18:00:00Z)")
        return v


class TaskListItem(BaseModel):
    # 목록 응답 — description 제외
    id:         str
    title:      str
    status:     TaskStatus
    due_at:     Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskDetail(TaskListItem):
    # 단건 응답 — description 포함
    description: Optional[str]
