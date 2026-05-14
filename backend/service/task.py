import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import Task, TaskStatus
from schemas import TaskCreate, TaskUpdate

logger = logging.getLogger(__name__)


def create_task(db: Session, data: TaskCreate) -> Task:
    task = Task(
        title=data.title,
        description=data.description,
        status=data.status,
        due_at=data.due_at,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    logger.info("태스크 생성: id=%s", task.id)
    return task


def list_tasks(db: Session, status: TaskStatus | None = None) -> list[Task]:
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    return query.order_by(Task.created_at.desc()).all()


def get_task(db: Session, task_id: str) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="태스크를 찾을 수 없습니다")
    return task


def update_task(db: Session, task_id: str, data: TaskUpdate) -> Task:
    task = get_task(db, task_id)
    # 전송된 필드만 반영 (None 제외)
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    logger.info("태스크 수정: id=%s fields=%s", task_id, list(changes.keys()))
    return task


def delete_task(db: Session, task_id: str) -> None:
    task = get_task(db, task_id)
    db.delete(task)
    db.commit()
    logger.info("태스크 삭제: id=%s", task_id)
