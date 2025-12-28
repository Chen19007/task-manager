from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    color = Column(String(7), default="#2196f3")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 与 Task 的一对多关系
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(String(20), default="pending")  # pending, in_progress, completed
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 所属项目
    project = relationship("Project", back_populates="tasks")

    # 依赖关系：当前任务被哪些任务依赖（其他任务依赖当前任务）
    dependents = relationship(
        "Dependency",
        foreign_keys="Dependency.depends_on_id",
        back_populates="prerequisite"
    )

    # 依赖关系：当前任务依赖哪些任务（当前任务依赖其他任务）
    dependencies = relationship(
        "Dependency",
        foreign_keys="Dependency.task_id",
        back_populates="dependent"
    )


class Dependency(Base):
    __tablename__ = "dependencies"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    depends_on_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)

    # task_id 指向的任务
    dependent = relationship("Task", foreign_keys=[task_id], back_populates="dependencies")
    # depends_on_id 指向的任务
    prerequisite = relationship("Task", foreign_keys=[depends_on_id], back_populates="dependents")
