const decomposeMatrix = (m) => {
    const scaleX = Math.sqrt(m.a * m.a + m.b * m.b);
    const scaleY = Math.sqrt(m.c * m.c + m.d * m.d);
    const rotation = Math.atan2(m.b, m.a) * (180 / Math.PI);
    return { x: m.e, y: m.f, scaleX, scaleY, rotation };
};

import VectorSidebar from './ui/VectorSidebar.js';
import VectorInspector from './ui/VectorInspector.js';

export default class VectorEditor {
    constructor(engine) {
        this.engine = engine;
        this.svgNs = "http://www.w3.org/2000/svg";

        // State
        this.selectedElement = null; // Principal selection (for Inspector)
        this.selectedElements = [];  // All selected elements (for Grouping)
        this.lastSelectedIndex = -1; // For Range Selection
        this.mode = 'select';
        this.isDragging = false;
        this.isResizing = false;
        this.isMarquee = false;
        this.isPanning = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.marqueeStart = { x: 0, y: 0 };
        this.panStart = { x: 0, y: 0 };
        this.zoomLevel = 1.0;
        this.viewBox = { x: 0, y: 0, w: 800, h: 600 };
        this.initialTransform = { x: 0, y: 0, sx: 1, sy: 1 };
        this.initialTransforms = []; // Store initial transforms for multi-drag
        this.resizeStart = { w: 0, h: 0, mouseX: 0, mouseY: 0 };
        this.keys = {}; // Track key states
    }

    create() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.background = '#1e1e1e';
        container.style.color = '#fff';


        // 1. Canvas Area
        const workspace = document.createElement('div');
        workspace.style.width = '100%';
        workspace.style.height = '100%';
        workspace.style.position = 'relative';
        workspace.style.overflow = 'hidden';
        workspace.style.display = 'flex';
        workspace.style.alignItems = 'center';
        workspace.style.justifyContent = 'center';
        workspace.style.background = '#1e1e1e';

        // The Artboard
        this.svg = document.createElementNS(this.svgNs, "svg");
        this.svg.setAttribute("width", "800");
        this.svg.setAttribute("height", "600");
        this.svg.style.background = '#ffffff';
        this.svg.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        workspace.appendChild(this.svg);

        // Gizmo Layer (Always on top)
        this.gizmoGroup = document.createElementNS(this.svgNs, "g");
        this.gizmoGroup.style.display = "none";
        this.gizmoGroup.style.pointerEvents = "all";

        this.gizmoRect = document.createElementNS(this.svgNs, "rect");
        this.gizmoRect.setAttribute("fill", "none");
        this.gizmoRect.setAttribute("stroke", "#00aaff");
        this.gizmoRect.setAttribute("stroke-width", "1");
        this.gizmoRect.setAttribute("stroke-dasharray", "4,4");
        this.gizmoRect.style.pointerEvents = "none";

        this.gizmoHandle = document.createElementNS(this.svgNs, "rect");
        this.gizmoHandle.setAttribute("width", "12");
        this.gizmoHandle.setAttribute("height", "12");
        this.gizmoHandle.setAttribute("fill", "#00aaff");
        this.gizmoHandle.setAttribute("stroke", "#ffffff");
        this.gizmoHandle.style.cursor = "nwse-resize";
        this.gizmoHandle.setAttribute("class", "gizmo-handle-br");

        this.gizmoGroup.appendChild(this.gizmoRect);
        this.gizmoGroup.appendChild(this.gizmoHandle);
        this.svg.appendChild(this.gizmoGroup);

        // Selection Marquee
        this.marqueeRect = document.createElementNS(this.svgNs, "rect");
        this.marqueeRect.setAttribute("fill", "rgba(0, 170, 255, 0.1)");
        this.marqueeRect.setAttribute("stroke", "#00aaff");
        this.marqueeRect.setAttribute("stroke-width", "1");
        this.marqueeRect.style.display = "none";
        this.marqueeRect.style.pointerEvents = "none";
        this.svg.appendChild(this.marqueeRect);

        container.appendChild(workspace);

        // Open Tab
        this.engine.tabManager.openTab('Vector Design', 'ovivector', container);

