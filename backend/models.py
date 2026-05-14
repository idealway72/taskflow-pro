import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Enum, DateTime
from database import Base


class TaskStatus(str, enum.Enum):
    todo        = "todo"
    in_progress = "in_progress"
    done        = "done"


class Task(Base):
    __tablename__ = "tasks"

    id          = Column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    title       = Column(String(200), nullable=False)
    description = Column(Text,    nullable=True)
    status      = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.todo)
    due_at      = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), nullable=False,
                         default=lambda: datetime.now(timezone.utc))
    updated_at  = Column(DateTime(timezone=True), nullable=False,
                         default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))
