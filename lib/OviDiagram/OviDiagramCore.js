/**
 * OviDiagramCore
 * Contains the core logic for the diagram editor: Graph management and Canvas interaction.
 */
import FlowchartRenderer from './renderers/FlowchartRenderer.js';
import DiagramBehaviorSystem from './DiagramBehaviorSystem.js';


export class Graph {
    constructor() {
        this.nodes = [];
        this.links = [];
    }

    addNode(node) {
        if (!node.status) node.status = 'pending';
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
            },
            label: '',
            labelStyle: {
                fontSize: 12,
                color: '#202124',
                background: '#fff'
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
        this.selectedLinkIds = new Set();
        this.connectionStyle = 'angle'; // Default style

        // Dragging/Panning
        this.isPanning = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.scale = 1;
        this.draggingNodes = [];
        this.dragOffset = { x: 0, y: 0 };

        // Grid & Snapping
        this.showGrid = true;
        this.gridSize = 25;
        this.enableSnapping = true;

        // Themes
        this.themes = {
            'default': { nodeFill: '#ffffff', nodeStroke: '#5f6368', textColor: '#202124', linkColor: '#5f6368' },
            'modern-blue': { nodeFill: '#e8f0fe', nodeStroke: '#1a73e8', textColor: '#174ea6', linkColor: '#1a73e8' },
            'professional-dark': { nodeFill: '#202124', nodeStroke: '#9aa0a6', textColor: '#ffffff', linkColor: '#9aa0a6' },
            'forest': { nodeFill: '#e6f4ea', nodeStroke: '#1e8e3e', textColor: '#137333', linkColor: '#1e8e3e' }
        };

        // Presentation Mode State
        this.presentationState = {
            active: false,
            currentIndex: -1,
            playlist: [], // Array of node IDs in order
            cameraTarget: null // {x, y, scale} for smooth transition
        };


        // Default Renderer (can be overridden)
        this.renderer = new FlowchartRenderer(this.ctx);

        // Behavior System
        this.behaviorSystem = new DiagramBehaviorSystem(this);
        this.lastTime = performance.now();

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

        if (this.showGrid) {
            this.drawGrid();
        }

        // 1. Background
        this._smartHandle = null; // Reset per frame
        if (this.renderer) {
            this.renderer.drawBackground();
        }

        // 2. Links
        this.drawLinks();

        // 3. Nodes
        if (this.renderer) {
            // Filter invisible nodes
            const visibleNodes = this.graph.nodes.filter(n => n.visible !== false);
            this.renderer.drawNodes(visibleNodes);

            // Draw Toggles for MindMap/OrgChart types
            visibleNodes.forEach(n => {
                if (n.type && (n.type.startsWith('MindMap') || n.type.startsWith('OrgChart'))) {
                    this.drawSmartToggle(n);
                }
                // Draw Status
                this.drawStatusIndicator(n);
                this.drawDetailIndicator(n);
            });
        }

        // 4. Connection Points (Only if hovered or connecting)
        if (this.hoveredShape && !this.isConnecting) {
            this.drawConnectionPoints(this.hoveredShape);
        }

        // 5. Connection Line (During drag)
        if (this.isConnecting && this.connectionStart) {
            this.drawConnectionLine();
        }

        // 6. Highlight Chain (Special Diagram Behavior)
        if (this.hoveredShape && this._isChainHighlight) {
            this.drawChainHighlight(this.hoveredShape);
        }

        // 7. Info Tooltip
        if (this.hoveredShape && this.hoveredShape.behaviors && this.hoveredShape.behaviors.includes('tooltip')) {
            this.drawInfoTooltip(this.hoveredShape);
        }


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

            // Allow MindMap nodes to have smart handles too
            const isMindMap = selectedNode && selectedNode.type && selectedNode.type.startsWith('MindMap');

            if (selectedNode && (selectedNode.canConnectOutgoing() || isMindMap) && !isEndEvent) {
                this.drawSmartHandle(selectedNode);
            }
        }

