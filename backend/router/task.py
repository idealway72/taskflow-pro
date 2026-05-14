from typing import Optional
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from database import get_db
from models import TaskStatus
from schemas import TaskCreate, TaskUpdate, TaskListItem, TaskDetail
import service.task as task_service

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.post("", response_model=TaskDetail, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    return task_service.create_task(db, data)


@router.get("", response_model=list[TaskListItem])
def list_tasks(
    status: Optional[TaskStatus] = None,
    db: Session = Depends(get_db),
):
    return task_service.list_tasks(db, status)


@router.get("/{task_id}", response_model=TaskDetail)
def get_task(task_id: str, db: Session = Depends(get_db)):
    return task_service.get_task(db, task_id)


@router.put("/{task_id}", response_model=TaskDetail)
def update_task(task_id: str, data: TaskUpdate, db: Session = Depends(get_db)):
    return task_service.update_task(db, task_id, data)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task_service.delete_task(db, task_id)
    return Response(status_code=204)
