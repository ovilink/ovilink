/**
 * OviBoard Core Editor
 * Manages Canvas, Zoom/Pan, and Render Loop
 */
import ToolManager from './ToolManager.js';
import SmartObject from '../objects/SmartObject.js';
import ShapeRecognizer from '../utils/ShapeRecognizer.js';
import SmartInput from '../ui/SmartInput.js';

export default class Editor {
    constructor(engine) {
        this.engine = engine;
        this.canvas = null;
        this.ctx = null;
        this.parentElement = null;
        this.toolManager = new ToolManager(this);

        // Viewport State (Infinite Canvas)

        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isPanning = false;
        this.lastPan = { x: 0, y: 0 };

        // Virtual Cursor (For Voice Auto-Newline)
        this.cursorPos = { x: 0, y: 0 }; // World Coordinates

        // Data Management
        this.strokes = []; // Array of { points: [], color, width, type }
        this.objects = []; // Array of SmartObject instances
        this.activeStroke = null;

        // Render Loop
        this.rafId = null;

        // Features
        this.magicDrawEnabled = true; // Default ON

        // Interaction State
        this.isDraggingObject = false;
        this.dragOffset = { x: 0, y: 0 };
        this.hoveredObject = null; // For Pen tool smart-connect feedback
    }

    attachToElement(container) {
        this.parentElement = container;
        this.parentElement.innerHTML = ''; // Clear previous
        this.parentElement.style.position = 'relative'; // Ensure overlays engage correctly
        this.parentElement.style.overflow = 'hidden'; // Clip content

        // 1. Create Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.background = '#f5f5f5'; // Grid background/color

        // Handle Resize
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.parentElement);

        this.parentElement.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // 2. Input Listeners
        this.setupInput();

        // 3. Start Loop
        this.resize();
        this.loop();

        // 4. Init Smart Input (Voice/Text)
        this.smartInput = new SmartInput(this);

