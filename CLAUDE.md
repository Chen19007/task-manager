# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A lightweight personal task management system with task dependencies, RESTful API, and SVG-based dependency graph visualization.

**Tech Stack:** FastAPI 2.x, SQLAlchemy 2.x, Pydantic 2.x, SQLite, Vanilla JS with SVG

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run server (primary)
python main.py

# Run with uvicorn (with auto-reload)
uvicorn main:app --reload --port 8001
```

**Access Points:**
- API: `http://localhost:8001`
- Swagger UI: `http://localhost:8001/docs`
- Web UI: `http://localhost:8001/static/index.html`

## Architecture

### Backend Structure
- `main.py` - FastAPI application, all API routes, cycle detection logic
- `database.py` - DB connection and session management
- `models.py` - SQLAlchemy ORM models (Project, Task, Dependency)
- `schemas.py` - Pydantic validation schemas

### Frontend Structure
- `static/js/api.js` - API client functions
- `static/js/layout.js` - Graph layout algorithm
- `static/js/renderer.js` - SVG rendering
- `static/js/interaction.js` - User interactions (drag, zoom, connect)
- `static/js/main.js` - Entry point

### Data Flow
API Routes → Pydantic Validation (schemas) → SQLAlchemy ORM (models) → SQLite

## Key Conventions

- **Database Path**: Uses `Path(__file__).parent.resolve()` to ensure `tasks.db` is always in project directory
- **Task Status**: `pending`, `in_progress`, `completed`
- **Circular Dependency Prevention**: DFS-based cycle detection in `would_create_cycle()` at `main.py:86`
- **Default Project**: Unspecified tasks default to `project_id=1`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/projects` | List/Create projects |
| GET/PUT/DELETE | `/api/projects/{id}` | Project CRUD |
| GET | `/api/tasks` | List tasks (supports `?project_id=` filter) |
| GET | `/api/tasks/with-dependencies` | Tasks with dependency info |
| GET/PUT/DELETE | `/api/tasks/{id}` | Task CRUD |
| POST | `/api/tasks/{id}/dependencies` | Add dependency |
| DELETE | `/api/tasks/{id}/dependencies/{depends_on_id}` | Remove dependency |

## Database Models

- **Project**: id, name, description, color, tasks relationship
- **Task**: id, title, description, status, project_id, dependencies[], dependents[]
- **Dependency**: task_id, depends_on_id (composite PK)
