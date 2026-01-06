import { ParticleSystem } from './Particles.js';
import { SpritePlayer } from './Sprites.js';

/**
 * OviState Runtime Core
 * Handles canvas rendering, physics, and object management
 */
export default class OviStateRuntime {
    constructor(container, config = {}) {
        // CRITICAL: Use existing canvas if provided
        if (config.canvas) {
            this.canvas = config.canvas;
            console.log("✅ OviStateRuntime: Using existing canvas", this.canvas);
        } else if (container) {
            this.canvas = document.createElement('canvas');
            container.appendChild(this.canvas);
            console.log("✅ OviStateRuntime: Created new canvas in container");
        } else {
            console.error("❌ OviStateRuntime: No canvas or container provided!");
            throw new Error("OviStateRuntime requires either a canvas or container");
        }

        this.ctx = this.canvas.getContext('2d');
        this.config = config || {};
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        console.log("📐 Canvas dimensions:", this.width, "x", this.height);

        this.objects = [];
        this.controls = [];
        this.graphs = [];
        this.behaviors = new Map();
        this.particleSystem = new ParticleSystem();
        this.spritePlayer = new SpritePlayer();
        this.activeActions = new Set();
        this.globalScriptSource = '';
        this.variables = {}; // Global data store

        this.isRunning = false;
        this.lastTime = 0;

        this.gravity = config.gravity !== undefined ? config.gravity : 1500;
        this.gravityX = config.gravityX || 0;
        this.friction = config.friction !== undefined ? config.friction : 0.1;
        this.enablePhysics = config.enablePhysics !== undefined ? config.enablePhysics : true;
        this.wallBounciness = config.wallBounciness !== undefined ? config.wallBounciness : 0.8;

        // Input State
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.clickProcessed = false;
        this._draggingObj = null; // Fix for Draggable behavior

        this._audioCtx = null;
        this.setupAudioResume();

        // Path vertex dragging state (global, not on object)
        this._draggingPath = null;
        this._draggingVertexIndex = null;

        this.setupInputListeners();

        console.log("OviStateRuntime initialized with", this.objects.length, "objects");
    }

    setupAudioResume() {
        const resume = () => {
            if (this._audioCtx && this._audioCtx.state === 'suspended') {
                this._audioCtx.resume();
            }
            window.removeEventListener('mousedown', resume);
            window.removeEventListener('touchstart', resume);
        };
        window.addEventListener('mousedown', resume);
        window.addEventListener('touchstart', resume);
    }

