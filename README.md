# Task Manager - 轻量级个人任务管理系统

一个简单的个人任务管理系统，支持任务依赖管理、REST API、SQLite 数据持久化。

## 功能特性

- 任务管理（增删改查）
- 任务依赖关系管理（防止循环依赖）
- 任务状态跟踪（pending/in_progress/completed）
- RESTful API 接口
- SQLite 数据库（单文件，无需安装）
- 自动生成 API 文档（Swagger UI）

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python main.py
```

或使用 uvicorn：

```bash
uvicorn main:app --reload
```

服务将在 `http://localhost:8000` 启动。

### 3. 访问 API 文档

打开浏览器访问：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API 接口

### 任务管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取所有任务 |
| POST | `/api/tasks` | 创建新任务 |
| GET | `/api/tasks/{id}` | 获取任务详情（含依赖） |
| PUT | `/api/tasks/{id}` | 更新任务 |
| DELETE | `/api/tasks/{id}` | 删除任务 |

### 任务依赖管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tasks/{id}/dependencies` | 添加依赖 |
| DELETE | `/api/tasks/{id}/dependencies/{depends_on_id}` | 删除依赖 |

**删除依赖说明**: `DELETE /api/tasks/2/dependencies/1` 表示删除"任务2依赖任务1"的关系 |

## 使用示例

### 创建任务

```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "完成项目文档",
    "description": "编写项目使用说明",
    "status": "pending"
  }'
```

### 添加依赖

任务 2 依赖于任务 1：

```bash
curl -X POST "http://localhost:8000/api/tasks/2/dependencies" \
  -H "Content-Type: application/json" \
  -d '{
    "depends_on_id": 1
  }'
```

### 更新任务状态

```bash
curl -X PUT "http://localhost:8000/api/tasks/1" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

### 查看任务详情（含依赖）

```bash
curl "http://localhost:8000/api/tasks/1"
```

### 删除依赖关系

删除"任务2依赖任务1"的关系：

```bash
curl -X DELETE "http://localhost:8000/api/tasks/2/dependencies/1"
```

返回示例：

```json
{
  "id": 1,
  "title": "完成项目文档",
  "description": "编写项目使用说明",
  "status": "completed",
  "created_at": "2025-12-28T14:30:00",
  "dependencies": [],
  "dependents": [2]
}
```

## 数据模型

### Task（任务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 主键 |
| title | String(200) | 标题（必填） |
| description | Text | 描述 |
| status | String(20) | 状态：pending/in_progress/completed |
| created_at | DateTime | 创建时间 |

### Dependency（依赖关系）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 主键 |
| task_id | Integer | 任务ID（外键） |
| depends_on_id | Integer | 依赖的任务ID（外键） |

## 循环依赖检测

系统会自动检测并阻止循环依赖。例如：
- 如果任务 A 依赖于任务 B
- 则无法创建任务 B 依赖于任务 A
- 这样可以防止依赖死循环

## 数据库

数据存储在 `tasks.db` SQLite 数据库文件中。

首次运行时会自动创建数据库表。

## 项目结构

```
task-manager/
├── main.py           # 主应用程序（FastAPI + 路由）
├── database.py       # 数据库连接配置
├── models.py         # SQLAlchemy 数据模型
├── schemas.py        # Pydantic 数据验证模型
├── requirements.txt  # Python 依赖
├── .gitignore       # Git 忽略文件
└── README.md        # 项目文档
```

## 技术栈

- FastAPI - 现代化的 Web 框架
- SQLAlchemy - ORM 数据库工具
- SQLite - 轻量级数据库
- Pydantic - 数据验证
- Uvicorn - ASGI 服务器

## 后续扩展

- [ ] 添加任务优先级
- [ ] 添加任务截止日期
- [ ] 添加任务标签/分类
- [ ] 提供 MCP 服务器集成
- [ ] 打包为 Windows 可执行文件（.exe）
- [ ] 添加前端界面

## License

MIT
