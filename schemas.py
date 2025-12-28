from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pending"


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaskWithDependencies(TaskResponse):
    dependencies: List[int] = []  # 依赖的任务ID列表
    dependents: List[int] = []    # 被依赖的任务ID列表

    class Config:
        from_attributes = True


class DependencyCreate(BaseModel):
    depends_on_id: int
