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

        // 九宫格矩形（虚线边框，方形无圆角）
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', grid.topLeft.x);
        rect.setAttribute('y', grid.topLeft.y);
        rect.setAttribute('width', Layout.CONFIG.gridWidth);
        rect.setAttribute('height', Layout.CONFIG.gridHeight);
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', '#ddd');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-dasharray', '5,5');

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
     * 计算曼哈顿路由路径（走相邻外框边，选择相对方向的角）
     * 根据相对位置选择方向一致的出口点和入口点
     * @param {Object} sourceLayout - 源任务布局
     * @param {Object} targetLayout - 目标任务布局
     * @returns {string} SVG 路径字符串
     */
    calculateConnectionPath(sourceLayout, targetLayout) {
        const sourceGrid = sourceLayout.grid;
        const targetGrid = targetLayout.grid;
        const start = sourceGrid.center;
        const end = targetGrid.center;

        const points = [start];

        // 计算相对位置
        const columnDiff = targetLayout.column - sourceLayout.column;
        const rowDiff = targetLayout.row - sourceLayout.row;

        if (columnDiff > 0) {
            // 目标在右侧
            if (rowDiff > 0) {
                // 目标在右下方：从源右下角 → 目标左上角
                points.push(sourceGrid.bottomRight);
                points.push({ x: targetGrid.topLeft.x, y: sourceGrid.bottomRight.y });
                points.push(targetGrid.topLeft);
            } else if (rowDiff < 0) {
                // 目标在右上方：从源右上角 → 目标左下角
                points.push(sourceGrid.topRight);
                points.push({ x: targetGrid.bottomLeft.x, y: sourceGrid.topRight.y });
                points.push(targetGrid.bottomLeft);
            } else {
                // 目标在同一行：从源右上角 → 目标左上角
                points.push(sourceGrid.topRight);
                points.push(targetGrid.topLeft);
            }
        } else if (columnDiff < 0) {
            // 目标在左侧
            if (rowDiff > 0) {
                // 目标在左下方：从源左下角 → 目标右上角
                points.push(sourceGrid.bottomLeft);
                points.push({ x: targetGrid.topRight.x, y: sourceGrid.bottomLeft.y });
                points.push(targetGrid.topRight);
            } else if (rowDiff < 0) {
                // 目标在左上方：从源左上角 → 目标右下角
                points.push(sourceGrid.topLeft);
                points.push({ x: targetGrid.bottomRight.x, y: sourceGrid.topLeft.y });
                points.push(targetGrid.bottomRight);
            } else {
                // 目标在同一行：从源左上角 → 目标右上角
                points.push(sourceGrid.topLeft);
                points.push(targetGrid.topRight);
            }
        } else {
            // 同列
            if (rowDiff > 0) {
                // 目标在下方：从源顶角 → 目标底角
                points.push(sourceGrid.topLeft);
                points.push(targetGrid.bottomLeft);
            } else if (rowDiff < 0) {
                // 目标在上方：从源底角 → 目标顶角
                points.push(sourceGrid.bottomLeft);
                points.push(targetGrid.topLeft);
            } else {
                // 同一位置（不可能）
            }
        }

        points.push(end);

        // 转换为SVG路径字符串
        return points.map((p, i) => {
            return i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`;
        }).join('\n');
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
     * @param {Set} highlightedEdges - 需要高亮的边集合（格式：sourceId-targetId）
     */
    render(tasks, layout, highlightedEdges = new Set()) {
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
                    // 检查这条边是否需要高亮
                    const highlighted = highlightedEdges.has(key);
                    const connection = this.createConnectionElement(
                        depId, task.id, layout, highlighted
                    );
                    this.layers.connections.appendChild(connection);
                    renderedConnections.add(key);
                }
            });
        });

        // 如果有高亮任务，降低非高亮连接线的透明度
        if (highlightedEdges.size > 0) {
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
        // 记录需要高亮的边（格式：sourceId-targetId）
        const highlightedEdges = new Set();

        // 上游路径：找依赖
        const findUpstream = (id) => {
            const t = tasks.find(task => task.id === id);
            if (t) {
                t.dependencies.forEach(depId => {
                    highlightedEdges.add(`${depId}-${id}`);  // depId → id
                    findUpstream(depId);
                });
            }
        };
        findUpstream(taskId);

        // 下游路径：找被依赖
        const findDownstream = (id) => {
            tasks.forEach(t => {
                if (t.dependencies.includes(id)) {
                    highlightedEdges.add(`${id}-${t.id}`);  // id → t.id
                    findDownstream(t.id);
                }
            });
        };
        findDownstream(taskId);

        this.render(tasks, layout, highlightedEdges);
    }
};
