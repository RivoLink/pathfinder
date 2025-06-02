class DijkstraAlgorithm {
    constructor(visualizer) {
        this.visualizer = visualizer;
        // Pre-computed directions for better performance
        this.directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    }

    // Optimized Dijkstra using sorted array
    async execute() {
        const unvisited = [];
        const visited = new Set();
        let visitedCount = 0;

        // Initialize all nodes
        for (let y = 0; y < this.visualizer.gridHeight; y++) {
            for (let x = 0; x < this.visualizer.gridWidth; x++) {
                const node = this.visualizer.grid[y][x];
                node.distance = Infinity;
                node.parent = null;
                if (!node.isWall) {
                    unvisited.push(node);
                }
            }
        }

        const startNode = this.visualizer.grid[this.visualizer.startNode.y][this.visualizer.startNode.x];
        startNode.distance = 0;

        while (unvisited.length > 0) {
            // Find node with minimum distance
            let currentIndex = 0;
            for (let i = 1; i < unvisited.length; i++) {
                if (unvisited[i].distance < unvisited[currentIndex].distance) {
                    currentIndex = i;
                }
            }

            const currentNode = unvisited.splice(currentIndex, 1)[0];

            if (currentNode.distance === Infinity) break;

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
                if (visited.has(neighbor) || neighbor.isWall) continue;

                const newDistance = currentNode.distance + 1;
                if (newDistance < neighbor.distance) {
                    neighbor.distance = newDistance;
                    neighbor.parent = currentNode;
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
