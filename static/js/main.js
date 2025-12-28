/**
 * 应用主入口
 * 负责初始化应用和协调各模块
 */
class App {
    constructor() {
        this.tasks = [];
        this.layout = {};
        this.projects = [];
        this.currentProjectId = null;
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            // 初始化渲染器
            Renderer.init();

            // 初始化交互处理
            Interaction.init();

            // 加载项目列表
            await this.loadProjects();

            // 加载当前项目的任务
            await this.loadData();
        } catch (error) {
            this.showError('应用初始化失败：' + error.message);
        }
    }

    /**
     * 加载项目列表
     */
    async loadProjects() {
        try {
            this.projects = await API.fetchAllProjects();

            // 如果没有项目，创建默认项目
            if (this.projects.length === 0) {
                const defaultProject = await API.createProject({
                    name: '默认项目',
                    description: '系统自动创建的默认项目',
                    color: '#2196f3'
                });
                this.projects.push(defaultProject);
            }

            // 设置当前项目（优先使用 localStorage 保存的值）
            const savedProjectId = localStorage.getItem('currentProjectId');
            if (savedProjectId && this.projects.some(p => p.id === parseInt(savedProjectId))) {
                this.currentProjectId = parseInt(savedProjectId);
            } else if (this.currentProjectId === null && this.projects.length > 0) {
                this.currentProjectId = this.projects[0].id;
            }

            // 更新 UI
            Interaction.updateProjectSelector(this.projects, this.currentProjectId);
        } catch (error) {
            this.showError('加载项目失败：' + error.message);
        }
    }

    /**
     * 切换项目
     * @param {number} projectId - 项目ID
     */
    async switchProject(projectId) {
        if (this.currentProjectId === projectId) return;

        this.currentProjectId = projectId;
        localStorage.setItem('currentProjectId', projectId);
        await this.loadData();
        Interaction.updateProjectSelector(this.projects, this.currentProjectId);
    }

    /**
     * 加载数据
     */
    async loadData() {
        const loading = document.getElementById('loading');
        loading.classList.remove('hidden');

        try {
            // 获取当前项目的任务
            this.tasks = await API.fetchAllTasks(this.currentProjectId);

            // 计算布局
            this.layout = Layout.computeLayout(this.tasks);

            // 渲染图形
            Renderer.render(this.tasks, this.layout);

            // 设置交互数据
            Interaction.setData(this.tasks, this.layout);
        } catch (error) {
            this.showError('加载数据失败：' + error.message);
        } finally {
            loading.classList.add('hidden');
        }
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     */
    showError(message) {
        Interaction.showToast(message, 'error');
        console.error(message);
    }

    /**
     * 刷新应用
     */
    refresh() {
        this.loadData();
    }
}

// 创建应用实例
const app = new App();

// 页面加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