        this.ctx.restore();
    }

    /**
     * Renders a professional dot grid in the background to assist with alignment.
     */
    drawGrid() {
        const width = this.canvas.width / this.scale + 2000;
        const height = this.canvas.height / this.scale + 2000;

        // Offset-aware start positions
        const startX = Math.floor(-this.offset.x / this.scale / this.gridSize) * this.gridSize - 1000;
        const startY = Math.floor(-this.offset.y / this.scale / this.gridSize) * this.gridSize - 1000;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.fillStyle = '#dbdbdb'; // Professional subtle grey dots

        for (let x = startX; x < startX + width; x += this.gridSize) {
            for (let y = startY; y < startY + height; y += this.gridSize) {
                this.ctx.fillRect(x, y, 1, 1);
            }
        }
        this.ctx.restore();
    }

    drawStatusIndicator(node) {
        if (!node.status || node.status === 'pending') return;

        const ctx = this.ctx;
        // Position: Top-Right corner
        const cx = node.x + node.width;
        const cy = node.y;

        ctx.save();

        if (node.status === 'done') {
            // Green Check Badge
            ctx.fillStyle = '#1e8e3e';
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();

            // Outer White Ring
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Checkmark
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy);
            ctx.lineTo(cx - 1, cy + 4);
            ctx.lineTo(cx + 5, cy - 4);
            ctx.lineWidth = 2;
            ctx.stroke();

        } else if (node.status === 'active') {
            // Pulsing Glow
            const pulse = (Math.sin(performance.now() / 200) + 1) / 2; // 0 to 1
            ctx.shadowColor = '#1a73e8';
            ctx.shadowBlur = 10 + pulse * 10;
            ctx.fillStyle = '#1a73e8';

            // Blue Badge
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();

            // Loading Spinner
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const angle = (performance.now() / 1000 * Math.PI * 2) % (Math.PI * 2);
            ctx.arc(cx, cy, 6, angle, angle + Math.PI * 1.5);
            ctx.stroke();

        } else if (node.status === 'error') {
            // Red Error Badge
            ctx.fillStyle = '#d93025';
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Exclamation
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('!', cx, cy);
        }

        ctx.restore();
    }

    drawDetailIndicator(node) {
        if ((!node.metadata || !node.metadata.detail) && (!node.metadata?.attachments || node.metadata.attachments.length === 0)) return;

        // Position: Top-Left corner (opposite to status)
        const cx = node.x;
        const cy = node.y;

        // Determine Icon Type
        let iconChar = 'i';
        let bg = '#fbbc04';

        const atts = node.metadata?.attachments || [];
        const hasMedia = atts.some(a => a.type === 'video' || a.type === 'audio');
        if (hasMedia) {
            iconChar = '▶';
            bg = '#ff0000'; // Red for media
        }

        this.ctx.save();

        // Background Circle
        this.ctx.fillStyle = bg;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Icon
        this.ctx.fillStyle = '#fff'; // White text on red/yellow looks better? or Keep dark on yellow.
        if (bg === '#fbbc04') this.ctx.fillStyle = '#202124';

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.fillText(iconChar, cx, cy);

        this.ctx.restore();

        // Hit Area
        node._detailHit = { x: cx - 8, y: cy - 8, w: 16, h: 16 };
    }

    showDetailPopover(node) {
        if ((!node.metadata || !node.metadata.detail) && (!node.metadata?.attachments || node.metadata.attachments.length === 0)) return;

        // Remove existing popovers
        this.hideDetailPopover();

        const canvasRect = this.canvas.getBoundingClientRect();

        // Calculate screen coordinates for the node
        const screenX = canvasRect.left + (node.x * this.scale + this.offset.x);
        const screenY = canvasRect.top + (node.y * this.scale + this.offset.y);
        const screenW = node.width * this.scale;
        const screenH = node.height * this.scale;

        const popover = document.createElement('div');
        popover.className = 'ovi-detail-popover';
        popover.style.position = 'absolute';
        popover.style.left = `${screenX + screenW + 15}px`;
        popover.style.top = `${screenY}px`;
        popover.style.width = '300px';
        popover.style.maxHeight = '400px';
        popover.style.overflowY = 'auto';
        popover.style.background = '#fff';
        popover.style.border = '1px solid #dadce0';
        popover.style.borderRadius = '8px';
        popover.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        popover.style.zIndex = '1000';
        popover.style.padding = '15px';
        popover.style.fontFamily = 'Inter, sans-serif';
        popover.style.fontSize = '13px';
        popover.style.lineHeight = '1.5';
        popover.style.color = '#333';

        // Header with Title and Close
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '10px';
        header.style.borderBottom = '1px solid #f1f3f4';
        header.style.paddingBottom = '8px';
        header.innerHTML = `<strong>${node.label || 'Details'}</strong>`;

        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '18px';
        closeBtn.style.color = '#5f6368';
        closeBtn.onclick = () => this.hideDetailPopover();
        header.appendChild(closeBtn);
        popover.appendChild(header);

        // Content (Simple Markdown-like parser or raw text)
        const content = document.createElement('div');
        // Basic formatting: newlines to br, bullet points
        let formatted = (node.metadata.detail || '')
            .replace(/\n/g, '<br>')
            .replace(/- (.*?)<br>/g, '<li>$1</li>');

        content.innerHTML = formatted;
        popover.appendChild(content);

        // Attachments
        if (node.metadata?.attachments && node.metadata.attachments.length > 0) {
            const mediaContainer = document.createElement('div');
            mediaContainer.style.borderTop = '1px solid #f1f3f4';
            mediaContainer.style.paddingTop = '10px';
            mediaContainer.style.display = 'flex';
            mediaContainer.style.flexDirection = 'column';
            mediaContainer.style.gap = '10px';

            node.metadata.attachments.forEach(att => {
                const wrapper = document.createElement('div');

                if (att.label) {
                    const label = document.createElement('div');
                    label.textContent = att.label;
                    label.style.fontSize = '11px';
                    label.style.fontWeight = 'bold';
                    label.style.color = '#5f6368';
                    label.style.marginBottom = '4px';
                    wrapper.appendChild(label);
                }

                if (att.type === 'video') {
                    // Check for YouTube or Google Drive
                    let embedUrl = att.url;
                    let isEmbed = false;

                    if (att.url.includes('youtube.com') || att.url.includes('youtu.be')) {
                        isEmbed = true;
                        if (att.url.includes('watch?v=')) {
                            const vidId = att.url.split('watch?v=')[1].split('&')[0];
                            embedUrl = `https://www.youtube.com/embed/${vidId}`;
                        } else if (att.url.includes('youtu.be/')) {
                            const vidId = att.url.split('youtu.be/')[1].split('?')[0];
                            embedUrl = `https://www.youtube.com/embed/${vidId}`;
                        }
                    } else if (att.url.includes('drive.google.com')) {
                        isEmbed = true;
                        // Transform /view to /preview for embedding
                        embedUrl = att.url.replace('/view', '/preview');
                    }

                    if (isEmbed) {
                        const iframe = document.createElement('iframe');
                        iframe.src = embedUrl;
                        iframe.style.width = '100%';
                        iframe.style.aspectRatio = '16/9';
                        iframe.style.border = 'none';
                        iframe.style.borderRadius = '4px';
                        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                        iframe.allowFullscreen = true;
                        wrapper.appendChild(iframe);
                    } else {
                        const vid = document.createElement('video');
                        vid.src = att.url;
                        vid.controls = true;
                        vid.style.width = '100%';
                        vid.style.borderRadius = '4px';
                        wrapper.appendChild(vid);
                    }
                } else if (att.type === 'audio') {
                    const audio = document.createElement('audio');
                    audio.src = att.url;
                    audio.controls = true;
                    audio.style.width = '100%';
                    wrapper.appendChild(audio);
                } else if (att.type === 'image') {
                    const img = document.createElement('img');
                    img.src = att.url;
                    img.style.width = '100%';
                    img.style.borderRadius = '4px';
                    wrapper.appendChild(img);
                } else { // Link
                    const link = document.createElement('a');
                    link.href = att.url;
                    link.target = '_blank';
                    link.textContent = att.label || att.url; // Fallback label
                    link.style.display = 'inline-block';
                    link.style.padding = '8px 12px';
                    link.style.background = '#e8f0fe';
                    link.style.color = '#1a73e8';
                    link.style.textDecoration = 'none';
                    link.style.borderRadius = '4px';
                    link.style.fontSize = '12px';
                    link.style.fontWeight = '500';
                    link.style.wordBreak = 'break-word';

                    if (att.label) {
                        link.textContent = 'Open Link ↗';
                    }
                    wrapper.appendChild(link);
                }
                mediaContainer.appendChild(wrapper);
            });
            popover.appendChild(mediaContainer);
        }

        document.body.appendChild(popover);
        this.activePopover = popover;

        // Auto-close on click outside (managed via global listener or transparent overlay?)
        // For simplicity, just close when clicking canvas again
    }

    hideDetailPopover() {
        if (this.activePopover) {
            this.activePopover.remove();
            this.activePopover = null;
        }
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

            // 1. Check for Flow Behavior
            const hasFlow = source.behaviors && source.behaviors.includes('flow');
            const flowSpeed = this.behaviorSystem.registry.getParameter(source, 'flow', 'speed') || 20;
            const flowColor = this.behaviorSystem.registry.getParameter(source, 'flow', 'color') || '#1a73e8';

            // 1b. Check for Smart Status Flow
            const isCompletedPath = source.status === 'done' && target.status === 'done';
            const isActivePath = source.status === 'active';

            // 2. Base Path
            this.ctx.beginPath();

            // Determine Style
            if (isCompletedPath) {
                // Success Flow
                const dashOffset = (performance.now() / 1000 * 40) % 40;
                this.ctx.setLineDash([10, 5]);
                this.ctx.lineDashOffset = -dashOffset;
                this.ctx.strokeStyle = '#1e8e3e';
                this.ctx.lineWidth = 3;
            } else if (isActivePath) {
                // Active Pulse
                const pulse = (Math.sin(performance.now() / 300) + 1) / 2;
                this.ctx.strokeStyle = `rgba(26, 115, 232, ${0.5 + pulse * 0.5})`;
                this.ctx.lineWidth = 3;
            } else if (hasFlow) {
                // Behavior Flow
                const dashOffset = (performance.now() / 1000 * flowSpeed) % 40;
                this.ctx.setLineDash([10, 5]);
                this.ctx.lineDashOffset = -dashOffset;
                this.ctx.strokeStyle = flowColor;
                this.ctx.lineWidth = 3;
            } else {
                // Default
                this.ctx.strokeStyle = (source.isHovered || target.isHovered) && this._isChainHighlight ? flowColor : link.style.color;
                this.ctx.lineWidth = 2;
            }

            this.drawPath(startPos, endPos, link.style.type);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset
            this.ctx.lineDashOffset = 0;

            // 3. Link Label
            if (link.label) {
                const mid = this.getMidpoint(startPos, endPos, link.style.type);
                this.drawLinkLabel(mid, link.label, link.labelStyle);
            }

            // Arrowhead
            if (link.style.endHead === 'arrow') {
                if (isCompletedPath) this.ctx.strokeStyle = '#1e8e3e';
                else if (isActivePath) this.ctx.strokeStyle = '#1a73e8';
                else this.ctx.strokeStyle = hasFlow ? flowColor : link.style.color;

                this.drawArrowHead(startPos, endPos, link.style.type);
            }

            // Selection Highlight
            if (this.selectedLinkIds.has(link.id)) {
                this.ctx.save();
                this.ctx.strokeStyle = '#1a73e8';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([2, 2]);
                this.drawPath(startPos, endPos, link.style.type);
                this.ctx.stroke();
                this.ctx.restore();
            }
        });
    }

    getMidpoint(start, end, type) {
        if (type === 'angle') {
            const midX = start.x + (end.x - start.x) / 2;
            // The middle segment is from (midX, start.y) to (midX, end.y)
            return { x: midX, y: start.y + (end.y - start.y) / 2 };
        } else if (type === 'curve') {
            return this.getBezierPoint(0.5, start, end);
        } else {
            return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        }
    }

    drawLinkLabel(pos, text, style) {
        this.ctx.save();
        this.ctx.font = `${style.fontSize || 12}px sans-serif`;
        const metrics = this.ctx.measureText(text);
        const padding = 4;
        const w = metrics.width + padding * 2;
        const h = (style.fontSize || 12) + padding * 2;

        // Background Mask
        this.ctx.fillStyle = style.background || '#fff';
        this.ctx.fillRect(pos.x - w / 2, pos.y - h / 2, w, h);

        // Text
        this.ctx.fillStyle = style.color || '#202124';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, pos.x, pos.y);
        this.ctx.restore();
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
        this.canvas.addEventListener('dblclick', this._onDoubleClick.bind(this));

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
        // Ignore if typing in an input or textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

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
            this.selectedLinkIds.clear();
            this.selectedNodeIds.add(clickedNode.id);
            this.draggingNodes = [clickedNode];
            this.dragOffset = { x: mouseX - clickedNode.x, y: mouseY - clickedNode.y };

            // Visual update
            this.graph.nodes.forEach(n => n.isSelected = (n.id === clickedNode.id));

            if (this.onNodeSelected) this.onNodeSelected(clickedNode);
        } else {
            // Panning
            this.isPanning = true;
            this.lastPanningMousePos = { x: e.clientX, y: e.clientY };
            this.selectedNodeIds.clear();
            this.selectedLinkIds.clear();
            this.graph.nodes.forEach(n => n.isSelected = false);
            if (this.onNodeSelected) this.onNodeSelected(null);
        }

        // 0. Check for Detail Indicator Click
        let clickedDetail = null;
        // Check in reverse draw order (topmost first)
        for (let i = this.graph.nodes.length - 1; i >= 0; i--) {
            const node = this.graph.nodes[i];
            if (node._detailHit &&
                this.isPointInRect(mouseX, mouseY, node._detailHit.x, node._detailHit.y, node._detailHit.w, node._detailHit.h)) {
                clickedDetail = node;
                break;
            }
        }

        if (clickedDetail) {
            console.log("Detail Clicked:", clickedDetail);
            this.showDetailPopover(clickedDetail);
            return; // Stop other interactions
        }

        this.hideDetailPopover(); // Close if clicking elsewhere

        // 1. Check for Link Selection
        let clickedLink = null;
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
            this.draggingNodes.forEach(node => {
                let targetX = graphPos.x - this.dragOffset.x;
                let targetY = graphPos.y - this.dragOffset.y;

                if (this.enableSnapping) {
                    targetX = Math.round(targetX / this.gridSize) * this.gridSize;
                    targetY = Math.round(targetY / this.gridSize) * this.gridSize;
                }

                node.x = targetX;
                node.y = targetY;
            });
            this.draw();
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
            if (this.hoveredShape) {
                this.hoveredShape.isHovered = true;
                // Check if behavior is enabled
                this._isChainHighlight = this.hoveredShape.behaviors && this.hoveredShape.behaviors.includes('chain');
            } else {
                this._isChainHighlight = false;
            }
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
        this.draw();
    }

    _onDoubleClick(e) {
        const { x: mouseX, y: mouseY } = this.toGraphCoords(e.clientX, e.clientY);

        // 1. Check Link
        const link = this.getLinkAt(mouseX, mouseY);
        if (link) {
            const source = this.graph.nodes.find(n => n.id === link.sourceNodeId);
            const target = this.graph.nodes.find(n => n.id === link.targetNodeId);
            const mid = this.getMidpoint(
                source.getConnectionPoints()[link.sourcePointIndex],
                target.getConnectionPoints()[link.targetPointIndex],
                link.style.type
            );
            this.showInlineEditor(mid.x, mid.y, link.label || '', (text) => {
                link.label = text;
                this.draw();
            });
            return;
        }

        // 2. Check Node
        const node = this.graph.nodes.slice().reverse().find(n => n.isPointInside(mouseX, mouseY));
        if (node) {
            this.showInlineEditor(node.x, node.y, node.label || '', (text) => {
                node.label = text;
                this.draw();
            });
        }
    }

    showInlineEditor(x, y, initialText, onSave) {
        const existing = document.getElementById('ovi-diagram-inline-editor');
        if (existing) existing.remove();

        const rect = this.canvas.getBoundingClientRect();
        const screenX = x * this.scale + rect.left + this.offset.x;
        const screenY = y * this.scale + rect.top + this.offset.y;

        const input = document.createElement('textarea');
        input.id = 'ovi-diagram-inline-editor';
        input.value = initialText;
        input.style.position = 'fixed';
        input.style.left = `${screenX - 50}px`;
        input.style.top = `${screenY - 15}px`;
        input.style.width = '120px';
        input.style.height = 'auto';
        input.style.minHeight = '30px';
        input.style.zIndex = '1000';
        input.style.textAlign = 'center';
        input.style.fontSize = '14px';
        input.style.background = 'white';
        input.style.border = '1px solid #1a73e8';
        input.style.borderRadius = '4px';
        input.style.padding = '4px';
        input.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

        document.body.appendChild(input);
        input.focus();
        input.select();

        const save = () => {
            onSave(input.value);
            input.remove();
        };

        input.onblur = save;
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                save();
            }
            if (e.key === 'Escape') {
                input.remove();
            }
        };
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

    isPointInRect(px, py, x, y, w, h) {
        return px >= x && px <= x + w && py >= y && py <= y + h;
    }

    applyTheme(themeId) {
        const theme = this.themes[themeId];
        if (!theme) return;

        this.graph.nodes.forEach(node => {
            node.fillStyle = theme.nodeFill;
            node.strokeStyle = theme.nodeStroke;
            node.textColor = theme.textColor;
        });

        this.graph.links.forEach(link => {
            link.style.color = theme.linkColor;
        });

        this.draw();
    }

    autoLayout(direction = 'horizontal') {
        if (this.graph.nodes.length === 0) return;

        const layers = [];
        const visited = new Set();
        const roots = this.graph.nodes.filter(node =>
            !this.graph.links.some(link => link.targetNodeId === node.id)
        );
        if (roots.length === 0) roots.push(this.graph.nodes[0]);

        const queue = roots.map(r => ({ node: r, depth: 0 }));
        roots.forEach(r => visited.add(r.id));

        while (queue.length > 0) {
            const { node, depth } = queue.shift();
            if (!layers[depth]) layers[depth] = [];
            layers[depth].push(node);

            const children = this.graph.links
                .filter(l => l.sourceNodeId === node.id)
                .map(l => this.graph.nodes.find(n => n.id === l.targetNodeId))
                .filter(n => n && !visited.has(n.id));

            children.forEach(child => {
                visited.add(child.id);
                queue.push({ node: child, depth: depth + 1 });
            });
        }

        this.graph.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                if (!layers[0]) layers[0] = [];
                layers[0].push(node);
                visited.add(node.id);
            }
        });

        const spacingX = 220;
        const spacingY = 120;
        layers.forEach((layer, depth) => {
            const layerHeight = layer.length * spacingY;
            layer.forEach((node, nodeIdx) => {
                if (direction === 'horizontal') {
                    node.x = depth * spacingX + 150;
                    node.y = nodeIdx * spacingY + 150 - (layerHeight / 2) + (layers[0].length * spacingY / 2);
                } else {
                    node.y = depth * spacingY + 150;
                    node.x = nodeIdx * spacingX + 150 - (layer.length * spacingX / 2) + (layers[0].length * spacingX / 2);
                }
            });
        });
        this.draw();
    }

    getLinkAt(x, y) {
        const threshold = 5;
        for (const link of this.graph.links) {
            const source = this.graph.nodes.find(n => n.id === link.sourceNodeId);
            const target = this.graph.nodes.find(n => n.id === link.targetNodeId);
            if (!source || !target) continue;

            const start = source.getConnectionPoints()[link.sourcePointIndex];
            const end = target.getConnectionPoints()[link.targetPointIndex];
            if (!start || !end) continue;

            // Check if point is near link path
            if (this.isPointNearPath(x, y, start, end, link.style.type, threshold)) {
                return link;
            }
        }
        return null;
    }

    isPointNearPath(x, y, start, end, type, threshold) {
        if (type === 'angle') {
            const midX = start.x + (end.x - start.x) / 2;
            return this.isPointNearLine(x, y, start.x, start.y, midX, start.y, threshold) ||
                this.isPointNearLine(x, y, midX, start.y, midX, end.y, threshold) ||
                this.isPointNearLine(x, y, midX, end.y, end.x, end.y, threshold);
        } else if (type === 'curve') {
            // Precise Bezier distance is complex, use approximation or midpoint sampling
            // For now, check distance to a few points along the curve
            for (let t = 0; t <= 1; t += 0.1) {
                const pt = this.getBezierPoint(t, start, end);
                const dist = Math.sqrt((x - pt.x) ** 2 + (y - pt.y) ** 2);
                if (dist < threshold * 2) return true;
            }
            return false;
        } else {
            return this.isPointNearLine(x, y, start.x, start.y, end.x, end.y, threshold);
        }
    }

    isPointNearLine(px, py, x1, y1, x2, y2, threshold) {
        const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (L2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) < threshold;
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / L2;
        t = Math.max(0, Math.min(1, t));
        const dist = Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
        return dist < threshold;
    }

    getBezierPoint(t, start, end) {
        const cp1x = start.x + (end.x - start.x) * 0.5;
        const cp1y = start.y;
        const cp2x = end.x - (end.x - start.x) * 0.5;
        const cp2y = end.y;

        const cx = 3 * (cp1x - start.x);
        const bx = 3 * (cp2x - cp1x) - cx;
        const ax = end.x - start.x - cx - bx;

        const cy = 3 * (cp1y - start.y);
        const by = 3 * (cp2y - cp1y) - cy;
        const ay = end.y - start.y - cy - by;

        const x = (ax * (t ** 3)) + (bx * (t ** 2)) + (cx * t) + start.x;
        const y = (ay * (t ** 3)) + (by * (t ** 2)) + (cy * t) + start.y;

        return { x, y };
    }

    update(dt) {
        // Assuming behaviorSystem has an update method now
        if (this.behaviorSystem) {
            this.behaviorSystem.update(dt);
        }

        // Camera Animation (FlyTo)
        if (this.presentationState && this.presentationState.cameraTarget) {
            const target = this.presentationState.cameraTarget;
            const speed = 5 * dt;

            // Interpolate
            this.offset.x += (target.x - this.offset.x) * speed;
            this.offset.y += (target.y - this.offset.y) * speed;
            this.scale += (target.scale - this.scale) * speed;

            // Snap when close
            if (Math.abs(target.x - this.offset.x) < 1 && Math.abs(target.y - this.offset.y) < 1 &&
                Math.abs(target.scale - this.scale) < 0.01) { // Added scale check for snapping
                this.offset.x = target.x;
                this.offset.y = target.y;
                this.scale = target.scale;
                this.presentationState.cameraTarget = null; // Animation done
            }
            this.draw(); // Request redraw
        }
    }

    loop() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.update(dt);
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    // --- Presentation Mode ---

    startPresentation() {
        this.presentationState.active = true;
        this.presentationState.playlist = this.buildPresentationPlaylist();

        if (this.presentationState.playlist.length > 0) {
            this.presentationState.currentIndex = 0;
            this.flyToNode(this.presentationState.playlist[0]);
        }
    }

    stopPresentation() {
        this.presentationState.active = false;
        this.presentationState.cameraTarget = null;
        this.presentationState.currentIndex = -1;
        this.draw();
    }

    nextSlide() {
        if (!this.presentationState.active) return;

        if (this.presentationState.currentIndex < this.presentationState.playlist.length - 1) {
            this.presentationState.currentIndex++;
            this.flyToNode(this.presentationState.playlist[this.presentationState.currentIndex]);
        } else {
            this.stopPresentation();
        }
    }

    prevSlide() {
        if (!this.presentationState.active) return;

        if (this.presentationState.currentIndex > 0) {
            this.presentationState.currentIndex--;
            this.flyToNode(this.presentationState.playlist[this.presentationState.currentIndex]);
        }
    }

    flyToNode(nodeId) {
        const node = this.graph.nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Calculate Target Offset to center the node
        const targetScale = 1.2;
        const canvasCx = this.canvas.width / 2;
        const canvasCy = this.canvas.height / 2;

        const nodeCx = node.x + node.width / 2;
        const nodeCy = node.y + node.height / 2;

        const targetX = canvasCx - (nodeCx * targetScale);
        const targetY = canvasCy - (nodeCy * targetScale);

        this.presentationState.cameraTarget = {
            x: targetX,
            y: targetY,
            scale: targetScale
        };

    }

    buildPresentationPlaylist() {
        const visited = new Set();
        const playlist = [];

        // 1. Find Roots (no incoming links)
        const roots = this.graph.nodes.filter(n =>
            !this.graph.links.some(l => l.targetNodeId === n.id)
        );

        roots.sort((a, b) => a.y - b.y || a.x - b.x);

        const queue = [...roots];
        if (queue.length === 0 && this.graph.nodes.length > 0) {
            queue.push(this.graph.nodes[0]);
        }

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.id)) continue;

            visited.add(current.id);
            playlist.push(current.id);

            const childLinks = this.graph.links.filter(l => l.sourceNodeId === current.id);
            const children = childLinks.map(l => this.graph.nodes.find(n => n.id === l.targetNodeId));

            children.sort((a, b) => a.x - b.x);

            queue.push(...children);
        }

        return playlist;
    }

    // --- Mind Map & Auto Layout ---

    /**
     * Toggles the collapsed state of a Mind Map node.
     */
    toggleCollapse(node) {
        if (!node.collapsed) {
            node.collapsed = true;
            this.setChildrenVisible(node, false);
        } else {
            node.collapsed = false;
            this.setChildrenVisible(node, true);
        }

        // Re-layout if it's a mind map
        // Find Root (simplistic: traversing up or assume selected is part of a tree)
        // For now, just re-layout the whole graph if structure exists
        const root = this.findRootNode(node);
        if (root) {
            this.applyMindMapLayout(root);
        }
        this.draw();
    }

    setChildrenVisible(node, visible) {
        const children = this.getDirectChildren(node);
        children.forEach(child => {
            child.visible = visible;
            // Recursively hide others if we are HIDING, but if SHOWING, only show if parent is not collapsed?
            // "Deep" hide, "Shallow" show?
            // Simple logic: If hiding, hide all descendants.
            // If showing, show direct children. If child was open, show its children? 
            // For now: Smart State.

            if (!visible) {
                this.setChildrenVisible(child, false); // Recursive Hide
            } else if (visible && !child.collapsed) {
                this.setChildrenVisible(child, true); // Recursive Show if expanded
            }
        });
    }

    getDirectChildren(node) {
        return this.graph.links
            .filter(l => l.sourceNodeId === node.id)
            .map(l => this.graph.nodes.find(n => n.id === l.targetNodeId))
            .filter(n => n); // filter nulls
    }

    findRootNode(startNode) {
        // Walk up parents
        let current = startNode;
        while (true) {
            const parentLink = this.graph.links.find(l => l.targetNodeId === current.id);
            if (!parentLink) break;
            const parent = this.graph.nodes.find(n => n.id === parentLink.sourceNodeId);
            if (!parent) break;
            current = parent;
        }
        return current;
    }

    /**
     * Basic Reingold-Tilford inspired Tree Layout (Horizontal)
     * @param {Node} root 
     */
    applyMindMapLayout(root) {
        // Constants
        const LEVEL_X_GAP = 200;
        const SIBLING_Y_GAP = 60;

        // 1. Calculate Dimensions (Recursive)
        const measure = (node) => {
            if (!node.visible && node !== root) return 0; // Skip invisible

            const children = this.getDirectChildren(node);

            if (children.length === 0 || node.collapsed) {
                node._treeHeight = node.height + SIBLING_Y_GAP;
            } else {
                let h = 0;
                children.forEach(child => {
                    h += measure(child);
                });
                node._treeHeight = h;
            }
            return node._treeHeight;
        };

        measure(root);

        // 2. Set Positions (Recursive)
        const layout = (node, x, yStart) => {
            if (!node.visible && node !== root) return;

            // Center Y for this node is yStart + height/2
            // But we want to center it relative to its children block
            const myHeight = node._treeHeight;
            const centerY = yStart + myHeight / 2;

            // Animate or Set?
            // Smooth transition preferred
            this.animateNodeTo(node, x, centerY - node.height / 2);

            if (!node.collapsed) {
                const children = this.getDirectChildren(node);
                let currentY = yStart;
                children.forEach(child => {
                    layout(child, x + LEVEL_X_GAP, currentY);
                    currentY += child._treeHeight;
                });
            }
        };

        layout(root, root.x, root.y - root._treeHeight / 2); // Start layout centered on root's current Y roughly
    }

    animateNodeTo(node, targetX, targetY) {
        // Basic Linear Interpolation hook (can be expanded)
        node.x = targetX;
        node.y = targetY;
    }

    // --- Drawing Augmentations ---

    drawSmartToggle(node) {
        const children = this.getDirectChildren(node);
        if (children.length === 0) return;

        // Position: Right Edge
        const cx = node.x + node.width;
        const cy = node.y + node.height / 2;

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.strokeStyle = '#5f6368';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Icon (+ or -)
        this.ctx.fillStyle = '#5f6368';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.fillText(node.collapsed ? '+' : '-', cx, cy);

        // Hit Area
        node._toggleHit = { x: cx - 8, y: cy - 8, w: 16, h: 16 };
    }

    drawChainHighlight(node) {

        const chain = this.getChain(node);
        this.ctx.save();
        this.ctx.strokeStyle = '#1a73e8';
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 2;

        chain.links.forEach(linkId => {
            const link = this.graph.links.find(l => l.id === linkId);
            if (link) {
                const s = this.graph.nodes.find(n => n.id === link.sourceNodeId);
                const t = this.graph.nodes.find(n => n.id === link.targetNodeId);
                if (s && t) {
                    this.ctx.beginPath();
                    this.drawPath(s.getConnectionPoints()[link.sourcePointIndex], t.getConnectionPoints()[link.targetPointIndex], link.style.type);
                    this.ctx.stroke();
                }
            }
        });
        this.ctx.restore();
    }

    drawInfoTooltip(node) {
        if (!node.metadata || !node.metadata.info) return;

        const x = node.x + node.width / 2;
        const y = node.y - 10;

        this.ctx.save();
        this.ctx.font = '12px sans-serif';
        const txt = node.metadata.info;
        const metrics = this.ctx.measureText(txt);
        const pad = 8;
        const tw = metrics.width + pad * 2;
        const th = 24;

        this.ctx.fillStyle = 'rgba(32, 33, 36, 0.9)';
        this.ctx.beginPath();
        this.ctx.roundRect(x - tw / 2, y - th - 5, tw, th, 4);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(txt, x, y - th / 2 - 5);
        this.ctx.restore();
    }

    getChain(node, direction = 'both') {
        const visited = new Set();
        const chain = { nodes: new Set(), links: new Set() };
        const stack = [node.id];

        while (stack.length > 0) {
            const id = stack.pop();
            if (visited.has(id)) continue;
            visited.add(id);
            chain.nodes.add(id);

            this.graph.links.forEach(l => {
                if (direction === 'both' || direction === 'down') {
                    if (l.sourceNodeId === id) {
                        chain.links.add(l.id);
                        stack.push(l.targetNodeId);
                    }
                }
                if (direction === 'both' || direction === 'up') {
                    if (l.targetNodeId === id) {
                        chain.links.add(l.id);
                        stack.push(l.sourceNodeId);
                    }
                }
            });
        }
        return chain;
    }
}

