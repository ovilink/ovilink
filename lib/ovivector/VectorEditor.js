import VectorSidebar from './ui/VectorSidebar.js';
import VectorInspector from './ui/VectorInspector.js';
import BooleanEngine from './BooleanEngine.js';

const decomposeMatrix = (m) => {
    const scaleX = Math.sqrt(m.a * m.a + m.b * m.b);
    const scaleY = Math.sqrt(m.c * m.c + m.d * m.d);
    const rotation = Math.atan2(m.b, m.a) * (180 / Math.PI);
    return { x: m.e, y: m.f, scaleX, scaleY, rotation };
};

class WarpEngine {
    static parse(d) {
        const commands = [];
        const regex = /([MLHVCSQTA])([^MLHVCSQTA]*)/gi;
        let match;
        let curX = 0, curY = 0;

        while ((match = regex.exec(d)) !== null) {
            const type = match[1];
            const argStr = match[2] || "";
            const args = (argStr.match(/-?\d*\.?\d+(?:[eE][+-]?\d+)?/g) || []).map(parseFloat);
            const isRelative = type === type.toLowerCase() && type.toUpperCase() !== 'A';
            const cmdUpper = type.toUpperCase();

            if (cmdUpper === 'M') {
                for (let i = 0; i < args.length; i += 2) {
                    if (isRelative) { curX += args[i]; curY += args[i + 1]; }
                    else { curX = args[i]; curY = args[i + 1]; }
                    commands.push({ type: i === 0 ? 'M' : 'L', args: [curX, curY] });
                }
            } else if (cmdUpper === 'L') {
                for (let i = 0; i < args.length; i += 2) {
                    if (isRelative) { curX += args[i]; curY += args[i + 1]; }
                    else { curX = args[i]; curY = args[i + 1]; }
                    commands.push({ type: 'L', args: [curX, curY] });
                }
            } else if (cmdUpper === 'H') {
                for (let i = 0; i < args.length; i++) {
                    if (isRelative) { curX += args[i]; }
                    else { curX = args[i]; }
                    commands.push({ type: 'L', args: [curX, curY] });
                }
            } else if (cmdUpper === 'V') {
                for (let i = 0; i < args.length; i++) {
                    if (isRelative) { curY += args[i]; }
                    else { curY = args[i]; }
                    commands.push({ type: 'L', args: [curX, curY] });
                }
            } else if (cmdUpper === 'C') {
                for (let i = 0; i < args.length; i += 6) {
                    const pts = [
                        isRelative ? curX + args[i] : args[i],
                        isRelative ? curY + args[i + 1] : args[i + 1],
                        isRelative ? curX + args[i + 2] : args[i + 2],
                        isRelative ? curY + args[i + 3] : args[i + 3],
                        isRelative ? curX + args[i + 4] : args[i + 4],
                        isRelative ? curY + args[i + 5] : args[i + 5]
                    ];
                    commands.push({ type: 'C', args: pts });
                    curX = pts[4]; curY = pts[5];
                }
            } else if (cmdUpper === 'Z') {
                commands.push({ type: 'Z', args: [] });
            } else {
                commands.push({ type: cmdUpper, args: args });
                if (args.length >= 2) {
                    if (isRelative) { curX += args[args.length - 2]; curY += args[args.length - 1]; }
                    else { curX = args[args.length - 2]; curY = args[args.length - 1]; }
                }
            }
        }
        return commands;
    }

    static serialize(cmds) {
        return cmds.map(c => {
            const fArgs = c.args.map(n => isNaN(n) ? 0 : Number(n.toFixed(3)));
            return c.type + ' ' + fArgs.join(' ');
        }).join(' ');
    }

    static subdivide(cmds, threshold = 10) {
        const newCmds = [];
        let curX = 0, curY = 0;

        cmds.forEach(cmd => {
            const type = cmd.type;
            const args = cmd.args;

            if (type.toUpperCase() === 'M') {
                curX = args[0]; curY = args[1];
                newCmds.push(cmd);
            } else if (type.toUpperCase() === 'L') {
                const tx = args[0], ty = args[1];
                const dist = Math.sqrt((tx - curX) ** 2 + (ty - curY) ** 2);
                if (dist > threshold) {
                    const steps = Math.ceil(dist / threshold);
                    for (let i = 1; i <= steps; i++) {
                        newCmds.push({
                            type: 'L',
                            args: [curX + (tx - curX) * (i / steps), curY + (ty - curY) * (i / steps)]
                        });
                    }
                } else {
                    newCmds.push(cmd);
                }
                curX = tx; curY = ty;
            } else {
                newCmds.push(cmd);
                if (args.length >= 2) {
                    curX = args[args.length - 2];
                    curY = args[args.length - 1];
                }
            }
        });
        return newCmds;
    }

    static apply(d, bbox, settings) {
        if (!d) return "";
        let cmds = this.parse(d);
        cmds = this.subdivide(cmds, 5);

        cmds.forEach(cmd => {
            // Only warp points if it's not a generic command without points or with specific logic
            // For now, warp every pair of coordinates
            for (let i = 0; i < cmd.args.length; i += 2) {
                if (cmd.args[i + 1] === undefined) break;
                const pt = this.warpPoint(cmd.args[i], cmd.args[i + 1], bbox, settings);
                cmd.args[i] = pt.x;
                cmd.args[i + 1] = pt.y;
            }
        });
        return this.serialize(cmds);
    }

