/**
 * 交互处理模块
 * 负责处理所有用户交互：点击、右键菜单、CRUD操作等
 */
const Interaction = {
    selectedTask: null,
    tasks: [],
    layout: {},

    /**
     * 初始化交互处理
     */
    init() {
        this.setupTaskClick();
        this.setupTaskHover();
        this.setupTaskDblClick();
        this.setupContextMenu();
        this.setupToolbar();
        this.setupDialogs();
        this.setupGlobalClick();
        this.setupProjectManagement();
    },

    /**
     * 设置任务点击事件
     */
    setupTaskClick() {
        document.getElementById('tasks-layer').addEventListener('click', (e) => {
            const taskNode = e.target.closest('.task-node');
            if (taskNode) {
                const taskId = parseInt(taskNode.dataset.taskId);
                this.handleTaskClick(taskId);
            } else {
                this.clearSelection();
            }
        });
    },

    /**
     * 处理任务点击
     * @param {number} taskId - 任务ID
     */
    handleTaskClick(taskId) {
        this.selectedTask = taskId;
        Renderer.highlightPaths(taskId, this.tasks, this.layout);
    },

    /**
     * 清除选择
     */
    clearSelection() {
        this.selectedTask = null;
        Renderer.render(this.tasks, this.layout);
    },

    /**
     * 设置任务双击事件
     */
    setupTaskDblClick() {
        document.getElementById('tasks-layer').addEventListener('dblclick', (e) => {
            const taskNode = e.target.closest('.task-node');
            if (taskNode) {
                const taskId = parseInt(taskNode.dataset.taskId);
                this.showEditDialog(taskId);
            }
        });
    },

    /**
     * 设置右键菜单
     */
    setupContextMenu() {
        const tasksLayer = document.getElementById('tasks-layer');
        const contextMenu = document.getElementById('context-menu');

        tasksLayer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const taskNode = e.target.closest('.task-node');
            if (taskNode) {
                const taskId = parseInt(taskNode.dataset.taskId);
                this.showContextMenu(e.clientX, e.clientY, taskId);
            }
        });

        contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleContextMenuAction(action);
                this.hideContextMenu();
            }
        });
    },

    /**
     * 显示右键菜单
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} taskId - 任务ID
     */
    showContextMenu(x, y, taskId) {
        this.selectedTask = taskId;
        const menu = document.getElementById('context-menu');
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.remove('hidden');

        // 隐藏悬浮框
        this.hideDependencyTooltip();

        // 根据任务状态更新菜单项
        const task = this.tasks.find(t => t.id === taskId);
        const removeDepItem = menu.querySelector('[data-action="remove-dep"]');
        removeDepItem.style.display = task && task.dependencies.length > 0 ? 'block' : 'none';
    },

    /**
     * 隐藏右键菜单
     */
    hideContextMenu() {
        document.getElementById('context-menu').classList.add('hidden');
    },

    /**
     * 处理右键菜单操作
     * @param {string} action - 操作类型
     */
    async handleContextMenuAction(action) {
        if (!this.selectedTask) return;

        switch (action) {
            case 'edit':
                this.showEditDialog(this.selectedTask);
                break;
            case 'add-dep':
                this.showAddDependencyDialog(this.selectedTask);
                break;
            case 'remove-dep':
                this.showRemoveDependencyDialog(this.selectedTask);
                break;
            case 'delete':
                await this.deleteTask(this.selectedTask);
                break;
        }
    },

    /**
     * 显示编辑对话框
     * @param {number} taskId - 任务ID
     */
    showEditDialog(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        document.getElementById('dialog-title').textContent = '编辑任务';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-status').value = task.status;

        document.getElementById('task-dialog').classList.remove('hidden');
    },

    /**
     * 显示添加依赖对话框
     * @param {number} taskId - 任务ID
     */
    showAddDependencyDialog(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // 找出可以作为依赖的任务
        const availableTasks = this.tasks.filter(t =>
            t.id !== taskId &&
            !task.dependencies.includes(t.id)
        );

        const depList = document.getElementById('dep-list');
        depList.innerHTML = '';

        if (availableTasks.length === 0) {
            depList.innerHTML = '<div class="dep-item-empty">没有可添加的依赖任务</div>';
        } else {
            availableTasks.forEach(t => {
                const item = document.createElement('div');
                item.className = 'dep-item';
                item.textContent = t.title;
                item.onclick = async () => {
                    await this.addDependency(taskId, t.id);
                    document.getElementById('dep-dialog').classList.add('hidden');
                };
                depList.appendChild(item);
            });
        }

        document.getElementById('dep-dialog').classList.remove('hidden');
    },

    /**
     * 显示删除依赖对话框
     * @param {number} taskId - 任务ID
     */
    showRemoveDependencyDialog(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task || task.dependencies.length === 0) return;

        const depList = document.getElementById('remove-dep-list');
        depList.innerHTML = '';

        task.dependencies.forEach(depId => {
            const depTask = this.tasks.find(t => t.id === depId);
            if (depTask) {
                const item = document.createElement('div');
                item.className = 'dep-item';
                item.textContent = `依赖：${depTask.title}`;
                item.onclick = async () => {
                    await this.removeDependency(taskId, depId);
                    document.getElementById('remove-dep-dialog').classList.add('hidden');
                };
                depList.appendChild(item);
            }
        });

        document.getElementById('remove-dep-dialog').classList.remove('hidden');
    },

    /**
     * 添加依赖
     * @param {number} taskId - 任务ID
     * @param {number} depId - 依赖的任务ID
     */
    async addDependency(taskId, depId) {
        try {
            await API.addDependency(taskId, depId);
            this.showToast('依赖添加成功');
            await this.refreshData();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    /**
     * 删除依赖
     * @param {number} taskId - 任务ID
     * @param {number} depId - 依赖的任务ID
     */
    async removeDependency(taskId, depId) {
        try {
            await API.removeDependency(taskId, depId);
            this.showToast('依赖删除成功');
            await this.refreshData();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    /**
     * 删除任务
     * @param {number} taskId - 任务ID
     */
    async deleteTask(taskId) {
        if (!confirm('确定要删除这个任务吗？')) return;

        try {
            await API.deleteTask(taskId);
            this.showToast('任务删除成功');
            await this.refreshData();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    /**
     * 设置对话框事件
     */
    setupDialogs() {
        // 任务表单提交
        document.getElementById('task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskId = document.getElementById('task-id').value;
            const data = {
                title: document.getElementById('task-title').value,
                description: document.getElementById('task-description').value,
                status: document.getElementById('task-status').value
            };

            try {
                if (taskId) {
                    await API.updateTask(parseInt(taskId), data);
                    this.showToast('任务更新成功');
                } else {
                    await API.createTask({ ...data, project_id: app.currentProjectId });
                    this.showToast('任务创建成功');
                }
                document.getElementById('task-dialog').classList.add('hidden');
                await this.refreshData();
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        });

        // 取消按钮
        document.getElementById('cancel-btn').addEventListener('click', () => {
            document.getElementById('task-dialog').classList.add('hidden');
        });

        document.getElementById('dep-cancel-btn').addEventListener('click', () => {
            document.getElementById('dep-dialog').classList.add('hidden');
        });

        document.getElementById('remove-dep-cancel-btn').addEventListener('click', () => {
            document.getElementById('remove-dep-dialog').classList.add('hidden');
        });
    },

    /**
     * 设置工具栏按钮事件
     */
    setupToolbar() {
        document.getElementById('add-task-btn').addEventListener('click', () => {
            document.getElementById('dialog-title').textContent = '创建任务';
            document.getElementById('task-id').value = '';
            document.getElementById('task-form').reset();
            document.getElementById('task-dialog').classList.remove('hidden');
        });

        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });
    },

    /**
     * 设置全局点击事件（用于关闭菜单）
     */
    setupGlobalClick() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideContextMenu();
            }
        });

        // ESC 键关闭对话框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('task-dialog').classList.add('hidden');
                document.getElementById('dep-dialog').classList.add('hidden');
                document.getElementById('remove-dep-dialog').classList.add('hidden');
                this.hideContextMenu();
            }
        });
    },

    /**
     * 刷新数据
     */
    async refreshData() {
        try {
            this.tasks = await API.fetchAllTasks(app.currentProjectId);
            this.layout = Layout.computeLayout(this.tasks);
            Renderer.render(this.tasks, this.layout);
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    /**
     * 显示 Toast 提示
     * @param {string} message - 提示消息
     * @param {string} type - 提示类型（success/error）
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    /**
     * 设置数据
     * @param {Array} tasks - 任务列表
     * @param {Object} layout - 布局信息
     */
    setData(tasks, layout) {
        this.tasks = tasks;
        this.layout = layout;
    },

    /**
     * 设置任务悬停事件
     */
    setupTaskHover() {
        const tasksLayer = document.getElementById('tasks-layer');

        // 鼠标进入任务节点
        tasksLayer.addEventListener('mouseenter', (e) => {
            const taskNode = e.target.closest('.task-node');
            if (taskNode) {
                const taskId = parseInt(taskNode.dataset.taskId);
                this.showDependencyTooltip(taskId, e.clientX, e.clientY);
            }
        }, true);

        // 鼠标离开任务节点
        tasksLayer.addEventListener('mouseleave', (e) => {
            const taskNode = e.target.closest('.task-node');
            if (taskNode) {
                this.hideDependencyTooltip();
            }
        }, true);
    },

    /**
     * 显示依赖任务悬浮框
     * @param {number} taskId - 任务ID
     * @param {number} x - 鼠标X坐标
     * @param {number} y - 鼠标Y坐标
     */
    showDependencyTooltip(taskId, x, y) {
        // 检查是否有打开的对话框或右键菜单
        if (document.querySelector('.modal:not(.hidden)') ||
            document.querySelector('.context-menu:not(.hidden)')) {
            return;
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (!task || task.dependencies.length === 0) {
            return;
        }

        const tooltip = document.getElementById('tooltip');
        const content = document.getElementById('tooltip-content');

        // 清空现有内容
        content.innerHTML = '';

        // 添加依赖任务列表
        task.dependencies.forEach(depId => {
            const depTask = this.tasks.find(t => t.id === depId);
            if (depTask) {
                const item = document.createElement('div');
                item.className = 'tooltip-item';
                item.textContent = depTask.title;

                // 点击跳转功能（高亮选中该依赖任务）
                item.style.cursor = 'pointer';
                item.onclick = () => {
                    this.handleTaskClick(depId);
                    this.hideDependencyTooltip();
                };

                content.appendChild(item);
            }
        });

        // 定位悬浮框（在鼠标附近）
        const offsetX = 15; // 偏移量，避免遮挡鼠标
        const offsetY = 15;

        // 确保不超出屏幕边界
        let posX = x + offsetX;
        let posY = y + offsetY;

        // 先显示以获取尺寸
        tooltip.classList.remove('hidden');
        const tooltipRect = tooltip.getBoundingClientRect();

        if (posX + tooltipRect.width > window.innerWidth) {
            posX = x - tooltipRect.width - offsetX;
        }
        if (posY + tooltipRect.height > window.innerHeight) {
            posY = y - tooltipRect.height - offsetY;
        }

        tooltip.style.left = `${posX}px`;
        tooltip.style.top = `${posY}px`;
    },

    /**
     * 隐藏依赖任务悬浮框
     */
    hideDependencyTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.add('hidden');
    },

    /**
     * 设置项目管理
     */
    setupProjectManagement() {
        // Project 切换
        document.getElementById('project-select').addEventListener('change', async (e) => {
            const projectId = parseInt(e.target.value);
            await app.switchProject(projectId);
        });

        // 管理项目按钮
        document.getElementById('manage-projects-btn').addEventListener('click', () => {
            this.showProjectDialog();
        });

        // 关闭项目对话框
        document.getElementById('close-project-dialog-btn').addEventListener('click', () => {
            document.getElementById('project-dialog').classList.add('hidden');
        });

        // 创建项目
        document.getElementById('create-project-btn').addEventListener('click', () => {
            this.showCreateProjectDialog();
        });

        // 项目表单提交
        document.getElementById('project-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleProjectFormSubmit();
        });

        // 取消项目表单
        document.getElementById('cancel-project-btn').addEventListener('click', () => {
            document.getElementById('project-form-dialog').classList.add('hidden');
        });
    },

    /**
     * 更新项目选择器
     * @param {Array} projects - 项目列表
     * @param {number} currentProjectId - 当前项目ID
     */
    updateProjectSelector(projects, currentProjectId) {
        const select = document.getElementById('project-select');
        select.innerHTML = '';

        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = `${p.name} (${p.task_count})`;
            if (p.id === currentProjectId) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        this.projects = projects;
    },

    /**
     * 显示项目管理对话框
     */
    showProjectDialog() {
        const projectList = document.getElementById('project-list');
        projectList.innerHTML = '';

        this.projects.forEach(p => {
            const item = document.createElement('div');
            item.className = 'project-item';
            item.innerHTML = `
                <div class="project-info">
                    <span class="project-color" style="background-color: ${p.color}"></span>
                    <div class="project-details">
                        <div class="project-name">${p.name}</div>
                        <div class="project-meta">${p.task_count} 个任务</div>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-sm btn-edit" data-id="${p.id}">编辑</button>
                    <button class="btn btn-sm btn-delete" data-id="${p.id}">删除</button>
                </div>
            `;

            item.querySelector('.btn-edit').addEventListener('click', () => {
                this.showEditProjectDialog(p);
            });

            item.querySelector('.btn-delete').addEventListener('click', async () => {
                await this.deleteProject(p);
            });

            projectList.appendChild(item);
        });

        document.getElementById('project-dialog').classList.remove('hidden');
    },

    /**
     * 显示创建项目对话框
     */
    showCreateProjectDialog() {
        document.getElementById('project-form-title').textContent = '创建项目';
        document.getElementById('project-id').value = '';
        document.getElementById('project-form').reset();
        document.getElementById('project-color').value = '#2196f3';
        document.getElementById('project-form-dialog').classList.remove('hidden');
    },

    /**
     * 显示编辑项目对话框
     * @param {Object} project - 项目对象
     */
    showEditProjectDialog(project) {
        document.getElementById('project-form-title').textContent = '编辑项目';
        document.getElementById('project-id').value = project.id;
        document.getElementById('project-name').value = project.name;
        document.getElementById('project-description').value = project.description || '';
        document.getElementById('project-color').value = project.color;
        document.getElementById('project-form-dialog').classList.remove('hidden');
    },

    /**
     * 处理项目表单提交
     */
    async handleProjectFormSubmit() {
        const projectId = document.getElementById('project-id').value;
        const data = {
            name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            color: document.getElementById('project-color').value
        };

        try {
            if (projectId) {
                await API.updateProject(parseInt(projectId), data);
                this.showToast('项目更新成功');
            } else {
                await API.createProject(data);
                this.showToast('项目创建成功');
            }

            document.getElementById('project-form-dialog').classList.add('hidden');
            document.getElementById('project-dialog').classList.add('hidden');

            await app.loadProjects();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    /**
     * 删除项目
     * @param {Object} project - 项目对象
     */
    async deleteProject(project) {
        if (project.task_count > 0) {
            this.showToast(`无法删除：项目 "${project.name}" 还有 ${project.task_count} 个任务`, 'error');
            return;
        }

        if (!confirm(`确定要删除项目 "${project.name}" 吗？`)) return;

        try {
            await API.deleteProject(project.id);
            this.showToast('项目删除成功');

            if (app.currentProjectId === project.id) {
                const remainingProjects = this.projects.filter(p => p.id !== project.id);
                if (remainingProjects.length > 0) {
                    await app.switchProject(remainingProjects[0].id);
                }
            }

            await app.loadProjects();
            document.getElementById('project-dialog').classList.add('hidden');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
};