    getAudioContext() {
        if (!this._audioCtx) {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this._audioCtx;
    }

    setupInputListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouseX = -1000;
            this.mouseY = -1000;
        });

        this.canvas.addEventListener('mousedown', () => {
            if (!this.isRunning) return;
            this.isMouseDown = true;
            this.clickProcessed = false; // Flag to process click once per frame
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            // Clear vertex dragging state
            this._draggingPath = null;
            this._draggingVertexIndex = null;
            this._draggingObj = null;
        });
    }

    // --- Manual Input Injection (For Embedded Mode) ---
    injectInput(type, x, y) {
        this.mouseX = x;
        this.mouseY = y;

        if (type === 'down') {
            if (this.isRunning) {
                this.isMouseDown = true;
                this.clickProcessed = false;
            }
        } else if (type === 'up') {
            this.isMouseDown = false;
            // Clear vertex dragging state
            this._draggingPath = null;
            this._draggingVertexIndex = null;
            this._draggingObj = null;
        }
        // 'move' is active just by calling this with x/y
    }

    addObject(obj) {
        if (obj.rotation === undefined) obj.rotation = 0;
        if (obj.scale === undefined) obj.scale = 1;
        this.objects.push(obj);
        console.log(`➕ Added ${obj.type} object:`, obj.id, "Total objects:", this.objects.length);
    }

    addControl(control) {
        this.controls.push(control);
    }

    addGraph(graph) {
        this.graphs.push(graph);
    }

    registerBehavior(id, behaviorFn) {
        this.behaviors.set(id, behaviorFn);
    }

    /**
     * Helper for scripts to find an object by ID
     */
    getObject(id) {
        return this.objects.find(obj => obj.id === id) || (this.controls && this.controls.find(c => c.id === id));
    }

    setVariable(name, value) {
        this.variables[name] = value;
    }

    getVariable(name) {
        return this.variables[name];
    }

    getWorldTransform(obj) {
        let x = obj.x;
        let y = obj.y;
        let rotation = obj.rotation || 0;
        let scale = obj.scale !== undefined ? obj.scale : 1;

        if (obj.parent) {
            const parent = this.getObject(obj.parent);
            if (parent) {
                const parentTransform = this.getWorldTransform(parent);

                // Rotate child position by parent rotation
                const rad = parentTransform.rotation * Math.PI / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const rx = x * cos - y * sin;
                const ry = x * sin + y * cos;

                x = parentTransform.x + rx * parentTransform.scale;
                y = parentTransform.y + ry * parentTransform.scale;
                rotation += parentTransform.rotation;
                scale *= parentTransform.scale;
            }
        }

        // Apply Render Offset (Visual Center vs Pivot Center)
        if (obj.renderOffset) {
            const rad = rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rx = obj.renderOffset.x * cos - obj.renderOffset.y * sin;
            const ry = obj.renderOffset.x * sin + obj.renderOffset.y * cos;
            x += rx * scale;
            y += ry * scale;
        }

        return { x, y, rotation, scale };
    }

    getObjectBounds(obj) {
        let minX, minY, maxX, maxY;

        if (obj.type === 'group') {
            minX = minY = Infinity;
            maxX = maxY = -Infinity;
        } else {
            minX = - (obj.width || 0) / 2;
            minY = - (obj.height || 0) / 2;
            maxX = (obj.width || 0) / 2;
            maxY = (obj.height || 0) / 2;

            if (obj.type === 'circle') {
                const r = obj.radius || 30;
                minX = -r; minY = -r; maxX = r; maxY = r;
            } else if (obj.type === 'symbol') {
                const s = (obj.size || 48) / 2;
                minX = -s; minY = -s; maxX = s; maxY = s;
            } else if (obj.type === 'spring') {
                if (obj.targetA && obj.targetB) {
                    // Bounds are tricky for World-Space connected objects in a Local-Space function.
                    // getObjectBounds usually returns Local AABB.
                    // Editor uses this for handle drawing around obj.x, obj.y.
                    // If spring is connected, its "center" (obj.x,y) might be anywhere.
                    // But we want handles to encompass the spring?
                    // Or maybe just a central handle?
                    // Let's return a box around 0,0 that is large enough to be clicked/seen if we draw handles there?
                    // Better: Editor draws handles based on this. If we return 0, handles are at obj.x,y.
                    // That's fine.
                    minX = -20; minY = -20; maxX = 20; maxY = 20;
                } else {
                    // Unconnected placeholder stats
                    minX = -10; minY = -25; maxX = 10; maxY = 25;
                }
            }
        }

        // Include children
        const children = this.objects.filter(o => o.parent === obj.id);
        if (children.length > 0) {
            children.forEach(child => {
                const childBounds = this.getObjectBounds(child);
                if (childBounds.minX === Infinity) return; // Skip empty/invalid groups

                const s = child.scale || 1;
                // Child's position in parent (this obj) space
                const x = child.x || 0;
                const y = child.y || 0;

                // Approximate child's box in parent space (ignoring child rotation for simplicity in AABB)
                minX = Math.min(minX, x + childBounds.minX * s);
                minY = Math.min(minY, y + childBounds.minY * s);
                maxX = Math.max(maxX, x + childBounds.maxX * s);
                maxY = Math.max(maxY, y + childBounds.maxY * s);
            });
        }

        // Final safety: if still Infinity (e.g. empty group), return small default box?
        // Or better, return a box that won't ruin the parent.
        if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

        return { minX, minY, maxX, maxY };
    }

    /**
     * Helper for scripts to find an object by Name (from Hub)
     */
    findByName(name) {
        return this.objects.find(obj => obj.name === name) || this.objects.find(o => o.id === name);
    }

    emitAction(actionId) {
        if (!actionId) return;
        this.activeActions.add(actionId);
        console.log(`🎬 OviAction: ${actionId}`);
        if (this.onActionEmitted) this.onActionEmitted(actionId);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.emitAction('start');
        this.lastTime = performance.now();

        // Lifecycle Hook: onStart
        if (this.globalScript && this.globalScript.onStart) {
            try {
                console.log("🚀 Executing GlobalScript.onStart()...");
                this.globalScript.onStart(this);
            } catch (e) {
                console.error("❌ GlobalScript.onStart() Failed:", e);
            }
        }

        this.loop();
        console.log("▶️ Runtime started");
    }

    stop() {
        this.isRunning = false;
        console.log("⏸️ Runtime stopped");
    }

    updateInput() {
        this._clickHandled = false;

        // If actively dragging a path vertex, skip object selection to prevent interference
        if (this._draggingPath && this._draggingVertexIndex !== null && this.isMouseDown) {
            return; // Let the update() method handle vertex dragging
        }

        this.objects.slice().sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).forEach(obj => {
            if (obj.type === 'group') return;

            const world = this.getWorldTransform(obj);

            // Mouse Local calculation (Inverse Transform)
            const dx = this.mouseX - world.x;
            const dy = this.mouseY - world.y;

            const rad = -world.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const lx = (dx * cos - dy * sin) / world.scale;
            const ly = (dx * sin + dy * cos) / world.scale;

            let isHit = false;

            if (obj.type === 'vector_path') {
                if (!obj._path2d && obj.pathData) {
                    obj._path2d = new Path2D(obj.pathData);
                }
                if (obj._path2d) {
                    // Adjust local mouse for renderOffset (since path might be absolute)
                    let alx = lx;
                    let aly = ly;
                    if (obj.renderOffset) {
                        alx -= obj.renderOffset.x;
                        aly -= obj.renderOffset.y;
                    }
                    isHit = this.ctx.isPointInPath(obj._path2d, alx, aly);
                }
            } else if (obj.type === 'circle') {
                isHit = (lx * lx + ly * ly <= (obj.radius || 0) ** 2);
            } else if (obj.type === 'spring') {
                if (obj.targetA && obj.targetB) {
                    // Connected: Check strict line segment distance in World Space
                    // We need World Mouse (dX, dY are relative to Object Center, but Object Center might not be useful for Spring)
                    // Wait, the loop calculates `world` transform for `obj`.
                    // For a connected spring, `obj.x/y` might be irrelevant or 0 if parented.
                    // But we used `obj.x/y` as reference in Render loop if parent existed?
                    // Actually, connected spring renders from TargetA to TargetB in World Space.
                    // So we should check if Mouse is near the line segment (TargetA -> TargetB).

                    const bodyA = this.getObject(obj.targetA);
                    const bodyB = this.getObject(obj.targetB);
                    if (bodyA && bodyB) {
                        const wa = this.getWorldTransform(bodyA);
                        const wb = this.getWorldTransform(bodyB);

                        // Line Segment Distance
                        const x1 = wa.x, y1 = wa.y;
                        const x2 = wb.x, y2 = wb.y;
                        const mx = this.mouseX, my = this.mouseY;

                        const A = mx - x1, B = my - y1;
                        const C = x2 - x1, D = y2 - y1;
                        const dot = A * C + B * D;
                        const lenSq = C * C + D * D;
                        let param = -1;
                        if (lenSq !== 0) param = dot / lenSq;

                        let xx, yy;
                        if (param < 0) { xx = x1; yy = y1; }
                        else if (param > 1) { xx = x2; yy = y2; }
                        else { xx = x1 + param * C; yy = y1 + param * D; }

                        const dx = mx - xx;
                        const dy = my - yy;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        isHit = (dist <= (obj.width || 10) + 5); // +5 tolerance
                    }
                } else {
                    // Unconnected: Check local box (Placeholder Visual)
                    // Visual is approx 20x50 centered at obj.x,obj.y
                    // lx, ly are already local to obj.x,obj.y
                    isHit = (Math.abs(lx) <= 15 && Math.abs(ly) <= 30);
                }
            } else if (obj.width && obj.height) {
                isHit = (lx >= -obj.width / 2 && lx <= obj.width / 2 && ly >= -obj.height / 2 && ly <= obj.height / 2);
            } else if (obj.type === 'symbol') {
                const s = obj.size || 48;
                isHit = (lx >= -s / 2 && lx <= s / 2 && ly >= -s / 2 && ly <= s / 2);
            } else if (obj.type === 'path') {
                // Check if clicking on a vertex first
                if (this.isEditor && obj.points) {
                    let vertexHit = -1;
                    const vertexRadius = 6; // Click tolerance

                    for (let i = 0; i < obj.points.length; i++) {
                        const p = obj.points[i];
                        const dx = lx - p.x;
                        const dy = ly - p.y;
                        if (Math.sqrt(dx * dx + dy * dy) <= vertexRadius) {
                            vertexHit = i;
                            break;
                        }
                    }

                    if (vertexHit !== -1) {
                        isHit = true;
                        // Set global vertex dragging state on NEW click
                        if (this.isMouseDown && !this.clickProcessed && !this._clickHandled) {
                            this._draggingPath = obj;
                            this._draggingVertexIndex = vertexHit;
                        }
                    } else {
                        // Check if clicking on the path itself (AABB of all points)
                        const xs = obj.points.map(p => p.x);
                        const ys = obj.points.map(p => p.y);
                        const minX = Math.min(...xs) - 10;
                        const maxX = Math.max(...xs) + 10;
                        const minY = Math.min(...ys) - 10;
                        const maxY = Math.max(...ys) + 10;
                        isHit = (lx >= minX && lx <= maxX && ly >= minY && ly <= maxY);
                    }
                } else {
                    isHit = false;
                }
            }

            obj.isHovered = isHit;

            if (this.isMouseDown && !this.clickProcessed && isHit && !this._clickHandled) {
                obj._justClicked = true;
                this._clickHandled = true;
                // Only set dragging obj if not already dragging something
                if (!this._draggingObj) {
                    this._draggingObj = obj;
                }
            } else {
                obj._justClicked = false;
            }
        });

        // Also check UI controls for hover (needed for OviLink)
        const allControls = [
            ...(this.controls || []),
            ...(this.isEditor && window.oviEditor?.simulationData?.controls || [])
        ];

        allControls.forEach(control => {
            if (!control) return;

            // Simple bounding box check for controls
            const cx = control.x || 0;
            const cy = control.y || 0;
            const cw = control.width || 100;
            const ch = control.height || 40;

            const isHit = (
                this.mouseX >= cx - cw / 2 &&
                this.mouseX <= cx + cw / 2 &&
                this.mouseY >= cy - ch / 2 &&
                this.mouseY <= cy + ch / 2
            );

            control.isHovered = isHit;
        });

        if (this.isMouseDown) {
            this.clickProcessed = true;

            // OviLink: Handle connection mode
            if (this.isEditor && window.oviEditor && window.oviEditor._oviLinkMode) {
                const linkMode = window.oviEditor._oviLinkMode;

                // Check both runtime controls and simulationData controls
                const allControls = [
                    ...(this.controls || []),
                    ...(window.oviEditor.simulationData?.controls || [])
                ];

                console.log('🔗 OviLink: Looking for hovered control...', {
                    totalControls: allControls.length,
                    hoveredControls: allControls.filter(c => c.isHovered)
                });

                const clickedControl = allControls.find(c => c.isHovered);

                console.log('🔗 OviLink: Clicked control:', clickedControl, 'has binding?', !!clickedControl?.binding);

                if (clickedControl) {
                    // Ensure binding exists
                    if (!clickedControl.binding) {
                        clickedControl.binding = {};
                    }

                    // Generate or use existing Action ID
                    const actionId = clickedControl.binding.actionId || `action_${clickedControl.id}`;

                    // Update the control's Action ID
                    if (!clickedControl.binding.actionId) {
                        clickedControl.binding.actionId = actionId;
                    }

                    // Update the target behavior's activation ID
                    const targetObj = this.getObject(linkMode.targetId);
                    if (targetObj) {
                        if (!targetObj._behaviorParams) targetObj._behaviorParams = {};
                        if (!targetObj._behaviorParams[linkMode.behaviorId]) {
                            targetObj._behaviorParams[linkMode.behaviorId] = {};
                        }
                        targetObj._behaviorParams[linkMode.behaviorId][linkMode.paramName] = actionId;

                        console.log(`✅ OviLink: Connected "${clickedControl.id}" → "${targetObj.id}.${linkMode.behaviorId}" via "${actionId}"`);
                    }


                    // Reset button state
                    if (linkMode.button) {
                        linkMode.button.innerHTML = '🔗 Link';
                        linkMode.button.style.background = '#27ae60';
                    }

                    // Exit connection mode
                    delete window.oviEditor._oviLinkMode;
                    if (this.canvas) this.canvas.style.cursor = 'default';

                    // Refresh Inspector
                    if (window.oviEditor.selectedObject && this.isEditor) {
                        // Trigger re-render by temporarily clearing selection
                        const temp = window.oviEditor.selectedObject;
                        window.oviEditor.selectedObject = null;
                        setTimeout(() => window.oviEditor.selectedObject = temp, 10);
                    }
                }
            }
        }
    }

    loop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.updateInput(); // Calculate hover/clicks FIRST
        this.update(dt);    // Then update based on input state
        this.render();

        requestAnimationFrame(() => this.loop());
    }

    resize(width, height) {
        if (!width || !height || width <= 0 || height <= 0) return;

        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;

        console.log(`📏 Runtime Resized to ${width}x${height}`);

        // Force a re-render immediately to avoid flicker
        this.render();
    }


    // Check if point is inside Selection handle
    getHandleAt(x, y) {
        // ... (Optional: Implement if needed for Editor interaction, usually Editor handles this via render)
        // But here we just return active handle if any.
        // For simplicity, we assume Editor handles the logic of checking handles array.
        return null;
    }

    drawHandle(x, y, type, cursor, obj) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 1;

        const size = 6;
        this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
        this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);

        // Store for hit testing if Editor uses it
        // this.handles.push({ x, y, size, type, cursor, obj });
    }

    drawSelectionHandles(obj) {
        this.ctx.save();

        // Selection outline
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        if (obj.type === 'circle') {
            // Circle outline
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, obj.radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();

            // Center point
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Resize handles (4 cardinal points)
            const handlePositions = [
                { x: obj.x + obj.radius, y: obj.y, cursor: 'ew-resize', dir: 'e' },
                { x: obj.x - obj.radius, y: obj.y, cursor: 'ew-resize', dir: 'w' },
                { x: obj.x, y: obj.y + obj.radius, cursor: 'ns-resize', dir: 's' },
                { x: obj.x, y: obj.y - obj.radius, cursor: 'ns-resize', dir: 'n' }
            ];

            handlePositions.forEach(pos => {
                this.drawHandle(pos.x, pos.y, `resize-${pos.dir}`, pos.cursor, obj);
            });

        } else {
            // Generic Rectangular Handles (Rect, Text, Vector Path, etc.)
            // Support width/height or default
            const w = obj.width || 50;
            const h = obj.height || 50;

            // If Vector Path, the 'x,y' is the origin, but the shape might be offset?
            // If pathData is absolute, and x,y=0...
            // So drawing handles at 0,0 is wrong.
            // We need to know the 'Center' of the shape.
            // VectorEditor typically centers anchor? 
            // In my implementation: x,y = Translation. Path = Original Coords.
            // To draw specific handles around the visual shape, we need the Bound Center.
            // For now, let's assume if it has width/height, it's relative to x/y OR 
            // if vector_path, we might need a specific fix if it feels detached.
            // BUT: Standard OviState objects use Center Anchor.
            // Let's draw handles around (obj.x, obj.y) with w/h.

            // Adjust for vector_path offset if needed?
            // If the user drags it, obj.x/y changes.
            // The visual shape moves.
            // So handles at obj.x/y match the movement.
            // The only issue is INITIAL position (Path absolute vs x,y=0).
            // If Path is at 350,250... and obj.x=0... handles at 0,0 will be far away.
            // FIX: Identify if Vector Path, and use a 'visualCenter' if available?
            // Or rely on user dragging it to snap?
            // Better: In VectorEditor, we should ideally normalize the path to be relative to 0,0 and set x,y to center.
            // BUT that is complex math (parsing path, shifting all points).
            // ALTERNATIVE: Use baseX/baseY from VectorEditor?
            // VectorEditor sent: x: tx, y: ty. (Translation).
            // And pathData (Absolute).
            // If I draw selection handles at (obj.x + offset?), it might match.
            // But 'offset' is unknown here without parsing path.
            // Lets try drawing at obj.x, obj.y. If it's wrong, we know we need Path Normalization.
            // However, generic fallback is better than nothing.

            const cx = obj.x;
            const cy = obj.y;

            // Visual Outline
            // If vector_path, the rect might not align with shape if shape is offset.
            // We Draw stroke rect.

            this.ctx.strokeRect(cx - w / 2 - 5, cy - h / 2 - 5, w + 10, h + 10);

            const handlePositions = [
                { x: cx - w / 2, y: cy - h / 2, cursor: 'nwse-resize', dir: 'nw' },
                { x: cx + w / 2, y: cy - h / 2, cursor: 'nesw-resize', dir: 'ne' },
                { x: cx + w / 2, y: cy + h / 2, cursor: 'nwse-resize', dir: 'se' },
                { x: cx - w / 2, y: cy + h / 2, cursor: 'nesw-resize', dir: 'sw' },
                { x: cx, y: cy - h / 2, cursor: 'ns-resize', dir: 'n' },
                { x: cx, y: cy + h / 2, cursor: 'ns-resize', dir: 's' },
                { x: cx - w / 2, y: cy, cursor: 'ew-resize', dir: 'w' },
                { x: cx + w / 2, y: cy, cursor: 'ew-resize', dir: 'e' }
            ];

            handlePositions.forEach(pos => {
                this.drawHandle(pos.x, pos.y, `resize-${pos.dir}`, pos.cursor, obj);
            });

            // Rotation Handle
            const rotX = cx;
            const rotY = cy - h / 2 - 25;

            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy - h / 2 - 5);
            this.ctx.lineTo(rotX, rotY + 6);
            this.ctx.stroke();

            this.drawHandle(rotX, rotY, 'rotate', 'grab', obj);
        }

        this.ctx.restore();
    }

    update(dt) {
        // Global action reset at START of frame ensures actions emitted 
        // between frames (async clicks) are seen by behaviors.
        this.activeActions.clear();

        // Handle Path Vertex Dragging (Editor Only) - using GLOBAL state
        if (this.isEditor && this._draggingPath && this._draggingVertexIndex !== null) {
            const obj = this._draggingPath;
            const vertexIndex = this._draggingVertexIndex;

            // Calculate local mouse position
            const world = this.getWorldTransform(obj);
            const dx = this.mouseX - world.x;
            const dy = this.mouseY - world.y;
            const rad = -world.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const lx = (dx * cos - dy * sin) / world.scale;
            const ly = (dx * sin + dy * cos) / world.scale;

            // Update vertex position
            if (obj.points && obj.points[vertexIndex]) {
                obj.points[vertexIndex].x = lx;
                obj.points[vertexIndex].y = ly;
            }
        }

        // 1. Update Logic Nodes (Timers, etc.)
        this.updateLogicNodes(dt);

        // 2. Apply Bindings (Data flow from Logic -> Properties)
        this.applyBindings();

        /* ... continue original update ... */

        /* [Methods injected here for context, but in reality they should be outside update. 
           Since replace_file_content replaces a block, I will close update and add methods, 
           then reopen the original update's next lines? No, that's messy.
           
           Better: I will insert the method calls in update(), AND add the method definitions 
           at the END of the file or before update(). 
           
           Actually, I can add methods recursively? No.
           
           Strategy: 
           1. Insert calls at start of update(). 
           2. Use a separate tool call to append the new methods to the class.
        */

        // Registry Shim for Runtime - Improved with default fallbacks
        const registry = {
            getParameter: (obj, behaviorId, paramName) => {
                // 1. Check instance-level params (Runtime)
                if (obj._behaviorParams && obj._behaviorParams[behaviorId] && obj._behaviorParams[behaviorId][paramName] !== undefined) {
                    return obj._behaviorParams[behaviorId][paramName];
                }
                // 2. Check object-level params (Editor/Static)
                if (obj.behaviorParams && obj.behaviorParams[behaviorId] && obj.behaviorParams[behaviorId][paramName] !== undefined) {
                    return obj.behaviorParams[behaviorId][paramName];
                }
                // 3. Check direct properties
                if (obj[paramName] !== undefined) return obj[paramName];

                // 4. Fallback to hardcoded defaults for new behaviors if registry not fully accessible
                const defaults = {
                    'shake_on_action': { 'actionID': 'shake', 'intensity': 5, 'duration': 0.5 }
                };
                if (defaults[behaviorId] && defaults[behaviorId][paramName] !== undefined) {
                    return defaults[behaviorId][paramName];
                }

                return undefined;
            }
        };


        // Apply behaviors
        this.objects.forEach(obj => {
            if (obj.behaviors && obj.behaviors.length > 0) {
                obj.behaviors.forEach(behaviorId => {
                    const behavior = this.behaviors.get(behaviorId);
                    if (behavior) {
                        try {
                            if (typeof behavior === 'function') behavior(obj, dt, this, registry);
                            else if (behavior.update) behavior.update(obj, dt, this, registry);
                        } catch (e) { }
                    }
                });
            }
        });

        // Apply global script
        if (this.globalScript) {
            if (this.globalScript.onUpdate) {
                try { this.globalScript.onUpdate(dt, this.objects, this); } catch (e) { }
            } else if (this.globalScript.update) {
                try { this.globalScript.update(this.objects, this, dt); } catch (e) { }
            }
        }

        // Physics
        if (this.enablePhysics) {
            // 0. Spring Physics (Injection / Advanced)
            this.objects.forEach(spring => {
                if (spring.type === 'spring' && spring.physics && spring.physics.enabled) {
                    const bodyA = this.getObject(spring.targetA);
                    const bodyB = this.getObject(spring.targetB);
                    if (bodyA && bodyB && bodyA.physics && bodyB.physics) {
                        // 1. Resolve World Positions of Anchors
                        const wa = this.getWorldTransform(bodyA);
                        const wb = this.getWorldTransform(bodyB);

                        const ax = spring.anchorA?.x || 0, ay = spring.anchorA?.y || 0;
                        const bx = spring.anchorB?.x || 0, by = spring.anchorB?.y || 0;

                        const cosA = Math.cos(wa.rotation * Math.PI / 180), sinA = Math.sin(wa.rotation * Math.PI / 180);
                        const worldAx = wa.x + (ax * cosA - ay * sinA) * wa.scale;
                        const worldAy = wa.y + (ax * sinA + ay * cosA) * wa.scale;

                        const cosB = Math.cos(wb.rotation * Math.PI / 180), sinB = Math.sin(wb.rotation * Math.PI / 180);
                        const worldBx = wb.x + (bx * cosB - by * sinB) * wb.scale;
                        const worldBy = wb.y + (bx * sinB + by * cosB) * wb.scale;

                        const dx = worldBx - worldAx;
                        const dy = worldBy - worldAy;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 0.1) return; // Singularity check

                        // 2. Spring Force calculation
                        const restLen = spring.length || 100;
                        const stiffness = spring.stiffness || 0.1;
                        const diff = dist - restLen;

                        // Higher scaling factor (80 instead of 50) to ensure distance stability
                        const forceMagnitude = diff * stiffness * 80;

                        const fx = (dx / dist) * forceMagnitude;
                        const fy = (dy / dist) * forceMagnitude;

                        // 3. Application to Body A
                        if (bodyA.physics.enabled && !bodyA.physics.static && !bodyA.physics.isConstraint) {
                            if (!bodyA.physics.velocity) bodyA.physics.velocity = { x: 0, y: 0 };

                            // Linear Acceleration
                            bodyA.physics.velocity.x += fx * dt;
                            bodyA.physics.velocity.y += fy * dt;

                            // Torque (Lever edge)
                            if (!bodyA.physics.lockRotation) {
                                // r = vector from center to anchor
                                const rx = worldAx - wa.x;
                                const ry = worldAy - wa.y;
                                // torque = rx*fy - ry*fx
                                const torque = rx * fy - ry * fx;
                                bodyA.physics.angularVelocity = (bodyA.physics.angularVelocity || 0) + torque * 0.005 * dt;
                            }
                        }

                        // 4. Application to Body B (Opposite force)
                        if (bodyB.physics.enabled && !bodyB.physics.static && !bodyB.physics.isConstraint) {
                            if (!bodyB.physics.velocity) bodyB.physics.velocity = { x: 0, y: 0 };

                            bodyB.physics.velocity.x -= fx * dt;
                            bodyB.physics.velocity.y -= fy * dt;

                            if (!bodyB.physics.lockRotation) {
                                const rx = worldBx - wb.x;
                                const ry = worldBy - wb.y;
                                const torque = rx * (-fy) - ry * (-fx);
                                bodyB.physics.angularVelocity = (bodyB.physics.angularVelocity || 0) + torque * 0.005 * dt;
                            }
                        }

                        // 5. Specialized Damping (Relative velocity damping)
                        const va = bodyA.physics.velocity || { x: 0, y: 0 };
                        const vb = bodyB.physics.velocity || { x: 0, y: 0 };
                        const damping = (spring.damping || 0.5) * 5.0; // Increased damping factor

                        const rvx = vb.x - va.x;
                        const rvy = vb.y - va.y;

                        if (bodyA.physics.enabled && !bodyA.physics.static && !bodyA.physics.isConstraint) {
                            bodyA.physics.velocity.x += rvx * damping * dt;
                            bodyA.physics.velocity.y += rvy * damping * dt;
                        }
                        if (bodyB.physics.enabled && !bodyB.physics.static && !bodyB.physics.isConstraint) {
                            bodyB.physics.velocity.x -= rvx * damping * dt;
                            bodyB.physics.velocity.y -= rvy * damping * dt;
                        }
                    }
                }
            });

            // 1. Integration & Bounds
            this.objects.forEach(obj => {
                if (obj.physics && obj.physics.enabled && !obj.physics.static) {
                    if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
                    if (obj.physics.angularVelocity === undefined) obj.physics.angularVelocity = 0;
                    if (obj.physics.mass === undefined) obj.physics.mass = 1;

                    const scale = (obj.physics.gravityScale !== undefined) ? obj.physics.gravityScale : 1;
                    obj.physics.velocity.y += this.gravity * scale * dt;
                    obj.physics.velocity.x += this.gravityX * scale * dt;

                    if (this.friction) {
                        obj.physics.velocity.x *= (1 - this.friction * dt);
                        obj.physics.velocity.y *= (1 - this.friction * dt);
                    }

                    // Angular Damping & Stability
                    const damping = obj.physics.angularDamping !== undefined ? obj.physics.angularDamping : 0.1;
                    obj.physics.angularVelocity *= (1 - damping * dt * 10);

                    // Auto-Uprighting Torque (Self-Leveling)
                    const uprightStrength = obj.physics.uprightStrength || 0;
                    if (uprightStrength > 0 && !obj.physics.lockRotation) {
                        let currentRot = (obj.rotation || 0) % 360;
                        if (currentRot > 180) currentRot -= 360;
                        if (currentRot < -180) currentRot += 360;

                        // Apply counter-torque to pull towards 0
                        const targetAngle = 0;
                        const angleDiff = (targetAngle - currentRot) * Math.PI / 180;
                        obj.physics.angularVelocity += angleDiff * uprightStrength * dt * 10;
                    }

                    if (obj.physics.lockRotation) {
                        obj.physics.angularVelocity = 0;
                        obj.rotation = obj.rotation || 0; // Keep current
                    }

                    obj.x += obj.physics.velocity.x * dt;
                    obj.y += obj.physics.velocity.y * dt;

                    if (!obj.physics.lockRotation) {
                        obj.rotation += (obj.physics.angularVelocity || 0) * dt * (180 / Math.PI);
                    }

                    const bounciness = obj.physics.bounciness !== undefined ? obj.physics.bounciness : this.wallBounciness;

                    // Hierarchy-Aware World Bounds
                    const bounds = this.getObjectBounds(obj);
                    if (obj.y + bounds.maxY > this.height) {
                        obj.y = this.height - bounds.maxY;
                        obj.physics.velocity.y *= -bounciness;
                        obj.physics.angularVelocity *= 0.9; // Friction with ground
                    }
                    if (obj.y + bounds.minY < 0) { obj.y = -bounds.minY; obj.physics.velocity.y *= -bounciness; }
                    if (obj.x + bounds.maxX > this.width) { obj.x = this.width - bounds.maxX; obj.physics.velocity.x *= -bounciness; }
                    if (obj.x + bounds.minX < 0) { obj.x = -bounds.minX; obj.physics.velocity.x *= -bounciness; }
                }
            });

            // 2. Resolve Physical Collisions (Solid & Dynamic)
            const resolveCollision = (a, b) => {
                const getColliders = (obj) => {
                    const res = [];
                    const world = this.getWorldTransform(obj);
                    const isCircle = obj.type === 'circle';

                    if (obj.type === 'path') {
                        const points = obj.points || [];
                        if (points.length >= 2) {
                            for (let i = 0; i < points.length - (obj.closed ? 0 : 1); i++) {
                                const p1 = points[i];
                                const p2 = points[(i + 1) % points.length];

                                // Transform points to world space
                                const rad = world.rotation * Math.PI / 180;
                                const cos = Math.cos(rad);
                                const sin = Math.sin(rad);

                                const wx1 = world.x + (p1.x * cos - p1.y * sin) * world.scale;
                                const wy1 = world.x + (p1.x * sin + p1.y * cos) * world.scale; // Typo in original logic? Wait.
                                const wy1_fixed = world.y + (p1.x * sin + p1.y * cos) * world.scale;

                                const wx2 = world.x + (p2.x * cos - p2.y * sin) * world.scale;
                                const wy2 = world.y + (p2.x * sin + p2.y * cos) * world.scale;

                                const cx = (wx1 + wx2) / 2;
                                const cy = (wy1_fixed + wy2) / 2;
                                const len = Math.sqrt((wx2 - wx1) ** 2 + (wy2 - wy1_fixed) ** 2);
                                const ang = Math.atan2(wy2 - wy1_fixed, wx2 - wx1) * 180 / Math.PI;

                                res.push({
                                    obj,
                                    world: { x: cx, y: cy, rotation: ang, scale: 1 },
                                    isCircle: false,
                                    w: len,
                                    h: (obj.width || 4) * world.scale, // Stroke width as thickness
                                    r: 0
                                });
                            }
                        }
                    } else if (obj.type !== 'group') {
                        res.push({
                            obj, world, isCircle,
                            w: (obj.width || (obj.type === 'symbol' ? obj.size : 50) || 50) * world.scale,
                            h: (obj.height || (obj.type === 'symbol' ? obj.size : 50) || 50) * world.scale,
                            r: (obj.radius || 30) * world.scale
                        });
                    }

                    const children = this.objects.filter(o => o.parent === obj.id);
                    children.forEach(c => {
                        const cw = this.getWorldTransform(c);
                        res.push({
                            obj: c, world: cw, isCircle: c.type === 'circle',
                            w: (c.width || (c.type === 'symbol' ? c.size : 50) || 50) * cw.scale,
                            h: (c.height || (c.type === 'symbol' ? c.size : 50) || 50) * cw.scale,
                            r: (c.radius || 30) * cw.scale
                        });
                    });
                    return res;
                };

                const collsA = getColliders(a);
                const collsB = getColliders(b);

                collsA.forEach(ca => {
                    collsB.forEach(cb => {
                        let nx = 0, ny = 0, overlap = Infinity, collided = false;

                        if (ca.isCircle && cb.isCircle) {
                            const dx = ca.world.x - cb.world.x, dy = ca.world.y - cb.world.y;
                            const distSq = dx * dx + dy * dy, minDist = ca.r + cb.r;
                            if (distSq < minDist * minDist) {
                                if (distSq < 0.0001) { nx = 0; ny = -1; overlap = minDist; }
                                else { const dist = Math.sqrt(distSq); nx = dx / dist; ny = dy / dist; overlap = minDist - dist; }
                                collided = true;
                            }
                        } else if (ca.isCircle || cb.isCircle) {
                            const circle = ca.isCircle ? ca : cb;
                            const rect = ca.isCircle ? cb : ca;
                            const dx = circle.world.x - rect.world.x, dy = circle.world.y - rect.world.y;
                            const rad = -rect.world.rotation * Math.PI / 180;
                            const cos = Math.cos(rad), sin = Math.sin(rad);
                            const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
                            const closestX = Math.max(-rect.w / 2, Math.min(lx, rect.w / 2));
                            const closestY = Math.max(-rect.h / 2, Math.min(ly, rect.h / 2));
                            const ldx = lx - closestX, ldy = ly - closestY, distSq = ldx * ldx + ldy * ldy;
                            if (distSq < circle.r * circle.r) {
                                if (distSq < 0.0001) { nx = 0; ny = -1; overlap = circle.r + rect.h / 2; }
                                else {
                                    const dist = Math.sqrt(distSq); nx = (ldx / dist); ny = (ldy / dist);
                                    const wrad = rect.world.rotation * Math.PI / 180, wcos = Math.cos(wrad), wsin = Math.sin(wrad);
                                    const tx = nx; nx = tx * wcos - ny * wsin; ny = tx * wsin + ny * wcos;
                                    overlap = circle.r - dist;
                                }
                                if (ca !== circle) { nx = -nx; ny = -ny; }
                                collided = true;
                            }
                        } else {
                            const getVertices = (c) => {
                                const r = c.world.rotation * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r), hw = c.w / 2, hh = c.h / 2;
                                return [
                                    { x: c.world.x + (-hw * cos - -hh * sin), y: c.world.y + (-hw * sin + -hh * cos) },
                                    { x: c.world.x + (hw * cos - -hh * sin), y: c.world.y + (hw * sin + -hh * cos) },
                                    { x: c.world.x + (hw * cos - hh * sin), y: c.world.y + (hw * sin + hh * cos) },
                                    { x: c.world.x + (-hw * cos - hh * sin), y: c.world.y + (-hw * sin + hh * cos) }
                                ];
                            };
                            const vertsA = getVertices(ca), vertsB = getVertices(cb), axes = [];
                            [ca, cb].forEach(c => {
                                const r = c.world.rotation * Math.PI / 180;
                                axes.push({ x: Math.cos(r), y: Math.sin(r) });
                                axes.push({ x: -Math.sin(r), y: Math.cos(r) });
                            });
                            collided = true;
                            for (let axis of axes) {
                                const proj = (verts, axs) => {
                                    let min = Infinity, max = -Infinity;
                                    verts.forEach(v => { const p = v.x * axs.x + v.y * axs.y; min = Math.min(min, p); max = Math.max(max, p); });
                                    return { min, max };
                                };
                                const pAA = proj(vertsA, axis), pBB = proj(vertsB, axis);
                                const ov = Math.min(pAA.max, pBB.max) - Math.max(pAA.min, pBB.min);
                                if (ov <= 0) { collided = false; break; }
                                if (ov < overlap) {
                                    overlap = ov; const dot = (ca.world.x - cb.world.x) * axis.x + (ca.world.y - cb.world.y) * axis.y;
                                    nx = dot > 0 ? axis.x : -axis.x; ny = dot > 0 ? axis.y : -axis.y;
                                }
                            }
                        }

                        if (collided) {
                            const dynA = a.physics && a.physics.enabled, dynB = b.physics && b.physics.enabled;
                            const mA = dynA ? (a.physics.mass || 1) : Infinity;
                            const mB = dynB ? (b.physics.mass || 1) : Infinity;
                            const invMA = dynA ? 1 / mA : 0, invMB = dynB ? 1 / mB : 0;

                            // Positional Correction (Anti-penetration using mass ratios)
                            const totalInvM = invMA + invMB;
                            if (totalInvM > 0) {
                                const ratioA = invMA / totalInvM, ratioB = invMB / totalInvM;
                                if (dynA) { a.x += nx * overlap * ratioA; a.y += ny * overlap * ratioA; }
                                if (dynB) { b.x -= nx * overlap * ratioB; b.y -= ny * overlap * ratioB; }
                            }

                            // Inertia Calculations
                            const getInertia = (obj, mass) => {
                                const w = obj.width || 50, h = obj.height || 50;
                                if (obj.type === 'circle') return 0.5 * mass * (obj.radius || 30) ** 2;
                                return (1 / 12) * mass * (w * w + h * h);
                            };
                            const iA = dynA ? getInertia(a, mA) : Infinity;
                            const iB = dynB ? getInertia(b, mB) : Infinity;
                            const invIA = dynA ? 1 / iA : 0, invIB = dynB ? 1 / iB : 0;

                            // Contact Point Logic
                            // Find deepest vertex in direction of normal to generate torque
                            let contactX = 0, contactY = 0;
                            if (ca.isCircle && cb.isCircle) {
                                contactX = cb.world.x + nx * cb.r;
                                contactY = cb.world.y + ny * cb.r;
                            } else {
                                // Find furthest vertex of ca in direction -nx,-ny (into cb)
                                const getVerts = (c) => {
                                    if (c.isCircle) return [{ x: c.world.x - nx * c.r, y: c.world.y - ny * c.r }];
                                    const r = c.world.rotation * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r), hw = c.w / 2, hh = c.h / 2;
                                    return [
                                        { x: c.world.x + (-hw * cos - -hh * sin), y: c.world.y + (-hw * sin + -hh * cos) },
                                        { x: c.world.x + (hw * cos - -hh * sin), y: c.world.y + (hw * sin + -hh * cos) },
                                        { x: c.world.x + (hw * cos - hh * sin), y: c.world.y + (hw * sin + hh * cos) },
                                        { x: c.world.x + (-hw * cos - hh * sin), y: c.world.y + (-hw * sin + hh * cos) }
                                    ];
                                };
                                const vertsA = getVerts(ca);
                                let bestDist = Infinity, bestV = vertsA[0];
                                vertsA.forEach(v => {
                                    const d = (v.x - cb.world.x) * nx + (v.y - cb.world.y) * ny;
                                    if (d < bestDist) { bestDist = d; bestV = v; }
                                });
                                contactX = bestV.x; contactY = bestV.y;
                            }

                            const rAX = contactX - a.x, rAY = contactY - a.y;
                            const rBX = contactX - b.x, rBY = contactY - b.y;

                            const vAX = (a.physics?.velocity?.x || 0) + (-(a.physics?.angularVelocity || 0) * rAY);
                            const vAY = (a.physics?.velocity?.y || 0) + ((a.physics?.angularVelocity || 0) * rAX);
                            const vBX = (b.physics?.velocity?.x || 0) + (-(b.physics?.angularVelocity || 0) * rBY);
                            const vBY = (b.physics?.velocity?.y || 0) + ((b.physics?.angularVelocity || 0) * rBX);

                            const relVelX = vAX - vBX, relVelY = vAY - vBY;
                            const velAlongNormal = relVelX * nx + relVelY * ny;

                            if (velAlongNormal < 0) {
                                const resA = a.physics?.bounciness !== undefined ? a.physics.bounciness : (a.isSolid ? (a.solidBounciness || 0.8) : this.wallBounciness);
                                const resB = b.physics?.bounciness !== undefined ? b.physics.bounciness : (b.isSolid ? (b.solidBounciness || 0.8) : this.wallBounciness);
                                const e = resA * resB;

                                // Cross products for torque: (r x n)
                                const rAn = rAX * ny - rAY * nx;
                                const rBn = rBX * ny - rBY * nx;

                                // Impulse scalar J
                                const j = -(1 + e) * velAlongNormal / (invMA + invMB + (rAn * rAn * invIA) + (rBn * rBn * invIB));

                                if (dynA) {
                                    a.physics.velocity.x += j * nx * invMA;
                                    a.physics.velocity.y += j * ny * invMA;
                                    a.physics.angularVelocity += rAn * j * invIA;
                                }
                                if (dynB) {
                                    b.physics.velocity.x -= j * nx * invMB;
                                    b.physics.velocity.y -= j * ny * invMB;
                                    b.physics.angularVelocity -= rBn * j * invIB;
                                }
                            }
                        }
                    });
                });
            };

            for (let i = 0; i < this.objects.length; i++) {
                const a = this.objects[i];
                if (!(a.physics && a.physics.enabled)) continue;
                for (let j = 0; j < this.objects.length; j++) {
                    if (i === j) continue;
                    const b = this.objects[j];
                    if (b.physics && b.physics.enabled && i >= j) continue;
                    if (b.isSolid || b.type === 'path' || (b.physics && b.physics.enabled)) resolveCollision(a, b);
                }
            }
            // 3. Resolve Joints (Constraints)
            this.objects.filter(obj => obj.type === 'joint').forEach(joint => {
                const bodyA = this.getObject(joint.targetA);
                const bodyB = this.getObject(joint.targetB);
                if (!bodyA || !bodyB) return;

                // Breakable logic
                if (joint.breakable && joint._broken) return;

                const wa = this.getWorldTransform(bodyA);
                const wb = this.getWorldTransform(bodyB);

                const ax = joint.anchorA?.x || 0, ay = joint.anchorA?.y || 0;
                const bx = joint.anchorB?.x || 0, by = joint.anchorB?.y || 0;

                const radA = wa.rotation * Math.PI / 180, cosA = Math.cos(radA), sinA = Math.sin(radA);
                const p1x = wa.x + (ax * cosA - ay * sinA) * wa.scale;
                const p1y = wa.y + (ax * sinA + ay * cosA) * wa.scale;
                const radB = wb.rotation * Math.PI / 180, cosB = Math.cos(radB), sinB = Math.sin(radB);
                const p2x = wb.x + (bx * cosB - by * sinB) * wb.scale;
                const p2y = wb.y + (bx * sinB + by * cosB) * wb.scale;

                const dx = p2x - p1x, dy = p2y - p1y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Check for breakage
                if (joint.breakable && joint.breakForce > 0) {
                    if (dist > joint.breakForce) {
                        joint._broken = true;
                        if (this.isEditor && window.showOviToast) window.showOviToast("💥 Joint Broken!");
                        return;
                    }
                }

                const strength = joint.strength !== undefined ? joint.strength : 0.5;
                const invMA = (bodyA.physics && bodyA.physics.enabled) ? 1 / (bodyA.physics.mass || 1) : 0;
                const invMB = (bodyB.physics && bodyB.physics.enabled) ? 1 / (bodyB.physics.mass || 1) : 0;
                if (invMA + invMB === 0) return;

                if (joint.subtype === 'motor') {
                    // Motor logic
                    const speed = joint.motorSpeed || 0;
                    const torque = (joint.motorTorque || 100) * strength;
                    if (bodyB.physics && !bodyB.physics.lockRotation) {
                        if (bodyB.physics.angularVelocity === undefined) bodyB.physics.angularVelocity = 0;
                        const diff = speed - bodyB.physics.angularVelocity;
                        bodyB.physics.angularVelocity += diff * torque * dt;
                    }
                    // Motor usually acts as a hinge too
                    this.resolveDistanceConstraintInCore(bodyA, bodyB, dx, dy, 0, strength, invMA, invMB);
                }
                else if (joint.subtype === 'hinge' || joint.subtype === 'fixed') {
                    this.resolveDistanceConstraintInCore(bodyA, bodyB, dx, dy, 0, strength, invMA, invMB);

                    if (joint.subtype === 'fixed') {
                        // Keep relative rotation
                        const targetRotDiff = joint._initialRotDiff || 0;
                        if (joint._initialRotDiff === undefined) {
                            joint._initialRotDiff = (bodyB.rotation || 0) - (bodyA.rotation || 0);
                        } else {
                            const currentDiff = (bodyB.rotation || 0) - (bodyA.rotation || 0);
                            const rotError = targetRotDiff - currentDiff;
                            if (bodyB.physics && !bodyB.physics.lockRotation) {
                                bodyB.rotation += rotError * strength;
                            }
                        }
                    }
                }
                else if (joint.subtype === 'rope') {
                    const maxDist = joint.length || 100;
                    if (dist > maxDist) {
                        this.resolveDistanceConstraintInCore(bodyA, bodyB, dx, dy, maxDist, strength, invMA, invMB);
                    }
                }
                else if (joint.subtype === 'prismatic') {
                    // Prismatic along axis
                    const axisAngle = (joint.axisAngle || 0) * Math.PI / 180;
                    const axisX = Math.cos(axisAngle), axisY = Math.sin(axisAngle);
                    const dot = dx * axisX + dy * axisY;
                    const projX = axisX * dot, projY = axisY * dot;
                    const perpX = dx - projX, perpY = dy - projY;

                    const ratioA = invMA / (invMA + invMB), ratioB = invMB / (invMA + invMB);
                    if (bodyA.physics && bodyA.physics.enabled) { bodyA.x += perpX * ratioA * strength; bodyA.y += perpY * ratioA * strength; }
                    if (bodyB.physics && bodyB.physics.enabled) { bodyB.x -= perpX * ratioB * strength; bodyB.y -= perpY * ratioB * strength; }
                }
            });

            // 5. Update Trigger Zones
            this.objects.filter(obj => obj.type === 'trigger_zone').forEach(trigger => {
                const currentlyInside = [];
                const shape = trigger.shape || 'rectangle';
                const filterTag = trigger.filterTag || '';
                const filterName = trigger.filterName || '';
                const requiredStayTime = (trigger.requiredStayTime || 0) / 1000;
                const cooldown = (trigger.cooldown || 0) / 1000;

                // Handle Cooldown
                if (trigger._cooldownTimer > 0) trigger._cooldownTimer -= dt;

                this.objects.forEach(other => {
                    if (other === trigger || other.type === 'trigger_zone') return;

                    // Filtering
                    if (filterTag && (!other.tags || !other.tags.includes(filterTag))) return;
                    if (filterName && other.name !== filterName && other.id !== filterName) return;

                    // Overlap Detection
                    let overlap = false;
                    const ow = (other.width || 50) / 2;
                    const oh = (other.height || 50) / 2;

                    if (shape === 'rectangle') {
                        const tw = trigger.width || 100;
                        const th = trigger.height || 100;
                        const tx1 = trigger.x - tw / 2, tx2 = trigger.x + tw / 2;
                        const ty1 = trigger.y - th / 2, ty2 = trigger.y + th / 2;

                        const ox1 = other.x - ow, ox2 = other.x + ow;
                        const oy1 = other.y - oh, oy2 = other.y + oh;
                        overlap = !(ox1 > tx2 || ox2 < tx1 || oy1 > ty2 || oy2 < ty1);
                    } else if (shape === 'circle') {
                        const tr = trigger.radius || 60;
                        const dx = other.x - trigger.x;
                        const dy = other.y - trigger.y;
                        const distSq = dx * dx + dy * dy;
                        // Simple check: treat 'other' as a circle for speed, or a point
                        // For better accuracy, we could use Circle-Rect but this is usually fine for Trigger Zones
                        const combinedRadius = tr + Math.max(ow, oh);
                        overlap = distSq < combinedRadius * combinedRadius;
                    }

                    if (overlap) {
                        currentlyInside.push(other.id);

                        // Track Stay Time
                        if (!trigger._stayTimers) trigger._stayTimers = {};
                        if (trigger._stayTimers[other.id] === undefined) trigger._stayTimers[other.id] = 0;
                        trigger._stayTimers[other.id] += dt;

                        // onEnter? (Only if cooldown is done and STAY requirement met)
                        const isStaying = trigger._staying && trigger._staying.includes(other.id);
                        const stayMet = trigger._stayTimers[other.id] >= requiredStayTime;
                        const hasFiredEnter = trigger._firedEnter && trigger._firedEnter.includes(other.id);

                        if (!hasFiredEnter && stayMet && (trigger._cooldownTimer || 0) <= 0) {
                            this.fireLogicEvent(trigger, 'onEnter', { otherId: other.id });
                            if (!trigger._firedEnter) trigger._firedEnter = [];
                            trigger._firedEnter.push(other.id);

                            if (cooldown > 0) trigger._cooldownTimer = cooldown;
                            if (trigger.triggerOnce) trigger._disabled = true;
                        }

                        // onStay?
                        this.fireLogicEvent(trigger, 'onStay', { otherId: other.id, time: trigger._stayTimers[other.id] });
                    } else {
                        // Reset stay timer if they left
                        if (trigger._stayTimers && trigger._stayTimers[other.id] !== undefined) {
                            delete trigger._stayTimers[other.id];
                        }
                        // Reset firedEnter flag if they left (so it triggers again on re-entry)
                        if (trigger._firedEnter) {
                            const idx = trigger._firedEnter.indexOf(other.id);
                            if (idx !== -1) trigger._firedEnter.splice(idx, 1);
                        }
                    }
                });

                // onExit?
                if (trigger._staying) {
                    trigger._staying.forEach(id => {
                        if (!currentlyInside.includes(id)) {
                            this.fireLogicEvent(trigger, 'onExit', { otherId: id });
                        }
                    });
                }

                trigger._staying = currentlyInside;
            });

            // 6. Update activeCollisions (moved from 3)
            this.objects.forEach(o => o.activeCollisions = []);
            for (let i = 0; i < this.objects.length; i++) {
                const a = this.objects[i];
                for (let j = i + 1; j < this.objects.length; j++) {
                    const b = this.objects[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const rA = a.radius || Math.max(a.width || 0, a.height || 0) / 2 || 20;
                    const rB = b.radius || Math.max(b.width || 0, b.height || 0) / 2 || 20;
                    if (dx * dx + dy * dy < (rA + rB) * (rA + rB)) { a.activeCollisions.push(b); b.activeCollisions.push(a); }
                }
            }
        }

        this.objects.forEach(obj => { if (obj.update) obj.update(dt); });

        // Sprite Animation Updates
        this.objects.forEach(obj => {
            if (obj.type === 'sprite') {
                this.spritePlayer.update(obj, dt);
            }
        });

        this.objects = this.objects.filter(obj => !obj._shouldDestroy);
        this.objects.forEach(obj => {
            if (obj.type === 'emitter') {
                if (!obj._lastEmit) obj._lastEmit = 0;
                const rate = obj.rate || 10;
                const interval = 1 / rate;
                obj._lastEmit += dt;

                // Texture Handling
                if (!obj._particleTexture && obj.textureUrl) {
                    obj._particleTexture = new Image();
                    obj._particleTexture.src = obj.textureUrl;
                }

                while (obj._lastEmit > interval) {
                    this.particleSystem.spawn(obj.x, obj.y, {
                        spawnType: obj.spawnType || 'point',
                        boxWidth: obj.boxWidth || 0,
                        boxHeight: obj.boxHeight || 0,
                        spawnRadius: obj.spawnRadius || 0,
                        speed: obj.speed || 100,
                        speedVariation: obj.speedVariation !== undefined ? obj.speedVariation : 0.4,
                        angle: (obj.angle || -90) + (obj.rotation || 0),
                        spread: obj.spread || 30,
                        color: obj.color || '#ffaa00',
                        endColor: obj.endColor || obj.color || '#ffaa00',
                        lifetime: obj.lifetime || 1.0,
                        size: obj.particleSize || 3,
                        endSize: obj.endSize !== undefined ? obj.endSize : (obj.particleSize || 3),
                        gravity: obj.particleGravity || 0,
                        rotation: obj.particleRotation || 0,
                        rotationSpeed: obj.particleRotationSpeed || 0,
                        texture: obj._particleTexture
                    });
                    obj._lastEmit -= interval;
                }
            }
        });

        this.particleSystem.update(dt, this.objects);
        if (this.ui) this.ui.update(dt);
    }

    fireLogicEvent(sourceObj, eventName, data = {}) {
        // Find if any graph nodes are listening to this event
        if (this.isEditor && this.ui && this.ui.engine && this.ui.engine.graphEditor) {
            // Log for visual feedback in graph if needed
        }

        // Store event state
        if (!sourceObj._events) sourceObj._events = {};
        sourceObj._events[eventName] = { fired: true, timestamp: Date.now(), ...data };

        // --- NEW: Execute Bound Actions ---
        if (sourceObj.eventActions && sourceObj.eventActions[eventName]) {
            const actionConfig = sourceObj.eventActions[eventName];
            if (actionConfig.targetId) {
                const target = this.getObject(actionConfig.targetId);
                if (target) {
                    this.executeAction(sourceObj, target, actionConfig);
                }
            }
        }

        // Optional: Trigger global handler if exists
        if (this.config.onEvent) {
            this.config.onEvent(sourceObj, eventName, data);
        }
    }

    /**
     * Centralized Action Execution
     * Shared between UI (Buttons) and World Events (Trigger Zones)
     */
    executeAction(source, target, config) {
        if (!target || !config) return;
        const action = config.action;
        const actionId = config.actionId;

        console.log(`⚡ Action: ${action} on ${target.id} (Source: ${source?.id})`);

        switch (action) {
            case 'reset_pos':
                target.x = 100; target.y = 100;
                if (target.physics) target.physics.velocity = { x: 0, y: 0 };
                break;
            case 'stop':
                if (target.physics) target.physics.velocity = { x: 0, y: 0 };
                break;
            case 'jump':
                if (target.physics) {
                    if (!target.physics.velocity) target.physics.velocity = { x: 0, y: 0 };
                    target.physics.velocity.y = -600;
                }
                break;
            case 'toggle_physics':
                if (target.physics) target.physics.enabled = !target.physics.enabled;
                break;
            case 'random_color':
                target.fill = '#' + Math.floor(Math.random() * 16777215).toString(16);
                if (target.color) target.color = target.fill;
                break;

            case 'start_behavior':
                if (actionId) this.setBehaviorKeyState(target, actionId, true);
                break;
            case 'stop_behavior':
                if (actionId) this.setBehaviorKeyState(target, actionId, false);
                break;
            case 'toggle_behavior':
                if (actionId) this.toggleBehaviorKeyState(target, actionId);
                break;

            case 'emit_action':
                if (actionId) this.emitAction(actionId);
                break;

            case 'set_property':
                if (config.property && config.value !== undefined) {
                    let val = config.value;
                    if (!isNaN(val) && val !== '' && typeof val === 'string') val = Number(val);
                    this._applyProperty(target, config.property, val);
                }
                break;

            case 'toggle_property':
                if (config.property && config.valueA !== undefined && config.valueB !== undefined) {
                    const current = this._getProperty(target, config.property);
                    let valA = config.valueA;
                    let valB = config.valueB;
                    if (!isNaN(valA) && valA !== '' && typeof valA === 'string') valA = Number(valA);
                    if (!isNaN(valB) && valB !== '' && typeof valB === 'string') valB = Number(valB);

                    const next = (String(current) == String(valA)) ? valB : valA;
                    this._applyProperty(target, config.property, next);
                }
                break;

            case 'add_value':
                if (config.property && config.value !== undefined) {
                    const current = Number(this._getProperty(target, config.property)) || 0;
                    const delta = Number(config.value) || 0;
                    this._applyProperty(target, config.property, current + delta);
                }
                break;

            case 'set_variable':
                if (config.variableName && config.value !== undefined) {
                    let val = config.value;
                    if (!isNaN(val) && val !== '' && typeof val === 'string') val = Number(val);
                    this.setVariable(config.variableName, val);
                }
                break;
        }
    }

    // Helper to get property (handles nested physics/behaviors)
    _getProperty(target, property) {
        if (!property) return undefined;
        if (property.includes('.')) {
            const parts = property.split('.');
            if (parts[0] === 'physics' && target.physics) {
                return target.physics[parts[1]];
            } else if (target._behaviorParams && target._behaviorParams[parts[0]]) {
                return target._behaviorParams[parts[0]][parts[1]];
            }
        }
        return target[property];
    }

    // Helper to apply property (handles nested physics/behaviors)
    _applyProperty(target, property, value) {
        if (!property) return;
        if (property.includes('.')) {
            const parts = property.split('.');
            if (parts[0] === 'physics') {
                const prop = parts[1];
                if (target.physics) {
                    if (prop === 'velocity' && parts[2]) {
                        if (parts[2] === 'x') target.physics.velocity.x = value;
                        else if (parts[2] === 'y') target.physics.velocity.y = value;
                    } else {
                        target.physics[prop] = value;
                    }
                }
            } else {
                const behaviorId = parts[0];
                const paramName = parts[1];
                if (!target._behaviorParams) target._behaviorParams = {};
                if (!target._behaviorParams[behaviorId]) target._behaviorParams[behaviorId] = {};
                target._behaviorParams[behaviorId][paramName] = value;
            }
        } else {
            target[property] = value;
        }
    }

    // Behavior State Helpers for executeAction
    setBehaviorKeyState(target, behaviorKey, state) {
        if (!target.behaviors) return;
        // In this runtime version, behaviors are often toggled by event IDs if configured
        // But we also support direct toggling if behaviorKey matches behavior ID
        if (target._behaviorState && target._behaviorState[behaviorKey] !== undefined) {
            target._behaviorState[behaviorKey] = state;
        }
    }

    toggleBehaviorKeyState(target, behaviorKey) {
        if (!target._behaviorState) return;
        if (target._behaviorState[behaviorKey] !== undefined) {
            target._behaviorState[behaviorKey] = !target._behaviorState[behaviorKey];
        }
    }

    getSplinePoint(pts, tension, t, closed = false) {
        if (pts.length < 2) return pts[0] || { x: 0, y: 0 };
        const len = pts.length;
        let i = Math.floor(t * (closed ? len : len - 1));
        if (i >= (closed ? len : len - 1)) i = (closed ? len : len - 1) - 1;
        const localT = (t * (closed ? len : len - 1)) - i;
        const p1 = pts[i];
        const p2 = pts[(i + 1) % len];
        const p0 = pts[i === 0 ? (closed ? len - 1 : 0) : i - 1];
        const p3 = pts[(i + 2) % len];
        const t2 = localT * localT;
        const t3 = t2 * localT;
        const f1 = -tension * t3 + 2 * tension * t2 - tension * localT;
        const f2 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
        const f3 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * localT;
        const f4 = tension * t3 - tension * t2;
        return {
            x: f1 * p0.x + f2 * p1.x + f3 * p2.x + f4 * p3.x,
            y: f1 * p0.y + f2 * p1.y + f3 * p2.y + f4 * p3.y
        };
    }

    attachUI(ui) {
        this.ui = ui;
        console.log("✅ RuntimeUI attached to Core");
    }

    setGlobalScript(code) {
        try {
            // Robust parsing: detect if code is already wrapped or needs wrapping
            let cleanCode = code.trim();

            // Check if it's an Object Literal (Simple Check)
            // Use regex to ignore comments/whitespace at start
            const isObjectLiteral = /^\s*\{/.test(cleanCode);

            let scriptFn;

            if (isObjectLiteral) {
                // Legacy / OviState Native Mode: Expects return { ... }
                // Remove trailing semicolon if present
                if (cleanCode.endsWith(';')) cleanCode = cleanCode.slice(0, -1);

                // Wrap in return if just strict JSON-like object
                scriptFn = new Function('return ' + cleanCode + ';');
            } else {
                // Imperative Mode (Generic HTML scripts)
                // Wrap in an onStart handler
                console.log("ℹ️ Core: Detected Imperative Script. Wrapping in onStart().");
                const wrapper = `
                    return {
                        onStart: function(runtime) {
                            // Ensure 'document' and 'window' availability is standard
                            // User code goes here
                            ${cleanCode}
                        }
                    };
                `;
                scriptFn = new Function(wrapper);
            }

            this.globalScript = scriptFn();
            this.globalScriptSource = code;
            console.log("✅ OviHub: Global Script Compiled Successfully");
        } catch (e) {
            console.error("❌ OviHub: Script Compilation Error:", e);
            console.log("Source Code Snippet:", code.substring(0, 100) + "...");
            // Don't alert here to avoid spamming user during live typing or load
        }
    }

    triggerChoice(choiceId) {
        if (this.globalScript && this.globalScript.onChoice) {
            try {
                this.globalScript.onChoice(choiceId, this.objects, this);
            } catch (e) {
                console.error("Global script onChoice error:", e);
            }
        }
    }

    resolvePaint(paint, obj) {
        if (typeof paint !== 'object' || !paint.type) return paint;

        // Gradient Handling
        // Calculate BBox Min X/Y based on renderOffset inverse logic
        const offX = obj.renderOffset ? obj.renderOffset.x : 0;
        const offY = obj.renderOffset ? obj.renderOffset.y : 0;
        const w = obj.width || 100;
        const h = obj.height || 100;

        // Visual BBox Origin in Local Path Space
        const minX = -offX - (w / 2);
        const minY = -offY - (h / 2);

        let grad;
        if (paint.type === 'linear-gradient') {
            const x1 = minX + (paint.x1 * w);
            const y1 = minY + (paint.y1 * h);
            const x2 = minX + (paint.x2 * w);
            const y2 = minY + (paint.y2 * h);
            grad = this.ctx.createLinearGradient(x1, y1, x2, y2);
        } else if (paint.type === 'radial-gradient') {
            const cx = minX + (paint.cx * w);
            const cy = minY + (paint.cy * h);
            const r = (paint.r * Math.max(w, h)); // Radius relative to max dim
            grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        } else {
            return '#000000';
        }

        if (paint.stops) {
            paint.stops.forEach(stop => {
                try {
                    grad.addColorStop(stop.offset, stop.color);
                    // stop.opacity is harder to support in CanvasGradient without pre-blending or globalAlpha (which affects whole shape)
                    // Advanced: parse color string and apply opacity manually? 
                    // For now, accept color as is.
                } catch (e) { }
            });
        }
        return grad;
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.handles = [];

        // Background
        this.ctx.fillStyle = this.config.background || '#f0f0f0';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.objects.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).forEach(obj => {
            const world = this.getWorldTransform(obj);

            this.ctx.save();
            this.ctx.translate(world.x, world.y);
            this.ctx.rotate(world.rotation * Math.PI / 180);
            this.ctx.scale(world.scale, world.scale);

            // Apply opacity
            if (obj.opacity !== undefined) {
                this.ctx.globalAlpha = obj.opacity;
            }

            if (obj.renderOffset) {
                this.ctx.translate(obj.renderOffset.x, obj.renderOffset.y);
            }

            // Draw selection handles BEFORE restore if selected
            if (obj.selected && this.isEditor) {
                this.drawSelectionHandles(obj);
            }

            if (obj.type === 'group') {
                return;
            }

            if (obj.type === 'sprite') {
                this.spritePlayer.draw(this.ctx, obj);
            } else if (obj.type === 'vector_path') {
                if (!obj._path2d && obj.pathData) obj._path2d = new Path2D(obj.pathData);
                if (obj._path2d) {
                    if (obj.fill && obj.fill !== 'none') {
                        this.ctx.fillStyle = this.resolvePaint(obj.fill, obj);
                        this.ctx.fill(obj._path2d);
                    }
                    if (obj.stroke && obj.stroke !== 'none') {
                        this.ctx.strokeStyle = this.resolvePaint(obj.stroke, obj);
                        this.ctx.lineWidth = (obj.strokeWidth || 1);
                        this.ctx.stroke(obj._path2d);
                    }
                }
            } else if (obj.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, obj.radius || 30, 0, Math.PI * 2);
                this.ctx.fillStyle = obj.fill || '#ff6b6b';
                this.ctx.fill();
                if (obj.stroke) {
                    this.ctx.strokeStyle = obj.stroke;
                    this.ctx.lineWidth = obj.strokeWidth || 2;
                    this.ctx.stroke();
                }
            } else if (obj.type === 'rect') {
                const x = -obj.width / 2, y = -obj.height / 2;
                this.ctx.fillStyle = obj.fill || '#2ecc71';
                this.ctx.fillRect(x, y, obj.width, obj.height);
                if (obj.stroke) {
                    this.ctx.strokeStyle = obj.stroke;
                    this.ctx.lineWidth = obj.strokeWidth || 2;
                    this.ctx.strokeRect(x, y, obj.width, obj.height);
                }
            } else if (obj.type === 'emitter') {
                // Emitter Visual (Editor Only usually)
                this.ctx.fillStyle = obj.color || '#ffa500';
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(-10, -20);
                this.ctx.lineTo(10, -20);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(-16, -16, 32, 32);

                // Add Indicator for Angle and Spread (Editor Only)
                if (this.isEditor) {
                    const angle = (obj.angle !== undefined ? obj.angle : -90) * Math.PI / 180;
                    const spread = (obj.spread || 0) * Math.PI / 180;
                    const length = 60; // Length of the indicator line

                    this.ctx.save();
                    this.ctx.strokeStyle = obj.color || '#ffa500';
                    this.ctx.globalAlpha = 0.8;
                    this.ctx.setLineDash([4, 4]);
                    this.ctx.lineWidth = 2;

                    // Central Angle Line
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
                    this.ctx.stroke();

                    // Spread Cone Boundaries
                    if (spread > 0) {
                        this.ctx.globalAlpha = 0.4;
                        this.ctx.lineWidth = 1;

                        // Left boundary
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, 0);
                        this.ctx.lineTo(Math.cos(angle - spread / 2) * length, Math.sin(angle - spread / 2) * length);
                        this.ctx.stroke();

                        // Right boundary
                        this.ctx.beginPath();
                        this.ctx.moveTo(0, 0);
                        this.ctx.lineTo(Math.cos(angle + spread / 2) * length, Math.sin(angle + spread / 2) * length);
                        this.ctx.stroke();

                        // Small arc to show the spread
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, length * 0.8, angle - spread / 2, angle + spread / 2);
                        this.ctx.stroke();
                    }

                    this.ctx.restore();
                }

            } else if (obj.type === 'variable') {
                this.ctx.fillStyle = obj.fill || '#34495e';
                this.ctx.strokeStyle = obj.stroke || '#2c3e50';
                this.ctx.lineWidth = 2;
                // Round Rect Helper inline
                const r = 8, w = obj.width, h = obj.height, x = -w / 2, y = -h / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x + r, y);
                this.ctx.lineTo(x + w - r, y);
                this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                this.ctx.lineTo(x + w, y + h - r);
                this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                this.ctx.lineTo(x + r, y + h);
                this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                this.ctx.lineTo(x, y + r);
                this.ctx.quadraticCurveTo(x, y, x + r, y);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                // Draw Icon & Label
                this.ctx.fillStyle = '#ecf0f1';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(obj.varName || 'Var', 0, -8);
                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillText(obj.value !== undefined ? obj.value : 0, 0, 8);

            } else if (obj.type === 'timer') {
                this.ctx.fillStyle = obj.fill || '#e67e22';
                this.ctx.strokeStyle = obj.stroke || '#d35400';
                this.ctx.lineWidth = 2;
                const r = 8, w = obj.width, h = obj.height, x = -w / 2, y = -h / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x + r, y);
                this.ctx.lineTo(x + w - r, y);
                this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                this.ctx.lineTo(x + w, y + h - r);
                this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                this.ctx.lineTo(x + r, y + h);
                this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                this.ctx.lineTo(x, y + r);
                this.ctx.quadraticCurveTo(x, y, x + r, y);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                // Draw Icon & Label
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('⏱️ ' + (obj.duration || 0) + 's', 0, 0);

            } else if (obj.type === 'spring') {
                const bodyA = this.getObject(obj.targetA);
                const bodyB = this.getObject(obj.targetB);

                this.ctx.save(); // Isolate any transform changes within this block

                if (bodyA && bodyB) {
                    // Connected Spring: Draw in World Space
                    // We need to pop the current object's transform and set to world identity
                    this.ctx.restore(); // Pop the object's transform from the outer loop's save()
                    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Set to world identity

                    const wa = this.getWorldTransform(bodyA);
                    const wb = this.getWorldTransform(bodyB);

                    this.ctx.beginPath();
                    this.ctx.lineWidth = obj.width || 4;
                    this.ctx.strokeStyle = obj.color || '#555';
                    this.ctx.lineCap = 'round';
                    this.ctx.lineJoin = 'round';

                    const ax = obj.anchorA?.x || 0, ay = obj.anchorA?.y || 0;
                    const bx = obj.anchorB?.x || 0, by = obj.anchorB?.y || 0;

                    const radA = (wa.rotation || 0) * Math.PI / 180;
                    const sA = wa.scale || 1;
                    const x1 = wa.x + (ax * Math.cos(radA) - ay * Math.sin(radA)) * sA;
                    const y1 = wa.y + (ax * Math.sin(radA) + ay * Math.cos(radA)) * sA;

                    const radB = (wb.rotation || 0) * Math.PI / 180;
                    const sB = wb.scale || 1;
                    const x2 = wb.x + (bx * Math.cos(radB) - by * Math.sin(radB)) * sB;
                    const y2 = wb.y + (bx * Math.sin(radB) + by * Math.cos(radB)) * sB;

                    this.ctx.beginPath();
                    this.ctx.lineWidth = obj.width || 4;
                    this.ctx.strokeStyle = obj.color || '#555555';
                    this.ctx.lineCap = 'round';
                    this.ctx.lineJoin = 'round';

                    const dx = x2 - x1, dy = y2 - y1;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (obj.style === 'coil' || obj.style === 'zigzag') {
                        const nx = dx / dist, ny = dy / dist;
                        const perpX = -ny, perpY = nx;
                        const steps = Math.floor(dist / 10) || 5;
                        this.ctx.moveTo(x1, y1);
                        for (let k = 1; k <= steps; k++) {
                            const tx = x1 + dx * (k / steps);
                            const ty = y1 + dy * (k / steps);
                            const offset = (k % 2 === 0 ? 1 : -1) * 8;
                            this.ctx.lineTo(tx + perpX * offset, ty + perpY * offset);
                        }
                        this.ctx.lineTo(x2, y2);
                    } else {
                        this.ctx.moveTo(x1, y1);
                        this.ctx.lineTo(x2, y2);
                    }
                    this.ctx.stroke();

                    // Anchor Debug Dots (Editor Only)
                    if (this.isEditor) {
                        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                        this.ctx.beginPath(); this.ctx.arc(x1, y1, 4, 0, Math.PI * 2); this.ctx.fill();
                        this.ctx.beginPath(); this.ctx.arc(x2, y2, 4, 0, Math.PI * 2); this.ctx.fill();
                    }

                } else {
                    // Unconnected Spring Placeholder: Draw in Local Space
                    // The current context is already translated/rotated to obj.x, obj.y
                    this.ctx.beginPath();
                    this.ctx.lineWidth = obj.width || 4;
                    this.ctx.strokeStyle = obj.color || '#555';
                    this.ctx.lineCap = 'round';
                    this.ctx.lineJoin = 'round';

                    const h = 50;
                    const w = 20;
                    const coils = 6;
                    this.ctx.moveTo(0, -h / 2);
                    for (let i = 0; i <= coils; i++) {
                        const t = i / coils;
                        const ty = -h / 2 + h * t;
                        const tx = (i % 2 === 0 ? w / 2 : -w / 2) * (i > 0 && i < coils ? 1 : 0);
                        this.ctx.lineTo(tx, ty);
                    }
                    this.ctx.stroke();

                    // Label
                    this.ctx.fillStyle = '#666';
                    this.ctx.font = '10px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText("?", 0, 0);
                }

                this.ctx.restore(); // Restore the state saved at the beginning of this 'spring' block

            } else if (obj.type === 'joint') {
                const bodyA = this.getObject(obj.targetA);
                const bodyB = this.getObject(obj.targetB);
                if (bodyA && bodyB) {
                    this.ctx.restore(); // Pop the object's transform from the outer loop's save()
                    this.ctx.save();
                    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Set to world identity

                    const wa = this.getWorldTransform(bodyA);
                    const wb = this.getWorldTransform(bodyB);
                    const ax = obj.anchorA?.x || 0, ay = obj.anchorA?.y || 0;
                    const bx = obj.anchorB?.x || 0, by = obj.anchorB?.y || 0;
                    const radA = wa.rotation * Math.PI / 180, sA = wa.scale;
                    const x1 = wa.x + (ax * Math.cos(radA) - ay * Math.sin(radA)) * sA;
                    const y1 = wa.y + (ax * Math.sin(radA) + ay * Math.cos(radA)) * sA;
                    const radB = wb.rotation * Math.PI / 180, sB = wb.scale;
                    const x2 = wb.x + (bx * Math.cos(radB) - by * Math.sin(radB)) * sB;
                    const y2 = wb.y + (bx * Math.sin(radB) + by * Math.cos(radB)) * sB;

                    this.ctx.beginPath();
                    this.ctx.setLineDash(obj.subtype === 'rope' ? [5, 5] : []);
                    this.ctx.strokeStyle = obj.color || (obj.subtype === 'rope' ? '#8e44ad' : '#2980b9');
                    this.ctx.lineWidth = obj.width || 2;
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);

                    // Draw pivot points
                    this.ctx.fillStyle = this.ctx.strokeStyle;
                    this.ctx.beginPath(); this.ctx.arc(x1, y1, 4, 0, Math.PI * 2); this.ctx.fill();
                    this.ctx.beginPath(); this.ctx.arc(x2, y2, 4, 0, Math.PI * 2); this.ctx.fill();

                    this.ctx.restore();
                    this.ctx.save(); // Re-establish save for the loop's outer balance
                } else {
                    // Unconnected Joint Placeholder
                    this.ctx.beginPath();
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = obj.color || '#2980b9';
                    this.ctx.setLineDash([2, 2]);

                    // Draw a circle with a link icon or ?
                    this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);

                    this.ctx.fillStyle = this.ctx.strokeStyle;
                    this.ctx.font = 'bold 12px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText("🔗", 0, 0);

                    this.ctx.font = '8px sans-serif';
                    this.ctx.fillText("Unconnected", 0, 20);
                }

            } else if (obj.type === 'text') {
                this.drawText(this.ctx, obj);
            } else if (obj.type === 'symbol') {
                this.ctx.font = `${obj.size || 48}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(obj.symbol || '😀', 0, 0);
            } else if (obj.type === 'path') {
                const points = obj.points || [];
                if (points.length < 2) return;

                this.ctx.beginPath();
                this.ctx.strokeStyle = obj.color || '#3498db';
                this.ctx.lineWidth = obj.width || 4;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';

                if (obj.dashed) {
                    this.ctx.setLineDash([obj.width * 2, obj.width * 2]);
                } else {
                    this.ctx.setLineDash([]);
                }

                const tension = obj.tension !== undefined ? obj.tension : 0.5;

                // Spline drawing
                // ... (existing spline logic) ...
                const steps = points.length * 10;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const p = this.getSplinePoint(points, tension, t, obj.closed);
                    if (i === 0) this.ctx.moveTo(p.x, p.y);
                    else this.ctx.lineTo(p.x, p.y);
                }

                if (obj.closed) {
                    this.ctx.closePath();
                    if (obj.filled) {
                        this.ctx.fillStyle = obj.fillColor || obj.color || '#3498db';
                        this.ctx.globalAlpha = (obj.opacity || 0.9) * 0.5; // Slightly clearer fill
                        this.ctx.fill();
                        this.ctx.globalAlpha = obj.opacity || 0.9; // Restore for stroke
                    }
                }

                this.ctx.stroke();
                this.ctx.setLineDash([]); // Reset after draw

                // Draw vertices in Editor
                if (this.isEditor) {
                    points.forEach((p, idx) => {
                        this.ctx.beginPath();
                        // Check if this vertex is being dragged (using GLOBAL state)
                        const isActive = (this._draggingPath === obj && this._draggingVertexIndex === idx);
                        const radius = isActive ? 6 : 4;
                        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

                        if (isActive) {
                            this.ctx.fillStyle = '#f39c12'; // Orange for active
                        } else if (idx === 0) {
                            this.ctx.fillStyle = '#2ecc71'; // Green for start
                        } else if (idx === points.length - 1) {
                            this.ctx.fillStyle = '#e74c3c'; // Red for end
                        } else {
                            this.ctx.fillStyle = '#ffffff'; // White for middle
                        }

                        this.ctx.fill();
                        this.ctx.strokeStyle = '#2c3e50';
                        this.ctx.lineWidth = isActive ? 2 : 1;
                        this.ctx.stroke();
                    });
                }
            } else if (obj.type === 'trigger_zone') {
                if (this.isEditor || obj.showInExport) {
                    const shape = obj.shape || 'rectangle';
                    const isActive = obj._staying && obj._staying.length > 0;
                    const color = obj.color || '#f1c40f';
                    const activeColor = obj.activeColor || color;

                    this.ctx.save();
                    this.ctx.fillStyle = isActive ? activeColor : color;
                    this.ctx.globalAlpha = obj.opacity || 0.3;

                    if (isActive) {
                        const pulse = Math.sin(Date.now() / 200) * 0.1;
                        this.ctx.globalAlpha = Math.max(0, Math.min(1, (obj.opacity || 0.3) + pulse));
                    }

                    if (shape === 'rectangle') {
                        const w = obj.width || 100;
                        const h = obj.height || 100;
                        this.ctx.fillRect(-w / 2, -h / 2, w, h);
                        this.ctx.strokeStyle = isActive ? activeColor : color;
                        this.ctx.globalAlpha = 0.8;
                        this.ctx.setLineDash([5, 5]);
                        this.ctx.lineWidth = 2;
                        this.ctx.strokeRect(-w / 2, -h / 2, w, h);
                    } else if (shape === 'circle') {
                        const r = obj.radius || 60;
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.strokeStyle = isActive ? activeColor : color;
                        this.ctx.globalAlpha = 0.8;
                        this.ctx.setLineDash([5, 5]);
                        this.ctx.lineWidth = 2;
                        this.ctx.stroke();
                    }
                    this.ctx.restore();

                    if (this.isEditor && !this.isEditorPreview) {
                        this.ctx.fillStyle = isActive ? activeColor : color;
                        this.ctx.font = 'bold 10px sans-serif';
                        this.ctx.textAlign = 'center';
                        const label = shape === 'circle' ? `🎯 TRIGGER (R:${Math.round(obj.radius || 60)})` : `🎯 TRIGGER (${Math.round(obj.width || 100)}x${Math.round(obj.height || 100)})`;
                        this.ctx.fillText(label, 0, (shape === 'circle' ? -(obj.radius || 60) : -(obj.height || 100) / 2) - 10);
                    }
                }
            } else if (obj.type === 'force_field') {
                // Only render in editor or if explicitly enabled
                if (this.isEditor || obj.showInExport) {
                    if (obj.subtype === 'wind') {
                        const isInternalEditor = this.isEditor && !this.isEditorPreview;

                        // 1. Render Force Zone (Editor Only)
                        // This visualizes the physics area
                        if (isInternalEditor) {
                            const range = obj.range || 400;
                            const zoneWidth = obj.zoneWidth || 200;
                            const angle = (obj.direction || 0) * Math.PI / 180;

                            this.ctx.save();
                            this.ctx.rotate(angle);

                            // Draw Zone
                            this.ctx.fillStyle = '#00bcd4';
                            this.ctx.globalAlpha = 0.1;

                            // Visualize Source Footprint (Based on 'Shape')
                            // This gives feedback for the "Area Shape" dropdown
                            if (obj.shape === 'circle') {
                                const sr = obj.radius || 30;
                                this.ctx.beginPath();
                                this.ctx.arc(0, 0, sr, 0, Math.PI * 2);
                                this.ctx.fill();
                            } else {
                                // Rectangle
                                const sw = obj.width || 60;
                                const sh = obj.height || 60;
                                this.ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
                            }

                            // Wind Stream Area (Physics Range)
                            // Starts from center and extends 'range' distance
                            this.ctx.fillRect(0, -zoneWidth / 2, range, zoneWidth);

                            this.ctx.strokeStyle = '#00bcd4';
                            this.ctx.globalAlpha = 0.5;
                            this.ctx.lineWidth = 1;
                            this.ctx.setLineDash([4, 4]);
                            this.ctx.strokeRect(0, -zoneWidth / 2, range, zoneWidth);
                            this.ctx.setLineDash([]);

                            // Draw Flow Arrows inside Zone
                            this.ctx.globalAlpha = 0.6;
                            const arrowCount = Math.max(2, Math.floor(range / 100));
                            for (let i = 1; i <= arrowCount; i++) {
                                const x = (i / (arrowCount + 1)) * range;
                                const size = 10;
                                this.ctx.beginPath();
                                this.ctx.moveTo(x - size, -size);
                                this.ctx.lineTo(x, 0);
                                this.ctx.lineTo(x - size, size);
                                this.ctx.stroke();
                            }

                            this.ctx.restore();
                        }

                        // 2. Render Visual Source (Fan/Blower)
                        // This is what appears in Export if 'showInExport' is true
                        const color = obj.color || '#00bcd4';
                        this.ctx.fillStyle = color;
                        this.ctx.strokeStyle = color; // For border

                        // Visual Style Rendering
                        const style = obj.visualStyle || 'arrow';
                        const angle = (obj.direction || 0) * Math.PI / 180;

                        this.ctx.save();
                        this.ctx.rotate(angle);
                        this.ctx.fillStyle = color;
                        this.ctx.strokeStyle = color;

                        if (obj.showInExport || isInternalEditor) {
                            if (style === 'arrow') {
                                // Default Arrow Style
                                const size = obj.shape === 'circle' ? (obj.radius || 30) * 2 : Math.min(obj.width || 60, obj.height || 60);
                                this.ctx.globalAlpha = obj.opacity || 0.8;

                                // Draw Triangle Arrow
                                this.ctx.beginPath();
                                const aw = size * 0.6;
                                this.ctx.moveTo(-aw / 2, -aw / 2);
                                this.ctx.lineTo(aw / 2, 0);
                                this.ctx.lineTo(-aw / 2, aw / 2);
                                this.ctx.closePath();
                                this.ctx.fill();

                            } else if (style === 'stream') {
                                // Stream/Flow Style (3 Wavy Lines)
                                const size = obj.shape === 'circle' ? (obj.radius || 30) * 2 : Math.min(obj.width || 60, obj.height || 60);
                                const len = size * 0.8;
                                const spacing = size * 0.25;
                                this.ctx.globalAlpha = obj.opacity || 0.8;
                                this.ctx.lineWidth = 2;
                                this.ctx.lineCap = 'round';

                                for (let i = -1; i <= 1; i++) {
                                    const y = i * spacing;
                                    this.ctx.beginPath();
                                    this.ctx.moveTo(-len / 2, y);
                                    this.ctx.lineTo(len / 2, y);
                                    // Arrowhead
                                    this.ctx.lineTo(len / 2 - 5, y - 3);
                                    this.ctx.moveTo(len / 2, y);
                                    this.ctx.lineTo(len / 2 - 5, y + 3);
                                    this.ctx.stroke();
                                }

                            } else if (style === 'fan') {
                                // Fan Device Style
                                const size = obj.shape === 'circle' ? (obj.radius || 30) * 2 : Math.min(obj.width || 60, obj.height || 60);
                                const r = size / 2;

                                // Frame
                                this.ctx.globalAlpha = obj.opacity || 0.8;
                                this.ctx.lineWidth = 3;
                                this.ctx.beginPath();
                                this.ctx.arc(0, 0, r, 0, Math.PI * 2);
                                this.ctx.stroke();

                                // Blades
                                this.ctx.save();
                                if (obj.fanAnimate !== false) { // Default true
                                    const time = Date.now() / 100;
                                    this.ctx.rotate(time);
                                }

                                this.ctx.fillStyle = color;
                                this.ctx.globalAlpha = 0.6;
                                for (let i = 0; i < 3; i++) {
                                    this.ctx.rotate(Math.PI * 2 / 3);
                                    this.ctx.beginPath();
                                    this.ctx.ellipse(r / 2, 0, r / 2, r / 4, 0, 0, Math.PI * 2);
                                    this.ctx.fill();
                                }
                                this.ctx.beginPath();
                                this.ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
                                this.ctx.fillStyle = '#fff';
                                this.ctx.fill();

                                this.ctx.restore();
                            }
                        }
                        this.ctx.restore();

                        // Label
                        if (this.isEditor && !this.isEditorPreview) {
                            this.ctx.fillStyle = '#fff';
                            this.ctx.font = 'bold 12px sans-serif';
                            this.ctx.textAlign = 'center';
                            const labelY = obj.shape === 'circle' ? -(obj.radius || 30) - 10 : -(obj.height || 60) / 2 - 10;
                            this.ctx.fillText("💨 WIND", 0, labelY);
                        }
                    } else if (obj.subtype === 'magnet') {
                        // Magnet: Circle with radial gradient
                        let r = obj.radius || 150;
                        const innerR = obj.innerRadius || 0;
                        const baseColor = obj.color || '#e91e63';

                        // Pulsation Visual logic
                        if (obj.pulsate) {
                            const pSpeed = (obj.pulseSpeed || 5) * 200;
                            const pMag = obj.pulseMagnitude || 0.5;
                            const pulseTime = Date.now() / 1000;
                            const mod = 1 + Math.sin(pulseTime * (obj.pulseSpeed || 5)) * pMag;
                            r *= mod;
                        }

                        // Gradient fill
                        const grad = this.ctx.createRadialGradient(0, 0, innerR, 0, 0, r);
                        grad.addColorStop(0, baseColor);
                        grad.addColorStop(1, baseColor + '00'); // Transparent at edge

                        this.ctx.fillStyle = grad;
                        this.ctx.globalAlpha = (obj.opacity || 0.4) * (obj.pulsate ? 0.8 : 1);
                        this.ctx.beginPath();

                        // Don't fill inner dead zone
                        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
                        if (innerR > 0) {
                            this.ctx.arc(0, 0, innerR, 0, Math.PI * 2, true); // Cutout
                        }
                        this.ctx.fill();

                        this.ctx.strokeStyle = baseColor;
                        this.ctx.lineWidth = 2;

                        // Outer Border
                        this.ctx.globalAlpha = 0.8;
                        this.ctx.setLineDash([5, 5]);
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, r, 0, Math.PI * 2);
                        this.ctx.stroke();

                        // Inner Border (Dead Zone)
                        if (innerR > 0) {
                            this.ctx.globalAlpha = 0.5;
                            this.ctx.beginPath();
                            this.ctx.arc(0, 0, innerR, 0, Math.PI * 2);
                            this.ctx.stroke();
                        }

                        // Field Lines
                        if (obj.showFieldLines !== false) {
                            this.ctx.globalAlpha = 0.3;
                            this.ctx.setLineDash([]);
                            const sections = 8;
                            const time = Date.now() / 1000;
                            const isOrbit = obj.mode === 'orbit' || obj.mode === 'vortex';

                            // Rotate whole line set if orbiting
                            this.ctx.save();
                            if (isOrbit) {
                                const direction = obj.orbitDirection === 'ccw' ? -1 : 1;
                                this.ctx.rotate(time * direction * 2);
                            }

                            for (let i = 0; i < sections; i++) {
                                const angle = (i / sections) * Math.PI * 2;
                                const c = Math.cos(angle);
                                const s = Math.sin(angle);
                                this.ctx.beginPath();
                                this.ctx.moveTo(c * innerR, s * innerR);
                                this.ctx.lineTo(c * r, s * r);

                                // Direction arrows on lines
                                const midR = (innerR + r) / 2;
                                if (midR > innerR + 10) {
                                    const dir = obj.mode === 'repel' ? 1 : -1;
                                    const arrowSize = 5;

                                    this.ctx.save();
                                    this.ctx.translate(c * midR, s * midR);

                                    if (isOrbit) {
                                        // Point Tangentially
                                        const tangentAngle = angle + (obj.orbitDirection === 'ccw' ? -Math.PI / 2 : Math.PI / 2);
                                        this.ctx.rotate(tangentAngle);
                                    } else {
                                        // Point in or out
                                        this.ctx.rotate(angle + (dir === -1 ? Math.PI : 0));
                                    }

                                    this.ctx.beginPath();
                                    this.ctx.moveTo(-arrowSize, -arrowSize);
                                    this.ctx.lineTo(0, 0);
                                    this.ctx.lineTo(-arrowSize, arrowSize);
                                    this.ctx.stroke();
                                    this.ctx.restore();
                                }
                                this.ctx.stroke();
                            }
                            this.ctx.restore();
                        }

                        // Pole Rendering for Dipoles
                        if (obj.isDipole) {
                            const pd = obj.poleDistance || 40;
                            this.ctx.lineWidth = 2;
                            this.ctx.globalAlpha = 1.0;

                            // North (Red)
                            this.ctx.fillStyle = '#ff4b2b';
                            this.ctx.beginPath(); this.ctx.arc(pd, 0, 10, 0, Math.PI * 2); this.ctx.fill();
                            this.ctx.fillStyle = 'white'; this.ctx.font = 'bold 10px sans-serif';
                            this.ctx.fillText("N", pd, 0);

                            // South (Blue)
                            this.ctx.fillStyle = '#2b76ff';
                            this.ctx.beginPath(); this.ctx.arc(-pd, 0, 10, 0, Math.PI * 2); this.ctx.fill();
                            this.ctx.fillStyle = 'white'; this.ctx.fillText("S", -pd, 0);
                        }

                        // Center symbol
                        this.ctx.globalAlpha = 1.0;
                        this.ctx.fillStyle = baseColor;
                        this.ctx.font = 'bold 24px sans-serif';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';

                        let label = 'Attract';
                        if (obj.mode === 'repel') label = 'Repel';
                        if (obj.mode === 'orbit') label = 'Orbit';
                        if (obj.mode === 'vortex') label = 'Vortex';
                        this.ctx.fillText(label, 0, 0);

                        // Label
                        if (this.isEditor) {
                            this.ctx.font = 'bold 12px sans-serif';
                            this.ctx.fillText(`🧲 ${label.toUpperCase()}`, 0, -r - 10);
                        }
                    }
                }

                this.ctx.setLineDash([]);
                this.ctx.globalAlpha = 1.0;
            } else if (obj.type === '3d_model') {
                // Render 3D Model Placeholder (Thumbnail)
                if (obj.thumbnail) {
                    if (!obj._thumbnailImg) {
                        obj._thumbnailImg = new Image();
                        obj._thumbnailImg.src = obj.thumbnail;
                    }
                    if (obj._thumbnailImg.complete) {
                        const w = obj.width || 200;
                        const h = obj.height || 200;
                        this.ctx.drawImage(obj._thumbnailImg, -w / 2, -h / 2, w, h);
                    }
                } else {
                    // Fallback visual
                    this.ctx.fillStyle = '#444';
                    this.ctx.fillRect(-50, -50, 100, 100);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '10px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText("3D MODEL", 0, 0);
                }

                // If in Interactive Mode or Selected in Editor, an overlay canvas 
                // will be managed by the Ovi3D Runtime/Editor.
            }

            this.ctx.restore();
        });

        // Controls
        this.controls.forEach(control => { if (control.render) control.render(this.ctx); });
        this.graphs.forEach(graph => { if (graph.render) graph.render(this.ctx); });
    }

    getTextMetrics(ctx, obj) {
        const text = String(obj.text || '');
        const size = obj.fontSize || 20;
        const font = obj.fontFamily || 'Arial';
        const weight = obj.fontWeight || 'normal';
        const style = obj.fontStyle || 'normal';
        const lineHeight = obj.lineHeight || 1.2;
        const spacing = obj.letterSpacing || 0;
        const transform = obj.textTransform || 'none';

        ctx.save();
        ctx.font = `${style} ${weight} ${size}px ${font}`;
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = spacing + 'px';

        let processedText = text;
        if (transform === 'uppercase') processedText = processedText.toUpperCase();
        else if (transform === 'lowercase') processedText = processedText.toLowerCase();

        let lines = [];
        if (obj.wordWrap && obj.width) {
            const rawLines = processedText.split('\n');
            rawLines.forEach(rl => {
                const words = rl.split(' ');
                let currentLine = '';
                for (let i = 0; i < words.length; i++) {
                    const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > obj.width && i > 0) {
                        lines.push(currentLine);
                        currentLine = words[i];
                    } else {
                        currentLine = testLine;
                    }
                }
                lines.push(currentLine);
            });
        } else {
            lines = processedText.split('\n');
        }

        const height = lines.length * size * lineHeight;
        let maxWidth = 0;
        lines.forEach(l => {
            const m = ctx.measureText(l);
            if (m.width > maxWidth) maxWidth = m.width;
        });

        ctx.restore();
        return { lines, width: obj.wordWrap ? (obj.width || maxWidth) : maxWidth, height, size, lineHeight };
    }

    drawText(ctx, obj) {
        const m = this.getTextMetrics(ctx, obj);
        const align = obj.align || 'center';
        const vAlign = obj.verticalAlign || 'middle';
        const weight = obj.fontWeight || 'normal';
        const style = obj.fontStyle || 'normal';
        const spacing = obj.letterSpacing || 0;

        ctx.font = `${style} ${weight} ${m.size}px ${obj.fontFamily || 'Arial'}`;
        ctx.fillStyle = obj.fill || '#ffffff';
        ctx.textAlign = align;
        ctx.textBaseline = 'top';

        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = spacing + 'px';

        if (obj.shadowEnabled) {
            ctx.shadowColor = obj.shadowColor || 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = obj.shadowBlur || 5;
            ctx.shadowOffsetX = obj.shadowOffsetX || 2;
            ctx.shadowOffsetY = obj.shadowOffsetY || 2;
        }

        let startY = 0;
        if (vAlign === 'middle' || !vAlign) startY = -m.height / 2;
        else if (vAlign === 'bottom') startY = -m.height;

        m.lines.forEach((line, index) => {
            const y = startY + (index * m.size * m.lineHeight);
            if (obj.stroke && obj.stroke !== 'none') {
                ctx.save();
                ctx.shadowColor = 'transparent';
                ctx.strokeStyle = obj.stroke;
                ctx.lineWidth = obj.strokeWidth || 1;
                ctx.strokeText(line, 0, y);
                ctx.restore();
            }
            ctx.fillText(line, 0, y);
        });

        ctx.shadowColor = 'transparent';
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    }

    drawSelectionHandles(obj) {
        this.ctx.save();

        // Selection outline
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        if (obj.type === 'circle') {
            // Circle outline
            this.ctx.beginPath();
            this.ctx.arc(0, 0, (obj.radius || 30) + 5, 0, Math.PI * 2);
            this.ctx.stroke();

            // Center point
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Resize handles (4 cardinal points)
            const r = obj.radius || 30;
            const handlePositions = [
                { x: r, y: 0, cursor: 'ew-resize', dir: 'e' },
                { x: -r, y: 0, cursor: 'ew-resize', dir: 'w' },
                { x: 0, y: r, cursor: 'ns-resize', dir: 's' },
                { x: 0, y: -r, cursor: 'ns-resize', dir: 'n' }
            ];

            handlePositions.forEach(pos => {
                this.drawHandle(pos.x, pos.y, `resize-${pos.dir}`, pos.cursor, obj);
            });

        } else if (obj.type === 'rect' || obj.type === 'vector_path' || obj.type === 'emitter' || obj.type === 'variable' || obj.type === 'timer') {
            const w = obj.width || 100;
            const h = obj.height || 100;
            const x = -w / 2, y = -h / 2;

            this.ctx.strokeRect(x - 5, y - 5, w + 10, h + 10);

            // 8 handles for rect-like objects
            const handlePositions = [
                { x: x - 5, y: y - 5, cursor: 'nwse-resize', dir: 'nw' },
                { x: x + w / 2, y: y - 5, cursor: 'ns-resize', dir: 'n' },
                { x: x + w + 5, y: y - 5, cursor: 'nesw-resize', dir: 'ne' },
                { x: x + w + 5, y: y + h / 2, cursor: 'ew-resize', dir: 'e' },
                { x: x + w + 5, y: y + h + 5, cursor: 'nwse-resize', dir: 'se' },
                { x: x + w / 2, y: y + h + 5, cursor: 'ns-resize', dir: 's' },
                { x: x - 5, y: y + h + 5, cursor: 'nesw-resize', dir: 'sw' },
                { x: x - 5, y: y + h / 2, cursor: 'ew-resize', dir: 'w' }
            ];

            handlePositions.forEach(pos => {
                this.drawHandle(pos.x, pos.y, `resize-${pos.dir}`, pos.cursor, obj);
            });

            // Rotation handle (top)
            this.drawRotationHandle(0, y - 25, 'rotation-handle', obj);

        } else if (obj.type === 'text') {
            const m = this.getTextMetrics(this.ctx, obj);
            const w = m.width;
            const h = m.height;

            let boxX = -w / 2;
            let boxY = -h / 2;

            if (obj.align === 'left') boxX = 0;
            else if (obj.align === 'right') boxX = -w;

            const vAlign = obj.verticalAlign || 'middle';
            if (vAlign === 'top') boxY = 0;
            else if (vAlign === 'bottom') boxY = -h;

            this.ctx.strokeRect(boxX - 5, boxY - 5, w + 10, h + 10);
            const handlePositions = [
                { x: boxX - 5, y: boxY - 5, cursor: 'nwse-resize', dir: 'nw' },
                { x: boxX + w + 5, y: boxY - 5, cursor: 'nesw-resize', dir: 'ne' },
                { x: boxX + w + 5, y: boxY + h + 5, cursor: 'nwse-resize', dir: 'se' },
                { x: boxX - 5, y: boxY + h + 5, cursor: 'nesw-resize', dir: 'sw' }
            ];
            handlePositions.forEach(pos => this.drawHandle(pos.x, pos.y, `resize-${pos.dir}`, pos.cursor, obj));
            this.drawRotationHandle(boxX + w / 2, boxY - 25, 'rotation-handle', obj);

        } else if (obj.type === 'symbol') {
            const size = obj.size || 48;
            const half = size / 2;
            this.ctx.strokeRect(-half - 5, -half - 5, size + 10, size + 10);
            this.drawHandle(half + 5, half + 5, 'resize-se', 'nwse-resize', obj);
            this.drawRotationHandle(0, -half - 25, 'rotation-handle', obj);

        } else if (obj.type === 'group') {
            const bounds = this.getObjectBounds(obj);
            const w = bounds.maxX - bounds.minX;
            const h = bounds.maxY - bounds.minY;

            if (w > 0 && h > 0) {
                this.ctx.strokeRect(bounds.minX - 5, bounds.minY - 5, w + 10, h + 10);
                this.drawRotationHandle((bounds.minX + bounds.maxX) / 2, bounds.minY - 25, 'rotation-handle', obj);
            }
        }

        this.ctx.restore();
    }

    drawHandle(x, y, id, cursor, obj) {
        const size = 8;
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.lineWidth = 2;

        this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
        this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);

        // Store handle info for interaction
        this.handles.push({ x, y, size, id, cursor, obj, isResize: true });
    }

    drawRotationHandle(x, y, id, obj) {
        const radius = 6;
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Rotation icon
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius - 2, 0.5, Math.PI * 1.5);
        this.ctx.stroke();

        // Arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - radius + 2);
        this.ctx.lineTo(x - 2, y - radius + 4);
        this.ctx.lineTo(x + 2, y - radius + 4);
        this.ctx.closePath();
        this.ctx.fillStyle = '#10b981';
        this.ctx.fill();

        // Store handle info
        this.handles.push({ x, y, size: radius * 2, id, cursor: 'grab', obj, isRotation: true });
    }
    updateLogicNodes(dt) {
        this.objects.forEach(obj => {
            if (obj.type === 'timer') {
                if (obj.autoStart && !obj.isRunning && obj.currentTime === undefined) {
                    obj.isRunning = true;
                    obj.currentTime = obj.mode === 'countdown' ? obj.duration : 0;
                }

                if (obj.isRunning) {
                    if (obj.mode === 'countdown') {
                        obj.currentTime -= dt;
                        if (obj.currentTime <= 0) {
                            obj.currentTime = 0;
                            obj.isRunning = false; // Stop at 0
                        }
                    } else {
                        obj.currentTime = (obj.currentTime || 0) + dt;
                    }
                    // Expose as 'value' for binding compatibility
                    obj.value = Math.round(obj.currentTime * 10) / 10;
                }
            } else if (obj.type === 'variable') {
                // Sync to global store
                if (obj.varName) {
                    this.variables[obj.varName] = obj.value;
                }
            }
        });
    }

    applyBindings() {
        this.objects.forEach(obj => {
            if (obj.bindings) {
                for (const [property, varId] of Object.entries(obj.bindings)) {
                    const sourceNode = this.getObject(varId);
                    if (sourceNode && sourceNode.value !== undefined) {
                        // Resolve Dot Notation
                        if (property.includes('.')) {
                            const parts = property.split('.');
                            let target = obj;
                            for (let i = 0; i < parts.length - 1; i++) {
                                target = target[parts[i]];
                                if (!target) break;
                            }
                            if (target) target[parts[parts.length - 1]] = sourceNode.value;
                        } else {
                            obj[property] = sourceNode.value;
                        }
                    }
                }
            }
        });
    }
}
