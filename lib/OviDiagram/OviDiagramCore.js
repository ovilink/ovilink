/**
 * OviDiagramCore
 * Contains the core logic for the diagram editor: Graph management and Canvas interaction.
 */
import FlowchartRenderer from './renderers/FlowchartRenderer.js';

export class Graph {
    constructor() {
        this.nodes = [];
        this.links = [];
    }

    addNode(node) {
        this.nodes.push(node);
        return node;
    }

    addLink(sourceNodeId, sourcePointIndex, targetNodeId, targetPointIndex, styleType = 'angle') {
        const link = {
            id: `link_${Date.now()}`,
            sourceNodeId,
            sourcePointIndex,
            targetNodeId,
            targetPointIndex,
            style: {
                type: styleType, // 'straight', 'angle', 'curve'
                color: '#5f6368', // Professional grey
                startHead: 'none',
                endHead: 'arrow'
            }
        };
        this.links.push(link);
        return link;
    }
}

export class DiagramCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.canvas.diagram = this; // Expose instance
        this.ctx = canvas.getContext('2d');
        this.graph = new Graph();

        // Interaction State
        this.hoveredShape = null;
        this.hoveredConnectionPoint = null;
        this.isConnecting = false;
        this.connectionStart = null;
        this.selectedNodeIds = new Set();
        this.connectionStyle = 'angle'; // Default style

        // Dragging/Panning
        this.isPanning = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.scale = 1;
        this.draggingNodes = [];
        this.dragOffset = { x: 0, y: 0 };

        // Default Renderer (can be overridden)
        this.renderer = new FlowchartRenderer(this.ctx);

        this.bindEvents();

        // Initial resize
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Start Loop
        this.loop();
    }

    setRenderer(renderer) {
        this.renderer = renderer;
    }

    executeContextPadAction(tool, sourceNode) {
        if (tool.action === 'delete') {
            const idx = this.graph.nodes.findIndex(n => n.id === sourceNode.id);
            if (idx !== -1) {
                this.graph.nodes.splice(idx, 1);
                // Remove linked links
                this.graph.links = this.graph.links.filter(l => l.sourceNodeId !== sourceNode.id && l.targetNodeId !== sourceNode.id);
                this.selectedNodeIds.clear();
            }
            return;
        }

        // Create new node
        const offset = 150;
        const newNodeData = {
            type: tool.type,
            x: sourceNode.x + offset,
            y: sourceNode.y - (sourceNode.height / 2) + 40 // simple alignment
        };

        // Use current renderer factory
        const newNode = this.renderer.createNode(newNodeData, this.graph.nodes);
        if (newNode) {
            // Check for collision/overlap and adjust y if needed? (skip for now)
            newNode.id = 'node_' + Date.now();
            this.graph.addNode(newNode);

            // Link them
            // Connect: Source Right -> Target Left
            const sourcePoints = sourceNode.getConnectionPoints();
            const targetPoints = newNode.getConnectionPoints();

            // Assuming simplified array order for now: Top(0), Right(1), Bottom(2), Left(3)
            // But Shapes might vary. Let's trust geometric center approach if indices fail, 
            // but for now hardcode 1->3

            const link = this.graph.addLink(sourceNode.id, 1, newNode.id, 3);

            // Select new node
            this.selectedNodeIds.clear();
            this.selectedNodeIds.add(newNode.id);
        }
    }

    resizeCanvas() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.clientWidth;
            this.canvas.height = parent.clientHeight;
            this.draw();
        }
    }

    // --- Drawing ---

    draw() {
        if (!this.ctx) return;

        // Clear and Save
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        // Apply Transform
        this.ctx.translate(this.offset.x, this.offset.y);
        this.ctx.scale(this.scale, this.scale);

        // 1. Background
        this._smartHandle = null; // Reset per frame
        if (this.renderer) {
            this.renderer.drawBackground();
        }

        // 2. Links
        this.drawLinks();

        // 3. Nodes
        if (this.renderer) {
            this.renderer.drawNodes(this.graph.nodes);
        }

        // 4. Connection Points (Only if hovered or connecting)
        if (this.hoveredShape && !this.isConnecting) {
            this.drawConnectionPoints(this.hoveredShape);
        }

        // 5. Connection Line (During drag)
        if (this.isConnecting && this.connectionStart) {
            this.drawConnectionLine();
        }

        // 6. Highlight Selection (if generic box needed, optional)

        // Draw Smart Create Handle (Fluid Flow)
        if (this.selectedNodeIds.size === 1) {
            const selectedNodeId = this.selectedNodeIds.values().next().value;
            const selectedNode = this.graph.nodes.find(n => n.id === selectedNodeId);

            // Check capability OR fallback to type check (safety net)
            const isEndEvent = selectedNode && (
                selectedNode.type === 'BPMN::EndEvent' ||
                selectedNode.subtype === 'end' ||
                (selectedNode.eventType === 'end')
            );

            if (selectedNode && selectedNode.canConnectOutgoing() && !isEndEvent) {
                this.drawSmartHandle(selectedNode);
            }
        }

        this.ctx.restore();
    }

    drawSmartHandle(node) {
        // Position: Right side center
        const cx = node.x + node.width + 20;
        const cy = node.y + node.height / 2;

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 10, 0, Math.PI * 2);

        // Style: Material Red/Orange pulse
        this.ctx.fillStyle = '#c5221f';
        this.ctx.shadowColor = 'rgba(197, 34, 31, 0.4)';
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Plus Icon
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 5, cy);
        this.ctx.lineTo(cx + 5, cy);
        this.ctx.moveTo(cx, cy - 5);
        this.ctx.lineTo(cx, cy + 5);
        this.ctx.stroke();

        // Store handle for hit test
        this._smartHandle = {
            nodeId: node.id,
            bounds: { x: cx - 12, y: cy - 12, w: 24, h: 24, node: node }
        };
    }

    /**
     * Called when the user drops a smart connection in empty space.
     * @param {number} x - Screen X
     * @param {number} y - Screen Y
     * @param {Object} sourceNode 
     */
    onRequestPicker(x, y, sourceNode) {
        console.log("Request Picker at", x, y);
        // External handler should be assigned to this property
        if (this.onShowNodePicker) {
            this.onShowNodePicker(x, y, sourceNode);
        }
    }

    getContextPadTools(node) {
        const tools = [];

        // Simplified Logic: Always offer Task and Gateway, adding End if it's not an End event
        tools.push({ icon: '⬜', type: 'BPMN::Task', label: 'Task', color: '#1a73e8' });
        tools.push({ icon: '◇', type: 'BPMN::ExclusiveGateway', label: 'Gateway', color: '#e37400' });

        // Assuming node.type exists and can be checked
        if (!node.type || !node.type.includes('End')) {
            tools.push({ icon: '⭕', type: 'BPMN::EndEvent', label: 'End', color: '#c5221f' });
        }

        // Add Trash icon
        tools.push({ icon: '🗑️', action: 'delete', label: 'Delete', color: '#666' });

        return tools;
    }

    drawLinks() {
        this.graph.links.forEach(link => {
            const source = this.graph.nodes.find(n => n.id === link.sourceNodeId);
            const target = this.graph.nodes.find(n => n.id === link.targetNodeId);
            if (!source || !target) return;

            const startPos = source.getConnectionPoints()[link.sourcePointIndex];
            const endPos = target.getConnectionPoints()[link.targetPointIndex];

            if (!startPos || !endPos) return;

            this.ctx.beginPath();
            this.ctx.strokeStyle = link.style.color;
            this.ctx.lineWidth = 2;
            this.drawPath(startPos, endPos, link.style.type);
            this.ctx.stroke();

            // Arrowhead
            if (link.style.endHead === 'arrow') {
                this.drawArrowHead(startPos, endPos, link.style.type);
            }
        });
    }

    drawPath(start, end, type) {
        if (type === 'angle') {
            const midX = start.x + (end.x - start.x) / 2;
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(midX, start.y);
            this.ctx.lineTo(midX, end.y);
            this.ctx.lineTo(end.x, end.y);
        } else if (type === 'curve') {
            const cp1x = start.x + (end.x - start.x) * 0.5;
            const cp1y = start.y;
            const cp2x = end.x - (end.x - start.x) * 0.5;
            const cp2y = end.y;
            this.ctx.moveTo(start.x, start.y);
            this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, end.x, end.y);
        } else {
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(end.x, end.y);
        }
    }

    drawArrowHead(from, to, type) {
        const headLength = 10;
        let angle;

        if (type === 'angle') {
            const midX = from.x + (to.x - from.x) / 2;
            // The last segment is from (midX, to.y) to (to.x, to.y)
            // So it's always horizontal
            angle = Math.atan2(0, to.x - midX);
        } else if (type === 'curve') {
            // Cubic Bezier: tangent at end is vector P3 - P2
            // P2 (Control Point 2) is calculated as:
            const cp2x = to.x - (to.x - from.x) * 0.5;
            const cp2y = to.y;
            angle = Math.atan2(to.y - cp2y, to.x - cp2x);
        } else {
            // Straight
            angle = Math.atan2(to.y - from.y, to.x - from.x);
        }

        this.ctx.beginPath();
        this.ctx.moveTo(to.x, to.y);
        this.ctx.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(to.x, to.y);
        this.ctx.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }

    drawConnectionPoints(node) {
        const points = node.getConnectionPoints();
        points.forEach((point, index) => {
            const isHovered = this.hoveredConnectionPoint &&
                this.hoveredConnectionPoint.nodeId === node.id &&
                this.hoveredConnectionPoint.index === index;

            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, isHovered ? 6 : 4, 0, Math.PI * 2);
            this.ctx.fillStyle = isHovered ? '#1a73e8' : '#ffffff';
            this.ctx.fill();
            this.ctx.strokeStyle = '#1a73e8';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        });
    }

    drawConnectionLine() {
        const start = this.connectionStart.point; // {x, y}
        const end = this.hoveredConnectionPoint ? this.hoveredConnectionPoint.point : this.toGraphCoords(this.lastMousePos.x, this.lastMousePos.y);

        this.ctx.beginPath();
        // Use the active connection style for the preview
        this.drawPath(start, end, this.connectionStyle);

        this.ctx.strokeStyle = '#1a73e8';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    // --- Interaction ---

    bindEvents() {
        this.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

        // Drag and Drop (External)
        this.canvas.addEventListener('dragover', e => e.preventDefault());
        this.canvas.addEventListener('drop', this._onDrop.bind(this));

        // Keyboard Events
        // Create a bound handler to enable removal if needed, though this class usually persists
        this._onKeyDownHandler = this._onKeyDown.bind(this);
        window.addEventListener('keydown', this._onKeyDownHandler);

        // Ensure we clean up when/if destroyed (not fully implemented in this flow but good practice)
    }

    _onKeyDown(e) {
        // Only if canvas is focused or active (checking if it's in the DOM)
        if (!document.body.contains(this.canvas)) return;

        // Delete / Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.selectedNodeIds.size > 0) {
                // Prevent default backspace navigation
                e.preventDefault();
                this.deleteSelectedNodes();
            }
        }
    }

    deleteSelectedNodes() {
        if (this.selectedNodeIds.size === 0) return;

        const idsToDelete = Array.from(this.selectedNodeIds);

        // Remove Nodes
        this.graph.nodes = this.graph.nodes.filter(n => !idsToDelete.includes(n.id));

        // Remove Links connected to these nodes
        this.graph.links = this.graph.links.filter(l =>
            !idsToDelete.includes(l.sourceNodeId) && !idsToDelete.includes(l.targetNodeId)
        );

        this.selectedNodeIds.clear();
        this._smartHandle = null; // Clear handle
        console.log(`Deleted ${idsToDelete.length} nodes.`);
    }

    _onMouseDown(e) {
        const { x: mouseX, y: mouseY } = this.toGraphCoords(e.clientX, e.clientY);

        // 0. Check Context Pad Hit
        if (this._currentContextPadTools && this.selectedNodeIds.size === 1) {
            for (const tool of this._currentContextPadTools) {
                if (tool.bounds &&
                    mouseX >= tool.bounds.x && mouseX <= tool.bounds.x + tool.bounds.w &&
                    mouseY >= tool.bounds.y && mouseY <= tool.bounds.y + tool.bounds.h) {

                    console.log('Context Pad tool clicked:', tool.label);
                    this.executeContextPadAction(tool, tool.bounds.node);
                    return;
                }
            }
        }

        // 1. Check Smart Handle Hit
        if (this._smartHandle) {
            const b = this._smartHandle.bounds;
            const dist = Math.sqrt(Math.pow(mouseX - (b.x + b.w / 2), 2) + Math.pow(mouseY - (b.y + b.h / 2), 2));
            if (dist <= 15) {
                // Start Drag-to-Create Connection
                this.isConnecting = true;
                const cx = b.x + b.w / 2;
                const cy = b.y + b.h / 2;
                this.connectionStart = {
                    nodeId: this._smartHandle.nodeId,
                    index: 1, // Assumed Right
                    point: { x: cx, y: cy }
                };
                return;
            }
        }

        // 2. Connection Start (from existing point)
        if (this.hoveredConnectionPoint) {
            this.isConnecting = true;
            this.connectionStart = {
                nodeId: this.hoveredConnectionPoint.nodeId,
                index: this.hoveredConnectionPoint.index,
                point: this.hoveredConnectionPoint.point
            };
            return;
        }

        // 3. Node Selection
        const clickedNode = this.graph.nodes.slice().reverse().find(n => n.isPointInside(mouseX, mouseY));

        if (clickedNode) {
            this.selectedNodeIds.clear();
            this.selectedNodeIds.add(clickedNode.id);
            this.draggingNodes = [clickedNode];
            this.dragOffset = { x: mouseX - clickedNode.x, y: mouseY - clickedNode.y };

            // Visual update
            this.graph.nodes.forEach(n => n.isSelected = (n.id === clickedNode.id));
        } else {
            // Panning
            this.isPanning = true;
            this.lastPanningMousePos = { x: e.clientX, y: e.clientY };
            this.selectedNodeIds.clear();
            this.graph.nodes.forEach(n => n.isSelected = false);
        }
    }

    _onMouseMove(e) {
        const graphPos = this.toGraphCoords(e.clientX, e.clientY);
        this.lastMousePos = { x: e.clientX, y: e.clientY };

        if (this.isPanning) {
            const dx = e.clientX - this.lastPanningMousePos.x;
            const dy = e.clientY - this.lastPanningMousePos.y;
            this.offset.x += dx;
            this.offset.y += dy;
            this.lastPanningMousePos = { x: e.clientX, y: e.clientY };
            return; // Don't process hovers while panning
        }

        if (this.draggingNodes.length > 0) {
            const node = this.draggingNodes[0];
            node.x = graphPos.x - this.dragOffset.x;
            node.y = graphPos.y - this.dragOffset.y;
            return; // Don't process hovers while dragging
        }

        // 0. Smart Handle Hover Cursor
        if (this._smartHandle) {
            const b = this._smartHandle.bounds;
            const dist = Math.sqrt(Math.pow(graphPos.x - (b.x + b.w / 2), 2) + Math.pow(graphPos.y - (b.y + b.h / 2), 2));
            if (dist <= 15) {
                this.canvas.style.cursor = 'crosshair';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }

        // --- Critical Hover Logic ---

        // 1. Check points first (if hovered shape exists)
        let foundPoint = null;
        if (this.hoveredShape) {
            const points = this.hoveredShape.getConnectionPoints();
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                const d = Math.sqrt(Math.pow(graphPos.x - p.x, 2) + Math.pow(graphPos.y - p.y, 2));
                if (d < 10) {
                    foundPoint = { nodeId: this.hoveredShape.id, index: i, point: p };
                    break;
                }
            }
        }

        // Also check ANY shape if we are connecting (to snap to target)
        if (this.isConnecting) {
            const targetShape = this.graph.nodes.find(n => n.isPointInside(graphPos.x, graphPos.y));
            if (targetShape) {
                const points = targetShape.getConnectionPoints();
                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    const d = Math.sqrt(Math.pow(graphPos.x - p.x, 2) + Math.pow(graphPos.y - p.y, 2));
                    if (d < 15) { // Larger snap radius
                        foundPoint = { nodeId: targetShape.id, index: i, point: p };
                        break;
                    }
                }
            }
        }

        this.hoveredConnectionPoint = foundPoint;

        // 2. Check shapes
        const foundShape = this.graph.nodes.slice().reverse().find(n => n.isPointInside(graphPos.x, graphPos.y));

        // Only update hoveredShape if it changes or if we are not connecting
        if (foundShape !== this.hoveredShape) {
            if (this.hoveredShape) this.hoveredShape.isHovered = false;
            this.hoveredShape = foundShape;
            if (this.hoveredShape) this.hoveredShape.isHovered = true;
        }
    }

    _onMouseUp(e) {
        if (this.isConnecting) {
            if (this.hoveredConnectionPoint) {
                // Create Link to existing node
                if (this.connectionStart.nodeId !== this.hoveredConnectionPoint.nodeId) {
                    const sourceNode = this.graph.nodes.find(n => n.id === this.connectionStart.nodeId);
                    const targetNode = this.graph.nodes.find(n => n.id === this.hoveredConnectionPoint.nodeId);

                    if (sourceNode && targetNode &&
                        sourceNode.canConnectOutgoing() &&
                        targetNode.canConnectIncoming()) {

                        this.graph.addLink(
                            this.connectionStart.nodeId,
                            this.connectionStart.index,
                            this.hoveredConnectionPoint.nodeId,
                            this.hoveredConnectionPoint.index,
                            this.connectionStyle // Pass style
                        );
                    } else {
                        console.warn("Invalid connection violated BPMN rules.");
                    }
                }
            } else {
                // Dropped on empty space? -> Trigger Picker
                // We need the screen coordinates for the UI popup
                const sourceNode = this.graph.nodes.find(n => n.id === this.connectionStart.nodeId);
                if (sourceNode) {
                    this.onRequestPicker(e.clientX, e.clientY, sourceNode);
                }
            }
        }

        this.isConnecting = false;
        this.connectionStart = null;
        this.draggingNodes = [];
        this.isPanning = false;
    }

    _onWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const zoom = Math.exp(-e.deltaY * zoomSpeed);
        // Simple zoom (centered on mouse requires more math, keeping simple for professional feel without glitch)
        const oldScale = this.scale;
        this.scale = Math.max(0.2, Math.min(4, this.scale * zoom));
    }

    _onDrop(e) {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data && data.type) {
                const pos = this.toGraphCoords(e.clientX, e.clientY);
                // Create node using renderer factory
                const node = this.renderer.createNode({
                    type: data.type,
                    x: pos.x,
                    y: pos.y
                }, this.graph.nodes);
                this.graph.addNode(node);
            }
        } catch (err) {
            console.error(err);
        }
    }

    // --- Helpers ---

    toGraphCoords(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.offset.x) / this.scale,
            y: (clientY - rect.top - this.offset.y) / this.scale
        };
    }

    loop() {
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}
