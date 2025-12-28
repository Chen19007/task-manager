/**
 * SVG 渲染模块
 * 负责渲染九宫格、任务方块和连接线
 */
const Renderer = {
    svg: null,
    layers: {},

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
     */
    calculateBasePath(sourceLayout, targetLayout) {
        const sourceGrid = sourceLayout.grid;
        const targetGrid = targetLayout.grid;

        const points = [sourceGrid.center];

        const columnDiff = targetLayout.column - sourceLayout.column;
        const rowDiff = targetLayout.row - sourceLayout.row;

        if (columnDiff > 0) {
            if (rowDiff > 0) {
                points.push(sourceGrid.bottomRight);
                points.push({ x: targetGrid.topLeft.x, y: sourceGrid.bottomRight.y });
                points.push(targetGrid.topLeft);
            } else if (rowDiff < 0) {
                points.push(sourceGrid.topRight);
                points.push({ x: targetGrid.bottomLeft.x, y: sourceGrid.topRight.y });
                points.push(targetGrid.bottomLeft);
            } else {
                points.push(sourceGrid.topRight);
                points.push(targetGrid.topLeft);
            }
        } else if (columnDiff < 0) {
            if (rowDiff > 0) {
                points.push(sourceGrid.bottomLeft);
                points.push({ x: targetGrid.topRight.x, y: sourceGrid.bottomLeft.y });
                points.push(targetGrid.topRight);
            } else if (rowDiff < 0) {
                points.push(sourceGrid.topLeft);
                points.push({ x: targetGrid.bottomRight.x, y: sourceGrid.topLeft.y });
                points.push(targetGrid.bottomRight);
            } else {
                points.push(sourceGrid.topLeft);
                points.push(targetGrid.topRight);
            }
        } else {
            if (rowDiff > 0) {
                points.push(sourceGrid.topLeft);
                points.push(targetGrid.bottomLeft);
            } else if (rowDiff < 0) {
                points.push(sourceGrid.bottomLeft);
                points.push(targetGrid.topLeft);
            }
        }

        points.push(targetGrid.center);
        return points;
    },

    /**
     * 对路径应用偏移
     */
    applyOffset(points, offsetX, offsetY) {
        return points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
    },

    /**
     * 创建连接线 SVG 元素
     */
    createConnectionElement(sourceId, targetId, layoutMap, highlighted = false, edgeIndex = 0) {
        const sourceLayout = layoutMap[sourceId];
        const targetLayout = layoutMap[targetId];

        // 计算基础路径
        const basePath = this.calculateBasePath(sourceLayout, targetLayout);

        // 根据 edgeIndex 计算偏移
        // 偶数向上偏移，奇数向下偏移，每级偏移 2px
        const offsetAmount = 2;
        const level = Math.floor(edgeIndex / 2);
        const direction = edgeIndex % 2 === 0 ? -1 : 1;
        const offsetY = level * offsetAmount * direction;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const offsetPath = this.applyOffset(basePath, 0, offsetY);
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

        // 渲染九宫格
        tasks.forEach(task => {
            const grid = this.createGridElement(task, layout[task.id]);
            this.layers.grids.appendChild(grid);
        });

        // 渲染连接线
        const renderedConnections = new Set();

        // 统计每个源任务的出边数量
        const sourceEdgeCount = {};
        tasks.forEach(task => {
            task.dependencies.forEach(depId => {
                sourceEdgeCount[depId] = (sourceEdgeCount[depId] || 0) + 1;
            });
        });

        // 为每个源任务分配 edgeIndex 偏移量
        const sourceEdgeOffset = {};
        let currentOffset = 0;
        Object.keys(sourceEdgeCount).forEach(sourceId => {
            sourceEdgeOffset[sourceId] = currentOffset;
            currentOffset += sourceEdgeCount[sourceId];
        });

        tasks.forEach(task => {
            task.dependencies.forEach((depId, idx) => {
                const key = `${depId}-${task.id}`;
                if (!renderedConnections.has(key)) {
                    const highlighted = highlightedEdges.has(key);
                    const edgeIndex = (sourceEdgeOffset[depId] || 0) + idx;
                    const connection = this.createConnectionElement(
                        depId, task.id, layout, highlighted, edgeIndex
                    );
                    this.layers.connections.appendChild(connection);
                    renderedConnections.add(key);
                }
            });
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
