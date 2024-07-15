// util.js; put wherever but remember to change the import further down
class ServerGraph {
    /**
     * @type { Map<string, Set<string>> }
     */
    edges = new Map();
    nodes = new Set();

    addEdge(from, to) {
        this.nodes.add(from).add(to);

        if (!this.edges.has(from)) this.edges.set(from, new Set());
        this.edges.get(from).add(to);

        if (!this.edges.has(to)) this.edges.set(to, new Set());
        this.edges.get(to).add(to);
    }

    neighors(node) {
        return this.edges.get(node) ?? new Set()
    }
}

/** @param {NS} ns */
export function getServerGraph(ns, startFrom = "home") {
    const graph = new ServerGraph();

    const queue = [startFrom];

    while (queue.length > 0) {
        const current = queue.shift();

        for (const to of ns.scan(current)) {
            if (!graph.nodes.has(to)) queue.push(to);

            const server = ns.getServer(to);
            if (server.backdoorInstalled) graph.addEdge("home", to);
            graph.addEdge(current, to);
        }
    }

    return graph;
}