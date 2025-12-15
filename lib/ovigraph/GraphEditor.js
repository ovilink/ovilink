import OviCanvas from '../../js/ui/OviCanvas.js';
import Inspector from './ui/Inspector.js';

export default class GraphEditor {
    constructor(engine) {
        this.engine = engine;
        this.canvas = null;
        this.nodes = []; // Keep track of nodes
        this.connections = []; // Keep track of connections {sourcePort, targetPort, pathElement}
        this.selectedNode = null;

        // Dragging State
        this.isDraggingNode = false;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };

        // Connection State
        this.isConnecting = false;
        this.tempConnection = null;
        this.sourcePort = null;

        // Bound Event Handlers (Shared between bind/unbind)
        this.onWindowMouseMove = this.handleWindowMouseMove.bind(this);
        this.onWindowMouseUp = this.handleWindowMouseUp.bind(this);
    }

    create() {
        // Container
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';

        // Open Tab (Pass 'this' as editor instance)
        this.engine.tabManager.openTab('Workflow', 'ovigraph', container, this);

        // Init Canvas
        this.canvas = new OviCanvas(container);

        // Setup Drop Zone
        this.setupDropZone(container);

        // Setup Interaction (Local container events)
        this.setupInteraction(container);

        // Run Button
        const runBtn = document.createElement('button');
        runBtn.innerText = '▶ Run Logic';
        runBtn.style.position = 'absolute';
        runBtn.style.top = '10px';
        runBtn.style.right = '20px';
        runBtn.style.padding = '5px 15px';
        runBtn.style.background = '#9c27b0';
        runBtn.style.color = 'white';
        runBtn.style.border = 'none';
        runBtn.style.borderRadius = '4px';
        runBtn.style.cursor = 'pointer';
        runBtn.style.zIndex = '10';
        runBtn.onclick = () => {
            this.runGraph();
        };
        container.appendChild(runBtn);
    }

    // Lifecycle: Called by TabManager when tab becomes active
    bindEvents() {
        window.addEventListener('mousemove', this.onWindowMouseMove);
        window.addEventListener('mouseup', this.onWindowMouseUp);
    }

    // Lifecycle: Called by TabManager when tab is deactivated
    unbindEvents() {
        window.removeEventListener('mousemove', this.onWindowMouseMove);
        window.removeEventListener('mouseup', this.onWindowMouseUp);
    }

    runGraph() {
        import('./GraphCompiler.js').then(module => {
            const code = module.default.compile(this.nodes, this.connections);
            console.log("Compiled Code:", code);

            // Inject into OviState
            const oviStatePlugin = this.engine.pluginManager.plugins.get('ovistate');
            if (oviStatePlugin && oviStatePlugin.activeEditor && oviStatePlugin.activeEditor.runtime) {
                oviStatePlugin.activeEditor.runtime.setGlobalScript(code);
                alert("Logic Running!");
            } else {
                alert("No active simulation found. Please create a simulation in OviState first.");
            }
        });
    }

    setupDropZone(container) {
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const nodeType = e.dataTransfer.getData('nodeType');
            const nodeLabel = e.dataTransfer.getData('nodeLabel');

            if (nodeType) {
                const pos = this.canvas.screenToWorld(e.clientX, e.clientY);
                this.createNode(nodeLabel, nodeType, pos.x, pos.y);
            }
        });
    }

    setupInteraction(container) {
        // Mouse Down: Select, Start Drag, or Start Connection
        container.addEventListener('mousedown', (e) => {
            // Ignore if panning (Alt or Middle)
            if (e.button === 1 || e.altKey) return;

            // Check if clicked on a port
            const port = e.target.closest('.node-port');
            if (port) {
                e.stopPropagation();
                this.startConnection(port, e);
                return;
            }

            const target = e.target.closest('.graph-node');

            if (target) {
                e.stopPropagation(); // Stop canvas panning
                this.selectNode(target);

                // Start Dragging
                this.isDraggingNode = true;
                this.draggedNode = target;

                // Calculate offset from node top-left
                const pos = this.canvas.screenToWorld(e.clientX, e.clientY);
                const nodeX = parseFloat(target.style.left);
                const nodeY = parseFloat(target.style.top);

                this.dragOffset = {
                    x: pos.x - nodeX,
                    y: pos.y - nodeY
                };
            } else {
                // Clicked on empty space -> Deselect
                this.deselectNode();
            }
        });

        // Note: Window listeners are now handled by bindEvents/unbindEvents
    }

    handleWindowMouseMove(e) {
        const pos = this.canvas.screenToWorld(e.clientX, e.clientY);

        if (this.isDraggingNode && this.draggedNode) {
            const newX = pos.x - this.dragOffset.x;
            const newY = pos.y - this.dragOffset.y;

            this.draggedNode.style.left = `${newX}px`;
            this.draggedNode.style.top = `${newY}px`;

            // Update connected lines
            this.updateConnections(this.draggedNode);
        }

        if (this.isConnecting && this.tempConnection) {
            // Update temp line end point
            // We need source coordinates
            const sourceRect = this.sourcePort.getBoundingClientRect();
            const sourcePos = this.canvas.screenToWorld(
                sourceRect.left + sourceRect.width / 2,
                sourceRect.top + sourceRect.height / 2
            );

            // Re-draw path
            const d = this.calculateBezier(sourcePos.x, sourcePos.y, pos.x, pos.y);
            this.tempConnection.setAttribute('d', d);
        }
    }

    handleWindowMouseUp(e) {
        this.isDraggingNode = false;
        this.draggedNode = null;

        if (this.isConnecting) {
            // Check if dropped on a valid target port
            const targetPort = e.target.closest('.node-port');
            if (targetPort && targetPort !== this.sourcePort) {
                this.finalizeConnection(targetPort);
            } else {
                // Cancel connection
                if (this.tempConnection) this.tempConnection.remove();
            }
            this.isConnecting = false;
            this.tempConnection = null;
            this.sourcePort = null;
        }
    }

    startConnection(port, e) {
        this.isConnecting = true;
        this.sourcePort = port;

        // Create temp line
        const rect = port.getBoundingClientRect();
        const startPos = this.canvas.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);

        this.tempConnection = this.canvas.drawConnection(startPos.x, startPos.y, startPos.x, startPos.y, '#40a9ff');
        this.tempConnection.style.pointerEvents = 'none'; // Ensure it doesn't block mouse events
    }

    finalizeConnection(targetPort) {
        // Draw permanent line
        const sourceRect = this.sourcePort.getBoundingClientRect();
        const targetRect = targetPort.getBoundingClientRect();

        const p1 = this.canvas.screenToWorld(sourceRect.left + sourceRect.width / 2, sourceRect.top + sourceRect.height / 2);
        const p2 = this.canvas.screenToWorld(targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height / 2);

        const path = this.canvas.drawConnection(p1.x, p1.y, p2.x, p2.y, '#555');

        // Store connection
        this.connections.push({
            sourcePort: this.sourcePort,
            targetPort: targetPort,
            pathElement: path
        });

        // Remove temp line
        if (this.tempConnection) this.tempConnection.remove();

        console.log("Connected!");
    }

    updateConnections(node) {
        this.connections.forEach(conn => {
            const sourceNode = conn.sourcePort.closest('.graph-node');
            const targetNode = conn.targetPort.closest('.graph-node');

            // If this connection is attached to the moved node
            if (sourceNode === node || targetNode === node) {
                const sourceRect = conn.sourcePort.getBoundingClientRect();
                const targetRect = conn.targetPort.getBoundingClientRect();

                const p1 = this.canvas.screenToWorld(sourceRect.left + sourceRect.width / 2, sourceRect.top + sourceRect.height / 2);
                const p2 = this.canvas.screenToWorld(targetRect.left + targetRect.width / 2, targetRect.top + targetRect.height / 2);

                const d = this.calculateBezier(p1.x, p1.y, p2.x, p2.y);
                conn.pathElement.setAttribute('d', d);
            }
        });
    }

    calculateBezier(x1, y1, x2, y2) {
        const dist = Math.abs(x2 - x1) * 0.5;
        const cp1x = x1 + dist;
        const cp1y = y1;
        const cp2x = x2 - dist;
        const cp2y = y2;
        return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    }

    createNode(label, type, x, y) {
        const node = document.createElement('div');
        node.className = 'graph-node';
        // Basic Styling
        node.style.width = '150px';
        node.style.height = '60px';
        node.style.background = 'var(--bg-panel)';
        node.style.border = '1px solid var(--border-color)';
        node.style.borderRadius = '6px';
        node.style.color = 'var(--text-primary)';
        node.style.display = 'flex';
        node.style.alignItems = 'center';
        node.style.justifyContent = 'center';
        node.style.fontSize = '12px';
        node.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        node.style.cursor = 'pointer';
        node.style.userSelect = 'none';
        node.style.position = 'absolute'; // Ensure absolute positioning

        // Content
        node.innerHTML = `<strong>${label}</strong>`;

        // Ports
        this.addPort(node, 'input');
        this.addPort(node, 'output');

        // Metadata
        node.dataset.type = type;
        node.dataset.label = label;

        // Add to canvas
        this.canvas.addNode(node, x, y);
        this.nodes.push(node);

        // Auto-select
        this.selectNode(node);
    }

    addPort(node, type) {
        const port = document.createElement('div');
        port.className = 'node-port';
        port.dataset.type = type;
        port.style.width = '10px';
        port.style.height = '10px';
        port.style.borderRadius = '50%';
        port.style.background = '#888';
        port.style.border = '1px solid #fff';
        port.style.position = 'absolute';
        port.style.cursor = 'crosshair';

        if (type === 'input') {
            port.style.left = '-5px';
            port.style.top = '50%';
            port.style.transform = 'translateY(-50%)';
        } else {
            port.style.right = '-5px';
            port.style.top = '50%';
            port.style.transform = 'translateY(-50%)';
        }

        // Hover effect
        port.onmouseenter = () => port.style.background = '#40a9ff';
        port.onmouseleave = () => port.style.background = '#888';

        node.appendChild(port);
    }

    selectNode(node) {
        if (this.selectedNode) {
            this.selectedNode.style.borderColor = 'var(--border-color)';
            this.selectedNode.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        }

        this.selectedNode = node;
        node.style.borderColor = 'var(--text-accent)';
        node.style.boxShadow = '0 0 0 2px rgba(64, 169, 255, 0.2)';

        // Update Inspector
        Inspector.update(this.engine, {
            type: node.dataset.type,
            label: node.dataset.label,
            x: node.style.left,
            y: node.style.top
        });
    }

    deselectNode() {
        if (this.selectedNode) {
            this.selectedNode.style.borderColor = 'var(--border-color)';
            this.selectedNode.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            this.selectedNode = null;

            // Clear Inspector
            Inspector.render(this.engine);
        }
    }
}
