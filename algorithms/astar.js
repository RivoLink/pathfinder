class AStarAlgorithm {
    constructor(visualizer) {
        this.visualizer = visualizer;
        // Pre-computed directions for better performance
        this.directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    }

    // Optimized A* using sorted array instead of MinHeap
    async execute() {
        const openSet = [];
        const closedSet = new Set();
        let visitedCount = 0;

        const startNode = this.visualizer.grid[this.visualizer.startNode.y][this.visualizer.startNode.x];
        const endNode = this.visualizer.grid[this.visualizer.endNode.y][this.visualizer.endNode.x];

        startNode.gScore = 0;
        startNode.fScore = this.heuristic(startNode, endNode);
        openSet.push(startNode);

        while (openSet.length > 0) {
            // Find node with lowest fScore
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].fScore < openSet[currentIndex].fScore) {
                    currentIndex = i;
                }
            }

            const currentNode = openSet.splice(currentIndex, 1)[0];

            if (closedSet.has(currentNode)) continue;
            closedSet.add(currentNode);

            if (!currentNode.isStart && !currentNode.isEnd) {
                currentNode.isVisited = true;
                currentNode.element.classList.add('visited');
                visitedCount++;
                await this.visualizer.sleep(this.visualizer.animationSpeed);
            }

            if (currentNode.isEnd) {
                return { path: this.reconstructPath(currentNode), visitedCount };
            }

            for (const neighbor of this.getNeighbors(currentNode)) {
                if (closedSet.has(neighbor) || neighbor.isWall) continue;

                const tentativeGScore = currentNode.gScore + 1;

                if (tentativeGScore < neighbor.gScore) {
                    neighbor.parent = currentNode;
                    neighbor.gScore = tentativeGScore;
                    neighbor.fScore = neighbor.gScore + this.heuristic(neighbor, endNode);

                    // Add to openSet if not already present
                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return { path: [], visitedCount };
    }

    getNeighbors(node) {
        const neighbors = [];

        for (const [dx, dy] of this.directions) {
            const x = node.x + dx, y = node.y + dy;
            if (x >= 0 && x < this.visualizer.gridWidth && y >= 0 && y < this.visualizer.gridHeight) {
                neighbors.push(this.visualizer.grid[y][x]);
            }
        }

        return neighbors;
    }

    heuristic(nodeA, nodeB) {
        return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
    }

    reconstructPath(endNode) {
        const path = [];
        let current = endNode;

        while (current) {
            path.unshift(current);
            current = current.parent;
        }

        return path;
    }
}
