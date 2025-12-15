/**
 * OviCanvas
 * A reusable canvas engine that handles panning, zooming, and grid rendering.
 * It manages a 'viewport' and a 'world' layer.
 */
export default class OviCanvas {
    constructor(container) {
        this.container = container;
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.init();
    }

    init() {
        // 1. Setup DOM Structure
        this.container.style.overflow = 'hidden';
        this.container.style.position = 'relative';
        this.container.style.cursor = 'grab';
        this.container.style.backgroundColor = '#0d1117'; // Match theme

        // The world layer (moves and scales)
        this.world = document.createElement('div');
        this.world.style.position = 'absolute';
        this.world.style.top = '0';
        this.world.style.left = '0';
        this.world.style.transformOrigin = '0 0';
        this.world.style.width = '100%';
        this.world.style.height = '100%';

        // SVG Layer for Connections (Must be behind nodes but part of world)
        this.svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgLayer.style.position = 'absolute';
        this.svgLayer.style.top = '0';
        this.svgLayer.style.left = '0';
        this.svgLayer.style.width = '100%';
        this.svgLayer.style.height = '100%';
        this.svgLayer.style.overflow = 'visible';
        this.svgLayer.style.pointerEvents = 'none'; // Let clicks pass through to nodes
        this.world.appendChild(this.svgLayer);

        // Grid Pattern
        this.updateGrid();

        this.container.appendChild(this.world);

        // 2. Event Listeners
        this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.container.addEventListener('wheel', (e) => this.onWheel(e));
    }

    updateGrid() {
        const size = 20 * this.zoomLevel;
        this.world.style.backgroundImage = `
            linear-gradient(var(--border-subtle) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
        `;
        this.world.style.backgroundSize = `${size}px ${size}px`;
    }

    updateTransform() {
        this.world.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }

    onMouseDown(e) {
        if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle mouse or Alt+Left
            this.isDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.container.style.cursor = 'grabbing';
            e.preventDefault(); // Prevent text selection
        }
    }

    onMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;

            this.panX += dx;
            this.panY += dy;

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            this.updateTransform();
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.container.style.cursor = 'grab';
    }

    onWheel(e) {
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        const newZoom = Math.min(Math.max(this.zoomLevel + delta, 0.1), 5);

        // Zoom towards mouse pointer logic
        const rect = this.container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleChange = newZoom - this.zoomLevel;
        const offsetX = (mouseX - this.panX) / this.zoomLevel;
        const offsetY = (mouseY - this.panY) / this.zoomLevel;

        this.panX -= offsetX * scaleChange;
        this.panY -= offsetY * scaleChange;

        this.zoomLevel = newZoom;
        this.updateTransform();
    }

    /**
     * Converts screen coordinates (clientX, clientY) to world coordinates.
     * @param {number} screenX 
     * @param {number} screenY 
     * @returns {Object} {x, y}
     */
    screenToWorld(screenX, screenY) {
        const rect = this.container.getBoundingClientRect();
        const mouseX = screenX - rect.left;
        const mouseY = screenY - rect.top;

        return {
            x: (mouseX - this.panX) / this.zoomLevel,
            y: (mouseY - this.panY) / this.zoomLevel
        };
    }

    /**
     * Draws a connection line.
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {string} [color] 
     * @returns {SVGElement} The path element.
     */
    drawConnection(x1, y1, x2, y2, color = '#555') {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        // Bezier Curve Logic
        const dist = Math.abs(x2 - x1) * 0.5;
        const cp1x = x1 + dist;
        const cp1y = y1;
        const cp2x = x2 - dist;
        const cp2y = y2;

        const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;

        path.setAttribute("d", d);
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");

        this.svgLayer.appendChild(path);
        return path;
    }

    /**
     * Get current transform state for coordinate conversion
     */
    getTransform() {
        return {
            x: this.panX,
            y: this.panY,
            scale: this.zoomLevel
        };
    }

    /**
     * Adds a node element to the world.
     * @param {HTMLElement} element 
     * @param {number} x 
     * @param {number} y 
     */
    addNode(element, x, y) {
        element.style.position = 'absolute';
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        this.world.appendChild(element);
    }
}
