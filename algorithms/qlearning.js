class QLearningAlgorithm {
    constructor(visualizer) {
        this.visualizer = visualizer;

        // Q-Learning properties
        this.qTable = new Map();
        this.epsilon = 0.1;
        this.alpha = 0.1;
        this.gamma = 0.9;
        this.episode = 0;
        this.maxEpisodes = 500;

        // Pre-computed directions for better performance
        this.directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    }

    // Q-Learning Implementation
    async execute() {
        this.initializeQTable();
        await this.trainAgent();
        return await this.executeLearned();
    }

    initializeQTable() {
        this.qTable.clear();
        for (let y = 0; y < this.visualizer.gridHeight; y++) {
            for (let x = 0; x < this.visualizer.gridWidth; x++) {
                if (!this.visualizer.grid[y][x].isWall) {
                    this.qTable.set(`${x},${y}`, { up: 0, down: 0, left: 0, right: 0 });
                }
            }
        }
    }

    async trainAgent() {
        const maxSteps = this.visualizer.gridWidth * this.visualizer.gridHeight;

        for (let episode = 0; episode < this.maxEpisodes; episode++) {
            let x = this.visualizer.startNode.x, y = this.visualizer.startNode.y;
            let steps = 0;
            const visited = new Set();
            let stuckCounter = 0;
            let lastPosition = null;

            while (steps < maxSteps && (x !== this.visualizer.endNode.x || y !== this.visualizer.endNode.y)) {
                const action = this.selectAction(x, y);
                const newPos = this.getNextPosition(x, y, action);

                if (this.isSurroundedByWalls(x, y)) break;

                if (this.isWall(newPos.x, newPos.y)) {
                    newPos.x = x;
                    newPos.y = y;
                }

                if (lastPosition && lastPosition.x === newPos.x && lastPosition.y === newPos.y) {
                    if (++stuckCounter > 5) {
                        // Give strong negative reward for being stuck
                        this.updateQValue(x, y, action, -50, newPos.x, newPos.y);
                        break;
                    }
                } else {
                    stuckCounter = 0;
                }

                const reward = this.getReward(x, y, newPos.x, newPos.y, visited);
                this.updateQValue(x, y, action, reward, newPos.x, newPos.y);

                visited.add(`${newPos.x},${newPos.y}`);
                lastPosition = {x, y};
                x = newPos.x;
                y = newPos.y;
                steps++;
            }

            // Decay epsilon for less exploration over time
            if (episode > 100) {
                this.epsilon = Math.max(0.05, this.epsilon * 0.998);
            }
        }
    }

    isSurroundedByWalls(x, y) {
        const actions = ['up', 'down', 'left', 'right'];
        let wallCount = 0;

        for (const action of actions) {
            const pos = this.getNextPosition(x, y, action);
            if (this.isWall(pos.x, pos.y)) {
                wallCount++;
            }
        }

        return wallCount === 4;
    }

    selectAction(x, y) {
        const qValues = this.qTable.get(`${x},${y}`);
        if (!qValues) return 'right';

        const actions = ['up', 'down', 'left', 'right'];
        const validActions = actions.filter(action => {
            const pos = this.getNextPosition(x, y, action);
            return !this.isWall(pos.x, pos.y);
        });

        if (validActions.length === 0) return 'right';

        // Epsilon-greedy action selection
        if (Math.random() < this.epsilon) {
            return validActions[Math.floor(Math.random() * validActions.length)];
        }

        return validActions.reduce((best, action) =>
            qValues[action] > qValues[best] ? action : best
        );
    }

    getNextPosition(x, y, action) {
        const moves = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const [dx, dy] = moves[action] || [0, 0];
        return { x: x + dx, y: y + dy };
    }

    isWall(x, y) {
        return x < 0 || x >= this.visualizer.gridWidth || y < 0 || y >= this.visualizer.gridHeight || this.visualizer.grid[y][x].isWall;
    }

    getReward(x, y, newX, newY, visited) {
        if (newX === this.visualizer.endNode.x && newY === this.visualizer.endNode.y) return 100;
        if (this.isWall(newX, newY)) return -20;
        if (visited.has(`${newX},${newY}`)) return -5;

        const distNew = Math.abs(newX - this.visualizer.endNode.x) + Math.abs(newY - this.visualizer.endNode.y);
        const distOld = Math.abs(x - this.visualizer.endNode.x) + Math.abs(y - this.visualizer.endNode.y);

        return distNew < distOld ? 5 : distNew > distOld ? -3 : -0.5;
    }

    updateQValue(x, y, action, reward, newX, newY) {
        const qValues = this.qTable.get(`${x},${y}`);
        const newQValues = this.qTable.get(`${newX},${newY}`);

        if (!qValues) return;

        const maxNextQ = newQValues ? Math.max(...Object.values(newQValues)) : 0;
        const currentQ = qValues[action];
        qValues[action] = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
    }

    async executeLearned() {
        let path = [];
        let x = this.visualizer.startNode.x, y = this.visualizer.startNode.y;
        let steps = 0;
        const maxSteps = this.visualizer.gridWidth * this.visualizer.gridHeight;
        const visited = new Set();
        let stuckCounter = 0;
        let lastPosition = null;

        while (steps < maxSteps && (x !== this.visualizer.endNode.x || y !== this.visualizer.endNode.y)) {
            if (this.isSurroundedByWalls(x, y)) break;

            if (!this.visualizer.grid[y][x].isStart && !this.visualizer.grid[y][x].isEnd) {
                this.visualizer.grid[y][x].isVisited = true;
                this.visualizer.grid[y][x].element.classList.add('visited');
                await this.visualizer.sleep(this.visualizer.animationSpeed);
            }

            path.push({ x, y });

            const qValues = this.qTable.get(`${x},${y}`);
            if (!qValues) break;

            const actions = ['up', 'down', 'left', 'right'];
            const validActions = actions.filter(action => {
                const pos = this.getNextPosition(x, y, action);
                return !this.isWall(pos.x, pos.y);
            });

            if (validActions.length === 0) break;

            let bestAction = validActions.reduce((best, action) =>
                qValues[action] > qValues[best] ? action : best
            );

            // Avoid loops
            const testPos = this.getNextPosition(x, y, bestAction);
            if (visited.has(`${testPos.x},${testPos.y}`) && validActions.length > 1) {
                const sorted = validActions.sort((a, b) => qValues[b] - qValues[a]);
                let foundAlternative = false;

                for (const action of sorted) {
                    const pos = this.getNextPosition(x, y, action);
                    if (!visited.has(`${pos.x},${pos.y}`)) {
                        bestAction = action;
                        foundAlternative = true;
                        break;
                    }
                }

                // If no unvisited alternative, try the second-best action
                if (!foundAlternative && sorted.length > 1) {
                    bestAction = sorted[1];
                }
            }

            const newPos = this.getNextPosition(x, y, bestAction);

            // Check if agent is stuck in same position
            if (lastPosition && lastPosition.x === newPos.x && lastPosition.y === newPos.y) {
                if (++stuckCounter > 5) break;
            } else {
                stuckCounter = 0;
            }

            visited.add(`${x},${y}`);
            lastPosition = {x, y};
            x = newPos.x;
            y = newPos.y;
            steps++;
        }

        // Only add end position if we actually reached it
        if (x === this.visualizer.endNode.x && y === this.visualizer.endNode.y) {
            path.push({ x: this.visualizer.endNode.x, y: this.visualizer.endNode.y });
        } else {
            path = [];
        }

        return { path: this.extractGridPath(path), visitedCount: path.length };
    }

    extractGridPath(path) {
        return path.length ? path.map(step => this.visualizer.grid[step.y][step.x]) : [];
    }

    // Reset Q-Learning specific properties
    reset() {
        this.qTable.clear();
        this.episode = 0;
        this.epsilon = 0.1;
    }
}
