from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ==================== Project Schemas ====================

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#2196f3"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    task_count: int = 0

    class Config:
        from_attributes = True


# ==================== Task Schemas ====================

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "pending"


class TaskCreate(TaskBase):
    project_id: Optional[int] = None  # 可选，未指定时使用默认项目


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaskWithDependencies(TaskResponse):
    dependencies: List[int] = []  # 依赖的任务ID列表
    dependents: List[int] = []    # 被依赖的任务ID列表

    class Config:
        from_attributes = True


# ==================== Dependency Schemas ====================

class DependencyCreate(BaseModel):
    depends_on_id: int
