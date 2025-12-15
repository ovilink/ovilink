export default class GraphCompiler {
    static compile(nodes, connections) {
        // 1. Find Entry Point (On Update)
        const updateNode = nodes.find(n => n.dataset.type === 'event_update');

        if (!updateNode) {
            return "// No 'On Update' node found.";
        }

        let code = "update: function(dt, objects) {\n";

        // 2. Traverse Graph
        // Simple linear traversal for this prototype
        let currentNode = updateNode;

        // Prevent infinite loops
        const maxSteps = 100;
        let steps = 0;

        while (currentNode && steps < maxSteps) {
            // Find connection starting from this node's output
            const connection = connections.find(c => c.sourcePort.closest('.graph-node') === currentNode);

            if (!connection) break;

            const nextNode = connection.targetPort.closest('.graph-node');
            const type = nextNode.dataset.type;

            // Generate Code based on Node Type
            if (type === 'action_rotate') {
                code += "    // Rotate Action\n";
                code += "    objects.forEach(obj => {\n";
                code += "        if (obj.rotation !== undefined) obj.rotation += 2 * dt;\n";
                code += "    });\n";
            } else if (type === 'action_color') {
                code += "    // Color Action\n";
                code += "    objects.forEach(obj => {\n";
                code += "        // Cycle color just for demo\n";
                code += "        const hue = (performance.now() / 20) % 360;\n";
                code += "        obj.fill = `hsl(${hue}, 70%, 50%)`;\n";
                code += "    });\n";
            }

            currentNode = nextNode;
            steps++;
        }

        code += "}";
        return code;
    }
}
