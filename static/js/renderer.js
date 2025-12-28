/**
 * SVG 渲染模块
 * 负责渲染九宫格、任务方块和连接线
 */
const Renderer = {
    svg: null,
    layers: {},
    cornerUsage: {},  // 角使用计数 { "taskId_cornerName": count }

    // 连接线调色板（循环使用）
    connectionColors: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e91e63', '#00bcd4'],

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
     */
    createTaskElement(task, layout) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', `task-node ${task.status}`);
        group.setAttribute('data-task-id', task.id);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', layout.x);
        rect.setAttribute('y', layout.y);
        rect.setAttribute('width', Layout.CONFIG.taskWidth);
        rect.setAttribute('height', Layout.CONFIG.taskHeight);
        rect.setAttribute('rx', '8');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', layout.x + Layout.CONFIG.taskWidth / 2);
        text.setAttribute('y', layout.y + Layout.CONFIG.taskHeight / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('class', 'task-title');

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
     * 计算基础路径（不使用偏移）
     * @returns {Object} { points: Array, corners: Array } - 路径点和经过的角
     */
    calculateBasePath(sourceLayout, targetLayout) {
        const sourceGrid = sourceLayout.grid;
        const targetGrid = targetLayout.grid;
        const sourceId = sourceLayout.id;
        const targetId = targetLayout.id;

        const points = [sourceGrid.center];
        const corners = [];

        const columnDiff = targetLayout.column - sourceLayout.column;
        const rowDiff = targetLayout.row - sourceLayout.row;

        if (columnDiff > 0) {
            if (rowDiff > 0) {
                points.push(sourceGrid.bottomRight);
                corners.push({ taskId: sourceId, cornerName: 'bottomRight' });
                points.push({ x: targetGrid.topLeft.x, y: sourceGrid.bottomRight.y });
                points.push(targetGrid.topLeft);
                corners.push({ taskId: targetId, cornerName: 'topLeft' });
            } else if (rowDiff < 0) {
                points.push(sourceGrid.topRight);
                corners.push({ taskId: sourceId, cornerName: 'topRight' });
                points.push({ x: targetGrid.bottomLeft.x, y: sourceGrid.topRight.y });
                points.push(targetGrid.bottomLeft);
                corners.push({ taskId: targetId, cornerName: 'bottomLeft' });
            } else {
                points.push(sourceGrid.topRight);
                corners.push({ taskId: sourceId, cornerName: 'topRight' });
                points.push(targetGrid.topLeft);
                corners.push({ taskId: targetId, cornerName: 'topLeft' });
            }
        } else if (columnDiff < 0) {
            if (rowDiff > 0) {
                points.push(sourceGrid.bottomLeft);
                corners.push({ taskId: sourceId, cornerName: 'bottomLeft' });
                points.push({ x: targetGrid.topRight.x, y: sourceGrid.bottomLeft.y });
                points.push(targetGrid.topRight);
                corners.push({ taskId: targetId, cornerName: 'topRight' });
            } else if (rowDiff < 0) {
                points.push(sourceGrid.topLeft);
                corners.push({ taskId: sourceId, cornerName: 'topLeft' });
                points.push({ x: targetGrid.bottomRight.x, y: sourceGrid.topLeft.y });
                points.push(targetGrid.bottomRight);
                corners.push({ taskId: targetId, cornerName: 'bottomRight' });
            } else {
                points.push(sourceGrid.topLeft);
                corners.push({ taskId: sourceId, cornerName: 'topLeft' });
                points.push(targetGrid.topRight);
                corners.push({ taskId: targetId, cornerName: 'topRight' });
            }
        } else {
            if (rowDiff > 0) {
                points.push(sourceGrid.topLeft);
                corners.push({ taskId: sourceId, cornerName: 'topLeft' });
                points.push(targetGrid.bottomLeft);
                corners.push({ taskId: targetId, cornerName: 'bottomLeft' });
            } else if (rowDiff < 0) {
                points.push(sourceGrid.bottomLeft);
                corners.push({ taskId: sourceId, cornerName: 'bottomLeft' });
                points.push(targetGrid.topLeft);
                corners.push({ taskId: targetId, cornerName: 'topLeft' });
            }
        }

        points.push(targetGrid.center);
        return { points, corners };
    },

    /**
     * 初始化角使用计数
     */
    initCornerUsage() {
        this.cornerUsage = {};
    },

    /**
     * 标记路径经过的角（计数加1）
     */
    markCornerUsed(taskId, cornerName) {
        const key = `${taskId}_${cornerName}`;
        this.cornerUsage[key] = (this.cornerUsage[key] || 0) + 1;
    },

    /**
     * 根据路径经过的角获取 offset
     * @param {Array} corners - 路径经过的角 [{ taskId, cornerName }, ...]
     * @returns {number} offset 值
     */
    getOffsetForPath(corners) {
        if (corners.length === 0) return 0;

        // 找到经过的角中最大的使用次数
        let maxUsage = 0;
        corners.forEach(({ taskId, cornerName }) => {
            const key = `${taskId}_${cornerName}`;
            maxUsage = Math.max(maxUsage, this.cornerUsage[key] || 0);
        });

        // 返回 offset：偶数向上，奇数向下
        const offsetAmount = 2;
        const direction = maxUsage % 2 === 0 ? -1 : 1;
        return maxUsage * offsetAmount * direction;
    },

    /**
     * 对路径应用偏移
     */
    applyOffset(points, offsetX, offsetY) {
        return points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
    },

    /**
     * 创建连接线 SVG 元素
     * @param {number} sourceId - 源任务 ID
     * @param {number} targetId - 目标任务 ID
     * @param {Object} layoutMap - 布局映射
     * @param {boolean} highlighted - 是否高亮
     * @param {number} offsetY - Y 方向偏移量
     */
    createConnectionElement(sourceId, targetId, layoutMap, highlighted = false, offsetY = 0) {
        const sourceLayout = layoutMap[sourceId];
        const targetLayout = layoutMap[targetId];

        // 计算基础路径
        const { points } = this.calculateBasePath(sourceLayout, targetLayout);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const offsetPath = this.applyOffset(points, 0, offsetY);
        path.setAttribute('d', offsetPath.map((p, i) => {
            return i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`;
        }).join('\n'));
        path.setAttribute('class', highlighted ? 'connection-highlight' : 'connection');
        path.setAttribute('data-source', sourceId);
        path.setAttribute('data-target', targetId);
        // 去掉箭头
        // path.setAttribute('marker-end', highlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)');

        return path;
    },

    /**
     * 渲染完整图形
     */
    render(tasks, layout, highlightedEdges = new Set()) {
        this.clear();
        this.initCornerUsage();  // 初始化角使用计数

        // 渲染九宫格
        tasks.forEach(task => {
            const grid = this.createGridElement(task, layout[task.id]);
            this.layers.grids.appendChild(grid);
        });

        // 第一遍：计算所有路径需要的 offset（不渲染）
        const pathInfos = [];
        tasks.forEach(task => {
            task.dependencies.forEach(depId => {
                const sourceLayout = layout[depId];
                const targetLayout = layout[task.id];
                const { corners } = this.calculateBasePath(sourceLayout, targetLayout);
                const offset = this.getOffsetForPath(corners);

                pathInfos.push({
                    sourceId: depId,
                    targetId: task.id,
                    layoutMap: layout,
                    corners,
                    offset,
                    key: `${depId}-${task.id}`
                });

                // 标记这些角将被使用
                corners.forEach(c => this.markCornerUsed(c.taskId, c.cornerName));
            });
        });

        // 第二遍：渲染所有连接线
        const renderedConnections = new Set();
        pathInfos.forEach(info => {
            if (!renderedConnections.has(info.key)) {
                const highlighted = highlightedEdges.has(info.key);
                const connection = this.createConnectionElement(
                    info.sourceId, info.targetId,
                    info.layoutMap, highlighted, info.offset
                );
                this.layers.connections.appendChild(connection);
                renderedConnections.add(info.key);
            }
        });

        // 高亮处理
        if (highlightedEdges.size > 0) {
            const allConnections = this.layers.connections.querySelectorAll('.connection');
            allConnections.forEach(conn => {
                conn.style.opacity = '0.1';
            });
        }

        // 整体调整连接线样式
        this.adjustConnectionStyles(highlightedEdges);

        // 渲染任务方块
        tasks.forEach(task => {
            const taskEl = this.createTaskElement(task, layout[task.id]);
            this.layers.tasks.appendChild(taskEl);
        });

        // 更新 SVG 尺寸以支持滚动
        this.updateSvgSize(tasks, layout);
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
     * 整体调整连接线样式（在渲染最后调用）
     * @param {Set} highlightedEdges - 高亮的边集合
     */
    adjustConnectionStyles(highlightedEdges = new Set()) {
        const allConnections = this.layers.connections.querySelectorAll('.connection, .connection-highlight');
        allConnections.forEach((conn, index) => {
            const color = this.connectionColors[index % this.connectionColors.length];
            conn.style.stroke = color;
        });
    },

    /**
     * 计算并更新 SVG 尺寸以支持滚动
     */
    updateSvgSize(tasks, layout) {
        if (tasks.length === 0) return;

        // 找出最右下角的位置
        let maxX = 0;
        let maxY = 0;
        tasks.forEach(task => {
            const pos = layout[task.id];
            if (pos) {
                maxX = Math.max(maxX, pos.x + Layout.CONFIG.gridWidth);
                maxY = Math.max(maxY, pos.y + Layout.CONFIG.gridHeight);
            }
        });

        // 添加额外边距
        const extraMargin = 50;
        const width = maxX + extraMargin;
        const height = maxY + extraMargin;

        // 设置 SVG 尺寸
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
    },

    /**
     * 高亮特定任务的依赖路径
     */
    highlightPaths(taskId, tasks, layout) {
        const highlightedEdges = new Set();

        const findUpstream = (id) => {
            const t = tasks.find(task => task.id === id);
            if (t) {
                t.dependencies.forEach(depId => {
                    highlightedEdges.add(`${depId}-${id}`);
                    findUpstream(depId);
                });
            }
        };
        findUpstream(taskId);

        const findDownstream = (id) => {
            tasks.forEach(t => {
                if (t.dependencies.includes(id)) {
                    highlightedEdges.add(`${id}-${t.id}`);
                    findDownstream(t.id);
                }
            });
        };
        findDownstream(taskId);

        this.render(tasks, layout, highlightedEdges);
    }
};
