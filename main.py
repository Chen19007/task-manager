from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional

import models
import schemas
from database import engine, get_db

# 创建数据库表
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Task Manager API",
    description="轻量级个人任务管理系统，支持任务依赖管理和项目管理",
    version="2.0.0"
)

# 添加 CORS 支持
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory="static"), name="static")


# ==================== Project CRUD 接口 ====================

@app.get("/api/projects", response_model=List[schemas.ProjectResponse])
def get_all_projects(db: Session = Depends(get_db)):
    """获取所有项目（含任务统计）"""
    projects = db.query(models.Project).all()
    result = []
    for project in projects:
        # 统计每个项目的任务数量
        task_count = db.query(models.Task).filter(
            models.Task.project_id == project.id
        ).count()
        result.append(schemas.ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            color=project.color,
            created_at=project.created_at,
            task_count=task_count
        ))
    return result


@app.get("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """获取项目详情"""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    task_count = db.query(models.Task).filter(
        models.Task.project_id == project.id
    ).count()

    return schemas.ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        created_at=project.created_at,
        task_count=task_count
    )


@app.post("/api/projects", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    """创建新项目"""
    # 检查项目名是否已存在
    existing = db.query(models.Project).filter(models.Project.name == project.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="项目名已存在")

    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@app.put("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: int, project_update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    """更新项目"""
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="项目不存在")

    update_data = project_update.model_dump(exclude_unset=True)

    # 如果更新了项目名，检查是否重复
    if "name" in update_data and update_data["name"] != db_project.name:
        existing = db.query(models.Project).filter(
            models.Project.name == update_data["name"],
            models.Project.id != project_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="项目名已存在")

    for field, value in update_data.items():
        setattr(db_project, field, value)

    db.commit()
    db.refresh(db_project)
    return db_project


@app.delete("/api/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """删除项目（仅限空项目）"""
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 检查项目下是否还有任务
    task_count = db.query(models.Task).filter(
        models.Task.project_id == project_id
    ).count()
    if task_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"无法删除：项目还有 {task_count} 个任务"
        )

    db.delete(db_project)
    db.commit()
    return None


# ==================== 任务 CRUD 接口 ====================

@app.get("/api/tasks", response_model=List[schemas.TaskResponse])
def get_all_tasks(
    project_id: Optional[int] = Query(None, description="过滤指定项目的任务"),
    db: Session = Depends(get_db)
):
    """获取所有任务（可选按项目过滤）"""
    query = db.query(models.Task)
    if project_id is not None:
        query = query.filter(models.Task.project_id == project_id)
    tasks = query.all()
    return tasks


@app.get("/api/tasks/with-dependencies", response_model=List[schemas.TaskWithDependencies])
def get_all_tasks_with_dependencies(
    project_id: Optional[int] = Query(None, description="过滤指定项目的任务"),
    db: Session = Depends(get_db)
):
    """获取所有任务及其依赖关系（可选按项目过滤）"""
    query = db.query(models.Task)
    if project_id is not None:
        query = query.filter(models.Task.project_id == project_id)
    tasks = query.all()

    result = []
    for task in tasks:
        dependencies = [d.depends_on_id for d in task.dependencies]
        dependents = [d.task_id for d in task.dependents]
        result.append(schemas.TaskWithDependencies(
            **schemas.TaskResponse.model_validate(task).model_dump(),
            dependencies=dependencies,
            dependents=dependents
        ))
    return result


@app.post("/api/tasks", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    """创建新任务（未指定 project_id 时使用默认项目）"""
    # 如果未指定项目，使用默认项目（ID=1）
    project_id = task.project_id if task.project_id is not None else 1

    # 验证项目存在
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="指定的项目不存在")

    # 创建任务
    task_data = task.model_dump(exclude_unset=True)
    task_data["project_id"] = project_id
    db_task = models.Task(**task_data)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.get("/api/tasks/{task_id}", response_model=schemas.TaskWithDependencies)
def get_task(task_id: int, db: Session = Depends(get_db)):
    """获取任务详情（包含依赖关系）"""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 获取依赖的任务ID列表
    dependencies = [dep.depends_on_id for dep in task.dependencies]
    # 获取被依赖的任务ID列表
    dependents = [dep.task_id for dep in task.dependents]

    return schemas.TaskWithDependencies(
        **schemas.TaskResponse.model_validate(task).model_dump(),
        dependencies=dependencies,
        dependents=dependents
    )


@app.put("/api/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db)):
    """更新任务"""
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")

    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)

    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """删除任务（同时删除相关的依赖关系）"""
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 删除相关的依赖关系
    db.query(models.Dependency).filter(
        (models.Dependency.task_id == task_id) |
        (models.Dependency.depends_on_id == task_id)
    ).delete()

    db.delete(db_task)
    db.commit()
    return None


# ==================== 任务依赖管理接口 ====================

@app.post("/api/tasks/{task_id}/dependencies", response_model=schemas.TaskWithDependencies)
def add_dependency(task_id: int, dep: schemas.DependencyCreate, db: Session = Depends(get_db)):
    """为任务添加依赖（任务 task_id 依赖于任务 depends_on_id）"""
    # 验证任务存在
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    prerequisite = db.query(models.Task).filter(models.Task.id == dep.depends_on_id).first()
    if not prerequisite:
        raise HTTPException(status_code=404, detail="依赖的任务不存在")

    # 防止自依赖
    if task_id == dep.depends_on_id:
        raise HTTPException(status_code=400, detail="任务不能依赖自己")

    # 检查依赖是否已存在
    existing = db.query(models.Dependency).filter(
        models.Dependency.task_id == task_id,
        models.Dependency.depends_on_id == dep.depends_on_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="依赖关系已存在")

    # 检查循环依赖
    if would_create_cycle(db, dep.depends_on_id, task_id):
        raise HTTPException(status_code=400, detail="无法添加依赖：会产生循环依赖")

    # 创建依赖关系
    db_dep = models.Dependency(task_id=task_id, depends_on_id=dep.depends_on_id)
    db.add(db_dep)
    db.commit()
    db.refresh(task)

    # 返回更新后的任务
    dependencies = [d.depends_on_id for d in task.dependencies]
    dependents = [d.task_id for d in task.dependents]

    return schemas.TaskWithDependencies(
        **schemas.TaskResponse.model_validate(task).model_dump(),
        dependencies=dependencies,
        dependents=dependents
    )


@app.delete("/api/tasks/{task_id}/dependencies/{depends_on_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_dependency(task_id: int, depends_on_id: int, db: Session = Depends(get_db)):
    """
    删除依赖关系

    参数:
    - task_id: 任务ID
    - depends_on_id: 被依赖的任务ID

    示例: DELETE /api/tasks/2/dependencies/1 表示删除"任务2依赖任务1"的关系
    """
    # 验证任务存在
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 验证被依赖的任务存在
    prerequisite = db.query(models.Task).filter(models.Task.id == depends_on_id).first()
    if not prerequisite:
        raise HTTPException(status_code=404, detail="被依赖的任务不存在")

    # 查找并删除依赖关系
    db_dep = db.query(models.Dependency).filter(
        models.Dependency.task_id == task_id,
        models.Dependency.depends_on_id == depends_on_id
    ).first()
    if not db_dep:
        raise HTTPException(status_code=404, detail="依赖关系不存在")

    db.delete(db_dep)
    db.commit()
    return None


# ==================== 辅助函数 ====================

def would_create_cycle(db: Session, prerequisite_id: int, dependent_id: int) -> bool:
    """
    检查添加依赖是否会产生循环依赖
    使用 DFS 检查从 prerequisite_id 是否能到达 dependent_id
    """
    visited = set()

    def dfs(current_id: int) -> bool:
        if current_id == dependent_id:
            return True
        if current_id in visited:
            return False
        visited.add(current_id)

        # 获取当前任务依赖的所有任务
        deps = db.query(models.Dependency).filter(
            models.Dependency.task_id == current_id
        ).all()

        for dep in deps:
            if dfs(dep.depends_on_id):
                return True
        return False

    return dfs(prerequisite_id)


@app.get("/")
def root():
    """根路径"""
    return {
        "message": "Task Manager API",
        "docs": "/docs",
        "version": "2.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
