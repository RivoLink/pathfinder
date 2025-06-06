class PathfinderVisualizer {
    constructor() {
        this.gridWidth = 30;
        this.gridHeight = 20;
        this.grid = [];
        this.startNode = { x: 5, y: 10 };
        this.endNode = { x: 25, y: 10 };
        this.isRunning = false;
        this.isDrawing = false;
        this.currentAlgorithm = 'astar';
        this.animationSpeed = 50;

        // Pre-computed directions for better performance
        this.directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        this.mazeDirections = [[0, -2], [2, 0], [0, 2], [-2, 0]];

        // Initialize the algorithm instances
        this.algorithms = {
            astar: new AStarAlgorithm(this),
            dijkstra: new DijkstraAlgorithm(this),
            bfs: new BreadthFirstSearchAlgorithm(this),
            dfs: new DepthFirstSearchAlgorithm(this),
            qlearning: new QLearningAlgorithm(this)
        };

        this.cacheElements();
        this.createGrid();
        this.setupEventListeners();
        this.adjustGridSize();

        window.addEventListener('resize', this.debounce(() => this.adjustGridSize(), 250));
    }

    cacheElements() {
        this.elements = {
            grid: document.getElementById('grid'),
            pathLength: document.getElementById('pathLength'),
            nodesVisited: document.getElementById('nodesVisited'),
            currentAlgorithm: document.getElementById('currentAlgorithm'),
            algorithmSelect: document.getElementById('algorithmSelect'),
            speedSlider: document.getElementById('speedSlider'),
            speedValue: document.getElementById('speedValue'),
            startBtn: document.getElementById('startBtn'),
            clearBtn: document.getElementById('clearBtn'),
            resetBtn: document.getElementById('resetBtn'),
            mazeBtn: document.getElementById('mazeBtn')
        };
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    adjustGridSize() {
        const width = window.innerWidth;
        let newGridWidth, newGridHeight;

        if (width <= 480) {
            newGridWidth = 15;
            newGridHeight = 12;
        } else if (width <= 768) {
            newGridWidth = 20;
            newGridHeight = 15;
        } else {
            newGridWidth = 30;
            newGridHeight = 20;
        }

        if (newGridWidth !== this.gridWidth || newGridHeight !== this.gridHeight) {
            this.gridWidth = newGridWidth;
            this.gridHeight = newGridHeight;

            this.elements.grid.style.gridTemplateColumns = `repeat(${this.gridWidth}, 1fr)`;
            this.elements.grid.style.gridTemplateRows = `repeat(${this.gridHeight}, 1fr)`;

            this.startNode = {
                x: Math.floor(this.gridWidth * 0.15),
                y: Math.floor(this.gridHeight / 2)
            };
            this.endNode = {
                x: Math.floor(this.gridWidth * 0.85),
                y: Math.floor(this.gridHeight / 2)
            };

            this.createGrid();
        }
    }

    createGrid() {
        this.grid = [];
        const fragment = document.createDocumentFragment();
        this.elements.grid.innerHTML = '';

        // Create grid in single pass
        for (let y = 0; y < this.gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell empty';
                cell.dataset.x = x;
                cell.dataset.y = y;

                fragment.appendChild(cell);

                this.grid[y][x] = {
                    x, y, element: cell,
                    isWall: false,
                    isStart: x === this.startNode.x && y === this.startNode.y,
                    isEnd: x === this.endNode.x && y === this.endNode.y,
                    isVisited: false,
                    isPath: false,
                    distance: Infinity,
                    heuristic: 0,
                    fScore: Infinity,
                    gScore: Infinity,
                    parent: null
                };
            }
        }

        this.elements.grid.appendChild(fragment);
        this.updateGridDisplay();
        this.resetStats();
    }

    updateGridDisplay() {
        requestAnimationFrame(() => {
            for (let y = 0; y < this.gridHeight; y++) {
                for (let x = 0; x < this.gridWidth; x++) {
                    const node = this.grid[y][x];
                    let className = 'cell ';

                    if (node.isStart) className += 'start';
                    else if (node.isEnd) className += 'end';
                    else if (node.isPath) className += 'path';
                    else if (node.isVisited) className += 'visited';
                    else if (node.isWall) className += 'wall';
                    else className += 'empty';

                    if (node.element.className !== className) {
                        node.element.className = className;
                    }
                }
            }
        });
    }

    setupEventListeners() {
        this.elements.grid.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.handleMouseDown(e);
        });

        this.elements.grid.addEventListener('mouseover', (e) => this.handleMouseOver(e));
        this.elements.grid.addEventListener('mouseup', () => this.isDrawing = false);
        this.elements.grid.addEventListener('contextmenu', (e) => e.preventDefault());

        this.elements.algorithmSelect.addEventListener('change', (e) => {
            this.currentAlgorithm = e.target.value;
            this.elements.currentAlgorithm.textContent = e.target.options[e.target.selectedIndex].text;
        });

        this.elements.speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = 101 - parseInt(e.target.value);
            this.elements.speedValue.textContent = this.animationSpeed + 'ms';
        });

        this.elements.startBtn.addEventListener('click', () => this.startPathfinding());
        this.elements.clearBtn.addEventListener('click', () => this.clearPath());
        this.elements.resetBtn.addEventListener('click', () => this.resetGrid());
        this.elements.mazeBtn.addEventListener('click', () => this.generateMaze());

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            switch(e.code) {
                case 'Space': e.preventDefault(); this.startPathfinding(); break;
                case 'KeyC': e.preventDefault(); this.clearPath(); break;
                case 'KeyR': e.preventDefault(); this.resetGrid(); break;
                case 'KeyM': e.preventDefault(); this.generateMaze(); break;
            }
        });
    }

    handleMouseDown(e) {
        if (this.isRunning || !e.target.dataset.x) return;

        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);

        if (e.button === 2) {
            this.setPosition('start', x, y);
        } else if (e.ctrlKey) {
            this.setPosition('end', x, y);
        } else {
            this.isDrawing = true;
            this.toggleWall(x, y);
        }
    }

    handleMouseOver(e) {
        if (!this.isDrawing || this.isRunning || !e.target.dataset.x) return;

        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        this.toggleWall(x, y);
    }

    setPosition(type, x, y) {
        const isStart = type === 'start';
        const nodeKey = isStart ? 'startNode' : 'endNode';
        const prop = isStart ? 'isStart' : 'isEnd';

        const oldNode = this.grid[this[nodeKey].y][this[nodeKey].x];
        if (oldNode) oldNode[prop] = false;

        this[nodeKey] = { x, y };
        const newNode = this.grid[y][x];
        newNode[prop] = true;
        newNode.isWall = false;
        newNode[isStart ? 'isEnd' : 'isStart'] = false;

        this.updateGridDisplay();
    }

    toggleWall(x, y) {
        const node = this.grid[y][x];
        if (!node.isStart && !node.isEnd) {
            node.isWall = !node.isWall;
            node.element.className = `cell ${node.isWall ? 'wall' : 'empty'}`;
        }
    }

    async startPathfinding() {
        if (this.isRunning) return;

        this.clearPath();
        this.isRunning = true;
        this.updateButton('startBtn', 'Running...', true);

        try {
            // Execute the selected algorithm
            const algorithm = this.algorithms[this.currentAlgorithm];
            const result = await algorithm.execute();

            this.elements.pathLength.textContent = result.path.length;
            this.elements.nodesVisited.textContent = result.visitedCount;

            if (result.path.length > 0) {
                await this.animatePath(result.path);
            } else {
                window.alert("No path found. Try removing some walls or select a different algorithm.");
            }
        } catch (error) {
            console.error('Pathfinding error:', error);
        }

        this.isRunning = false;
        this.updateButton('startBtn', 'Find Path', false);
    }

    updateButton(id, text, disabled) {
        const btn = this.elements[id];
        btn.textContent = text;
        btn.disabled = disabled;
    }

    async animatePath(path) {
        for (let i = 1; i < path.length - 1; i++) {
            const node = path[i];
            node.isPath = true;

            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    node.element.classList.add('path');
                    setTimeout(resolve, this.animationSpeed * 2);
                });
            });
        }
    }

    generateMaze() {
        if (this.isRunning) return;

        this.resetGrid();

        // Initialize maze with all walls
        const maze = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(true));

        // Recursive backtracking
        const stack = [];
        const startX = 1, startY = 1;
        maze[startY][startX] = false;
        stack.push({ x: startX, y: startY });

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getMazeNeighbors(current, maze);

            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                const wallX = current.x + (next.x - current.x) / 2;
                const wallY = current.y + (next.y - current.y) / 2;
                maze[wallY][wallX] = false;
                maze[next.y][next.x] = false;
                stack.push(next);
            } else {
                stack.pop();
            }
        }

        // Apply maze to grid
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const node = this.grid[y][x];
                if (!node.isStart && !node.isEnd && maze[y]) {
                    node.isWall = maze[y][x];
                }
            }
        }

        this.updateGridDisplay();
    }

    getMazeNeighbors(cell, maze) {
        const neighbors = [];

        for (const [dx, dy] of this.mazeDirections) {
            const x = cell.x + dx, y = cell.y + dy;
            if (x > 0 && x < this.gridWidth - 1 && y > 0 && y < this.gridHeight - 1 && maze[y][x]) {
                neighbors.push({ x, y });
            }
        }

        return neighbors;
    }

    clearPath() {
        if (this.isRunning) return;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const node = this.grid[y][x];
                Object.assign(node, {
                    isVisited: false,
                    isPath: false,
                    distance: Infinity,
                    gScore: Infinity,
                    fScore: Infinity,
                    parent: null
                });
                node.element.classList.remove('visited', 'path', 'current');
            }
        }

        this.resetStats();
    }

    resetGrid() {
        if (this.isRunning) return;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const node = this.grid[y][x];
                Object.assign(node, {
                    isWall: false,
                    isVisited: false,
                    isPath: false,
                    distance: Infinity,
                    gScore: Infinity,
                    fScore: Infinity,
                    parent: null
                });
            }
        }

        this.updateGridDisplay();
        this.resetStats();

        // Reset Q-Learning specific properties
        if (this.algorithms.qlearning && this.algorithms.qlearning.reset) {
            this.algorithms.qlearning.reset();
        }
    }

    resetStats() {
        this.elements.pathLength.textContent = '0';
        this.elements.nodesVisited.textContent = '0';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => new PathfinderVisualizer());
