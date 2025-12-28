"""
数据库迁移脚本：添加 Project 层级
步骤：
1. 备份原数据库
2. 创建 projects 表
3. 创建"默认项目"
4. 为 tasks 表添加 project_id 列
5. 将所有现有任务关联到默认项目
"""
import sqlite3
import shutil
from datetime import datetime
import os


# 数据库路径
DB_PATH = "tasks.db"
BACKUP_PATH = f"tasks.db.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"


def backup_database():
    """备份数据库"""
    print(f"正在备份数据库到 {BACKUP_PATH}...")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print("✓ 数据库备份完成")


def migrate():
    """执行迁移"""
    if not os.path.exists(DB_PATH):
        print(f"错误：数据库文件 {DB_PATH} 不存在")
        return False

    # 备份
    backup_database()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("\n开始迁移...")

        # 1. 创建 projects 表
        print("1. 创建 projects 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                color VARCHAR(7) DEFAULT '#2196f3',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✓ projects 表创建完成")

        # 2. 创建默认项目
        print("2. 创建默认项目...")
        cursor.execute("""
            INSERT OR IGNORE INTO projects (id, name, description, color)
            VALUES (1, '默认项目', '系统自动创建的默认项目', '#2196f3')
        """)
        print("   ✓ 默认项目创建完成")

        # 3. 为 tasks 表添加 project_id 列
        print("3. 为 tasks 表添加 project_id 列...")
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [col[1] for col in cursor.fetchall()]

        if "project_id" not in columns:
            cursor.execute("""
                ALTER TABLE tasks
                ADD COLUMN project_id INTEGER DEFAULT 1
            """)
            print("   ✓ project_id 列添加完成")
        else:
            print("   - project_id 列已存在，跳过")

        # 4. 更新所有现有任务，关联到默认项目
        print("4. 关联现有任务到默认项目...")
        cursor.execute("""
            UPDATE tasks
            SET project_id = 1
            WHERE project_id IS NULL
        """)
        updated_count = cursor.rowcount
        print(f"   ✓ 已将 {updated_count} 个任务关联到默认项目")

        # 5. 提交更改
        conn.commit()
        print("\n✓ 迁移成功完成！")

        # 验证结果
        print("\n验证迁移结果...")
        cursor.execute("SELECT COUNT(*) FROM projects")
        project_count = cursor.fetchone()[0]
        print(f"  - 项目总数：{project_count}")

        cursor.execute("SELECT COUNT(*) FROM tasks WHERE project_id = 1")
        task_count = cursor.fetchone()[0]
        print(f"  - 默认项目中的任务数：{task_count}")

        return True

    except Exception as e:
        print(f"\n✗ 迁移失败：{str(e)}")
        conn.rollback()
        print(f"请使用备份恢复数据库：cp {BACKUP_PATH} {DB_PATH}")
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 50)
    print("数据库迁移：添加 Project 层级")
    print("=" * 50)
    print(f"数据库文件：{DB_PATH}")
    print(f"备份文件：{BACKUP_PATH}")
    print("=" * 50)

    success = migrate()

    if success:
        print("\n" + "=" * 50)
        print("迁移完成！您可以安全地启动应用了。")
        print("=" * 50)
    else:
        print("\n" + "=" * 50)
        print("迁移失败，请检查错误信息。")
        print("=" * 50)
