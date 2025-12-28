/**
 * 布局计算模块
 * 负责计算任务的依赖深度、位置分配和九宫格边界
 */
const Layout = {
    // 配置参数
    CONFIG: {
        taskWidth: 160,
        taskHeight: 60,
        gridWidth: 200,
        gridHeight: 160,
        columnWidth: 200,
        rowHeight: 160,
        marginLeft: 50,
        marginTop: 100
    },

    /**
     * 计算每个任务的依赖深度
     * 深度定义：从无依赖任务开始的最长路径长度
     * @param {Array} tasks - 所有任务列表
     * @returns {Object} 深度映射表 { taskId: depth }
     */
    calculateTaskDepth(tasks) {
        const depthMap = {};

        /**
         * 递归计算任务深度
         * @param {number} taskId - 任务ID
         * @param {Set} visited - 已访问的任务（防止循环依赖）
         * @returns {number} 深度值
         */
        const getDepth = (taskId, visited = new Set()) => {
            // 防止循环依赖
            if (visited.has(taskId)) return 0;

            const task = tasks.find(t => t.id === taskId);
            if (!task || task.dependencies.length === 0) return 0;

            // 递归计算所有依赖的深度
            visited.add(taskId);
            const depDepths = task.dependencies.map(depId =>
                getDepth(depId, new Set(visited))
            );

            // 深度 = 1 + max(所有依赖的深度)
            return 1 + Math.max(...depDepths);
        };

        // 计算每个任务的深度
        tasks.forEach(task => {
            depthMap[task.id] = getDepth(task.id);
        });

        return depthMap;
    },

    /**
     * 分配任务到列和行，计算坐标
     * @param {Array} tasks - 所有任务列表
     * @param {Object} depthMap - 深度映射表
     * @returns {Object} 位置映射表 { taskId: { x, y, column, row } }
     */
    assignPositions(tasks, depthMap) {
        // 按深度分组
        const columns = {};
        tasks.forEach(task => {
            const depth = depthMap[task.id];
            if (!columns[depth]) {
                columns[depth] = [];
            }
            columns[depth].push(task);
        });

        // 计算每个任务的位置
        const positions = {};
        Object.entries(columns).forEach(([depth, tasksInCol]) => {
            tasksInCol.forEach((task, index) => {
                positions[task.id] = {
                    column: parseInt(depth),
                    row: index,
                    x: this.CONFIG.marginLeft + depth * this.CONFIG.columnWidth,
                    y: this.CONFIG.marginTop + index * this.CONFIG.rowHeight
                };
            });
        });

        return positions;
    },

    /**
     * 计算九宫格的边界框和关键点
     * @param {Object} taskPos - 任务位置 { x, y }
     * @returns {Object} 九宫格边界信息
     */
    calculateGridBounds(taskPos) {
        const { x, y } = taskPos;

        // 任务中心点
        const taskCenterX = x + this.CONFIG.taskWidth / 2;
        const taskCenterY = y + this.CONFIG.taskHeight / 2;

        // 九宫格半宽半高
        const halfGridW = this.CONFIG.gridWidth / 2;   // 100
        const halfGridH = this.CONFIG.gridHeight / 2;  // 50

        return {
            // 中心点
            center: { x: taskCenterX, y: taskCenterY },

            // 四个角
            topLeft: { x: taskCenterX - halfGridW, y: taskCenterY - halfGridH },
            topRight: { x: taskCenterX + halfGridW, y: taskCenterY - halfGridH },
            bottomLeft: { x: taskCenterX - halfGridW, y: taskCenterY + halfGridH },
            bottomRight: { x: taskCenterX + halfGridW, y: taskCenterY + halfGridH },

            // 四条边的中点（用于连接线进出）
            leftCenter: { x: taskCenterX - halfGridW, y: taskCenterY },
            rightCenter: { x: taskCenterX + halfGridW, y: taskCenterY },
            topCenter: { x: taskCenterX, y: taskCenterY - halfGridH },
            bottomCenter: { x: taskCenterX, y: taskCenterY + halfGridH }
        };
    },

    /**
     * 完整的布局计算
     * @param {Array} tasks - 所有任务列表
     * @returns {Object} 完整布局信息 { taskId: { x, y, column, row, grid } }
     */
    computeLayout(tasks) {
        // 1. 计算深度
        const depthMap = this.calculateTaskDepth(tasks);

        // 2. 分配位置
        const positions = this.assignPositions(tasks, depthMap);

        // 3. 计算九宫格边界
        const layout = {};
        Object.entries(positions).forEach(([taskId, pos]) => {
            layout[taskId] = {
                ...pos,
                grid: this.calculateGridBounds(pos)
            };
        });

        return layout;
    }
};
