/**
 * SVG 渲染模块
 * 负责渲染九宫格、任务方块和连接线
 */
const Renderer = {
    svg: null,
    layers: {},

    /**
     * 初始化渲染器
     */
    init() {
        this.svg = document.getElementById('dependency-graph');
        this.layers = {
            grids: document.getElementById('grids-layer'),
            connections: document.getElementById('connections-layer'),
            tasks: document.getElementById('tasks-layer')
        };
    },

    /**
     * 创建九宫格 SVG 元素
     * @param {Object} task - 任务对象
     * @param {Object} layout - 布局信息
     * @returns {SVGGElement} SVG 元素
     */
    createGridElement(task, layout) {
        const grid = layout.grid;
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'task-grid');
        group.setAttribute('data-task-id', task.id);

        // 九宫格矩形（虚线边框）
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', grid.topLeft.x);
        rect.setAttribute('y', grid.topLeft.y);
        rect.setAttribute('width', Layout.CONFIG.gridWidth);
        rect.setAttribute('height', Layout.CONFIG.gridHeight);
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', '#ddd');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-dasharray', '5,5');
        rect.setAttribute('rx', '4');

        group.appendChild(rect);
        return group;
    },

    /**
     * 创建任务方块 SVG 元素
     * @param {Object} task - 任务对象
     * @param {Object} layout - 布局信息
     * @returns {SVGGElement} SVG 元素
     */
    createTaskElement(task, layout) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `task-node ${task.status}`);
        group.setAttribute('data-task-id', task.id);

        // 背景矩形
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', layout.x);
        rect.setAttribute('y', layout.y);
        rect.setAttribute('width', Layout.CONFIG.taskWidth);
        rect.setAttribute('height', Layout.CONFIG.taskHeight);
        rect.setAttribute('rx', '8');

        // 标题文本
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', layout.x + Layout.CONFIG.taskWidth / 2);
        text.setAttribute('y', layout.y + Layout.CONFIG.taskHeight / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('class', 'task-title');

        // 截断长文本
        const maxChars = 15;
        const displayTitle = task.title.length > maxChars
            ? task.title.substring(0, maxChars) + '...'
            : task.title;
        text.textContent = displayTitle;

        group.appendChild(rect);
        group.appendChild(text);

        return group;
    },

    /**
     * 计算曼哈顿路由路径
     * @param {Object} sourceLayout - 源任务布局
     * @param {Object} targetLayout - 目标任务布局
     * @returns {string} SVG 路径字符串
     */
    calculateConnectionPath(sourceLayout, targetLayout) {
        const sourceGrid = sourceLayout.grid;
        const targetGrid = targetLayout.grid;
        const start = sourceGrid.center;
        const end = targetGrid.center;

        let path;

        // 根据相对位置选择路由策略
        if (targetLayout.column > sourceLayout.column) {
            // 目标在右侧：从源右侧出，从目标左侧入
            const exitPoint = sourceGrid.rightCenter;
            const entryPoint = targetGrid.leftCenter;

            path = `M ${start.x} ${start.y}
                    L ${exitPoint.x} ${exitPoint.y}
                    L ${entryPoint.x} ${entryPoint.y}
                    L ${end.x} ${end.y}`;
        } else if (targetLayout.column < sourceLayout.column) {
            // 目标在左侧：从源左侧出，从目标右侧入
            const exitPoint = sourceGrid.leftCenter;
            const entryPoint = targetGrid.rightCenter;

            path = `M ${start.x} ${start.y}
                    L ${exitPoint.x} ${exitPoint.y}
                    L ${entryPoint.x} ${entryPoint.y}
                    L ${end.x} ${end.y}`;
        } else {
            // 同列：垂直路由
            const midY = (start.y + end.y) / 2;
            path = `M ${start.x} ${start.y}
                    L ${start.x} ${midY}
                    L ${end.x} ${midY}
                    L ${end.x} ${end.y}`;
        }

        return path;
    },

    /**
     * 创建连接线 SVG 元素
     * @param {number} sourceId - 源任务ID（被依赖的任务）
     * @param {number} targetId -目标任务ID（依赖源任务的任务）
     * @param {Object} layoutMap - 布局映射表
     * @param {boolean} highlighted - 是否高亮
     * @returns {SVGPathElement} SVG 元素
     */
    createConnectionElement(sourceId, targetId, layoutMap, highlighted = false) {
        const sourceLayout = layoutMap[sourceId];
        const targetLayout = layoutMap[targetId];

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', this.calculateConnectionPath(sourceLayout, targetLayout));
        path.setAttribute('class', highlighted ? 'connection-highlight' : 'connection');
        path.setAttribute('data-source', sourceId);
        path.setAttribute('data-target', targetId);
        path.setAttribute('marker-end', highlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)');

        return path;
    },

    /**
     * 渲染完整图形
     * @param {Array} tasks - 所有任务列表
     * @param {Object} layout - 布局信息
     * @param {Set} highlightedTasks - 需要高亮的任务ID集合
     */
    render(tasks, layout, highlightedTasks = new Set()) {
        this.clear();

        // 渲染九宫格
        tasks.forEach(task => {
            const grid = this.createGridElement(task, layout[task.id]);
            this.layers.grids.appendChild(grid);
        });

        // 渲染连接线
        const renderedConnections = new Set();
        tasks.forEach(task => {
            task.dependencies.forEach(depId => {
                const key = `${depId}-${task.id}`;
                if (!renderedConnections.has(key)) {
                    // 检查是否需要高亮
                    const highlighted = highlightedTasks.has(task.id) || highlightedTasks.has(depId);
                    const connection = this.createConnectionElement(
                        depId, task.id, layout, highlighted
                    );
                    this.layers.connections.appendChild(connection);
                    renderedConnections.add(key);
                }
            });
        });

        // 如果有高亮任务，降低非高亮连接线的透明度
        if (highlightedTasks.size > 0) {
            const allConnections = this.layers.connections.querySelectorAll('.connection');
            allConnections.forEach(conn => {
                conn.style.opacity = '0.1';
            });
        }

        // 渲染任务方块
        tasks.forEach(task => {
            const taskEl = this.createTaskElement(task, layout[task.id]);
            this.layers.tasks.appendChild(taskEl);
        });
    },

    /**
     * 清空所有层
     */
    clear() {
        Object.values(this.layers).forEach(layer => {
            while (layer.firstChild) {
                layer.removeChild(layer.firstChild);
            }
        });
    },

    /**
     * 高亮特定任务的依赖路径
     * @param {number} taskId - 任务ID
     * @param {Array} tasks - 所有任务列表
     * @param {Object} layout - 布局信息
     */
    highlightPaths(taskId, tasks, layout) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const highlightedIds = new Set([taskId]);

        // 添加上游依赖
        const addUpstream = (id) => {
            const t = tasks.find(task => task.id === id);
            if (t) {
                t.dependencies.forEach(depId => {
                    highlightedIds.add(depId);
                    addUpstream(depId);
                });
            }
        };
        addUpstream(taskId);

        // 添加下游依赖
        const addDownstream = (id) => {
            tasks.forEach(t => {
                if (t.dependencies.includes(id)) {
                    highlightedIds.add(t.id);
                    addDownstream(t.id);
                }
            });
        };
        addDownstream(taskId);

        this.render(tasks, layout, highlightedIds);
    }
};