        // --- Persistence Logic ---
        // Hook into Tab Activation to restore sidebar
        // Assuming tabManager or PluginManager calls an 'activate' or 'focus' method if it exists on the instance?
        // If not, we rely on the plugin definition.
        // Force initial render:
        this.activate();


        // Store reference for Serialization
        const plugin = this.engine.pluginManager.plugins.get('ovivector');
        if (plugin) {
            plugin.activeEditor = this;
            // Monkey-patch or hook plugin activate if supported
            plugin.onActivate = () => this.activate();
        }

        this.bindEvents();
    }

    updateViewBox() {
        this.svg.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
    }

    resetView() {
        this.zoomLevel = 1.0;
        this.viewBox = { x: 0, y: 0, w: 800, h: 600 };
        this.updateViewBox();
    }

    activate() {
        // Called when tab becomes active
        VectorSidebar.render(this.engine, this);
        VectorInspector.render(this.engine, this, this.selectedElement);
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') this.svg.style.cursor = 'grab';
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'Space') this.svg.style.cursor = this.mode === 'select' ? 'default' : 'crosshair';
        });

        this.svg.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

                // Zoom relative to mouse
                const mouse = this.getMousePosition(e);

                const newW = this.viewBox.w * zoomFactor;
                const newH = this.viewBox.h * zoomFactor;

                // Adjust X and Y to zoom towards mouse
                this.viewBox.x = mouse.x - (mouse.x - this.viewBox.x) * zoomFactor;
                this.viewBox.y = mouse.y - (mouse.y - this.viewBox.y) * zoomFactor;
                this.viewBox.w = newW;
                this.viewBox.h = newH;

                this.updateViewBox();
                this.updateGizmo();
            }
        }, { passive: false });

        this.svg.addEventListener('mousedown', (e) => {
            if (this.keys['Space'] || e.button === 1) {
                this.isPanning = true;
                this.panStart = { x: e.clientX, y: e.clientY };
                this.svg.style.cursor = 'grabbing';
                e.preventDefault();
                return;
            }

            if (this.mode === 'select') {
                // Check if Handle Clicked (Resize)
                if (e.target.classList.contains('gizmo-handle-br')) {
                    this.isResizing = true;
                    this.resizeStart.mouseX = e.clientX;
                    this.resizeStart.mouseY = e.clientY;

                    // Get current dimensions (BBox * Scale)
                    const bbox = this.selectedElement.getBBox();
                    // Parse current scale
                    let scaleX = 1, scaleY = 1;
                    const transform = this.selectedElement.getAttribute("transform") || "";
                    const matchS = transform.match(/scale\(([^,]+)(?:,\s*([^)]+))?\)/); // Handle one or two args
                    if (matchS) {
                        scaleX = parseFloat(matchS[1]);
                        scaleY = matchS[2] ? parseFloat(matchS[2]) : scaleX;
                    }
                    this.resizeStart.w = bbox.width * scaleX;
                    this.resizeStart.h = bbox.height * scaleY;
                    this.initialTransform.sx = scaleX;
                    this.initialTransform.sy = scaleY;

                    e.stopPropagation();
                    return;
                }

                if (e.target === this.svg) {
                    this.deselect();
                    this.isMarquee = true;
                    const pos = this.getMousePosition(e);
                    this.marqueeStart = { x: pos.x, y: pos.y };
                    this.marqueeRect.style.display = "block";
                    this.marqueeRect.setAttribute("x", pos.x);
                    this.marqueeRect.setAttribute("y", pos.y);
                    this.marqueeRect.setAttribute("width", "0");
                    this.marqueeRect.setAttribute("height", "0");
                    return;
                }

                // Smart Group Selection
                const target = e.target.closest('.manual-group') || e.target.closest('.imported-group') || e.target;
                if (target === this.svg || target === this.gizmoGroup || this.gizmoGroup.contains(target)) return;

                if (e.shiftKey) {
                    this.toggleSelect(target);
                } else {
                    this.select(target);
                }

                this.isDragging = true;
                const pos = this.getMousePosition(e);
                this.dragStartPos = { x: pos.x, y: pos.y };

                // Store initial transforms for ALL selected elements
                this.initialTransforms = this.selectedElements.map(el => {
                    let tx = 0, ty = 0;
                    const transform = el.getAttribute("transform");
                    if (transform) {
                        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                        if (match) {
                            tx = parseFloat(match[1]);
                            ty = parseFloat(match[2]);
                        }
                    }
                    return { el, x: tx, y: ty, transformStr: transform || "" };
                });

                // Keep selectedElement legacy for some logic
                if (this.selectedElement) {
                    const match = this.selectedElement.getAttribute("transform")?.match(/translate\(([^,]+),([^)]+)\)/);
                    this.initialTransform = { x: match ? parseFloat(match[1]) : 0, y: match ? parseFloat(match[2]) : 0 };
                }
            }
        });

        this.svg.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                const dx = (e.clientX - this.panStart.x) * (this.viewBox.w / this.svg.clientWidth);
                const dy = (e.clientY - this.panStart.y) * (this.viewBox.h / this.svg.clientHeight);

                this.viewBox.x -= dx;
                this.viewBox.y -= dy;
                this.panStart = { x: e.clientX, y: e.clientY };
                this.updateViewBox();
                this.updateGizmo();
                return;
            }

            if (this.isMarquee) {
                const pos = this.getMousePosition(e);
                const x = Math.min(pos.x, this.marqueeStart.x);
                const y = Math.min(pos.y, this.marqueeStart.y);
                const w = Math.abs(pos.x - this.marqueeStart.x);
                const h = Math.abs(pos.y - this.marqueeStart.y);

                this.marqueeRect.setAttribute("x", x);
                this.marqueeRect.setAttribute("y", y);
                this.marqueeRect.setAttribute("width", w);
                this.marqueeRect.setAttribute("height", h);
            } else if (this.isResizing && this.selectedElement) {
                const dx = e.clientX - this.resizeStart.mouseX;
                const dy = e.clientY - this.resizeStart.mouseY;

                let newW = Math.max(10, this.resizeStart.w + dx);
                let newH = Math.max(10, this.resizeStart.h + dy);

                // Proportional Resize with Shift key
                if (e.shiftKey) {
                    const ratio = this.resizeStart.w / this.resizeStart.h;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        newH = newW / ratio;
                    } else {
                        newW = newH * ratio;
                    }
                }

                const bbox = this.selectedElement.getBBox();
                const newScaleX = newW / bbox.width;
                const newScaleY = newH / bbox.height;

                let transform = this.selectedElement.getAttribute("transform") || "";
                let tx = 0, ty = 0;
                const matchT = transform.match(/translate\(([^,]+),([^)]+)\)/);
                if (matchT) { tx = matchT[1]; ty = matchT[2]; }

                this.selectedElement.setAttribute('transform', `translate(${tx},${ty}) scale(${newScaleX.toFixed(3)}, ${newScaleY.toFixed(3)})`);
                this.updateGizmo();

            } else if (this.isDragging && this.selectedElements.length > 0 && this.mode === 'select') {
                const mouse = this.getMousePosition(e);
                const dx = mouse.x - this.dragStartPos.x;
                const dy = mouse.y - this.dragStartPos.y;

                this.initialTransforms.forEach(t => {
                    const newX = t.x + dx;
                    const newY = t.y + dy;

                    let scaleStr = "";
                    const matchS = t.transformStr.match(/scale\([^)]+\)/);
                    if (matchS) scaleStr = " " + matchS[0];

                    t.el.setAttribute('transform', `translate(${newX},${newY})${scaleStr}`);
                });
                this.updateGizmo();
            }
        });

        this.svg.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.svg.style.cursor = this.keys['Space'] ? 'grab' : (this.mode === 'select' ? 'default' : 'crosshair');
            }
            if (this.isMarquee) {
                this.isMarquee = false;
                this.marqueeRect.style.display = "none";
                this.selectInMarquee();
            }
            this.isDragging = false;
            this.isResizing = false;
        });

        this.svg.addEventListener('mouseleave', () => {
            this.isMarquee = false;
            this.marqueeRect.style.display = "none";
            this.isDragging = false;
            this.isResizing = false;
        });
    }

    selectInMarquee() {
        const x = parseFloat(this.marqueeRect.getAttribute("x"));
        const y = parseFloat(this.marqueeRect.getAttribute("y"));
        const w = parseFloat(this.marqueeRect.getAttribute("width"));
        const h = parseFloat(this.marqueeRect.getAttribute("height"));

        if (w < 2 || h < 2) return;

        const found = [];
        Array.from(this.svg.children).forEach(el => {
            if (el === this.gizmoGroup || el === this.marqueeRect) return;

            // Intersection Test
            const bbox = el.getBBox();
            const ctm = el.getCTM();
            const pt = this.svg.createSVGPoint();
            pt.x = bbox.x; pt.y = bbox.y;
            const tl = pt.matrixTransform(ctm);
            // Just test top-left for simplicity, or all 4
            // Better: Check if TL is inside marquee
            if (tl.x >= x && tl.x <= x + w && tl.y >= y && tl.y <= y + h) {
                found.push(el);
            }
        });

        if (found.length > 0) {
            this.selectedElements = found;
            this.selectedElement = found[found.length - 1];
            this.updateGizmo();
            VectorInspector.render(this.engine, this, this.selectedElement);
        }
    }

    updateGizmo() {
        if (!this.selectedElements || this.selectedElements.length === 0) {
            this.gizmoGroup.style.display = "none";
            return;
        }
        this.gizmoGroup.style.display = "block";

        try {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            // Get standard coordinate matrix (Local -> Root User Space)
            const rootCTM = this.svg.getScreenCTM();
            if (!rootCTM) return;
            const invRootCTM = rootCTM.inverse();

            this.selectedElements.forEach(el => {
                const bbox = el.getBBox();
                const elCTM = el.getScreenCTM();
                if (!elCTM) return;

                const matrix = invRootCTM.multiply(elCTM);
                const pt = this.svg.createSVGPoint();

                const points = [
                    { x: bbox.x, y: bbox.y },
                    { x: bbox.x + bbox.width, y: bbox.y },
                    { x: bbox.x, y: bbox.y + bbox.height },
                    { x: bbox.x + bbox.width, y: bbox.y + bbox.height }
                ];

                points.forEach(p => {
                    pt.x = p.x; pt.y = p.y;
                    const tp = pt.matrixTransform(matrix);
                    minX = Math.min(minX, tp.x);
                    minY = Math.min(minY, tp.y);
                    maxX = Math.max(maxX, tp.x);
                    maxY = Math.max(maxY, tp.y);
                });
            });

            this.gizmoRect.setAttribute("x", minX);
            this.gizmoRect.setAttribute("y", minY);
            this.gizmoRect.setAttribute("width", maxX - minX);
            this.gizmoRect.setAttribute("height", maxY - minY);

            // Constrain handle size based on zoom level to keep it usable
            const zoom = this.svg.clientWidth / this.viewBox.w;
            const handleSize = 12 / zoom;
            const half = handleSize / 2;

            this.gizmoHandle.setAttribute("x", maxX - half);
            this.gizmoHandle.setAttribute("y", maxY - half);
            this.gizmoHandle.setAttribute("width", handleSize);
            this.gizmoHandle.setAttribute("height", handleSize);

            // Limit resize handle to single selection for now
            this.gizmoHandle.style.display = (this.selectedElements.length === 1) ? "block" : "none";

            this.svg.appendChild(this.gizmoGroup);
        } catch (e) { console.warn(e); }
    }

    addShape(type) {
        let el;
        // Default spawn at 400,300 (Center of 800x600)

        if (type === 'rect') {
            el = document.createElementNS(this.svgNs, "rect");
            // Centered rect 100x100
            el.setAttribute("x", "350"); // 400 - 50
            el.setAttribute("y", "250"); // 300 - 50
            el.setAttribute("width", "100");
            el.setAttribute("height", "100");
        } else if (type === 'circle') {
            el = document.createElementNS(this.svgNs, "circle");
            el.setAttribute("cx", "400");
            el.setAttribute("cy", "300");
            el.setAttribute("r", "50");
        } else if (type === 'star') {
            el = document.createElementNS(this.svgNs, "path");
            // Centered roughly at 400,300
            el.setAttribute("d", "M 400 250 L 414 285 L 452 285 L 423 310 L 434 348 L 400 325 L 366 348 L 377 310 L 348 285 L 386 285 Z");
        } else if (type === 'text') {
            el = document.createElementNS(this.svgNs, "text");
            el.setAttribute("x", "400");
            el.setAttribute("y", "300");
            el.textContent = "Text";
            el.setAttribute("fill", "#ffffff");
            el.setAttribute("font-family", "Arial");
            el.setAttribute("font-size", "24");
            el.setAttribute("text-anchor", "middle"); // Center text
        }

        if (el) {
            el.setAttribute("fill", "#00ff88");
            el.setAttribute("stroke", "#000000");
            el.setAttribute("stroke-width", "1");
            el.setAttribute("transform", "translate(0,0)"); // Init transform
            el.setAttribute("data-id", type + "_" + Date.now().toString().slice(-4)); // Default ID
            el.setAttribute("data-physics", "static");
            el.style.cursor = "move";
            this.svg.appendChild(el);
            this.select(el);
        }
    }


    setMode(mode) {
        this.mode = mode;
        // Visual cursor update could go here
        this.svg.style.cursor = mode === 'select' ? 'default' : 'crosshair';
    }

    select(el) {
        this.selectedElements = [el];
        this.selectedElement = el;

        // Update index for range selection
        const children = Array.from(this.svg.children);
        this.lastSelectedIndex = children.indexOf(el);

        this.updateGizmo();
        VectorInspector.render(this.engine, this, el);
    }

    toggleSelect(el) {
        if (this.selectedElements.includes(el)) {
            this.selectedElements = this.selectedElements.filter(item => item !== el);
        } else {
            this.selectedElements.push(el);
        }
        this.selectedElement = this.selectedElements.length > 0 ? this.selectedElements[this.selectedElements.length - 1] : null;

        // Update index for range selection
        const children = Array.from(this.svg.children);
        this.lastSelectedIndex = children.indexOf(el);

        this.updateGizmo();
        VectorInspector.render(this.engine, this, this.selectedElement);
    }

    selectRange(el) {
        const children = Array.from(this.svg.children);
        const currentIndex = children.indexOf(el);

        if (this.lastSelectedIndex === -1) {
            this.select(el);
            return;
        }

        const start = Math.min(this.lastSelectedIndex, currentIndex);
        const end = Math.max(this.lastSelectedIndex, currentIndex);

        const range = children.slice(start, end + 1).filter(item => {
            if (item.tagName === 'rect' && item.style.pointerEvents === 'none') return false;
            if (item.tagName === 'g' && item === this.gizmoGroup) return false;
            return true;
        });

        this.selectedElements = Array.from(new Set([...this.selectedElements, ...range]));
        this.selectedElement = el;
        this.updateGizmo();
        VectorInspector.render(this.engine, this, this.selectedElement);
    }

    deselect() {
        this.selectedElements = [];
        this.selectedElement = null;
        this.updateGizmo();
        VectorInspector.render(this.engine, this, null);
    }

    groupSelection() {
        if (this.selectedElements.length < 2) return;

        const group = document.createElementNS(this.svgNs, "g");
        const id = "group_" + Date.now().toString().slice(-4);
        group.setAttribute("data-id", id);
        group.setAttribute("class", "manual-group");
        group.setAttribute("transform", "translate(0,0)");
        group.style.cursor = "move";

        // Insertion point: before the first selected element
        const parent = this.selectedElements[0].parentNode;
        parent.insertBefore(group, this.selectedElements[0]);

        this.selectedElements.forEach(el => group.appendChild(el));
        this.select(group);
    }

    ungroupSelection() {
        const target = this.selectedElement;
        if (!target || (target.tagName !== 'g' && !target.classList.contains('manual-group') && !target.classList.contains('imported-group'))) return;

        const parent = target.parentNode;
        const children = Array.from(target.children);

        // Get group's transform to apply to children to preserve alignment
        const groupTransform = target.getAttribute("transform") || "";

        children.forEach(child => {
            const childTransform = child.getAttribute("transform") || "";
            // Prepend group transform to child
            child.setAttribute("transform", (groupTransform + " " + childTransform).trim());
            parent.insertBefore(child, target);
        });
        parent.removeChild(target);
        this.deselect();
    }

    bringToFront() {
        if (!this.selectedElement) return;
        this.selectedElements.forEach(el => {
            this.svg.appendChild(el);
        });
        this.updateGizmo();
    }

    sendToBack() {
        if (!this.selectedElement) return;
        this.selectedElements.forEach(el => {
            if (this.svg.firstChild) {
                this.svg.insertBefore(el, this.svg.firstChild);
            }
        });
        this.updateGizmo();
    }

    align(type) {
        console.log("Align " + type + " - may behave unexpectedly with transforms.");
    }

    importSVG(svgContent) {
        console.log("Importing SVG...");
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, "image/svg+xml");
        const svgRoot = doc.querySelector("svg");

        if (!svgRoot) {
            alert("Invalid SVG file.");
            return;
        }

        // 1. Resize Canvas (User Request: Sothik Size / Correct Size)
        let w = 800;
        let h = 600;

        if (svgRoot.getAttribute("width")) w = parseFloat(svgRoot.getAttribute("width"));
        if (svgRoot.getAttribute("height")) h = parseFloat(svgRoot.getAttribute("height"));

        // Handle viewBox if width/height missing
        if (!svgRoot.getAttribute("width") && svgRoot.getAttribute("viewBox")) {
            const vb = svgRoot.getAttribute("viewBox").split(/\s+|,/).map(parseFloat);
            if (vb.length === 4) {
                w = vb[2];
                h = vb[3];
            }
        }

        this.svg.setAttribute("width", w);
        this.svg.setAttribute("height", h);

        // Optional: Update Grid/Background size if we had one? 
        // For now, SVG attribute update is sufficient for the workspace alignment.

        // 2. Clear current workspace
        this.svg.innerHTML = '';

        // 3. Mount for Computed Style Calculation
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.position = 'absolute';
        hiddenContainer.style.left = '-9999px';
        hiddenContainer.style.visibility = 'hidden';
        document.body.appendChild(hiddenContainer);

        // Clone the root to the DOM
        const mountedSVG = svgRoot.cloneNode(true);
        hiddenContainer.appendChild(mountedSVG);

        // CREATE WRAPPER GROUP
        const importGroup = document.createElementNS(this.svgNs, "g");
        importGroup.setAttribute("id", "import_group_" + Date.now());
        importGroup.setAttribute("class", "imported-group");
        // Center the group? No, keep original coordinates.
        this.svg.appendChild(importGroup);

        // 3. Import Elements from the mounted instance
        const validTags = ['rect', 'circle', 'path', 'text', 'polygon', 'polyline', 'line', 'g'];

        // processNode tailored to append to TARGET container
        const processNode = (node, parentTransform = "", container = importGroup) => {
            // Handle Groups (Transform inheritance)
            if (node.tagName === 'g') {
                let groupTransform = node.getAttribute("transform") || "";
                // If we want nested groups to be editable, we could append a new <g> to container
                // But for now, let's keep flattening nested groups INTO the wrapper group for simplicity of OviState export?
                // Actually, the user wants "Resize and Move". Use one Master Group options.
                // We will flatten internal structure but keep Master Wrapper.
                const children = Array.from(node.children);
                children.forEach(child => processNode(child, parentTransform + " " + groupTransform, container));
                return;
            }

            if (!validTags.includes(node.tagName)) return;

            // Clone node
            const clone = node.cloneNode(true);

            // Apply Group Transform to Element Transform if needed
            if (parentTransform.trim() !== "") {
                const current = clone.getAttribute("transform") || "";
                clone.setAttribute("transform", (parentTransform + " " + current).trim());
            }

            // --- COLOR & STYLE EXTRACTION (ROBUST) ---
            let fill, stroke, strokeWidth;
            try {
                const computed = window.getComputedStyle(node);
                fill = computed.fill;
                stroke = computed.stroke;
                strokeWidth = computed.strokeWidth;

                // Opacity
                const op = computed.opacity;
                if (op && parseFloat(op) < 1) {
                    clone.setAttribute('opacity', op);
                    clone.style.opacity = op;
                }
            } catch (e) {
                console.warn("Style computation failed", e);
            }

            // Normalize Transparent RGBA to 'none'
            if (fill && (fill === 'transparent' || fill.replace(/\s/g, '') === 'rgba(0,0,0,0)')) {
                fill = 'none';
            }
            if (stroke && (stroke === 'transparent' || stroke.replace(/\s/g, '') === 'rgba(0,0,0,0)')) {
                stroke = 'none';
            }
            if (strokeWidth === '0px' || parseFloat(strokeWidth) === 0) {
                stroke = 'none';
            }

            if (fill && fill !== 'none') clone.setAttribute("fill", fill);
            else if (fill === 'none') clone.setAttribute("fill", 'none');
            else clone.setAttribute("fill", "#000000");

            if (stroke && stroke !== 'none') clone.setAttribute("stroke", stroke);
            if (strokeWidth && strokeWidth !== '1px' && strokeWidth !== '0px') clone.setAttribute("stroke-width", strokeWidth);

            clone.setAttribute("data-id", node.tagName + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000));
            clone.setAttribute("data-physics", "static");
            clone.style.cursor = "move";

            // Convert Polygon/Polyline to Path
            if (node.tagName === 'polygon' || node.tagName === 'polyline') {
                const pointsStr = node.getAttribute("points") || "";
                const coords = pointsStr.trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

                if (coords.length >= 2) {
                    let d = `M ${coords[0]} ${coords[1]}`;
                    for (let i = 2; i < coords.length; i += 2) {
                        const x = coords[i];
                        const y = coords[i + 1] !== undefined ? coords[i + 1] : coords[i];
                        d += ` L ${x} ${y}`;
                    }
                    if (node.tagName === 'polygon') d += " Z";

                    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    pathEl.setAttribute("d", d);

                    ['fill', 'stroke', 'stroke-width', 'opacity', 'transform'].forEach(attr => {
                        if (clone.hasAttribute(attr)) pathEl.setAttribute(attr, clone.getAttribute(attr));
                    });

                    pathEl.setAttribute("data-id", clone.getAttribute("data-id"));
                    pathEl.setAttribute("data-physics", "static");
                    pathEl.style.cursor = "move";

                    container.appendChild(pathEl);
                    return;
                } else { return; }
            }

            container.appendChild(clone);
        };

        // Traverse MOUNTED SVG
        Array.from(mountedSVG.children).forEach(child => processNode(child));
        document.body.removeChild(hiddenContainer);
        alert(`Imported Vector File (${w}x${h})`);
    }

    sendToSimulation() {
        const objects = [];

        // Root Transform Context (to remove Pan/Zoom)
        const rootCTM = this.svg.getScreenCTM();
        if (!rootCTM) return;
        const invRootCTM = rootCTM.inverse();

        const processElement = (el, parentId = null) => {
            if (el === this.gizmoGroup || el === this.marqueeRect) return;
            if (el.tagName === 'rect' && el.style.pointerEvents === 'none') return;

            // 1. Get Global Matrix in SVG Space (ignoring Pan/Zoom)
            const elCTM = el.getScreenCTM();
            if (!elCTM) return;
            const matrix = invRootCTM.multiply(elCTM);
            const decomp = decomposeMatrix(matrix);

            // 2. BBox and Centers
            const bbox = el.getBBox();

            // Filter: Ignore elements with no size (likely invisible/defs/etc)
            // Unless it's a group (which we process for children) or text
            if (el.tagName !== 'g' && el.tagName !== 'text' && bbox.width === 0 && bbox.height === 0) return;
            // Also ignore if world position is invalid
            if (isNaN(decomp.x) || isNaN(decomp.y)) return;

            // Local point (0,0) in object's local coord space
            const pt = this.svg.createSVGPoint();
            pt.x = bbox.x + bbox.width / 2;
            pt.y = bbox.y + bbox.height / 2;

            // The World-Space position of the object's CENTER
            const worldCenter = pt.matrixTransform(matrix);

            // For OviState hierarchy: position relative to parent's center
            let finalX = worldCenter.x;
            let finalY = worldCenter.y;

            if (parentId) {
                const parentObj = objects.find(o => o.id === parentId);
                if (parentObj) {
                    // This is a simplification: OviState's current render() 
                    // applies parent transform. To satisfy OviState's logic, 
                    // we need to set (this.x, this.y) such that 
                    // ParentCenter + this.pos = GlobalCenter (if no scale/rotation)
                    // For nested rotation/scale, we'd need inverse parent matrix.
                    // For now, let's assume hierarchy is mostly for organization/grouping.
                    finalX -= parentObj.globalX;
                    finalY -= parentObj.globalY;
                }
            }

            const currentId = el.getAttribute('data-id') || (el.tagName + "_" + Math.random().toString(36).substr(2, 5));
            const obj = {
                id: currentId,
                type: el.tagName === 'g' ? 'group' : (el.tagName === 'text' ? 'text' : 'vector_path'),
                x: finalX,
                y: finalY,
                globalX: worldCenter.x, // Helper for sibling recursion
                globalY: worldCenter.y,
                width: bbox.width,
                height: bbox.height,
                rotation: decomp.rotation,
                scale: (decomp.scaleX + decomp.scaleY) / 2, // Average for uniform scale objects
                parent: parentId,
                renderOffset: el.tagName === 'g' ? { x: 0, y: 0 } : { x: -bbox.width / 2, y: -bbox.height / 2 }
            };

            // Style and Shape Specific
            if (obj.type === 'vector_path') {
                let pathData = "";
                if (el.tagName === 'path') pathData = el.getAttribute('d');
                else if (el.tagName === 'rect') {
                    const x = parseFloat(el.getAttribute('x'));
                    const y = parseFloat(el.getAttribute('y'));
                    const w = parseFloat(el.getAttribute('width'));
                    const h = parseFloat(el.getAttribute('height'));
                    pathData = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
                } else if (el.tagName === 'circle') {
                    const cx = parseFloat(el.getAttribute('cx'));
                    const cy = parseFloat(el.getAttribute('cy'));
                    const r = parseFloat(el.getAttribute('r'));
                    pathData = `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy}`;
                }

                // Shift Path to Origin-Center (since OviState draws at x,y)
                // Actually, our renderOffset handles the centering.
                // But path coordinates are relative to el.bbox.
                // We need to shift pathData so (bbox.x, bbox.y) becomes (0,0) in local space
                // No, renderOffset = -width/2. 
                // So if local path starts at bbox.x, and renderOffset is -bbox.w/2, 
                // then local (rect.x) should become 0.
                obj.pathData = pathData;
                obj.renderOffset.x = -bbox.x - bbox.width / 2;
                obj.renderOffset.y = -bbox.y - bbox.height / 2;

                const style = window.getComputedStyle(el);
                obj.fill = style.fill === 'rgba(0, 0, 0, 0)' ? 'none' : style.fill;
                obj.stroke = style.stroke === 'rgba(0, 0, 0, 0)' ? 'none' : style.stroke;
                obj.strokeWidth = parseFloat(style.strokeWidth) || 0;
                obj.opacity = parseFloat(style.opacity) || 1;
            } else if (obj.type === 'text') {
                obj.text = el.textContent;
                const style = window.getComputedStyle(el);
                obj.fill = style.fill;
                obj.fontSize = parseFloat(el.getAttribute('font-size')) || 20;
            }

            // Identity & Physics
            obj.physics = {
                enabled: el.getAttribute('data-physics') === 'dynamic',
                type: el.getAttribute('data-physics') || 'static'
            };
            obj.behaviors = [];
            obj.behaviorParams = {};

            objects.push(obj);

            // Children
            if (el.tagName === 'g') {
                Array.from(el.children).forEach(child => {
                    // Filter out non-visual elements
                    if (['defs', 'clippath', 'mask', 'filter', 'style', 'script', 'title', 'desc', 'metadata'].includes(child.tagName.toLowerCase())) return;
                    processElement(child, currentId);
                });
            }
        };

        Array.from(this.svg.children).forEach(child => processElement(child));

        // Transfer
        const oviStatePlugin = this.engine.pluginManager.plugins.get('ovistate');
        if (oviStatePlugin && oviStatePlugin.activeEditor) {
            objects.forEach(obj => oviStatePlugin.activeEditor.addObject(obj));
            console.log(`✅ Sent ${objects.filter(o => o.type !== 'group').length} objects to OviState.`);
        } else {
            alert("OviState is not active.");
        }
    }


    getMousePosition(evt) {
        // Check if CTM is available
        const CTM = this.svg.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };

        if (evt.touches) evt = evt.touches[0];
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    }
}
