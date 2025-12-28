/**
 * 应用主入口
 * 负责初始化应用和协调各模块
 */
class App {
    constructor() {
        this.tasks = [];
        this.layout = {};
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

            // 加载数据
            await this.loadData();
        } catch (error) {
            this.showError('应用初始化失败：' + error.message);
        }
    }

    /**
     * 加载数据
     */
    async loadData() {
        const loading = document.getElementById('loading');
        loading.classList.remove('hidden');

        try {
            // 获取所有任务
            this.tasks = await API.fetchAllTasks();

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
