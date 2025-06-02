class BreadthFirstSearchAlgorithm {
    constructor(visualizer) {
        this.visualizer = visualizer;
        // Pre-computed directions for better performance
        this.directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    }

    async execute() {
        const queue = [this.visualizer.grid[this.visualizer.startNode.y][this.visualizer.startNode.x]];
        const visited = new Set();
        let visitedCount = 0;

        while (queue.length > 0) {
            const currentNode = queue.shift(); // FIFO for BFS

            if (visited.has(currentNode) || currentNode.isWall) continue;
            visited.add(currentNode);

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
                if (!visited.has(neighbor) && !neighbor.isWall) {
                    neighbor.parent = currentNode;
                    queue.push(neighbor);
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
