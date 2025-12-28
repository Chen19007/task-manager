/**
 * API 调用模块
 * 封装所有后端 API 调用
 */
const API = {
    BASE_URL: '/api',

    // ==================== Project API ====================

    /**
     * 获取所有项目
     * @returns {Promise<Array>} 项目列表
     */
    async fetchAllProjects() {
        const response = await fetch(`${this.BASE_URL}/projects`);
        if (!response.ok) {
            throw new Error('获取项目失败');
        }
        return response.json();
    },

    /**
     * 创建项目
     * @param {Object} data - 项目数据
     * @param {string} data.name - 项目名称
     * @param {string} data.description - 项目描述
     * @param {string} data.color - 颜色标签
     * @returns {Promise<Object>} 创建的项目
     */
    async createProject(data) {
        const response = await fetch(`${this.BASE_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '创建项目失败');
        }
        return response.json();
    },

    /**
     * 更新项目
     * @param {number} id - 项目ID
     * @param {Object} data - 更新数据
     * @returns {Promise<Object>} 更新后的项目
     */
    async updateProject(id, data) {
        const response = await fetch(`${this.BASE_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '更新项目失败');
        }
        return response.json();
    },

    /**
     * 删除项目
     * @param {number} id - 项目ID
     * @returns {Promise<void>}
     */
    async deleteProject(id) {
        const response = await fetch(`${this.BASE_URL}/projects/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '删除项目失败');
        }
    },

    // ==================== Task API ====================

    /**
     * 获取所有任务（含依赖关系，可选按项目过滤）
     * @param {number|null} projectId - 项目ID，null 表示获取所有项目
     * @returns {Promise<Array>} 任务列表
     */
    async fetchAllTasks(projectId = null) {
        let url = `${this.BASE_URL}/tasks/with-dependencies`;
        if (projectId !== null) {
            url += `?project_id=${projectId}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('获取任务失败');
        }
        return response.json();
    },

    /**
     * 获取单个任务
     * @param {number} id - 任务ID
     * @returns {Promise<Object>} 任务对象
     */
    async fetchTask(id) {
        const response = await fetch(`${this.BASE_URL}/tasks/${id}`);
        if (!response.ok) {
            throw new Error('获取任务详情失败');
        }
        return response.json();
    },

    /**
     * 创建任务
     * @param {Object} data - 任务数据
     * @param {string} data.title - 任务标题
     * @param {string} data.description - 任务描述
     * @param {string} data.status - 任务状态
     * @param {number} data.project_id - 项目ID（可选）
     * @returns {Promise<Object>} 创建的任务
     */
    async createTask(data) {
        const response = await fetch(`${this.BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('创建任务失败');
        }
        return response.json();
    },

    /**
     * 更新任务
     * @param {number} id - 任务ID
     * @param {Object} data - 更新数据
     * @returns {Promise<Object>} 更新后的任务
     */
    async updateTask(id, data) {
        const response = await fetch(`${this.BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('更新任务失败');
        }
        return response.json();
    },

    /**
     * 删除任务
     * @param {number} id - 任务ID
     * @returns {Promise<void>}
     */
    async deleteTask(id) {
        const response = await fetch(`${this.BASE_URL}/tasks/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('删除任务失败');
        }
    },

    /**
     * 添加依赖关系
     * @param {number} taskId - 任务ID
     * @param {number} depId - 依赖的任务ID
     * @returns {Promise<Object>} 更新后的任务
     */
    async addDependency(taskId, depId) {
        const response = await fetch(`${this.BASE_URL}/tasks/${taskId}/dependencies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ depends_on_id: depId })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '添加依赖失败');
        }
        return response.json();
    },

    /**
     * 删除依赖关系
     * @param {number} taskId - 任务ID
     * @param {number} depId - 依赖的任务ID
     * @returns {Promise<void>}
     */
    async removeDependency(taskId, depId) {
        const response = await fetch(`${this.BASE_URL}/tasks/${taskId}/dependencies/${depId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('删除依赖失败');
        }
    }
};