    static warpPoint(px, py, bbox, settings) {
        if (isNaN(px) || isNaN(py)) return { x: 0, y: 0 };

        const bw = bbox.width || 1;
        const bh = bbox.height || 1;
        let u = (px - bbox.x) / bw;
        let v = (py - bbox.y) / bh;

        // Distortion (Tilt)
        u += (v - 0.5) * (settings.distH / 100);
        v += (u - 0.5) * (settings.distV / 100);

        const bend = settings.bend / 100;

        switch (settings.type) {
            case 'arc':
                v -= bend * Math.sin(u * Math.PI);
                break;
            case 'arc_lower':
                v -= bend * Math.sin(u * Math.PI) * (1 - v);
                break;
            case 'arc_upper':
                v -= bend * Math.sin(u * Math.PI) * v;
                break;
            case 'arch':
                v -= bend * Math.sin(u * Math.PI);
                u = (u - 0.5) * (1 + v * 0.3 * bend) + 0.5;
                break;
            case 'bulge':
                v = (v - 0.5) * (1 + bend * Math.sin(u * Math.PI)) + 0.5;
                u = (u - 0.5) * (1 + bend * Math.sin(v * Math.PI)) + 0.5;
                break;
            case 'shell_lower':
                u = (u - 0.5) * (1 + (1 - v) * bend) + 0.5;
                v += bend * 0.2 * Math.sin(u * Math.PI);
                break;
            case 'shell_upper':
                u = (u - 0.5) * (1 + v * bend) + 0.5;
                v -= bend * 0.2 * Math.sin(u * Math.PI);
                break;
            case 'flag':
                v -= bend * Math.sin(u * Math.PI * 2);
                break;
            case 'wave':
                v -= bend * Math.sin(u * Math.PI * 3);
                break;
            case 'fish':
                u = (u - 0.5) * (1 + (1 - u) * bend) + 0.5;
                v = (v - 0.5) * (1 + (1 - u) * bend * 0.5) + 0.5;
                break;
            case 'rise':
                v -= bend * (u - 0.5) * 2;
                break;
            case 'fisheye':
                const dx = u - 0.5, dy = v - 0.5;
                const r = Math.sqrt(dx * dx + dy * dy);
                if (r > 0) {
                    const nr = Math.pow(r, 1 - bend * 0.8);
                    u = 0.5 + (dx / r) * nr;
                    v = 0.5 + (dy / r) * nr;
                }
                break;
            case 'inflate':
                const dxi = u - 0.5, dyi = v - 0.5;
                const ri = Math.sqrt(dxi * dxi + dyi * dyi);
                const infl = 1 + bend * (1 - ri * 2);
                u = 0.5 + dxi * infl;
                v = 0.5 + dyi * infl;
                break;
            case 'squeeze':
                u = (u - 0.5) * (1 - bend * 0.5 * Math.cos(v * Math.PI)) + 0.5;
                v = (v - 0.5) * (1 - bend * 0.5 * Math.cos(u * Math.PI)) + 0.5;
                break;
            case 'twist':
                const dxt = u - 0.5, dyt = v - 0.5;
                const rt = Math.sqrt(dxt * dxt + dyt * dyt);
                const angle = bend * (1 - rt) * Math.PI * 1.5;
                u = 0.5 + dxt * Math.cos(angle) - dyt * Math.sin(angle);
                v = 0.5 + dxt * Math.sin(angle) + dyt * Math.cos(angle);
                break;
        }

        return {
            x: bbox.x + u * bw,
            y: bbox.y + v * bh
        };
    }
}


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

        // Shape Builder State
        this.isShapeBuilding = false;
        this.scribbledRegions = new Set();
        this.deletedRegions = new Set(); // Regions marked for removal (Alt+Drag)
        this.regionOverlayGroup = null;
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
            this.refreshCursor();

            // Delete key
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedElements.length > 0) {
                    this.selectedElements.forEach(el => el.remove());
                    this.deselect();
                }
            }

            // Ctrl+A Select All
            if (e.ctrlKey && e.code === 'KeyA') {
                e.preventDefault();
                const all = Array.from(this.svg.children).filter(el =>
                    el !== this.gizmoGroup && el !== this.marqueeRect && el.tagName !== 'defs');
                this.selectedElements = all;
                this.selectedElement = all[all.length - 1];
                this.updateGizmo();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.refreshCursor();
        });

        this.svg.addEventListener('wheel', (e) => {
            // ... (Same Zoom Logic)
            if (e.ctrlKey) {
                e.preventDefault();
                const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
                const mouse = this.getMousePosition(e);
                const newW = this.viewBox.w * zoomFactor;
                const newH = this.viewBox.h * zoomFactor;
                this.viewBox.x = mouse.x - (mouse.x - this.viewBox.x) * zoomFactor;
                this.viewBox.y = mouse.y - (mouse.y - this.viewBox.y) * zoomFactor;
                this.viewBox.w = newW;
                this.viewBox.h = newH;
                this.updateViewBox();
                this.updateGizmo();
            }
        }, { passive: false });

        this.svg.addEventListener('mousedown', (e) => {
            // 1. Pan
            if (this.keys['Space'] || e.button === 1) {
                this.isPanning = true;
                this.panStart = { x: e.clientX, y: e.clientY };
                this.svg.style.cursor = 'grabbing';
                e.preventDefault();
                return;
            }

            // 2. Gizmo Resize (Only in Select Mode)
            if ((this.mode === 'select' || this.mode === 'direct_select') && e.target.classList.contains('gizmo-handle-br')) {
                this.isResizing = true;
                this.resizeStart.mouseX = e.clientX;
                this.resizeStart.mouseY = e.clientY;
                const bbox = this.selectedElement.getBBox();
                let scaleX = 1, scaleY = 1;
                const transform = this.selectedElement.getAttribute("transform") || "";
                const matchS = transform.match(/scale\(([^,]+)(?:,\s*([^)]+))?\)/);
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

            const pos = this.getMousePosition(e);

            // 3. Drawing Mode
            if (['rect', 'circle', 'star', 'polygon', 'gear', 'arrow', 'pie', 'spiral', 'wave', 'grid', 'flower', 'cross', 'crescent', 'heart', 'blob', 'bubble', 'shield', 'cloud', 'drop', 'line'].includes(this.mode)) {
                this.isDrawing = true;
                this.drawStart = pos;

                // Create temp shape
                this.activeDrawingEl = this.createShape(this.mode, { x: pos.x, y: pos.y, w: 0, h: 0 });
                this.svg.appendChild(this.activeDrawingEl);
                this.deselect();
                return;
            }

            // 4. Text Mode
            if (this.mode === 'text') {
                const textEl = this.createShape('text', { x: pos.x, y: pos.y });
                this.svg.appendChild(textEl);
                this.select(textEl);
                // Switch back to select after text (usually)
                this.setMode('select');
                // Update UI button state would require callback or direct DOM manip
                if (document.getElementById('tool-select')) document.getElementById('tool-select').click();
                return;
            }

            // 5. Select Mode Main Logic
            if (this.mode === 'select' || this.mode === 'direct_select') {
                if (e.target === this.svg) {
                    this.deselect();
                    this.isMarquee = true;
                    this.marqueeStart = { x: pos.x, y: pos.y };
                    this.marqueeRect.style.display = "block";
                    this.marqueeRect.setAttribute("x", pos.x);
                    this.marqueeRect.setAttribute("y", pos.y);
                    this.marqueeRect.setAttribute("width", "0");
                    this.marqueeRect.setAttribute("height", "0");
                    return;
                }

                const target = e.target.closest('.manual-group') || e.target.closest('.imported-group') || e.target;
                if (target === this.svg || target === this.gizmoGroup || this.gizmoGroup.contains(target)) return;

                if (e.shiftKey) {
                    this.toggleSelect(target);
                } else {
                    this.select(target);
                }

                this.isDragging = true;
                this.dragStartPos = { x: pos.x, y: pos.y };

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
            }

            // 6. Shape Builder Mode
            if (this.mode === 'shape_builder') {
                this.isShapeBuilding = true;
                this.scribbledRegions.clear();
                this.updateShapeBuilderOverlay();
                return;
            }
        });

        this.svg.addEventListener('mousemove', (e) => {
            const mouse = this.getMousePosition(e);

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

            if (this.isDrawing && this.activeDrawingEl) {
                const w = Math.abs(mouse.x - this.drawStart.x);
                const h = Math.abs(mouse.y - this.drawStart.y);
                const x = Math.min(mouse.x, this.drawStart.x);
                const y = Math.min(mouse.y, this.drawStart.y);

                const type = this.mode;
                let cx, cy, r;
                if (type === 'rect') {
                    this.activeDrawingEl.setAttribute('x', 0);
                    this.activeDrawingEl.setAttribute('y', 0);
                    this.activeDrawingEl.setAttribute('width', w);
                    this.activeDrawingEl.setAttribute('height', h);
                    this.activeDrawingEl.setAttribute('transform', `translate(${x},${y})`);
                } else if (type === 'circle') {
                    this.activeDrawingEl.setAttribute('cx', 0);
                    this.activeDrawingEl.setAttribute('cy', 0);
                    this.activeDrawingEl.setAttribute('rx', w / 2);
                    this.activeDrawingEl.setAttribute('ry', h / 2);
                    this.activeDrawingEl.setAttribute('transform', `translate(${x + w / 2},${y + h / 2})`);
                } else if (type === 'line') {
                    this.activeDrawingEl.setAttribute('x1', 0);
                    this.activeDrawingEl.setAttribute('y1', 0);
                    this.activeDrawingEl.setAttribute('x2', mouse.x - x);
                    this.activeDrawingEl.setAttribute('y2', mouse.y - y);
                    this.activeDrawingEl.setAttribute('transform', `translate(${x},${y})`);
                } else if (type === 'star') {
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const numPoints = 5;
                    const innerRatio = 0.4;
                    const step = Math.PI / numPoints;
                    let angle = -Math.PI / 2;
                    let s = "";
                    for (let i = 0; i < numPoints * 2; i++) {
                        const radius = (i % 2 === 0) ? r : r * innerRatio;
                        const px = Math.cos(angle) * radius;
                        const py = Math.sin(angle) * radius;
                        s += `${px},${py} `;
                        angle += step;
                    }
                    this.activeDrawingEl.setAttribute("points", s.trim());
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "star");
                    this.activeDrawingEl.setAttribute("data-points", numPoints);
                    this.activeDrawingEl.setAttribute("data-inner-radius", innerRatio);
                    this.activeDrawingEl.setAttribute("data-cx", cx);
                    this.activeDrawingEl.setAttribute("data-cy", cy);
                    this.activeDrawingEl.setAttribute("data-r", r);
                } else if (type === 'polygon') {
                    // Proper Polygon Dynamic Preview (Hexagon default)
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const numPoints = 6;
                    const step = 2 * Math.PI / numPoints;
                    let angle = -Math.PI / 2;
                    let s = "";
                    for (let i = 0; i < numPoints; i++) {
                        const px = Math.cos(angle) * r;
                        const py = Math.sin(angle) * r;
                        s += `${px},${py} `;
                        angle += step;
                    }
                    this.activeDrawingEl.setAttribute("points", s.trim());
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "polygon");
                    this.activeDrawingEl.setAttribute("data-points", numPoints);
                    this.activeDrawingEl.setAttribute("data-cx", cx);
                    this.activeDrawingEl.setAttribute("data-cy", cy);
                    this.activeDrawingEl.setAttribute("data-r", r);
                } else if (type === 'gear') {
                    // Gear Preview
                    const teeth = 8;
                    const depth = 0.2;
                    const hole = 0.3;
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const innerR = r * (1 - depth);
                    const holeR = r * hole;

                    let dStr = "";
                    const step = (Math.PI * 2) / teeth;
                    const qStep = step / 4;

                    for (let i = 0; i < teeth; i++) {
                        const a = i * step - Math.PI / 2;
                        const a1 = a;
                        const a2 = a + qStep;
                        const a3 = a + qStep * 2;
                        const a4 = a + qStep * 3;

                        const p1x = Math.cos(a1) * innerR; const p1y = Math.sin(a1) * innerR;
                        const p2x = Math.cos(a2) * r; const p2y = Math.sin(a2) * r;
                        const p3x = Math.cos(a3) * r; const p3y = Math.sin(a3) * r;
                        const p4x = Math.cos(a4) * innerR; const p4y = Math.sin(a4) * innerR;

                        if (i === 0) dStr += `M ${p1x} ${p1y} `;
                        else dStr += `L ${p1x} ${p1y} `;
                        dStr += `L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} `;
                    }
                    dStr += "Z";

                    if (hole > 0) {
                        dStr += ` M ${holeR} ${0} A ${holeR} ${holeR} 0 1 0 ${-holeR} ${0} A ${holeR} ${holeR} 0 1 0 ${holeR} ${0} Z`;
                    }

                    this.activeDrawingEl.setAttribute("d", dStr.trim());
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-cx", cx); this.activeDrawingEl.setAttribute("data-cy", cy); this.activeDrawingEl.setAttribute("data-r", r);
                } else if (type === 'arrow') {
                    // Arrow Preview
                    const cy = y + h / 2;
                    const shaftWidth = 0.5;
                    const headLength = 0.4;
                    const sw = h * shaftWidth;
                    const hl = w * headLength;
                    const xHead = w - hl;

                    const s = `
                        ${0},${- sw / 2}
                        ${xHead},${- sw / 2}
                        ${xHead},${-h / 2}
                        ${w},${0}
                        ${xHead},${h / 2}
                        ${xHead},${sw / 2}
                        ${0},${sw / 2}
                    `.trim().replace(/\s+/g, ' ');

                    this.activeDrawingEl.setAttribute("points", s);
                    this.activeDrawingEl.setAttribute("transform", `translate(${x},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "arrow");
                    this.activeDrawingEl.setAttribute("data-shaft", shaftWidth);
                    this.activeDrawingEl.setAttribute("data-head", headLength);
                } else if (type === 'pie') {
                    // Pie Preview
                    const startAngle = 0;
                    const endAngle = 270;
                    const innerRatio = 0;

                    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
                        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
                        return {
                            x: centerX + (radius * Math.cos(angleInRadians)),
                            y: centerY + (radius * Math.sin(angleInRadians))
                        };
                    }

                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const innerR = r * innerRatio;

                    const start = polarToCartesian(cx, cy, r, endAngle);
                    const end = polarToCartesian(cx, cy, r, startAngle);
                    const startInner = polarToCartesian(cx, cy, innerR, endAngle);
                    const endInner = polarToCartesian(cx, cy, innerR, startAngle);

                    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

                    let d = [
                        "M", start.x - cx, start.y - cy,
                        "A", r, r, 0, largeArcFlag, 0, end.x - cx, end.y - cy
                    ];

                    if (innerRatio > 0.01) {
                        d.push("L", endInner.x - cx, endInner.y - cy);
                        d.push("A", innerR, innerR, 0, largeArcFlag, 1, startInner.x - cx, startInner.y - cy);
                    } else {
                        d.push("L", 0, 0);
                    }
                    d.push("Z");

                    this.activeDrawingEl.setAttribute("d", d.join(" "));
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "pie");
                    this.activeDrawingEl.setAttribute("data-start", startAngle);
                    this.activeDrawingEl.setAttribute("data-end", endAngle);
                    this.activeDrawingEl.setAttribute("data-inner", innerRatio);
                    // Store stable geometry frame
                    this.activeDrawingEl.setAttribute("data-cx", cx);
                    this.activeDrawingEl.setAttribute("data-cy", cy);
                    this.activeDrawingEl.setAttribute("data-r", r);
                } else if (type === 'spiral') {
                    // Spiral Preview
                    const turns = 3;
                    const inner = 0.1;

                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;

                    const points = turns * 40;
                    const step = (Math.PI * 2 * turns) / points;
                    let angle = 0;
                    let d = "";
                    const innerR = r * inner;

                    for (let i = 0; i <= points; i++) {
                        const progress = i / points;
                        const currentR = innerR + (r - innerR) * progress;
                        const px = Math.cos(angle) * currentR;
                        const py = Math.sin(angle) * currentR;
                        d += `${i === 0 ? 'M' : 'L'} ${px} ${py} `;
                        angle += step;
                    }

                    this.activeDrawingEl.setAttribute("d", d.trim());
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "spiral");
                    this.activeDrawingEl.setAttribute("data-turns", turns);
                    this.activeDrawingEl.setAttribute("data-inner", inner);
                    this.activeDrawingEl.setAttribute("data-cx", cx);
                    this.activeDrawingEl.setAttribute("data-cy", cy);
                    this.activeDrawingEl.setAttribute("data-r", r);
                    this.activeDrawingEl.style.fill = "none";
                    this.activeDrawingEl.style.stroke = "#000000";
                } else if (type === 'wave') {
                    // Wave Preview
                    const freq = 3;
                    const amp = 0.8;
                    const points = freq * 40;
                    const stepX = w / points;
                    const midY = y + h / 2;
                    const maxAmp = h / 2 * amp;

                    let d = "";
                    for (let i = 0; i <= points; i++) {
                        const px = i * stepX;
                        const angle = (i / points) * (freq * Math.PI * 2);
                        const py = Math.sin(angle) * maxAmp;
                        d += `${i === 0 ? 'M' : 'L'} ${px} ${py} `;
                    }

                    this.activeDrawingEl.setAttribute("d", d.trim());
                    this.activeDrawingEl.setAttribute("transform", `translate(${x},${midY})`);
                    this.activeDrawingEl.setAttribute("data-shape", "wave");
                    this.activeDrawingEl.setAttribute("data-freq", freq);
                    this.activeDrawingEl.setAttribute("data-amp", amp);
                    this.activeDrawingEl.setAttribute("data-x", x);
                    this.activeDrawingEl.setAttribute("data-y", y);
                    this.activeDrawingEl.setAttribute("data-w", w);
                    this.activeDrawingEl.setAttribute("data-h", h);
                    this.activeDrawingEl.style.fill = "none";
                    this.activeDrawingEl.style.stroke = "#000000";
                } else if (type === 'grid') {
                    // Grid Preview
                    const rows = 5;
                    const cols = 5;

                    let d = "";
                    const stepY = h / rows;
                    for (let i = 0; i <= rows; i++) {
                        const py = i * stepY;
                        d += `M ${0} ${py} L ${w} ${py} `;
                    }
                    const stepX = w / cols;
                    for (let i = 0; i <= cols; i++) {
                        const px = i * stepX;
                        d += `M ${px} ${0} L ${px} ${h} `;
                    }

                    this.activeDrawingEl.setAttribute("d", d.trim());
                    this.activeDrawingEl.setAttribute("transform", `translate(${x},${y})`);
                    this.activeDrawingEl.setAttribute("data-shape", "grid");
                    this.activeDrawingEl.setAttribute("data-rows", rows);
                    this.activeDrawingEl.setAttribute("data-cols", cols);

                    this.activeDrawingEl.setAttribute("data-x", x);
                    this.activeDrawingEl.setAttribute("data-y", y);
                    this.activeDrawingEl.setAttribute("data-w", w);
                    this.activeDrawingEl.setAttribute("data-h", h);

                    this.activeDrawingEl.style.fill = "none";
                    this.activeDrawingEl.style.stroke = "#000000";
                    this.activeDrawingEl.style.strokeWidth = "1px";
                } else if (type === 'flower') {
                    // Preview
                    const petals = 5;
                    const roundness = 0.6;
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;

                    let dStr = "";
                    const step = (Math.PI * 2) / petals;
                    for (let i = 0; i < petals; i++) {
                        const a = i * step;
                        const nextA = (i + 1) * step;
                        const pX = Math.cos(a) * r;
                        const pY = Math.sin(a) * r;
                        const nextX = Math.cos(nextA) * r;
                        const nextY = Math.sin(nextA) * r;
                        const cp1x = Math.cos(a + step * 0.3) * (r * (1 + roundness));
                        const cp1y = Math.sin(a + step * 0.3) * (r * (1 + roundness));
                        const cp2x = Math.cos(a + step * 0.7) * (r * (1 + roundness));
                        const cp2y = Math.sin(a + step * 0.7) * (r * (1 + roundness));
                        if (i === 0) dStr += `M ${pX} ${pY} `;
                        dStr += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${nextX} ${nextY} `;
                    }
                    dStr += "Z";

                    this.activeDrawingEl.setAttribute("d", dStr);
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "flower");
                    this.activeDrawingEl.setAttribute("data-petals", petals);
                    this.activeDrawingEl.setAttribute("data-round", roundness);
                    this.activeDrawingEl.setAttribute("data-cx", cx);
                    this.activeDrawingEl.setAttribute("data-cy", cy);
                    this.activeDrawingEl.setAttribute("data-r", r);
                } else if (type === 'cross') {
                    // Preview
                    const arms = 4;
                    const thickness = 0.4;
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const innerR = r * 0.4;

                    let pts = "";
                    const step = (Math.PI * 2) / arms;
                    const wAngle = (Math.PI / arms) * thickness;

                    for (let i = 0; i < arms; i++) {
                        const angle = i * step - (Math.PI / 2);
                        const p1x = Math.cos(angle - wAngle) * r;
                        const p1y = Math.sin(angle - wAngle) * r;
                        const p2x = Math.cos(angle + wAngle) * r;
                        const p2y = Math.sin(angle + wAngle) * r;

                        const nextAngle = (i + 1) * step - (Math.PI / 2);
                        const valleyAngle = (angle + nextAngle) / 2;
                        const pInnerX = Math.cos(valleyAngle) * innerR;
                        const pInnerY = Math.sin(valleyAngle) * innerR;

                        pts += `${p1x},${p1y} ${p2x},${p2y} ${pInnerX},${pInnerY} `;
                    }

                    this.activeDrawingEl.setAttribute("points", pts.trim());
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "cross");
                    this.activeDrawingEl.setAttribute("data-arms", arms);
                    this.activeDrawingEl.setAttribute("data-thick", thickness);
                    this.activeDrawingEl.setAttribute("data-cx", cx);
                    this.activeDrawingEl.setAttribute("data-cy", cy);
                    this.activeDrawingEl.setAttribute("data-r", r);
                } else if (type === 'crescent') {
                    const thickness = 0; // Default half moon
                    const style = 'phases';
                    let d;
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;

                    if (style === 'phases') {
                        const rx = r * Math.abs(thickness);
                        const sweep = thickness < 0 ? 0 : 1;
                        d = `M ${0} ${-r} 
                             A ${r} ${r} 0 0 1 ${0} ${r} 
                             A ${rx} ${r} 0 0 ${sweep} ${0} ${-r} Z`.trim();
                    } else {
                        // Solar/Eclipse Style
                        const coverage = (thickness + 1) / 2; // Map -1..1 to 0..1
                        const dist = 2 * r * (1 - coverage);
                        if (dist >= 1.99 * r) {
                            d = `M ${-r} ${0} A ${r} ${r} 0 1 1 ${r} ${0} A ${r} ${r} 0 1 1 ${-r} ${0} Z`;
                        } else if (dist <= 0.01 * r) {
                            d = "";
                        } else {
                            const intersectX = dist / 2;
                            const intersectY = Math.sqrt(r * r - intersectX * intersectX);
                            d = `M ${intersectX} ${-intersectY} 
                                 A ${r} ${r} 0 1 1 ${intersectX} ${intersectY} 
                                 A ${r} ${r} 0 0 0 ${intersectX} ${-intersectY} Z`.trim();
                        }
                    }

                    this.activeDrawingEl.setAttribute("d", d);
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "crescent");
                    this.activeDrawingEl.setAttribute("data-thickness", thickness);
                    this.activeDrawingEl.setAttribute("data-style", style);
                    this.activeDrawingEl.setAttribute("data-cx", cx); this.activeDrawingEl.setAttribute("data-cy", cy); this.activeDrawingEl.setAttribute("data-r", r);

                } else if (type === 'heart') {
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const midX = x + w / 2;
                    const bottomY = y + h;

                    const depth = 0.3;
                    const topY = y + h * depth;

                    const d = `
                        M ${0} ${-h / 2 + h * depth}
                        C ${0} ${-h / 2} ${-w / 2} ${-h / 2} ${-w / 2} ${-h / 2 + h * depth}
                        C ${-w / 2} ${-h / 2 + h * (depth + 0.3)} ${0} ${-h / 2 + h * 0.9} ${0} ${h / 2}
                        C ${0} ${-h / 2 + h * 0.9} ${w / 2} ${-h / 2 + h * (depth + 0.3)} ${w / 2} ${-h / 2 + h * depth}
                        C ${w / 2} ${-h / 2} ${0} ${-h / 2} ${0} ${-h / 2 + h * depth}
                     `.trim();
                    this.activeDrawingEl.setAttribute("d", d);
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "heart");
                    this.activeDrawingEl.setAttribute("data-depth", depth);
                    this.activeDrawingEl.setAttribute("data-cx", cx); this.activeDrawingEl.setAttribute("data-cy", cy); this.activeDrawingEl.setAttribute("data-r", r);
                } else if (type === 'blob') {
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const complexity = 7;
                    const contrast = 0.3;
                    const seed = 123; // Static seed for preview

                    // Duplicated makeBlob logic (inline for preview speed/context)
                    const random = (s) => (Math.sin(s) * 10000) - Math.floor(Math.sin(s) * 10000);
                    let points = [];
                    const step = (Math.PI * 2) / complexity;
                    for (let i = 0; i < complexity; i++) {
                        const angle = i * step;
                        const rnd = random(seed + i);
                        const varR = r * (1 - (contrast * 0.5) + (rnd * contrast));
                        points.push({ x: Math.cos(angle) * varR, y: Math.sin(angle) * varR });
                    }
                    const len = points.length;
                    let d = `M ${points[0].x} ${points[0].y} `;
                    for (let i = 0; i < len; i++) {
                        const p0 = points[(i - 1 + len) % len];
                        const p1 = points[i];
                        const p2 = points[(i + 1) % len];
                        const p3 = points[(i + 2) % len];
                        const cp1x = p1.x + (p2.x - p0.x) * 0.15;
                        const cp1y = p1.y + (p2.y - p0.y) * 0.15;
                        const cp2x = p2.x - (p3.x - p1.x) * 0.15;
                        const cp2y = p2.y - (p3.y - p1.y) * 0.15;
                        d += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y} `;
                    }
                    this.activeDrawingEl.setAttribute("d", d);
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "blob");
                    this.activeDrawingEl.setAttribute("data-complex", complexity);
                    this.activeDrawingEl.setAttribute("data-contrast", contrast);
                    this.activeDrawingEl.setAttribute("data-seed", seed);
                    this.activeDrawingEl.setAttribute("data-cx", cx); this.activeDrawingEl.setAttribute("data-cy", cy); this.activeDrawingEl.setAttribute("data-r", r);

                } else if (type === 'bubble') {
                    const tailX = 0.7;
                    const r = 10;
                    const boxH = h * 0.8;
                    const tailTooltipX = w * tailX + (w > 20 ? 10 : 0);
                    const tailBaseX = w * tailX;
                    const d = `
                        M ${r} ${0} 
                        H ${w - r} 
                        Q ${w} ${0} ${w} ${r} 
                        V ${boxH - r} 
                        Q ${w} ${boxH} ${w - r} ${boxH}
                        H ${tailBaseX + 20} 
                        L ${tailTooltipX} ${h}
                        L ${tailBaseX} ${boxH}
                        H ${r}
                        Q ${0} ${boxH} ${0} ${boxH - r}
                        V ${r}
                        Q ${0} ${0} ${r} ${0}
                        Z
                     `.trim();
                    this.activeDrawingEl.setAttribute("d", d);
                    this.activeDrawingEl.setAttribute("transform", `translate(${x},${y})`);
                    this.activeDrawingEl.setAttribute("data-shape", "bubble");
                    this.activeDrawingEl.setAttribute("data-tail", tailX);
                    this.activeDrawingEl.setAttribute("data-x", x); this.activeDrawingEl.setAttribute("data-y", y); this.activeDrawingEl.setAttribute("data-w", w); this.activeDrawingEl.setAttribute("data-h", h);
                } else if (type === 'shield') {
                    const shoulder = 0.5;
                    const crest = 0.15;
                    const curve = 1.0;
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;

                    const crestY = -h / 2 + h * crest;
                    const sideY = -h / 2 + h * shoulder;
                    const cp1x = -w / 4; // Simplified curve logic for preview
                    const cp1y = h / 2;
                    const cp2x = w / 4;
                    const cp2y = h / 2;

                    const d = `M 0 ${crestY} L ${-w / 2} ${-h / 2} V ${sideY} Q ${-w / 2} ${h / 2} 0 ${h / 2} Q ${w / 2} ${h / 2} ${w / 2} ${sideY} V ${-h / 2} Z`.trim();
                    this.activeDrawingEl.setAttribute("d", d);
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "shield");
                    this.activeDrawingEl.setAttribute("data-shoulder", shoulder);
                    this.activeDrawingEl.setAttribute("data-crest", crest);
                    this.activeDrawingEl.setAttribute("data-curve", curve);
                    this.activeDrawingEl.setAttribute("data-x", x); this.activeDrawingEl.setAttribute("data-y", y); this.activeDrawingEl.setAttribute("data-w", w); this.activeDrawingEl.setAttribute("data-h", h);
                } else if (type === 'cloud') {
                    const bumps = 6;
                    const puff = 0.5;
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const irregularity = 0.2;
                    const flatness = 0.5;

                    let cloudD = "";
                    const cloudStep = (Math.PI * 2) / bumps;
                    const seed = 123;
                    const random = (s) => {
                        const x = Math.sin(s) * 10000;
                        return x - Math.floor(x);
                    }

                    for (let i = 0; i < bumps; i++) {
                        const a = i * cloudStep;
                        const nextA = (i + 1) * cloudStep;
                        const r1 = r * (1 + (random(i + seed) - 0.5) * irregularity);
                        const r2 = r * (1 + (random(i + 1 + seed) - 0.5) * irregularity);
                        let p1X = Math.cos(a) * r1;
                        let p1Y = Math.sin(a) * r1;
                        let nX = Math.cos(nextA) * r2;
                        let nY = Math.sin(nextA) * r2;

                        if (flatness > 0) {
                            if (p1Y > 0) p1Y = p1Y * (1 - flatness);
                            if (nY > 0) nY = nY * (1 - flatness);
                        }

                        let cp1x = Math.cos(a + cloudStep * 0.3) * (r1 * (1 + puff));
                        let cp1y = Math.sin(a + cloudStep * 0.3) * (r1 * (1 + puff));
                        let cp2x = Math.cos(a + cloudStep * 0.7) * (r2 * (1 + puff));
                        let cp2y = Math.sin(a + cloudStep * 0.7) * (r2 * (1 + puff));

                        if (flatness > 0) {
                            if (cp1y > 0) cp1y = cp1y * (1 - flatness);
                            if (cp2y > 0) cp2y = cp2y * (1 - flatness);
                        }

                        if (i === 0) cloudD += `M ${p1X} ${p1Y} `;
                        cloudD += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${nX} ${nY} `;
                    }
                    cloudD += "Z";

                    this.activeDrawingEl.setAttribute("d", cloudD);
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "cloud");
                    this.activeDrawingEl.setAttribute("data-bumps", bumps);
                    this.activeDrawingEl.setAttribute("data-puff", puff);
                    this.activeDrawingEl.setAttribute("data-irreg", irregularity);
                    this.activeDrawingEl.setAttribute("data-flat", flatness);
                    this.activeDrawingEl.setAttribute("data-cx", cx); this.activeDrawingEl.setAttribute("data-cy", cy); this.activeDrawingEl.setAttribute("data-r", r);
                } else if (type === 'drop') {
                    cx = x + w / 2;
                    cy = y + h / 2;
                    r = Math.min(w, h) / 2;
                    const circleCy = h / 2 - r;
                    const taper = 0.25;
                    const d = `
                        M ${-w / 2} ${circleCy}
                        A ${r} ${r} 0 0 0 ${w / 2} ${circleCy}
                        Q ${w / 2} ${-h / 2 + h * taper} ${0} ${-h / 2}
                        Q ${-w / 2} ${-h / 2 + h * taper} ${-w / 2} ${circleCy}
                        Z
                     `.trim();
                    this.activeDrawingEl.setAttribute("d", d);
                    this.activeDrawingEl.setAttribute("transform", `translate(${cx},${cy})`);
                    this.activeDrawingEl.setAttribute("data-shape", "drop");
                    this.activeDrawingEl.setAttribute("data-taper", taper);
                    this.activeDrawingEl.setAttribute("data-x", x); this.activeDrawingEl.setAttribute("data-y", y); this.activeDrawingEl.setAttribute("data-w", w); this.activeDrawingEl.setAttribute("data-h", h);
                }
                return;
            }

            if (this.isMarquee) {
                const x = Math.min(mouse.x, this.marqueeStart.x);
                const y = Math.min(mouse.y, this.marqueeStart.y);
                const w = Math.abs(mouse.x - this.marqueeStart.x);
                const h = Math.abs(mouse.y - this.marqueeStart.y);
                this.marqueeRect.setAttribute("x", x);
                this.marqueeRect.setAttribute("y", y);
                this.marqueeRect.setAttribute("width", w);
                this.marqueeRect.setAttribute("height", h);
            } else if (this.isResizing && this.selectedElement) {
                const dx = e.clientX - this.resizeStart.mouseX;
                const dy = e.clientY - this.resizeStart.mouseY;
                let newW = Math.max(10, this.resizeStart.w + dx);
                let newH = Math.max(10, this.resizeStart.h + dy);
                if (e.shiftKey) {
                    const ratio = this.resizeStart.w / this.resizeStart.h;
                    if (Math.abs(dx) > Math.abs(dy)) newH = newW / ratio;
                    else newW = newH * ratio;
                }
                const bbox = this.selectedElement.getBBox();
                const newScaleX = newW / bbox.width;
                const newScaleY = newH / bbox.height;
                let transform = this.selectedElement.getAttribute("transform") || "";
                let tx = 0, ty = 0;
                const matchT = transform.match(/translate\(([^,]+),([^)]+)\)/);
                if (matchT) { tx = matchT[1]; ty = matchT[2]; }
                this.selectedElement.setAttribute('transform', `translate(${tx}, ${ty}) scale(${newScaleX.toFixed(3)}, ${newScaleY.toFixed(3)})`);
                this.updateGizmo();
            } else if (this.isDragging && this.selectedElements.length > 0) {
                const dx = mouse.x - this.dragStartPos.x;
                const dy = mouse.y - this.dragStartPos.y;
                this.initialTransforms.forEach(t => {
                    const newX = t.x + dx;
                    const newY = t.y + dy;
                    let scaleStr = "";
                    const matchS = t.transformStr.match(/scale\([^)]+\)/);
                    if (matchS) scaleStr = " " + matchS[0];
                    t.el.setAttribute('transform', `translate(${newX}, ${newY})${scaleStr} `);
                });
                this.updateGizmo();
            } else if (this.isWarpDragging && this.selectedElement) {
                const dy = (e.clientY - this.dragStartY) * (this.viewBox.h / this.svg.clientHeight);
                let newBend = this.dragStartBend - Math.round(dy * 0.5);
                newBend = Math.max(-100, Math.min(100, newBend));

                const warpDataStr = this.selectedElement.getAttribute('data-warp');
                let warpData = warpDataStr ? JSON.parse(warpDataStr) : { type: 'arc', distH: 0, distV: 0 };
                warpData.bend = newBend;

                this.selectedElement.setAttribute('data-warp', JSON.stringify(warpData));
                this.applyWarp(this.selectedElement);
                VectorInspector.render(this.engine, this, this.selectedElement);
            } else if (this.isShapeBuilding) {
                // Tracking regions under cursor
                const targets = document.elementsFromPoint(e.clientX, e.clientY);
                targets.forEach(t => {
                    if (t.classList.contains('region-overlay')) {
                        const rid = t.getAttribute('data-region-id');
                        if (e.altKey) {
                            t.setAttribute('fill', 'rgba(255, 0, 0, 0.5)');
                            this.deletedRegions.add(rid);
                            this.scribbledRegions.delete(rid);
                        } else {
                            t.setAttribute('fill', 'rgba(0, 170, 255, 0.5)');
                            this.scribbledRegions.add(rid);
                            this.deletedRegions.delete(rid);
                        }
                    }
                });
                // Cursor Feedback
                this.refreshCursor();
            }
        });

        this.svg.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.svg.style.cursor = this.keys['Space'] ? 'grab' : (this.mode === 'select' ? 'default' : 'crosshair');
            }

            if (this.isDrawing && this.activeDrawingEl) {
                this.isDrawing = false;
                // If created element is too small, remove it
                const bbox = this.activeDrawingEl.getBBox();
                if (bbox.width < 2 && bbox.height < 2 && this.mode !== 'line') {
                    this.activeDrawingEl.remove();
                } else {
                    this.select(this.activeDrawingEl);
                }
                this.activeDrawingEl = null;
                // Keep tool active for multiple shapes
            }

            if (this.isMarquee) {
                this.isMarquee = false;
                this.marqueeRect.style.display = "none";
                this.selectInMarquee();
            }
            this.isDragging = false;
            this.isResizing = false;
            this.isWarpDragging = false;

            if (this.isShapeBuilding) {
                this.isShapeBuilding = false;
                this.finalizeShapeBuilder();
            }
        });

        this.svg.addEventListener('mouseleave', () => {
            this.isPanning = false;
            this.isDrawing = false;
            this.isMarquee = false;
            this.marqueeRect.style.display = "none";
            this.isDragging = false;
            this.isResizing = false;
            this.isWarpDragging = false;
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
            this.updateWarpGizmo();
        } catch (e) { console.warn(e); }
    }

    updateWarpGizmo() {
        if (!this.selectedElement || this.mode !== 'warp') {
            if (this.warpGizmo) this.warpGizmo.style.display = 'none';
            return;
        }

        const bbox = this.selectedElement.getBBox();
        const rootCTM = this.svg.getScreenCTM();
        if (!rootCTM || isNaN(bbox.x)) return;

        const invRootCTM = rootCTM.inverse();
        const elCTM = this.selectedElement.getScreenCTM();
        if (!elCTM) return;
        const matrix = invRootCTM.multiply(elCTM);

        if (!this.warpGizmo) {
            this.warpGizmo = document.createElementNS(this.svgNs, "circle");
            this.warpGizmo.setAttribute("r", "8");
            this.warpGizmo.setAttribute("fill", "#ff00ff");
            this.warpGizmo.setAttribute("stroke", "#ffffff");
            this.warpGizmo.setAttribute("stroke-width", "2");
            this.warpGizmo.style.cursor = "ns-resize";
            this.warpGizmo.setAttribute("class", "warp-handle");
            this.gizmoGroup.appendChild(this.warpGizmo);

            this.warpGizmo.onmousedown = (e) => {
                e.stopPropagation();
                this.isWarpDragging = true;
                this.dragStartY = e.clientY;
                const warpDataStr = this.selectedElement.getAttribute('data-warp');
                const warpData = warpDataStr ? JSON.parse(warpDataStr) : { bend: 50, type: 'arc', distH: 0, distV: 0 };
                this.dragStartBend = warpData.bend !== undefined ? warpData.bend : 50;
            };
        }

        this.warpGizmo.style.display = 'block';
        const pt = this.svg.createSVGPoint();
        pt.x = bbox.x + bbox.width / 2;
        pt.y = bbox.y;
        const tp = pt.matrixTransform(matrix);

        this.warpGizmo.setAttribute("cx", tp.x);
        this.warpGizmo.setAttribute("cy", tp.y);
    }

    createShape(type, props = {}) {
        let el;
        const { x = 0, y = 0, w = 1, h = 1, points } = props;
        let cx = x + w / 2;
        let cy = y + h / 2;
        let r = Math.min(w, h) / 2;

        if (type === 'rect') {
            el = document.createElementNS(this.svgNs, "rect");
            el.setAttribute("x", 0);
            el.setAttribute("y", 0);
            el.setAttribute("width", w);
            el.setAttribute("height", h);
            el.setAttribute("transform", `translate(${x},${y})`);
        } else if (type === 'circle') {
            el = document.createElementNS(this.svgNs, "ellipse");
            el.setAttribute("cx", 0);
            el.setAttribute("cy", 0);
            el.setAttribute("rx", w / 2);
            el.setAttribute("ry", h / 2);
            el.setAttribute("transform", `translate(${x + w / 2},${y + h / 2})`);
        } else if (type === 'star') {
            el = document.createElementNS(this.svgNs, "polygon");

            // Helper to generate Star points
            const makeStar = (cx, cy, r, innerR, points) => {
                let s = "";
                const step = Math.PI / points;
                // Start at top (-90deg or -PI/2)
                let angle = -Math.PI / 2;

                for (let i = 0; i < points * 2; i++) {
                    const radius = (i % 2 === 0) ? r : innerR;
                    const px = cx + Math.cos(angle) * radius;
                    const py = cy + Math.sin(angle) * radius;
                    s += `${px},${py} `;
                    angle += step;
                }
                return s.trim();
            }

            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;
            // Default: 5 points, 0.4 inner radius ratio
            const numPoints = 5;
            const innerRatio = 0.4;

            el.setAttribute("points", makeStar(0, 0, r, r * innerRatio, numPoints));
            el.setAttribute("transform", `translate(${cx},${cy})`);

            // Store metadata for Inspector
            el.setAttribute("data-shape", "star");
            el.setAttribute("data-points", numPoints);
            el.setAttribute("data-inner-radius", innerRatio);
            el.setAttribute("data-cx", cx);
            el.setAttribute("data-cy", cy);
            el.setAttribute("data-r", r);
        } else if (type === 'polygon') {
            el = document.createElementNS(this.svgNs, "polygon");

            // Helper to generate Regular Polygon points
            const makePoly = (cx, cy, r, points) => {
                let s = "";
                const step = 2 * Math.PI / points;
                // Start a bit off to make flat top/bottom or pointy? 
                // Illustrator default for Hexagon is pointy top if angle is -PI/2
                let angle = -Math.PI / 2;

                for (let i = 0; i < points; i++) {
                    const px = cx + Math.cos(angle) * r;
                    const py = cy + Math.sin(angle) * r;
                    s += `${px},${py} `;
                    angle += step;
                }
                return s.trim();
            }

            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;
            const numPoints = 6; // Default to Hexagon

            el.setAttribute("points", makePoly(0, 0, r, numPoints));
            el.setAttribute("transform", `translate(${cx},${cy})`);

            // Store metadata
            el.setAttribute("data-shape", "polygon");
            el.setAttribute("data-points", numPoints);
            el.setAttribute("data-cx", cx);
            el.setAttribute("data-cy", cy);
            el.setAttribute("data-r", r);
        } else if (type === 'gear') {
            el = document.createElementNS(this.svgNs, "path");
            const makeGear = (cx, cy, r, teeth, depth, hole) => {
                const innerR = r * (1 - depth);
                const holeR = r * hole;
                let dStr = "";
                const step = (Math.PI * 2) / teeth;
                const qStep = step / 4;

                for (let i = 0; i < teeth; i++) {
                    const a = i * step - Math.PI / 2;
                    const a1 = a;
                    const a2 = a + qStep;
                    const a3 = a + qStep * 2;
                    const a4 = a + qStep * 3;

                    const p1x = cx + Math.cos(a1) * innerR; const p1y = cy + Math.sin(a1) * innerR;
                    const p2x = cx + Math.cos(a2) * r; const p2y = cy + Math.sin(a2) * r;
                    const p3x = cx + Math.cos(a3) * r; const p3y = cy + Math.sin(a3) * r;
                    const p4x = cx + Math.cos(a4) * innerR; const p4y = cy + Math.sin(a4) * innerR;

                    if (i === 0) dStr += `M ${p1x} ${p1y} `;
                    else dStr += `L ${p1x} ${p1y} `;
                    dStr += `L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} `;
                }
                dStr += "Z";
                if (hole > 0) {
                    dStr += ` M ${cx + holeR} ${cy} A ${holeR} ${holeR} 0 1 0 ${cx - holeR} ${cy} A ${holeR} ${holeR} 0 1 0 ${cx + holeR} ${cy} Z`;
                }
                return dStr.trim();
            }
            const teeth = 8;
            const depth = 0.2;
            const hole = 0.3;
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;
            el.setAttribute("d", makeGear(0, 0, r, teeth, depth, hole));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "gear");
            el.setAttribute("data-teeth", teeth);
            el.setAttribute("data-depth", depth);
            el.setAttribute("data-hole", hole);
            el.setAttribute("data-cx", cx); el.setAttribute("data-cy", cy); el.setAttribute("data-r", r);
        } else if (type === 'arrow') {
            el = document.createElementNS(this.svgNs, "polygon");

            const makeArrow = (x, y, w, h, shaftW, headL) => {
                const cy = y + h / 2;
                const sw = h * shaftW; // Shaft Height
                const hl = w * headL;  // Head Length
                const xHead = x + w - hl;

                return `
                    ${x},${cy - sw / 2}
                    ${xHead},${cy - sw / 2}
                    ${xHead},${y}
                    ${x + w},${cy}
                    ${xHead},${y + h}
                    ${xHead},${cy + sw / 2}
                    ${x},${cy + sw / 2}
                    `.trim().replace(/\s+/g, ' ');
            }

            const shaftWidth = 0.5; // ratio of H
            const headLength = 0.4; // ratio of W

            el.setAttribute("points", makeArrow(0, -h / 2, w, h, shaftWidth, headLength));
            el.setAttribute("transform", `translate(${x},${y + h / 2})`);

            el.setAttribute("data-shape", "arrow");
            el.setAttribute("data-shaft", shaftWidth);
            el.setAttribute("data-head", headLength);

        } else if (type === 'pie') {
            el = document.createElementNS(this.svgNs, "path");

            const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
                const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
                return {
                    x: centerX + (radius * Math.cos(angleInRadians)),
                    y: centerY + (radius * Math.sin(angleInRadians))
                };
            }

            const makePie = (x, y, w, h, startAngle, endAngle, innerRatio) => {
                cx = x + w / 2;
                cy = y + h / 2;
                r = Math.min(w, h) / 2;
                const innerR = r * innerRatio;

                const start = polarToCartesian(cx, cy, r, endAngle); // SVG Arc draws positive? Clockwise: Start -> End? 
                const end = polarToCartesian(cx, cy, r, startAngle); // Swapped for correct sweep

                const startInner = polarToCartesian(cx, cy, innerR, endAngle);
                const endInner = polarToCartesian(cx, cy, innerR, startAngle);

                const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

                // Close shape logic
                // If innerR > 0: Annulus
                // M start.x start.y A r r 0 largeArc 0 end.x end.y L endInner.x endInner.y A innerR innerR 0 largeArc 1 startInner.x startInner.y Z

                let d = [
                    "M", start.x, start.y,
                    "A", r, r, 0, largeArcFlag, 0, end.x, end.y
                ];

                if (innerRatio > 0.01) {
                    d.push("L", endInner.x, endInner.y);
                    d.push("A", innerR, innerR, 0, largeArcFlag, 1, startInner.x, startInner.y);
                } else {
                    d.push("L", cx, cy);
                }

                d.push("Z");
                return d.join(" ");
            }

            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;
            const start = 0;
            const end = 270;
            const inner = 0;

            el.setAttribute("d", makePie(0, 0, w, h, start, end, inner));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "pie");
            el.setAttribute("data-start", start);
            el.setAttribute("data-end", end);
            el.setAttribute("data-inner", inner);

            // Store stable geometry frame
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;
            el.setAttribute("data-cx", cx);
            el.setAttribute("data-cy", cy);
            el.setAttribute("data-r", r);

        } else if (type === 'spiral') {
            el = document.createElementNS(this.svgNs, "path");
            // Spirals are usually stroked lines, not filled shapes, but we allow both.
            // Force strict styling if needed, but let's stick to default for now.
            // Actually, a filled spiral is weird. We might want to set fill="none" by default if possible?
            // createShape uses default style from `this.currentStyle` or inspector.
            // I'll leave it as is.

            const makeSpiral = (cx, cy, r, turns, innerRatio) => {
                const points = turns * 50; // Resolution
                const step = (Math.PI * 2 * turns) / points;
                let angle = 0;
                let path = [];
                const innerR = r * innerRatio;

                for (let i = 0; i <= points; i++) {
                    // Radius grows linearly from innerR to r
                    // progress 0 -> 1
                    const progress = i / points;
                    const currentR = innerR + (r - innerR) * progress;

                    const px = cx + Math.cos(angle) * currentR;
                    const py = cy + Math.sin(angle) * currentR;

                    path.push(`${i === 0 ? 'M' : 'L'} ${px} ${py} `);
                    angle += step;
                }
                return path.join(" ");
            }

            const turns = 3;
            const inner = 0.1;

            // Stable frame
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;

            el.setAttribute("d", makeSpiral(0, 0, r, turns, inner));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "spiral");
            el.setAttribute("data-turns", turns);
            el.setAttribute("data-inner", inner);
            el.setAttribute("data-cx", cx);
            el.setAttribute("data-cy", cy);
            el.setAttribute("data-r", r);

            // Spirals look best with stroke, fill none
            el.style.fill = "none";
            el.style.stroke = "#000000";
            el.style.strokeWidth = "2px";

        } else if (type === 'wave') {
            el = document.createElementNS(this.svgNs, "path");

            const makeWave = (x, y, w, h, freq, amp) => {
                const points = freq * 40;
                const stepX = w / points;
                const midY = y + h / 2;
                const maxAmp = h / 2 * amp;

                let d = "";
                for (let i = 0; i <= points; i++) {
                    const px = x + i * stepX;
                    // Angle goes from 0 to freq * 2PI
                    const angle = (i / points) * (freq * Math.PI * 2);
                    const py = midY + Math.sin(angle) * maxAmp;

                    d += `${i === 0 ? 'M' : 'L'} ${px} ${py} `;
                }
                return d.trim();
            }

            const freq = 3;
            const amp = 0.8;

            el.setAttribute("d", makeWave(0, -h / 2, w, h, freq, amp));
            el.setAttribute("transform", `translate(${x},${y + h / 2})`);
            el.setAttribute("data-shape", "wave");
            el.setAttribute("data-freq", freq);
            el.setAttribute("data-amp", amp);

            // Stable frame (Box)
            el.setAttribute("data-x", x);
            el.setAttribute("data-y", y);
            el.setAttribute("data-w", w);
            el.setAttribute("data-h", h);

            el.style.fill = "none";
            el.style.stroke = "#000000";
            el.style.strokeWidth = "2px";

        } else if (type === 'grid') {
            el = document.createElementNS(this.svgNs, "path");

            const makeGrid = (x, y, w, h, rows, cols) => {
                let d = "";
                // Horizontal Lines
                const stepY = h / rows;
                for (let i = 0; i <= rows; i++) {
                    const py = y + i * stepY;
                    d += `M ${x} ${py} L ${x + w} ${py} `;
                }
                // Vertical Lines
                const stepX = w / cols;
                for (let i = 0; i <= cols; i++) {
                    const px = x + i * stepX;
                    d += `M ${px} ${y} L ${px} ${y + h} `;
                }
                return d.trim();
            }

            const rows = 5;
            const cols = 5;

            el.setAttribute("d", makeGrid(0, 0, w, h, rows, cols));
            el.setAttribute("transform", `translate(${x},${y})`);
            el.setAttribute("data-shape", "grid");
            el.setAttribute("data-rows", rows);
            el.setAttribute("data-cols", cols);

            // Stable frame (Box)
            el.setAttribute("data-x", x);
            el.setAttribute("data-y", y);
            el.setAttribute("data-w", w);
            el.setAttribute("data-h", h);

            el.style.fill = "none";
            el.style.stroke = "#000000";
            el.style.strokeWidth = "1px";

        } else if (type === 'flower') {
            el = document.createElementNS(this.svgNs, "path");

            const makeFlower = (cx, cy, r, petals, roundness) => {
                let dStr = "";
                const step = (Math.PI * 2) / petals;
                for (let i = 0; i < petals; i++) {
                    const a = i * step;
                    const nextA = (i + 1) * step;
                    const pX = cx + Math.cos(a) * r;
                    const pY = cy + Math.sin(a) * r;
                    const nextX = cx + Math.cos(nextA) * r;
                    const nextY = cy + Math.sin(nextA) * r;

                    // Bezier points for petals
                    const cp1x = cx + Math.cos(a + step * 0.3) * (r * (1 + roundness));
                    const cp1y = cy + Math.sin(a + step * 0.3) * (r * (1 + roundness));
                    const cp2x = cx + Math.cos(a + step * 0.7) * (r * (1 + roundness));
                    const cp2y = cy + Math.sin(a + step * 0.7) * (r * (1 + roundness));

                    if (i === 0) dStr += `M ${pX} ${pY} `;
                    dStr += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${nextX} ${nextY} `;
                }
                dStr += "Z";
                return dStr;
            }

            const petals = 5;
            const roundness = 0.6; // Default bloated

            // Stable frame
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;

            el.setAttribute("d", makeFlower(0, 0, r, petals, roundness));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "flower");
            el.setAttribute("data-petals", petals);
            el.setAttribute("data-round", roundness);
            el.setAttribute("data-cx", cx); el.setAttribute("data-cy", cy); el.setAttribute("data-r", r);

        } else if (type === 'cross') {
            el = document.createElementNS(this.svgNs, "polygon");

            const makeCross = (cx, cy, r, arms, thickness) => {
                let points = [];
                const step = (Math.PI * 2) / arms;
                const halfThick = (Math.PI * 2 * thickness) / (arms * 2); // Angular width/2

                // Actual inner radius to make straight lines? 
                // Let's use simple logic: Outer Tip (r), Inner Corner (innerR)
                // Inner Radius derived to make "Plus" look right?
                // Let's just use a param `depth` or just simple r/3.
                // Better: Use `thickness` as the ratio of Arm Width vs R.

                // For a straight-armed cross, the inner radius depends on thickness.
                // r_inner = r * sin(half_angle) / sin(PI/arms + ...) ? Too complex.
                // Simple approx: innerR = r * 0.4
                const innerR = r * 0.4;

                for (let i = 0; i < arms; i++) {
                    const angle = i * step - (Math.PI / 2); // Start at top

                    // Two tip points? Or one tip point? 
                    // Standard Cross has square ends. 
                    // So: TopRight, TopLeft corners of the arm.

                    // Angular width of arm?
                    // Let's say arm is X pixels wide.
                    // It's easier to do this with "width" in Cartesian if rotation is fixed.
                    // But for radial N-arms, we need angular logic.
                    // Let's create "Spokes".

                    const angleA = angle - 0.2; // Width param
                    const angleB = angle + 0.2;

                    // Better:
                    const wAngle = (Math.PI / arms) * thickness;

                    const p1x = cx + Math.cos(angle - wAngle) * r;
                    const p1y = cy + Math.sin(angle - wAngle) * r;
                    const p2x = cx + Math.cos(angle + wAngle) * r;
                    const p2y = cy + Math.sin(angle + wAngle) * r;

                    // Inner valley
                    const nextAngle = (i + 1) * step - (Math.PI / 2);
                    const valleyAngle = (angle + nextAngle) / 2;
                    const pInnerX = cx + Math.cos(valleyAngle) * innerR;
                    const pInnerY = cy + Math.sin(valleyAngle) * innerR;

                    points.push(`${p1x},${p1y} ${p2x},${p2y} ${pInnerX},${pInnerY} `);
                }
                return points.join(" ");
            }

            const arms = 4;
            const thickness = 0.4;

            // Stable frame
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;

            el.setAttribute("points", makeCross(0, 0, r, arms, thickness));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "cross");
            el.setAttribute("data-arms", arms);
            el.setAttribute("data-thick", thickness);
            el.setAttribute("data-cx", cx);
            el.setAttribute("data-cy", cy);
            el.setAttribute("data-r", r);

        } else if (type === 'crescent') {
            el = document.createElementNS(this.svgNs, "path");

            const makeCrescent = (cx, cy, r, thickness, style = 'phases') => {
                if (style === 'phases') {
                    const rx = r * Math.abs(thickness);
                    const sweep = thickness < 0 ? 0 : 1;
                    return `M ${cx} ${cy - r} 
                            A ${r} ${r} 0 0 1 ${cx} ${cy + r} 
                            A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`.trim();
                } else {
                    // Solar/Eclipse Style: Intersection of two circles
                    // thickness mapped -1..1 -> 0..1 (Coverage)
                    const coverage = (thickness + 1) / 2;
                    const dist = 2 * r * (1 - coverage);
                    if (dist >= 1.99 * r) {
                        return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
                    }
                    if (dist <= 0.01 * r) return "";

                    const intersectX = dist / 2;
                    const intersectY = Math.sqrt(r * r - intersectX * intersectX);

                    // Outer arc (long way) + Inner arc (short way)
                    return `M ${cx + intersectX} ${cy - intersectY} 
                    A ${r} ${r} 0 1 1 ${cx + intersectX} ${cy + intersectY} 
                    A ${r} ${r} 0 0 0 ${cx + intersectX} ${cy - intersectY} Z`.trim();
                }
            }

            const thickness = 0; // Half moon
            const style = 'phases';
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;

            el.setAttribute("d", makeCrescent(0, 0, r, thickness, style));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "crescent");
            el.setAttribute("data-thickness", thickness);
            el.setAttribute("data-style", style);

            // Stable frame
            el.setAttribute("data-cx", cx); el.setAttribute("data-cy", cy); el.setAttribute("data-r", r);

        } else if (type === 'heart') {
            el = document.createElementNS(this.svgNs, "path");

            const makeHeart = (x, y, w, h, depth) => {
                const topY = y + h * depth;
                const bottomY = y + h;
                const midX = x + w / 2;

                return `
                    M ${midX} ${topY}
                    C ${midX} ${y} ${x} ${y} ${x} ${topY}
                    C ${x} ${y + h * (depth + 0.3)} ${midX} ${y + h * 0.9} ${midX} ${bottomY}
                    C ${midX} ${y + h * 0.9} ${x + w} ${y + h * (depth + 0.3)} ${x + w} ${topY}
                    C ${x + w} ${y} ${midX} ${y} ${midX} ${topY}
                    `.trim();
            }

            const depth = 0.3; // Default 30% down
            cx = x + w / 2;
            cy = y + h / 2;
            el.setAttribute("d", makeHeart(-w / 2, -h / 2, w, h, depth));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "heart");
            el.setAttribute("data-depth", depth);
            // Stable frame
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;
            el.setAttribute("data-cx", cx); el.setAttribute("data-cy", cy); el.setAttribute("data-r", r);

        } else if (type === 'blob') {
            el = document.createElementNS(this.svgNs, "path");

            const makeBlob = (cx, cy, r, complexity, contrast, seed) => {
                const random = (s) => (Math.sin(s) * 10000) - Math.floor(Math.sin(s) * 10000);

                let points = [];
                const step = (Math.PI * 2) / complexity;
                for (let i = 0; i < complexity; i++) {
                    const angle = i * step;
                    const rnd = random(seed + i);
                    const varR = r * (1 - (contrast * 0.5) + (rnd * contrast));
                    points.push({
                        x: cx + Math.cos(angle) * varR,
                        y: cy + Math.sin(angle) * varR
                    });
                }

                const len = points.length;
                let d = `M ${points[0].x} ${points[0].y} `;

                for (let i = 0; i < len; i++) {
                    const p0 = points[(i - 1 + len) % len];
                    const p1 = points[i];
                    const p2 = points[(i + 1) % len];
                    const p3 = points[(i + 2) % len];

                    const cp1x = p1.x + (p2.x - p0.x) * 0.15;
                    const cp1y = p1.y + (p2.y - p0.y) * 0.15;
                    const cp2x = p2.x - (p3.x - p1.x) * 0.15;
                    const cp2y = p2.y - (p3.y - p1.y) * 0.15;

                    d += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y} `;
                }
                return d;
            }

            const complexity = 7;
            const contrast = 0.3;
            const seed = Math.floor(Math.random() * 1000);

            // Stable frame
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;

            el.setAttribute("d", makeBlob(0, 0, r, complexity, contrast, seed));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "blob");
            el.setAttribute("data-complex", complexity);
            el.setAttribute("data-contrast", contrast);
            el.setAttribute("data-seed", seed);
            el.setAttribute("data-cx", cx); el.setAttribute("data-cy", cy); el.setAttribute("data-r", r);

        } else if (type === 'bubble') {
            el = document.createElementNS(this.svgNs, "path");

            const makeBubble = (x, y, w, h, tailX) => {
                const r = 10;
                const boxH = h * 0.8;
                const tailTipX = x + w * tailX + (w > 20 ? 10 : 0);
                const tailBaseX = x + w * tailX;

                return `
                    M ${x + r} ${y} 
                    H ${x + w - r} 
                    Q ${x + w} ${y} ${x + w} ${y + r} 
                    V ${y + boxH - r} 
                    Q ${x + w} ${y + boxH} ${x + w - r} ${y + boxH}
                    H ${tailBaseX + 20} 
                    L ${tailTipX} ${y + h}
                    L ${tailBaseX} ${y + boxH}
                    H ${x + r}
                    Q ${x} ${y + boxH} ${x} ${y + boxH - r}
                    V ${y + r}
                    Q ${x} ${y} ${x + r} ${y}
                    Z
                 `.trim();
            }

            const tailX = 0.7; // 70% across
            el.setAttribute("d", makeBubble(0, 0, w, h, tailX));
            el.setAttribute("transform", `translate(${x},${y})`);
            el.setAttribute("data-shape", "bubble");
            el.setAttribute("data-tail", tailX);
            // Stable frame
            el.setAttribute("data-x", x); el.setAttribute("data-y", y); el.setAttribute("data-w", w); el.setAttribute("data-h", h);

        } else if (type === 'shield') {
            el = document.createElementNS(this.svgNs, "path");
            const makeShield = (x, y, w, h, shoulder, crest, curve) => {
                const crestY = -h / 2 + h * crest;
                const sideY = -h / 2 + h * shoulder;
                // Curve controls bottom corner sharpness: 0=sharp corners, 1=smooth rounded
                if (curve < 0.01) {
                    // Sharp corners - direct lines
                    return `M 0 ${crestY} L ${-w / 2} ${-h / 2} V ${sideY} L 0 ${h / 2} L ${w / 2} ${sideY} V ${-h / 2} Z`.trim();
                } else {
                    // Smooth corners - quadratic curves
                    const cpDist = curve * (h / 2 - sideY) * 0.8; // Control point distance from corner
                    return `M 0 ${crestY} L ${-w / 2} ${-h / 2} V ${sideY} Q ${-w / 2} ${sideY + cpDist} 0 ${h / 2} Q ${w / 2} ${sideY + cpDist} ${w / 2} ${sideY} V ${-h / 2} Z`.trim();
                }
            }
            const shoulder = 0.5;
            const crest = 0.15;
            const curve = 1.0;
            cx = x + w / 2;
            cy = y + h / 2;
            el.setAttribute("d", makeShield(0, 0, w, h, shoulder, crest, curve));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "shield");
            el.setAttribute("data-shoulder", shoulder);
            el.setAttribute("data-crest", crest);
            el.setAttribute("data-curve", curve);
            el.setAttribute("data-x", x); el.setAttribute("data-y", y); el.setAttribute("data-w", w); el.setAttribute("data-h", h);

        } else if (type === 'cloud') {
            el = document.createElementNS(this.svgNs, "path");
            const makeCloud = (cx, cy, r, bumps, puff, irregularity = 0, flatness = 0) => {
                let dStr = "";
                const step = (Math.PI * 2) / bumps;
                const seed = 123; // Fixed seed for stability per element

                const random = (s) => {
                    const x = Math.sin(s) * 10000;
                    return x - Math.floor(x);
                }

                for (let i = 0; i < bumps; i++) {
                    const a = i * step;
                    const nextA = (i + 1) * step;

                    // Simple irregularity
                    const r1 = r * (1 + (random(i + seed) - 0.5) * irregularity);
                    const r2 = r * (1 + (random(i + 1 + seed) - 0.5) * irregularity);

                    let pX = cx + Math.cos(a) * r1;
                    let pY = cy + Math.sin(a) * r1;
                    let nextX = cx + Math.cos(nextA) * r2;
                    let nextY = cy + Math.sin(nextA) * r2;

                    // Flatness check (if y is in the bottom half, pull it up)
                    if (flatness > 0) {
                        const bottomY = cy + r;
                        if (pY > cy) pY = pY + (cy + r * 0.2 - pY) * flatness;
                        if (nextY > cy) nextY = nextY + (cy + r * 0.2 - nextY) * flatness;
                    }

                    const cp1x = cx + Math.cos(a + step * 0.3) * (r1 * (1 + puff));
                    let cp1y = cy + Math.sin(a + step * 0.3) * (r1 * (1 + puff));
                    const cp2x = cx + Math.cos(a + step * 0.7) * (r2 * (1 + puff));
                    let cp2y = cy + Math.sin(a + step * 0.7) * (r2 * (1 + puff));

                    if (flatness > 0) {
                        if (cp1y > cy) cp1y = cp1y + (cy + r * 0.2 - cp1y) * flatness;
                        if (cp2y > cy) cp2y = cp2y + (cy + r * 0.2 - cp2y) * flatness;
                    }

                    if (i === 0) dStr += `M ${pX} ${pY} `;
                    dStr += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${nextX} ${nextY} `;
                }
                dStr += "Z";
                return dStr;
            }
            const bumps = 6;
            const puff = 0.5;
            cx = x + w / 2;
            cy = y + h / 2;
            r = Math.min(w, h) / 2;
            el.setAttribute("d", makeCloud(0, 0, r, bumps, puff, 0.2, 0.5));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "cloud");
            el.setAttribute("data-bumps", bumps);
            el.setAttribute("data-puff", puff);
            el.setAttribute("data-irreg", 0.2);
            el.setAttribute("data-flat", 0.5);
            el.setAttribute("data-cx", cx); el.setAttribute("data-cy", cy); el.setAttribute("data-r", r);

        } else if (type === 'drop') {
            el = document.createElementNS(this.svgNs, "path");
            const makeDrop = (x, y, w, h, taper) => {
                const r = Math.min(w, h) / 2;
                const circleCy = h / 2 - r;
                return `
                    M ${- w / 2} ${circleCy}
                    A ${r} ${r} 0 0 0 ${w / 2} ${circleCy}
                    Q ${w / 2} ${-h / 2 + h * taper} ${0} ${-h / 2}
                    Q ${- w / 2} ${-h / 2 + h * taper} ${- w / 2} ${circleCy}
                    Z
                 `.trim();
            }
            const taper = 0.25;
            cx = x + w / 2;
            cy = y + h / 2;
            el.setAttribute("d", makeDrop(0, 0, w, h, taper));
            el.setAttribute("transform", `translate(${cx},${cy})`);
            el.setAttribute("data-shape", "drop");
            el.setAttribute("data-taper", taper);
            el.setAttribute("data-x", x); el.setAttribute("data-y", y); el.setAttribute("data-w", w); el.setAttribute("data-h", h);

        } else if (type === 'line') {
            el = document.createElementNS(this.svgNs, "line");
            el.setAttribute("x1", 0);
            el.setAttribute("y1", 0);
            el.setAttribute("x2", w);
            el.setAttribute("y2", h);
            el.setAttribute("transform", `translate(${x},${y})`);
            el.setAttribute("stroke-width", "2"); // Visible line
        } else if (type === 'text') {
            el = document.createElementNS(this.svgNs, "text");
            el.setAttribute("x", "0");
            el.setAttribute("y", "0");
            el.setAttribute("transform", `translate(${x},${y})`);
            el.setAttribute("dominant-baseline", "hanging");
            el.textContent = "Text";
            el.setAttribute("fill", "#ffffff");
            el.setAttribute("font-family", "Arial");
            el.setAttribute("font-size", "24");
        }

        if (el) {
            el.setAttribute("fill", type === 'line' ? 'none' : "#00ff88");
            el.setAttribute("stroke", "#000000");
            el.setAttribute("stroke-width", "1");
            if (!el.getAttribute("transform")) {
                el.setAttribute("transform", "translate(0,0)");
            }
            el.setAttribute("data-id", type + "_" + Date.now().toString().slice(-4));
            el.setAttribute("data-physics", "static");
            el.style.cursor = "move";
        }
        return el;
    }


    setMode(mode) {
        this.mode = mode;
        this.refreshCursor();
    }

    refreshCursor() {
        if (this.keys['Space']) {
            this.svg.style.cursor = this.isPanning ? 'grabbing' : 'grab';
            return;
        }

        if (this.mode === 'shape_builder') {
            const isMinus = this.keys['AltLeft'] || this.keys['AltRight'] || this.keys['Alt'];
            const color = isMinus ? '%23ff4444' : '%2300aaff';
            const sign = isMinus ? '%3Cpath d="M11 16h10" stroke="white" stroke-width="3" stroke-linecap="round"/%3E' : '%3Cpath d="M16 11v10M11 16h10" stroke="white" stroke-width="3" stroke-linecap="round"/%3E';

            // Professional SVG Cursor with shadow and clear sign
            const svg = `%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Cpath d="M16 4 C22.627 4 28 9.373 28 16 C28 22.627 22.627 28 16 28 C9.373 28 4 22.627 4 16 C4 9.373 9.373 4 16 4 Z" fill="${color}" stroke="white" stroke-width="2" /%3E${sign}%3C/svg%3E`;

            this.svg.style.cursor = `url('data:image/svg+xml;utf8,${svg}') 16 16, crosshair`;
            return;
        }

        this.svg.style.cursor = this.mode === 'select' ? 'default' : 'crosshair';
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

    applyWarp(el) {
        if (!el) return null;

        let target = el;

        // 1. Convert basic shapes to paths if needed
        if (el.tagName !== 'path' && el.tagName !== 'g') {
            let d = "";
            if (el.tagName === 'rect') {
                const x = parseFloat(el.getAttribute('x')) || 0;
                const y = parseFloat(el.getAttribute('y')) || 0;
                const w = parseFloat(el.getAttribute('width')) || 0;
                const h = parseFloat(el.getAttribute('height')) || 0;
                d = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
            } else if (el.tagName === 'circle' || el.tagName === 'ellipse') {
                const cx = parseFloat(el.getAttribute('cx')) || 0;
                const cy = parseFloat(el.getAttribute('cy')) || 0;
                const rx = parseFloat(el.getAttribute('rx')) || parseFloat(el.getAttribute('r')) || 0;
                const ry = parseFloat(el.getAttribute('ry')) || parseFloat(el.getAttribute('r')) || 0;
                const k = 0.552284749831;
                d = `M ${cx} ${cy - ry} C ${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy} C ${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry} ${cx} ${cy + ry} C ${cx - rx * k} ${cy + ry} ${cx - rx} ${cy + ry * k} ${cx - rx} ${cy} C ${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry} Z`;
            } else if (el.tagName === 'line') {
                const x1 = parseFloat(el.getAttribute('x1')) || 0;
                const y1 = parseFloat(el.getAttribute('y1')) || 0;
                const x2 = parseFloat(el.getAttribute('x2')) || 0;
                const y2 = parseFloat(el.getAttribute('y2')) || 0;
                d = `M ${x1} ${y1} L ${x2} ${y2}`;
            } else if (el.tagName === 'polygon' || el.tagName === 'polyline') {
                const pts = el.getAttribute('points');
                if (pts) d = "M " + pts.replace(/,/g, ' ') + (el.tagName === 'polygon' ? " Z" : "");
            }

            if (d) {
                const path = document.createElementNS(this.svgNs, "path");
                // Copy all attributes
                for (let attr of el.attributes) {
                    if (['x', 'y', 'width', 'height', 'cx', 'cy', 'rx', 'ry', 'r', 'x1', 'y1', 'x2', 'y2', 'points'].includes(attr.name)) continue;
                    path.setAttribute(attr.name, attr.value);
                }
                path.setAttribute('d', d);
                path.setAttribute('data-orig-d', d);
                el.parentNode.replaceChild(path, el);

                // Update selection
                if (this.selectedElement === el) this.selectedElement = path;
                this.selectedElements = this.selectedElements.map(e => e === el ? path : e);
                target = path;
            }
        }

        // 2. Storage
        let origD = target.getAttribute('data-orig-d');
        if (!origD) {
            origD = target.getAttribute('d');
            if (origD) target.setAttribute('data-orig-d', origD);
        }

        if (!origD) return target;

        const warpDataStr = target.getAttribute('data-warp');
        if (!warpDataStr) return target;
        const settings = JSON.parse(warpDataStr);

        if (settings.type === 'none') {
            target.setAttribute('d', origD);
            this.updateGizmo();
            return target;
        }

        // 3. Apply Math
        const bbox = target.getBBox();
        const warpedD = WarpEngine.apply(origD, bbox, settings);
        target.setAttribute('d', warpedD);

        this.updateGizmo();
        return target;
    }

    booleanOperation(op) {
        if (this.selectedElements.length < 2) return;

        // Convert everything to path data and extract matrices
        const pathObjects = this.selectedElements.map(el => {
            let d = "";
            if (el.tagName === 'path') {
                d = el.getAttribute('d') || "";
            } else {
                // Convert primitives to paths
                const bbox = el.getBBox();
                if (el.tagName === 'rect') {
                    const x = bbox.x, y = bbox.y, w = bbox.width, h = bbox.height;
                    const rx = parseFloat(el.getAttribute('rx')) || 0;
                    if (rx > 0) {
                        d = `M ${x + rx} ${y} H ${x + w - rx} Q ${x + w} ${y} ${x + w} ${y + rx} V ${y + h - rx} Q ${x + w} ${y + h} ${x + w - rx} ${y + h} H ${x + rx} Q ${x} ${y + h} ${x} ${y + h - rx} V ${y + rx} Q ${x} ${y} ${x + rx} ${y} Z`;
                    } else {
                        d = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
                    }
                } else if (el.tagName === 'circle' || el.tagName === 'ellipse') {
                    const cx = (el.tagName === 'circle' ? parseFloat(el.getAttribute('cx')) : bbox.x + bbox.width / 2) || 0;
                    const cy = (el.tagName === 'circle' ? parseFloat(el.getAttribute('cy')) : bbox.y + bbox.height / 2) || 0;
                    const rx = (el.tagName === 'circle' ? parseFloat(el.getAttribute('r')) : bbox.width / 2) || 0;
                    const ry = (el.tagName === 'circle' ? rx : bbox.height / 2) || 0;
                    d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
                }
            }

            // Get transformation matrix relative to the workspace SVG
            // Element CTM - Workspace SVG CTM
            const matrix = el.getCTM();
            return { d, matrix };
        }).filter(obj => obj.d !== "");

        if (pathObjects.length < 2) return;

        const resultPath = BooleanEngine.perform(pathObjects, op);
        if (!resultPath) return;

        // Create new element
        const newEl = document.createElementNS(this.svgNs, "path");

        // Handle Parent Transformation
        // The resultPath is in ROOT SVG coordinates. If parent has a transform, we must account for it.
        const parent = this.selectedElements[0].parentNode;
        const parentMatrix = (parent && parent.getCTM) ? parent.getCTM() : null;

        if (parentMatrix) {
            const inv = parentMatrix.inverse();
            // Discretize for inverse transform (cleanest way to apply complex inverse matrix to path data)
            const globalPoly = BooleanEngine.pathToPolygon(resultPath, null);
            const localPoly = globalPoly.map(p => ({
                x: p.x * inv.a + p.y * inv.c + inv.e,
                y: p.x * inv.b + p.y * inv.d + inv.f
            }));
            newEl.setAttribute("d", BooleanEngine.polygonToPath(localPoly));
        } else {
            newEl.setAttribute("d", resultPath);
        }

        newEl.setAttribute("fill", this.selectedElements[0].getAttribute("fill") || "#00ff88");
        newEl.setAttribute("stroke", this.selectedElements[0].getAttribute("stroke") || "#000000");
        newEl.setAttribute("stroke-width", this.selectedElements[0].getAttribute("stroke-width") || "1");
        newEl.setAttribute("data-id", "path_" + Date.now().toString().slice(-4));

        parent.insertBefore(newEl, this.selectedElements[0]);
        this.selectedElements.forEach(el => el.remove());

        this.select(newEl);
    }

    updateShapeBuilderOverlay() {
        if (this.regionOverlayGroup) this.regionOverlayGroup.remove();

        this.regionOverlayGroup = document.createElementNS(this.svgNs, "g");
        this.regionOverlayGroup.setAttribute("class", "shape-builder-overlay");
        this.svg.appendChild(this.regionOverlayGroup);

        // Get all selected paths for region detection
        const paths = this.selectedElements.map(el => el.getAttribute('d') || "");

        // Use BooleanEngine to get sub-regions
        const regions = BooleanEngine.getRegions(this.selectedElements);

        regions.forEach((r, idx) => {
            const path = document.createElementNS(this.svgNs, "path");
            path.setAttribute("d", r.d);
            path.setAttribute("fill", "rgba(0, 170, 255, 0.1)");
            path.setAttribute("stroke", "#00aaff");
            path.setAttribute("stroke-width", "0.5");
            path.setAttribute("class", "region-overlay");
            path.setAttribute("data-region-id", idx);
            path.style.cursor = "pointer";
            this.regionOverlayGroup.appendChild(path);
        });
    }

    finalizeShapeBuilder() {
        if (this.scribbledRegions.size === 0 && this.deletedRegions.size === 0) {
            if (this.regionOverlayGroup) this.regionOverlayGroup.remove();
            this.isShapeBuilding = false;
            this.refreshCursor();
            return;
        }

        try {
            const allRegions = BooleanEngine.getRegions(this.selectedElements);
            const scribbledIdx = new Set(Array.from(this.scribbledRegions).map(idx => parseInt(idx)));
            const deletedIdx = new Set(Array.from(this.deletedRegions).map(idx => parseInt(idx)));
            const scribbledRegions = Array.from(scribbledIdx).map(idx => allRegions[idx]).filter(r => r);

            const newElements = [];
            const sourceElements = [...this.selectedElements];
            const firstParent = sourceElements[0].parentNode;

            // 1. Create Merged Path (Union of ALL scribbled regions)
            let mergeEl = null;
            if (scribbledRegions.length > 0) {
                const mergedPath = BooleanEngine.perform(scribbledRegions.map(r => r.d), 'union');
                if (mergedPath && mergedPath.trim() !== "" && mergedPath !== "M 0 0 Z") {
                    mergeEl = document.createElementNS(this.svgNs, "path");

                    // Bake merged path to parent space
                    const pMat = firstParent.getCTM ? firstParent.getCTM() : null;
                    if (pMat) {
                        const inv = pMat.inverse();
                        const gPoly = BooleanEngine.pathToPolygon(mergedPath, null);

                        // Filter out tiny shrapnel in merge
                        if (BooleanEngine.getPolygonArea(gPoly) < 5) {
                            mergeEl = null;
                        } else {
                            const lPoly = gPoly.map(p => ({
                                x: p.x * inv.a + p.y * inv.c + inv.e,
                                y: p.x * inv.b + p.y * inv.d + inv.f
                            }));
                            mergeEl.setAttribute("d", BooleanEngine.polygonToPath(lPoly));
                        }
                    } else {
                        mergeEl.setAttribute("d", mergedPath);
                    }

                    // Styles from first source
                    mergeEl.setAttribute("fill", sourceElements[0].getAttribute("fill") || "#00aaff");
                    mergeEl.setAttribute("stroke", sourceElements[0].getAttribute("stroke") || "#000000");
                    mergeEl.setAttribute("stroke-width", sourceElements[0].getAttribute("stroke-width") || "1");
                    mergeEl.setAttribute("data-id", "path_" + Date.now().toString().slice(-4));

                    firstParent.appendChild(mergeEl);
                    newElements.push(mergeEl);
                }
            }

            // 2. Rebuild Residues (Survivors) for each source element
            sourceElements.forEach((el) => {
                // Find regions that belong to this element and are NOT scribbled or deleted
                const survivorRegions = allRegions.filter((r, rIdx) => {
                    const isOwner = r.parents.includes(el);
                    return isOwner && !scribbledIdx.has(rIdx) && !deletedIdx.has(rIdx);
                });

                if (survivorRegions.length > 0) {
                    const residualPath = BooleanEngine.perform(survivorRegions.map(r => r.d), 'union');
                    if (residualPath && residualPath.trim() !== "" && residualPath !== "M 0 0 Z") {
                        const resEl = document.createElementNS(this.svgNs, "path");

                        // Copy stylistic attributes
                        const attrs = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray'];
                        attrs.forEach(attr => { if (el.getAttribute(attr)) resEl.setAttribute(attr, el.getAttribute(attr)); });
                        resEl.setAttribute("data-id", el.getAttribute("data-id") || ("path_" + Date.now().toString().slice(-4)));

                        const pMat = el.parentNode.getCTM ? el.parentNode.getCTM() : null;
                        if (pMat) {
                            const inv = pMat.inverse();
                            const gPoly = BooleanEngine.pathToPolygon(residualPath, null);

                            // Filter tiny shrapnel fragments
                            if (BooleanEngine.getPolygonArea(gPoly) < 5) {
                                // Skip this residue
                                return;
                            }

                            const lPoly = gPoly.map(p => ({
                                x: p.x * inv.a + p.y * inv.c + inv.e,
                                y: p.x * inv.b + p.y * inv.d + inv.f
                            }));
                            resEl.setAttribute("d", BooleanEngine.polygonToPath(lPoly));
                        } else {
                            resEl.setAttribute("d", residualPath);
                        }

                        el.parentNode.insertBefore(resEl, el);
                        newElements.push(resEl);
                    }
                }
                el.remove();
            });

            // Cleanup
            if (this.regionOverlayGroup) this.regionOverlayGroup.remove();
            this.regionOverlayGroup = null;
            this.scribbledRegions.clear();
            this.deletedRegions.clear();
            this.isShapeBuilding = false;
            this.refreshCursor();

            if (newElements.length > 0) {
                this.selectedElements = newElements;
                this.selectedElement = newElements[newElements.length - 1];
                this.updateGizmo();
            } else {
                this.deselect();
            }

        } catch (e) {
            console.error("Shape Builder Finalize Error:", e);
            if (this.regionOverlayGroup) this.regionOverlayGroup.remove();
            this.isShapeBuilding = false;
            this.refreshCursor();
        }
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
                    let d = `M ${coords[0]} ${coords[1]} `;
                    for (let i = 2; i < coords.length; i += 2) {
                        const x = coords[i];
                        const y = coords[i + 1] !== undefined ? coords[i + 1] : coords[i];
                        d += ` L ${x} ${y} `;
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
        alert(`Imported Vector File(${w}x${h})`);
    }

    sendToOviState() {
        console.log("Sending to OviState...");
        const objects = [];

        // Helper to convert SVG Element to OviState JSON Object (Recursive)
        const processElement = (el, parentTransform = { x: 0, y: 0, rotation: 0, scale: 1 }) => {
            if (el === this.gizmoGroup || el === this.marqueeRect) return;
            if (el.tagName === 'defs') return;
            if (el.style.display === 'none') return;

            // Handle Groups Recursively
            if (el.tagName === 'g') {
                // Extract group transform
                let gTx = 0, gTy = 0, gRot = 0, gScale = 1;
                const transform = el.getAttribute("transform");
                if (transform) {
                    const translateMatch = transform.match(/translate\(([^,]+)(?:,([^)]+))?\)/);
                    if (translateMatch) {
                        gTx = parseFloat(translateMatch[1]) || 0;
                        gTy = parseFloat(translateMatch[2]) || 0;
                    }
                    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
                    if (rotateMatch) {
                        gRot = parseFloat(rotateMatch[1]) || 0;
                    }
                    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
                    if (scaleMatch) {
                        gScale = parseFloat(scaleMatch[1]) || 1;
                    }
                }

                // Accumulate Transform
                // Simplified accumulation (stacking translate/rotation roughly)
                // Note: True matrix multiplication is better but overkill for this simple 2D editor context?
                // Let's stick to basic accumulation for now.
                const accumulatedTransform = {
                    x: parentTransform.x + gTx, // Rough approximation, ignores parent rotation effect on child translate
                    y: parentTransform.y + gTy,
                    rotation: parentTransform.rotation + gRot,
                    scale: parentTransform.scale * gScale
                };

                // Recurse children
                Array.from(el.children).forEach(child => processElement(child, accumulatedTransform));
                return;
            }

            const bbox = el.getBBox();
            if (bbox.width === 0 && bbox.height === 0 && el.tagName !== 'text') return;

            // Get Local Transforms
            let tx = 0, ty = 0;
            let rotation = 0;
            const transform = el.getAttribute("transform");
            if (transform) {
                const translateMatch = transform.match(/translate\(([^,]+)(?:,([^)]+))?\)/);
                if (translateMatch) {
                    tx = parseFloat(translateMatch[1]) || 0;
                    ty = parseFloat(translateMatch[2]) || 0;
                }
                const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
                if (rotateMatch) {
                    rotation = parseFloat(rotateMatch[1]) || 0;
                }
            }

            // Total Transform (Parent + Local)
            // Note: Parent Translate should be applied logic.
            // For now, simple addition is a fallback.
            // A more robust way: use getCTM()? But that gives screen coordinates? No, getCTM is root relative.
            // YES! el.getCTM() gives the full transform matrix relative to the SVG root!
            // We can resolve position from CTM directly!

            let finalX = 0;
            let finalY = 0;
            let finalRotation = 0;

            try {
                const ctm = el.getCTM();
                // Extract SRT from Matrix
                // Position (e, f) is the translation
                // But wait, BBox is pre-transform geometry.
                // Center of BBox in LOcal space:
                const localCx = bbox.x + bbox.width / 2;
                const localCy = bbox.y + bbox.height / 2;

                // Transform the Local Center by the CTM to get Global Center
                const p = this.svg.createSVGPoint();
                p.x = localCx;
                p.y = localCy;
                const globalP = p.matrixTransform(ctm);

                finalX = globalP.x;
                finalY = globalP.y;

                // Extract Scale/Rotation?
                // ScaleX = sqrt(a*a + b*b)
                // Rotation = atan2(b, a)
                const sx = Math.sqrt(ctm.a * ctm.a + ctm.b * ctm.b);
                finalRotation = Math.atan2(ctm.b, ctm.a) * (180 / Math.PI);

                // For OviState compatibility, we pass rotation and center
            } catch (e) {
                // Fallback if CTM fails (e.g. not in DOM?)
                finalX = tx + parentTransform.x + (bbox.x + bbox.width / 2); // Very rough
                finalY = ty + parentTransform.y + (bbox.y + bbox.height / 2);
            }

            // OviState Logic: Render Offset baking
            // Since finalX/Y is the global center, we need to bake the local offset (-localCx, -localCy)
            const localCx = bbox.x + bbox.width / 2;
            const localCy = bbox.y + bbox.height / 2;
            const renderOffset = { x: 0, y: 0 };
            const dx = -localCx;
            const dy = -localCy;

            const obj = {
                id: el.getAttribute('data-id') || (el.tagName + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000)),
                type: el.tagName === 'text' ? 'text' : 'vector_path',
                x: finalX,
                y: finalY,
                width: bbox.width,
                height: bbox.height,
                rotation: finalRotation,
                scale: 1, // Scale is baked into CTM usually or applied via matrix? 
                // Wait, if we use path data, scale is intrinsic.
                // OviState assumes scale=1 unless we explicitly set it.
                // If CTM has scale... baking it into path is hard without re-parsing.
                // If we assume Scale 1 and just Position/Rotation?
                // Visual consistency might vary if Imported groups had scale.
                // But for now, let's assume Scale 1.
                opacity: parseFloat(el.getAttribute('opacity')) || 1,
                physics: {
                    enabled: el.getAttribute('data-physics') === 'dynamic',
                    type: el.getAttribute('data-physics') || 'static'
                },
                renderOffset: renderOffset
            };

            // Style Processing
            const style = window.getComputedStyle(el);
            obj.fill = style.fill === 'rgba(0, 0, 0, 0)' ? 'none' : style.fill;
            obj.stroke = style.stroke === 'rgba(0, 0, 0, 0)' ? 'none' : style.stroke;
            obj.strokeWidth = parseFloat(style.strokeWidth) || 0;

            if (obj.type === 'text') {
                obj.text = el.textContent;
                obj.fontSize = parseFloat(el.getAttribute('font-size')) || 24;
                obj.fill = el.getAttribute('fill') || '#000000';
                obj.x = finalX;
                obj.y = finalY;
                obj.renderOffset = { x: 0, y: 0 };
            } else {
                let pathData = "";
                if (el.tagName === 'path') {
                    const rawD = el.getAttribute('d');
                    pathData = this.offsetPathData(rawD, dx, dy);
                }
                else if (el.tagName === 'rect') {
                    const rx = parseFloat(el.getAttribute('rx')) || 0;
                    const w = bbox.width; const h = bbox.height;
                    const l = -w / 2; const t = -h / 2; const r = w / 2; const b = h / 2;
                    pathData = `M ${l + rx} ${t} H ${r - rx} Q ${r} ${t} ${r} ${t + rx} V ${b - rx} Q ${r} ${b} ${r - rx} ${b} H ${l + rx} Q ${l} ${b} ${l} ${b - rx} V ${t + rx} Q ${l} ${t} ${l + rx} ${t} Z`;
                } else if (el.tagName === 'ellipse' || el.tagName === 'circle') {
                    const rx = el.tagName === 'circle' ? parseFloat(el.getAttribute('r')) : parseFloat(el.getAttribute('rx'));
                    const ry = el.tagName === 'circle' ? parseFloat(el.getAttribute('r')) : parseFloat(el.getAttribute('ry'));
                    pathData = `M ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0`;
                } else if (el.tagName === 'polygon') {
                    const points = el.getAttribute("points").trim().split(/\s+|,/);
                    if (points.length >= 2) {
                        pathData = "M " + (parseFloat(points[0]) + dx) + " " + (parseFloat(points[1]) + dy);
                        for (let i = 2; i < points.length; i += 2) {
                            pathData += " L " + (parseFloat(points[i]) + dx) + " " + (parseFloat(points[i + 1]) + dy);
                        }
                        pathData += " Z";
                    }
                } else if (el.tagName === 'line') {
                    const x1 = parseFloat(el.getAttribute('x1'));
                    const y1 = parseFloat(el.getAttribute('y1'));
                    const x2 = parseFloat(el.getAttribute('x2'));
                    const y2 = parseFloat(el.getAttribute('y2'));
                    pathData = `M ${x1 + dx} ${y1 + dy} L ${x2 + dx} ${y2 + dy}`;
                }
                obj.pathData = pathData;
            }

            // Filter out empty paths
            if (obj.type === 'vector_path' && (!obj.pathData || obj.pathData === "")) return;

            objects.push(obj);
        };

        // Recursive flattening instead of shallow iteration
        Array.from(this.svg.children).forEach(child => processElement(child));

        if (objects.length === 0) {
            alert("No objects to send!");
            return;
        }

        const payload = {
            source: 'ovivector',
            objects: objects
        };

        const event = new CustomEvent('ovi:import-vector', { detail: payload });
        window.dispatchEvent(event);

        console.log(`Sent ${objects.length} objects to OviState.`);
        alert(`Sent ${objects.length} objects to OviState!`);
    }

    // Legacy method kept for compatibility if needed
    sendToSimulation() {
        this.sendToOviState();
    }



    getSelectedPathPoints() {
        const el = this.selectedElement;
        if (!el) return null;

        const bbox = el.getBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;
        let points = [];

        if (el.tagName === 'rect') {
            const x = parseFloat(el.getAttribute('x'));
            const y = parseFloat(el.getAttribute('y'));
            const w = parseFloat(el.getAttribute('width'));
            const h = parseFloat(el.getAttribute('height'));
            points = [
                { x: x - centerX, y: y - centerY },
                { x: x + w - centerX, y: y - centerY },
                { x: x + w - centerX, y: y + h - centerY },
                { x: x - centerX, y: y + h - centerY }
            ];
        } else if (el.tagName === 'circle') {
            const r = parseFloat(el.getAttribute('r'));
            const count = 32;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                points.push({
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r
                });
            }
        } else if (el.tagName === 'path') {
            const d = el.getAttribute('d');
            const commands = d.match(/[MLZ][^MLZ]*/g);
            if (commands) {
                commands.forEach(cmd => {
                    const type = cmd[0];
                    if (type === 'M' || type === 'L') {
                        const coords = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat);
                        if (coords.length >= 2) {
                            points.push({ x: coords[0] - centerX, y: coords[1] - centerY });
                        }
                    }
                });
            }
        }

        const transform = el.getAttribute("transform") || "";
        const matchS = transform.match(/scale\(([^,]+)(?:,\s*([^)]+))?\)/);
        if (matchS && points.length > 0) {
            const sx = parseFloat(matchS[1]);
            const sy = matchS[2] ? parseFloat(matchS[2]) : sx;
            points.forEach(p => {
                p.x *= sx;
                p.y *= sy;
            });
        }
        return points.length > 0 ? points : null;
    }

    getMousePosition(evt) {
        const CTM = this.svg.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };
        if (evt.touches) evt = evt.touches[0];
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    }

    offsetPathData(d, dx, dy) {
        if (!d) return "";
        return d.replace(/([MLCQ])\s*([^A-Za-z]+)/g, (match, cmd, args) => {
            const coords = args.trim().split(/[\s,]+/).map(parseFloat);
            let res = cmd;
            for (let i = 0; i < coords.length; i += 2) {
                res += ` ${coords[i] + dx} ${coords[i + 1] + dy}`;
            }
            return res + " ";
        }).replace(/([HV])\s*([^A-Za-z]+)/g, (match, cmd, args) => {
            const coords = args.trim().split(/[\s,]+/).map(parseFloat);
            let res = cmd;
            const shift = (cmd === 'H') ? dx : dy;
            coords.forEach(v => res += ` ${v + shift}`);
            return res + " ";
        }).replace(/A\s*([^A-Za-z]+)/g, (match, args) => {
            const coords = args.trim().split(/[\s,]+/).map(parseFloat);
            let res = "A";
            for (let i = 0; i < coords.length; i += 7) {
                if (i + 6 < coords.length) {
                    res += ` ${coords[i]} ${coords[i + 1]} ${coords[i + 2]} ${coords[i + 3]} ${coords[i + 4]} ${coords[i + 5] + dx} ${coords[i + 6] + dy}`;
                }
            }
            return res + " ";
        });
    }

    sendToOviStateHierarchical() {
        console.log("Sending to OviState (Hierarchical)...");
        const objects = [];

        // Helper to convert SVG Element to OviState JSON Object (Recursive)
        const processElement = (el, parentId = null) => {
            if (el === this.gizmoGroup || el === this.marqueeRect) return;
            if (el.tagName === 'defs') return;
            if (el.style.display === 'none') return;

            // Generate ID
            const id = el.getAttribute('data-id') || (el.tagName + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000));
            el.setAttribute('data-id', id);

            // Handle Groups
            if (el.tagName === 'g') {
                // Determine Transform (Local to Parent)
                let tx = 0, ty = 0, rot = 0, scale = 1;
                const transform = el.getAttribute("transform");
                if (transform) {
                    const translateMatch = transform.match(/translate\(([^,]+)(?:,([^)]+))?\)/);
                    if (translateMatch) {
                        tx = parseFloat(translateMatch[1]) || 0;
                        ty = parseFloat(translateMatch[2]) || 0;
                    }
                    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
                    if (rotateMatch) {
                        rot = parseFloat(rotateMatch[1]) || 0;
                    }
                    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
                    if (scaleMatch) {
                        scale = parseFloat(scaleMatch[1]) || 1;
                    }
                }

                const groupObj = {
                    id: id,
                    type: 'group',
                    x: tx, y: ty,
                    rotation: rot,
                    scale: scale,
                    parent: parentId
                };

                objects.push(groupObj);

                // Recurse children
                Array.from(el.children).forEach(child => processElement(child, id));
                return;
            }

            const bbox = el.getBBox();
            if (bbox.width === 0 && bbox.height === 0 && el.tagName !== 'text') return;

            // Get Local Transforms (Relative to Parent Group)
            let tx = 0, ty = 0;
            let rotation = 0;

            const transform = el.getAttribute("transform");
            if (transform) {
                const translateMatch = transform.match(/translate\(([^,]+)(?:,([^)]+))?\)/);
                if (translateMatch) {
                    tx = parseFloat(translateMatch[1]) || 0;
                    ty = parseFloat(translateMatch[2]) || 0;
                }
                const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
                if (rotateMatch) {
                    rotation = parseFloat(rotateMatch[1]) || 0;
                }
            }

            // Standardize Position: Visual Center Calculation (LOCAL)
            const localCx = bbox.x + bbox.width / 2;
            const localCy = bbox.y + bbox.height / 2;

            const rad = rotation * (Math.PI / 180);
            const rotatedCx = localCx * Math.cos(rad) - localCy * Math.sin(rad);
            const rotatedCy = localCx * Math.sin(rad) + localCy * Math.cos(rad);

            let cx = tx + rotatedCx;
            let cy = ty + rotatedCy;

            // Bake Render Offset
            const renderOffset = { x: 0, y: 0 };
            const dx = -localCx;
            const dy = -localCy;

            const obj = {
                id: id,
                type: el.tagName === 'text' ? 'text' : 'vector_path',
                x: cx,
                y: cy,
                width: bbox.width,
                height: bbox.height,
                rotation: rotation,
                scale: 1,
                scale: 1,
                opacity: parseFloat(el.getAttribute('opacity')) || parseFloat(window.getComputedStyle(el).opacity) || 1,
                parent: parentId, // LINK TO PARENT
                physics: {
                    enabled: el.getAttribute('data-physics') === 'dynamic',
                    type: el.getAttribute('data-physics') || 'static'
                },
                renderOffset: renderOffset
            };

            // Style Processing
            const style = window.getComputedStyle(el);
            obj.fill = style.fill === 'rgba(0, 0, 0, 0)' ? 'none' : style.fill;
            obj.stroke = style.stroke === 'rgba(0, 0, 0, 0)' ? 'none' : style.stroke;
            obj.strokeWidth = parseFloat(style.strokeWidth) || 0;

            if (obj.type === 'text') {
                obj.text = el.textContent;
                obj.fontSize = parseFloat(el.getAttribute('font-size')) || 24;
                obj.fill = el.getAttribute('fill') || '#000000';
                const textX = parseFloat(el.getAttribute('x')) || 0;
                const textY = parseFloat(el.getAttribute('y')) || 0;
                obj.x = tx || textX;
                obj.y = ty || textY;
                obj.renderOffset = { x: 0, y: 0 };
            } else {
                let pathData = "";
                if (el.tagName === 'path') {
                    const rawD = el.getAttribute('d');
                    pathData = this.offsetPathData(rawD, dx, dy);
                }
                else if (el.tagName === 'rect') {
                    const rx = parseFloat(el.getAttribute('rx')) || 0;
                    const w = bbox.width; const h = bbox.height;
                    const l = -w / 2; const t = -h / 2; const r = w / 2; const b = h / 2;
                    pathData = `M ${l + rx} ${t} H ${r - rx} Q ${r} ${t} ${r} ${t + rx} V ${b - rx} Q ${r} ${b} ${r - rx} ${b} H ${l + rx} Q ${l} ${b} ${l} ${b - rx} V ${t + rx} Q ${l} ${t} ${l + rx} ${t} Z`;
                } else if (el.tagName === 'ellipse' || el.tagName === 'circle') {
                    const rx = el.tagName === 'circle' ? parseFloat(el.getAttribute('r')) : parseFloat(el.getAttribute('rx'));
                    const ry = el.tagName === 'circle' ? parseFloat(el.getAttribute('r')) : parseFloat(el.getAttribute('ry'));
                    pathData = `M ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0`;
                } else if (el.tagName === 'polygon') {
                    const points = el.getAttribute("points").trim().split(/\s+|,/);
                    if (points.length >= 2) {
                        pathData = "M " + (parseFloat(points[0]) + dx) + " " + (parseFloat(points[1]) + dy);
                        for (let i = 2; i < points.length; i += 2) {
                            pathData += " L " + (parseFloat(points[i]) + dx) + " " + (parseFloat(points[i + 1]) + dy);
                        }
                        pathData += " Z";
                    }
                } else if (el.tagName === 'line') {
                    const x1 = parseFloat(el.getAttribute('x1'));
                    const y1 = parseFloat(el.getAttribute('y1'));
                    const x2 = parseFloat(el.getAttribute('x2'));
                    const y2 = parseFloat(el.getAttribute('y2'));
                    pathData = `M ${x1 + dx} ${y1 + dy} L ${x2 + dx} ${y2 + dy}`;
                }
                obj.pathData = pathData;
            }

            if (obj.type === 'vector_path' && (!obj.pathData || obj.pathData === "")) return;

            objects.push(obj);
        };

        // Recursive flattening instead of shallow iteration
        Array.from(this.svg.children).forEach(child => processElement(child, null));

        if (objects.length === 0) {
            alert("No objects to send!");
            return;
        }

        const payload = {
            source: 'ovivector',
            objects: objects
        };

        const event = new CustomEvent('ovi:import-vector', { detail: payload });
        window.dispatchEvent(event);

        console.log(`Sent ${objects.length} objects to OviState (Hierarchical).`);
        alert(`Sent ${objects.length} objects to OviState!`);
    }

    sendToOviStateRobust() {
        console.log("Sending to OviState (Robust - Visual Center V4 + RenderOffset)...");
        const objects = [];

        // Helper: Decompose Matrix
        const decomposeMatrix = (m) => {
            const scaleX = Math.sqrt(m.a * m.a + m.b * m.b);
            const scaleY = Math.sqrt(m.c * m.c + m.d * m.d);
            const rotation = Math.atan2(m.b, m.a) * (180 / Math.PI);
            return { x: m.e, y: m.f, scaleX, scaleY, rotation };
        };

        // Root Transform Context
        const rootCTM = this.svg.getScreenCTM();
        if (!rootCTM) {
            console.error("Root CTM not found");
            return;
        }
        const invRootCTM = rootCTM.inverse();

        // Recursive Process
        const processElement = (el, parentId = null, parentGlobalMatrix = null, parentGlobalRot = 0, parentGlobalScale = 1) => {
            if (el === this.gizmoGroup || el === this.marqueeRect) return;
            if (el.tagName === 'defs') return;
            if (el.style.display === 'none') return;
            if (el.tagName === 'rect' && el.style.pointerEvents === 'none') return;

            // 1. Get Pure SVG Global Matrix
            const elCTM = el.getScreenCTM();
            if (!elCTM) return;
            const globalMatrixRaw = invRootCTM.multiply(elCTM);
            const globalDecomp = decomposeMatrix(globalMatrixRaw);

            // 2. BBox & Centers
            let bbox;
            try { bbox = el.getBBox(); } catch (e) { return; }
            if (el.tagName !== 'g' && el.tagName !== 'text' && (bbox.width === 0 && bbox.height === 0)) return;

            const cx = bbox.x + bbox.width / 2;
            const cy = bbox.y + bbox.height / 2;

            // Calculate Global Visual Center Point
            const pt = this.svg.createSVGPoint();
            pt.x = cx; pt.y = cy;
            const globalCenter = pt.matrixTransform(globalMatrixRaw);

            // 3. Local Position Calculation
            let finalX = globalCenter.x;
            let finalY = globalCenter.y;

            if (parentGlobalMatrix) {
                // Transform global center into parent's space
                const invParent = parentGlobalMatrix.inverse();
                const ptGlobal = this.svg.createSVGPoint();
                ptGlobal.x = globalCenter.x; ptGlobal.y = globalCenter.y;
                const ptLocal = ptGlobal.matrixTransform(invParent);
                finalX = ptLocal.x;
                finalY = ptLocal.y;
            }

            // 4. Local Rotation & Scale
            let finalRot = globalDecomp.rotation - parentGlobalRot;
            let finalScale = ((globalDecomp.scaleX + globalDecomp.scaleY) / 2) / parentGlobalScale;

            // ID
            const id = el.getAttribute('data-id') || (el.tagName + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000));
            el.setAttribute('data-id', id);

            // Opacity
            const style = window.getComputedStyle(el);
            let opacity = parseFloat(el.getAttribute('opacity')) || parseFloat(style.opacity) || 1;

            // 5. Construct This Object's Global Matrix (For Children)
            const thisGlobalMatrix = this.svg.createSVGMatrix()
                .translate(globalCenter.x, globalCenter.y)
                .rotate(globalDecomp.rotation)
                .scale(globalDecomp.scaleX);

            const obj = {
                id: id,
                type: el.tagName === 'g' ? 'group' : (el.tagName === 'text' ? 'text' : 'vector_path'),
                x: finalX,
                y: finalY,
                // Debug Globals
                globalX: globalCenter.x,
                globalY: globalCenter.y,
                width: bbox.width,
                height: bbox.height,
                rotation: finalRot,
                scale: finalScale,
                parent: parentId,
                opacity: opacity,
                // RenderOffset: LOCAL center of the BBox. 
                // This shifts drawing context so that (cx, cy) aligns with (0,0) (the Visual Center).
                renderOffset: { x: cx, y: cy }
            };

            // Shape Specific Data - NO REGEX MODIFICATION
            if (obj.type === 'vector_path') {
                let pathData = "";
                if (el.tagName === 'path') {
                    pathData = el.getAttribute('d');
                }
                else if (el.tagName === 'rect') {
                    const x = parseFloat(el.getAttribute('x')) || 0;
                    const y = parseFloat(el.getAttribute('y')) || 0;
                    const w = parseFloat(el.getAttribute('width'));
                    const h = parseFloat(el.getAttribute('height'));
                    const rx = parseFloat(el.getAttribute('rx')) || 0;
                    // Standard Rect Path (User Space)
                    if (rx > 0) {
                        const l = x; const t = y; const r = x + w; const b = y + h;
                        pathData = `M ${l + rx} ${t} H ${r - rx} Q ${r} ${t} ${r} ${t + rx} V ${b - rx} Q ${r} ${b} ${r - rx} ${b} H ${l + rx} Q ${l} ${b} ${l} ${b - rx} V ${t + rx} Q ${l} ${t} ${l + rx} ${t} Z`;
                    } else {
                        pathData = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
                    }
                } else if (el.tagName === 'circle' || el.tagName === 'ellipse') {
                    const rx = el.tagName === 'circle' ? parseFloat(el.getAttribute('r')) : parseFloat(el.getAttribute('rx'));
                    const ry = el.tagName === 'circle' ? parseFloat(el.getAttribute('r')) : parseFloat(el.getAttribute('ry'));
                    const cxAttr = parseFloat(el.getAttribute('cx')) || 0;
                    const cyAttr = parseFloat(el.getAttribute('cy')) || 0;
                    pathData = `M ${cxAttr + rx} ${cyAttr} A ${rx} ${ry} 0 1 0 ${cxAttr - rx} ${cyAttr} A ${rx} ${ry} 0 1 0 ${cxAttr + rx} ${cyAttr}`;
                } else if (el.tagName === 'line') {
                    const x1 = parseFloat(el.getAttribute('x1'));
                    const y1 = parseFloat(el.getAttribute('y1'));
                    const x2 = parseFloat(el.getAttribute('x2'));
                    const y2 = parseFloat(el.getAttribute('y2'));
                    pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
                } else if (el.tagName === 'polygon' || el.tagName === 'polyline') {
                    const points = el.getAttribute("points");
                    if (points) {
                        const pts = points.trim().split(/[\s,]+/).map(parseFloat);
                        if (pts.length >= 2) {
                            pathData = `M ${pts[0]} ${pts[1]}`;
                            for (let i = 2; i < pts.length; i += 2) pathData += ` L ${pts[i]} ${pts[i + 1]}`;
                            if (el.tagName === 'polygon') pathData += " Z";
                        }
                    }
                }
                obj.pathData = pathData;

                obj.fill = (style.fill === 'rgba(0, 0, 0, 0)' || style.fill === 'none') ? 'none' : style.fill;
                obj.stroke = (style.stroke === 'rgba(0, 0, 0, 0)' || style.stroke === 'none') ? 'none' : style.stroke;
                obj.strokeWidth = parseFloat(style.strokeWidth) || 0;

            } else if (obj.type === 'text') {
                obj.text = el.textContent;
                obj.fontSize = parseFloat(el.getAttribute('font-size')) || 24;
                obj.fill = style.fill;
                // RenderOffset for text is trickier depending on anchor.
                // BBox center should work.
            }

            obj.physics = {
                enabled: el.getAttribute('data-physics') === 'dynamic',
                type: el.getAttribute('data-physics') || 'static'
            };

            objects.push(obj);

            // Recurse children
            if (el.tagName === 'g') {
                Array.from(el.children).forEach(child => {
                    if (['defs', 'clippath', 'mask', 'filter', 'style', 'script'].includes(child.tagName.toLowerCase())) return;
                    processElement(child, id, thisGlobalMatrix, globalDecomp.rotation, globalDecomp.scaleX);
                });
            }
        };

        // Iterate top-level
        Array.from(this.svg.children).forEach(child => processElement(child, null, null, 0, 1));

        if (objects.length === 0) {
            alert("No objects to send!");
            return;
        }

        if (objects.length > 0) {
            console.log("DEBUG EXPORT: First Object:", JSON.stringify(objects[0], null, 2));
            console.log("DEBUG EXPORT: Last Object:", JSON.stringify(objects[objects.length - 1], null, 2));
            const invalidObjs = objects.filter(o => isNaN(o.x) || isNaN(o.y));
            if (invalidObjs.length > 0) {
                console.error("CRITICAL: Found objects with NaN coordinates!", invalidObjs);
                alert("Error: Some objects have invalid coordinates. Check console.");
            }
        }

        const payload = {
            source: 'ovivector',
            objects: objects
        };

        const event = new CustomEvent('ovi:import-vector', { detail: payload });
        window.dispatchEvent(event);

        console.log(`Sent ${objects.length} objects to OviState (Robust Visual Center V4).`);
        alert(`Sent ${objects.length} objects to OviState!`);
    }
}