        console.log("OviBoard Editor Attached to Tab");
    }

    // Legacy attach for compatibility (if needed)
    attach() {
        console.warn("Editor.attach() is deprecated. Use attachToElement().");
    }

    detach() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.resizeObserver) this.resizeObserver.disconnect();
        // Remove listeners (TODO: Strict cleanup)
    }

    resize() {
        if (!this.parentElement) return;
        const rect = this.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = rect.width;
        this.height = rect.height;
        this.render();
    }

    setupInput() {
        // Consolidated Pointer Events
        this.canvas.addEventListener('pointerdown', e => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', e => this.onPointerMove(e));
        this.canvas.addEventListener('pointerup', e => this.onPointerUp(e));
        this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });

        // Drag & Drop Support
        this.canvas.addEventListener('dragover', e => this.onDragOver(e));
        this.canvas.addEventListener('dragleave', e => this.onDragLeave(e));
        this.canvas.addEventListener('drop', e => this.onDrop(e));

        // Keyboard Support (Global)
        // Using window because canvas might not have focus
        window.addEventListener('keydown', e => this.onKeyDown(e));
    }

    onKeyDown(e) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.activeSmartObject) {
                // Remove the object
                const index = this.objects.indexOf(this.activeSmartObject);
                if (index > -1) {
                    this.objects.splice(index, 1);
                    this.activeSmartObject = null;
                    this.isDraggingObject = false; // Reset drag state
                    this.render();
                    console.log("Deleted Object");
                }
            }
        }
    }

    // --- Input Handlers (World Coordinates) ---

    getPointerPos(e) {
        // Convert screen (clientX) to World (Camera Space)
        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Transform: World = (Screen - Center) / Zoom + Center - Camera
        // Just keeping it simple: World = (Screen) / Zoom - Camera
        // Actually: ScreenX = (WorldX + CameraX) * Zoom
        // WorldX = (ScreenX / Zoom) - CameraX

        return {
            x: (screenX / this.camera.zoom) - this.camera.x,
            y: (screenY / this.camera.zoom) - this.camera.y,
            pressure: e.pressure || 0.5
        };
    }

    onPointerDown(e) {
        if (e.button === 1 || e.ctrlKey) { // Middle mouse or Ctrl+Click -> PAN
            this.isPanning = true;
            this.lastPan = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        const pos = this.getPointerPos(e);

        // Smart Interaction: Pass input to SmartObjects if hit
        // ONLY if tool is SELECT.
        // If Pen/Eraser, we want to draw/erase, ignoring the object beneath.
        if (this.toolManager.activeToolId === 'select') {
            let hitObject = null;
            for (let i = this.objects.length - 1; i >= 0; i--) {
                const obj = this.objects[i];
                if (obj.containsPoint(pos.x, pos.y)) {
                    hitObject = obj;

                    this.activeSmartObject = obj;
                    let captured = false;
                    if (obj.processInput) {
                        captured = obj.processInput('down', pos.x, pos.y);
                    }

                    if (captured) {
                        this.render();
                        return;
                    }

                    // Also select (simple logic)
                    this.objects.forEach(o => o.selected = false);
                    obj.selected = true;

                    // Start Dragging Object
                    this.isDraggingObject = true;
                    this.dragOffset = { x: pos.x - obj.x, y: pos.y - obj.y };

                    this.render();
                    return; // Stop propagation
                }
            } // Close for

            // If we are here, NO object was hit
            if (!hitObject) {
                // DESELECT ALL
                if (this.activeSmartObject) {
                    this.activeSmartObject = null;
                    this.objects.forEach(o => o.selected = false);
                    this.render();
                }
            }
        } // Close if (select)

        // If we have an active smart object dragging/interacting, don't use tool?
        // Let's rely on 'captured'.

        // If activeSmartObject is set but input wasn't captured, it means we clicked on the object's background
        // and it didn't consume the event. In this case, we still want to allow the tool to act on it,
        // e.g., drawing over the object.

        this.toolManager.onDown(pos, e);
    }

    onPointerMove(e) {
        if (this.isPanning) {
            const dx = (e.clientX - this.lastPan.x) / this.camera.zoom;
            const dy = (e.clientY - this.lastPan.y) / this.camera.zoom;
            this.camera.x += dx;
            this.camera.y += dy;
            this.lastPan = { x: e.clientX, y: e.clientY };
            return; // Don't draw while panning
        }

        const pos = this.getPointerPos(e);

        // Smart Hover (Visual Feedback for Connections)
        // If Pen is active, check if we are over an object
        if (this.toolManager.activeToolId === 'pen') {
            let found = null;
            // Check manually (or reuse containsPoint)
            for (let i = this.objects.length - 1; i >= 0; i--) {
                const obj = this.objects[i];
                // Simple hit test with padding for easiness
                const pad = 10;
                if (pos.x >= obj.x - pad && pos.x <= obj.x + obj.width + pad &&
                    pos.y >= obj.y - pad && pos.y <= obj.y + obj.height + pad) {
                    found = obj;
                    break;
                }
            }
            if (this.hoveredObject !== found) {
                this.hoveredObject = found;
                this.render();
            }
        } else {
            this.hoveredObject = null;
        }

        if (this.activeSmartObject) {
            if (this.isDraggingObject) {
                this.activeSmartObject.x = pos.x - this.dragOffset.x;
                this.activeSmartObject.y = pos.y - this.dragOffset.y;
                this.render();
                return; // Don't process other hover/tools
            }

            if (this.activeSmartObject.processInput) {
                this.activeSmartObject.processInput('move', pos.x, pos.y);
            }
        } else {
            // Hover Input (for UI highlights inside sim)
            for (let i = this.objects.length - 1; i >= 0; i--) {
                const obj = this.objects[i];
                if (obj.containsPoint(pos.x, pos.y)) {
                    if (obj.processInput) obj.processInput('move', pos.x, pos.y);
                }
            }
        }

        this.toolManager.onMove(pos, e);
    }

    addSmartObject(json, x, y) {
        let w = 400;
        let h = 300;

        // Auto-scale based on source
        if (json.canvas) {
            const aspect = (json.canvas.width || 800) / (json.canvas.height || 600);
            h = w / aspect;
        }

        const obj = new SmartObject({
            type: 'ovistate',
            x: x,
            y: y,
            width: w,
            height: h,
            content: json
        });
        this.objects.push(obj);
        this.render();
    }

    addSmartObject(config) {
        const obj = new SmartObject(config);
        this.objects.push(obj);
        this.render();
        return obj;
    }

    addTextObject(text, x, y, style = {}, options = {}) {
        // Default centering offset unless disabled
        const finalX = options.center === false ? x : x - 100;
        const finalY = options.center === false ? y : y - 25;

        const obj = new SmartObject({
            type: 'text',
            x: finalX,
            y: finalY,
            width: 200,
            height: 50,
            content: {
                text: text,
                fontSize: style.fontSize || 24,
                fontFamily: style.fontFamily || 'Arial',
                fontStyle: style.fontStyle || 'normal', // Added support
                color: style.color || 'black'
            }
        });
        this.objects.push(obj);
        this.render();
        return obj;
    }

    onPointerUp(e) {
        const pos = this.getPointerPos(e);

        if (this.activeSmartObject) {
            if (this.activeSmartObject.processInput) {
                this.activeSmartObject.processInput('up', pos.x, pos.y);
            }
            // Stop Dragging
            this.isDraggingObject = false;
            // Note: We don't clear activeSmartObject immediately so selection persists
        }

        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
            return;
        }

        this.toolManager.onUp(pos, e);

        // --- Shape Recognition ---
        // If we just finished a stroke with the pen, try to recognize it.
        // Also ensure Magic Draw is ENABLED.
        // --- Shape Recognition ---
        // If we just finished a stroke with the pen, try to recognize it.
        if (this.magicDrawEnabled && this.toolManager.activeToolId === 'pen' && this.strokes.length > 0) {
            const lastStroke = this.strokes[this.strokes.length - 1];
            // Only try if it hasn't been processed
            if (!lastStroke._processed) {
                const shape = ShapeRecognizer.recognize(lastStroke.points, this.objects);
                if (shape) {
                    // Remove the raw stroke
                    this.strokes.pop();

                    let obj;
                    if (shape.type === 'connector') {
                        obj = new SmartObject({
                            type: 'connector',
                            x: 0, y: 0, width: 0, height: 0, // Virtual bounds
                            content: {
                                from: shape.from,
                                to: shape.to,
                                color: shape.color,
                                strokeWidth: 2
                            }
                        });
                        console.log("🔗 Smart Connector Created!");
                    } else {
                        // Create SmartObject for the shape
                        obj = new SmartObject({
                            type: 'shape',
                            x: shape.x,
                            y: shape.y,
                            width: shape.width,
                            height: shape.height,
                            content: {
                                shapeType: shape.shapeType,
                                color: shape.color,
                                fill: 'transparent', // Default transparent fill
                                strokeWidth: 2
                            }
                        });
                        console.log("✨ Shape Auto-Corrected:", shape.shapeType);
                    }

                    this.objects.push(obj);
                    this.render();
                }
                lastStroke._processed = true;
            }
        }
    }

    // --- Drag & Drop ---
    onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.canvas.style.border = '2px dashed #007acc';
    }

    onDragLeave(e) {
        e.preventDefault();
        this.canvas.style.border = 'none';
    }

    onDrop(e) {
        e.preventDefault();
        this.canvas.style.border = 'none';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === "application/json" || file.name.endsWith(".json")) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const json = JSON.parse(evt.target.result);
                        // Validate OviState Data (Basic check)
                        if (json.objects || json.metadata) {
                            // Calculate World Position
                            const rect = this.canvas.getBoundingClientRect();
                            const screenX = e.clientX - rect.left;
                            const screenY = e.clientY - rect.top;
                            const worldX = (screenX / this.camera.zoom) - this.camera.x;
                            const worldY = (screenY / this.camera.zoom) - this.camera.y;

                            // Create Smart Object
                            const obj = new SmartObject({
                                type: 'ovistate',
                                x: worldX - 100, // Center approx
                                y: worldY - 100,
                                width: 200,
                                height: 200,
                                content: json
                            });

                            this.objects.push(obj);
                            this.render();
                            console.log("Check Drop: OviState simulation added.");
                        } else {
                            console.warn("Dropped JSON does not look like OviState data.");
                        }
                    } catch (err) {
                        console.error("Failed to parse JSON", err);
                    }
                };
                reader.readAsText(file);
            } else if (file.type.startsWith('image/')) {
                // Handle Image Drop
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = new Image();
                    img.onload = () => {
                        // Calculate World Position
                        const rect = this.canvas.getBoundingClientRect();
                        const screenX = e.clientX - rect.left;
                        const screenY = e.clientY - rect.top;
                        const worldX = (screenX / this.camera.zoom) - this.camera.x;
                        const worldY = (screenY / this.camera.zoom) - this.camera.y;

                        // Create SmartObject (Image)
                        const obj = new SmartObject({
                            type: 'image',
                            x: worldX - (img.width / 2), // Center
                            y: worldY - (img.height / 2),
                            width: img.width, // Natural size (maybe limit it?)
                            height: img.height,
                            content: {
                                src: img.src // Data URL
                            }
                        });
                        this.objects.push(obj);
                        this.render();
                        console.log("🖼️ Image Dropped");
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        }
    }

    onWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Visual Center fallback if no mouse
        // const cx = mouseX || this.width / 2;
        // const cy = mouseY || this.height / 2;

        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = Math.exp(wheel * zoomIntensity);

        const newZoom = this.camera.zoom * zoomFactor;

        // Clamp
        if (newZoom < 0.1 || newZoom > 10) return;

        // Zoom to Point Logic:
        // World = Screen / Zoom - Camera
        // We want World point under Mouse to remain static relative to Mouse Screen pos.
        // WorldBefore = mouseX / oldZoom - oldCamX
        // WorldAfter = mouseX / newZoom - newCamX
        // WorldBefore == WorldAfter
        // newCamX = mouseX / newZoom - WorldBefore

        const worldX = (mouseX / this.camera.zoom) - this.camera.x;
        const worldY = (mouseY / this.camera.zoom) - this.camera.y;

        this.camera.x = (mouseX / newZoom) - worldX;
        this.camera.y = (mouseY / newZoom) - worldY;
        this.camera.zoom = newZoom;
    }

    // --- Serialization ---
    save() {
        return {
            gameData: { // Standard OviPlatform format wrapper if needed? No, custom.
                strokes: this.strokes,
                camera: this.camera
            }
        };
    }

    load(data) {
        if (data && data.gameData) {
            this.strokes = data.gameData.strokes || [];
            if (data.gameData.camera) this.camera = data.gameData.camera;
        }
    }

    exportImage() {
        // Calculate Bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        if (this.objects.length === 0 && this.strokes.length === 0) return null;

        // Check Object Bounds
        this.objects.forEach(o => {
            if (o.x < minX) minX = o.x;
            if (o.y < minY) minY = o.y;
            if (o.x + o.width > maxX) maxX = o.x + o.width;
            if (o.y + o.height > maxY) maxY = o.y + o.height;
        });

        // Check Stroke Bounds
        this.strokes.forEach(s => {
            s.points.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
            });
        });

        // Pad
        const padding = 50;
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;

        const width = maxX - minX;
        const height = maxY - minY;

        // Create Offscreen Canvas
        const offCanvas = document.createElement('canvas');
        offCanvas.width = width;
        offCanvas.height = height;
        const ctx = offCanvas.getContext('2d');

        // Fill White
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // Translate to local space
        ctx.translate(-minX, -minY);

        // Render Objects
        this.objects.forEach(o => o.render(ctx, this.objects));

        // Render Strokes
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this.strokes.forEach(stroke => {
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            if (stroke.points.length > 0) {
                const points = stroke.points;
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
            }
            ctx.stroke();
        });

        return offCanvas.toDataURL('image/png');
    }

    // --- Rendering ---
    loop() {
        const now = performance.now();
        const dt = (now - (this.lastTime || now)) / 1000;
        this.lastTime = now;

        // Update Objects (for graphs, logic)
        this.objects.forEach(obj => {
            if (obj.update) obj.update(dt);
        });

        this.render();
        this.rafId = requestAnimationFrame(() => this.loop());
    }

    render() {
        if (!this.ctx) return;

        // Clear
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Grid (Optional)
        this.drawGrid();

        // Apply Camera Transform
        this.ctx.translate(0, 0); // Pivot?
        // World -> Screen: X * Zoom + CamX*Zoom
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(this.camera.x, this.camera.y);

        // Draw Strokes
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // 1. Render Objects (Bottom Layer)
        this.objects.forEach(obj => obj.render(this.ctx, this.objects));

        // 1.5 Render Hover Glow (Smart Connector Feedback)
        if (this.hoveredObject) {
            const o = this.hoveredObject;
            this.ctx.save();
            this.ctx.strokeStyle = '#00a8ff'; // Cyan/Blue
            this.ctx.lineWidth = 4;
            this.ctx.globalAlpha = 0.5;

            // We need to account that objects usually render with transform.
            // But here we can just verify if o.type is simple shape.
            // Actually, best to just stroke rect for feedback.
            // If it has rotation, we should respect it, but for now simple rect is enough feedback
            // since Smart Objects render differently.
            // Let's assume non-rotated for MVP or apply transform.

            this.ctx.translate(o.x + o.width / 2, o.y + o.height / 2);
            this.ctx.rotate(o.rotation || 0);
            this.ctx.translate(-o.width / 2, -o.height / 2);
            this.ctx.strokeRect(-5, -5, o.width + 10, o.height + 10);

            this.ctx.restore();
        }

        // 2. Render Strokes (Top Layer)
        this.strokes.forEach(stroke => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = stroke.color;
            this.ctx.lineWidth = stroke.width;

            // Eraser Support
            this.ctx.globalCompositeOperation = 'source-over';

            if (stroke.points.length > 0) {
                const points = stroke.points;
                if (points.length < 3) {
                    this.ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        this.ctx.lineTo(points[i].x, points[i].y);
                    }
                } else {
                    this.ctx.moveTo(points[0].x, points[0].y);
                    let i;
                    for (i = 1; i < points.length - 2; i++) {
                        const cx = (points[i].x + points[i + 1].x) / 2;
                        const cy = (points[i].y + points[i + 1].y) / 2;
                        this.ctx.quadraticCurveTo(points[i].x, points[i].y, cx, cy);
                    }
                    // Curve through the last two points
                    const last = points[i];
                    const end = points[i + 1];
                    this.ctx.quadraticCurveTo(last.x, last.y, end.x, end.y);
                }
            }
            this.ctx.stroke();
            this.ctx.globalCompositeOperation = 'source-over'; // Reset
        });

        // Current Tool Render (active stroke preview)
        this.toolManager.render(this.ctx);
    }

    drawGrid() {
        // Simple dot grid logic
    }
}
