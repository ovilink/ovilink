import { ParticleSystem } from './Particles.js';

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
        this.globalScript = null;
        this.globalScriptSource = '';

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

        this.setupInputListeners();

        console.log("OviStateRuntime initialized with", this.objects.length, "objects");
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
            this._draggingObj = null; // Clear global drag lock
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
            this._draggingObj = null;
        }
        // 'move' is active just by calling this with x/y
    }

    addObject(obj) {
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

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop();
        console.log("▶️ Runtime started");
    }

    stop() {
        this.isRunning = false;
        console.log("⏸️ Runtime stopped");
    }

    updateInput() {
        this.objects.forEach(obj => {
            let isHit = false;
            if (obj.width && obj.height) {
                // If rotated, hit test is complex. For now, simple AABB or Radius check.
                // TODO: Implement OBB hit test if robust rotation needed.
                isHit = (this.mouseX >= obj.x - obj.width / 2 && this.mouseX <= obj.x + obj.width / 2 &&
                    this.mouseY >= obj.y - obj.height / 2 && this.mouseY <= obj.y + obj.height / 2);
            } else if (obj.radius) {
                const dx = this.mouseX - obj.x;
                const dy = this.mouseY - obj.y;
                isHit = (dx * dx + dy * dy <= obj.radius * obj.radius);
            } else if (obj.type === 'text') {
                // Approximate hit box (centered AABB)
                const fontSize = parseFloat(obj.fontSize) || 20;
                const safeText = String(obj.text !== undefined && obj.text !== null ? obj.text : "");
                const lines = safeText.split('\n').length;
                const approxW = (obj.width && obj.width > 0) ? obj.width : safeText.length * fontSize * 0.6;
                const approxH = (obj.height && obj.height > 0) ? obj.height : lines * fontSize * 1.2;

                isHit = (this.mouseX >= obj.x - approxW / 2 && this.mouseX <= obj.x + approxW / 2 &&
                    this.mouseY >= obj.y - approxH / 2 && this.mouseY <= obj.y + approxH / 2);
            } else if (obj.type === 'symbol') {
                const s = obj.size || 48;
                isHit = (this.mouseX >= obj.x - s / 2 && this.mouseX <= obj.x + s / 2 &&
                    this.mouseY >= obj.y - s / 2 && this.mouseY <= obj.y + s / 2);
            }
            obj.isHovered = isHit;

            if (this.isMouseDown && !this.clickProcessed && isHit) {
                obj._justClicked = true;
            } else {
                obj._justClicked = false;
            }
        });
        if (this.isMouseDown) this.clickProcessed = true;
    }

    loop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(dt);
        this.updateInput(); // Calculate hover/clicks
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

    update(dt) {
        // Registry Shim for Runtime
        // Behaviors expect: (obj, dt, runtime, registry)
        const registry = {
            getParameter: (obj, behaviorId, paramName) => {
                // Try direct param
                if (obj.behaviorParams && obj.behaviorParams[behaviorId] && obj.behaviorParams[behaviorId][paramName] !== undefined) {
                    return obj.behaviorParams[behaviorId][paramName];
                }
                // Try flattened (some exporters flatten)
                if (obj[paramName] !== undefined) return obj[paramName];

                // Fallback (Runtime doesn't know defaults without full registry defs)
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
                            // CORRECT SIGNATURE: obj, dt, runtime, registry
                            if (typeof behavior === 'function') {
                                behavior(obj, dt, this, registry);
                            } else if (behavior.update) {
                                behavior.update(obj, dt, this, registry);
                            }
                        } catch (e) {
                            // Suppress/Log error to prevent crash
                            // console.warn("Behavior error", flavorId, e);
                        }
                    }
                });
            }
        });

        // Apply global script
        if (this.globalScript && this.globalScript.update) {
            try {
                this.globalScript.update(this.objects, this, dt);
            } catch (e) {
                console.error("Global script error:", e);
            }
        }

        // Physics
        if (this.enablePhysics) {
            this.objects.forEach(obj => {
                if (obj.physics && obj.physics.enabled) {
                    // Init velocity if missing
                    if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };

                    // 1. Integrate Forces (Gravity + Wind)
                    obj.physics.velocity.y += this.gravity * dt;
                    obj.physics.velocity.x += this.gravityX * dt;

                    // 2. Apply Friction
                    if (this.friction) {
                        obj.physics.velocity.x *= (1 - this.friction * dt);
                        obj.physics.velocity.y *= (1 - this.friction * dt);
                    }

                    // 3. Integrate Position
                    obj.x += obj.physics.velocity.x * dt;
                    obj.y += obj.physics.velocity.y * dt;

                    // Global Bounciness Default
                    const bounciness = obj.physics.bounciness !== undefined ? obj.physics.bounciness : this.wallBounciness;

                    // Bounce off edges (Simplified for Center-based coords)
                    // TODO: Improve radius calculation for non-circle types
                    let r = obj.radius || Math.max(obj.width || 0, obj.height || 0) / 2 || 20;

                    if (obj.y + r > this.height) {
                        obj.y = this.height - r;
                        obj.physics.velocity.y *= -bounciness;
                    }
                    if (obj.y - r < 0) {
                        obj.y = r;
                        obj.physics.velocity.y *= -bounciness;
                    }
                    if (obj.x + r > this.width) {
                        obj.x = this.width - r;
                        obj.physics.velocity.x *= -bounciness;
                    }
                    if (obj.x - r < 0) {
                        obj.x = r;
                        obj.physics.velocity.x *= -bounciness;
                    }
                }
            });

            // --- 4. Object-Object Collision Detection (Triggers) ---
            // Simple O(N^2) Broadphase
            // Reset collisions
            this.objects.forEach(o => o.activeCollisions = []);

            for (let i = 0; i < this.objects.length; i++) {
                const a = this.objects[i];
                for (let j = i + 1; j < this.objects.length; j++) {
                    const b = this.objects[j];

                    let hit = false;
                    // Simplified Distance check for all (Treat as circles for physics triggers mostly)
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const distSq = dx * dx + dy * dy;
                    // Get effective radius
                    const rA = a.radius || Math.max(a.width || 0, a.height || 0) / 2 || 20;
                    const rB = b.radius || Math.max(b.width || 0, b.height || 0) / 2 || 20;

                    if (distSq < (rA + rB) ** 2) {
                        hit = true;
                    }

                    if (hit) {
                        a.activeCollisions.push(b);
                        b.activeCollisions.push(a);
                    }
                }
            }
        }

        this.objects.forEach(obj => {
            if (obj.update) obj.update(dt);
        });

        // Cleanup Destroyed Objects
        this.objects = this.objects.filter(obj => !obj._shouldDestroy);

        // --- PARTICLE EMITTERS ---
        this.objects.forEach(obj => {
            if (obj.type === 'emitter') {
                if (!obj._lastEmit) obj._lastEmit = 0;
                const interval = 1 / (obj.rate || 10);
                obj._lastEmit += dt;

                while (obj._lastEmit > interval) {
                    this.particleSystem.spawn(obj.x, obj.y, {
                        speed: obj.speed || 100,
                        angle: (obj.angle || -90) + (obj.rotation || 0) * 180 / Math.PI, // Add rotation support
                        spread: obj.spread || 30,
                        color: obj.color || '#ffaa00',
                        endColor: obj.endColor || obj.color || '#ffaa00',
                        lifetime: obj.lifetime || 1.0,
                        size: obj.particleSize || 3,
                        endSize: obj.endSize !== undefined ? obj.endSize : (obj.particleSize || 3),
                        gravity: obj.particleGravity || 0
                    });
                    obj._lastEmit -= interval;
                }
            }
        });

        this.particleSystem.update(dt);

        if (this.ui) {
            this.ui.update(dt);
        }
    }

    attachUI(ui) {
        this.ui = ui;
        console.log("✅ RuntimeUI attached to Core");
    }

    setGlobalScript(code) {
        try {
            const createScript = new Function('return {' + code + '};');
            this.globalScript = createScript();
            this.globalScriptSource = code;
            console.log("Global Script Updated");
        } catch (e) {
            console.error("Failed to compile script:", e);
            alert("Script Error: " + e.message);
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Clear handles from previous frame
        this.handles = [];

        this.objects.forEach(obj => {
            this.ctx.save();
            this.ctx.translate(obj.x, obj.y); // Global Translate
            if (obj.rotation) this.ctx.rotate(obj.rotation); // Global Rotation

            // Apply opacity
            if (obj.opacity !== undefined) {
                this.ctx.globalAlpha = obj.opacity;
            }

            // Render based on type (All at 0,0 now)
            if (obj.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = obj.fill || '#3498db';
                this.ctx.fill();

                if (obj.stroke) {
                    this.ctx.strokeStyle = obj.stroke;
                    this.ctx.lineWidth = obj.strokeWidth || 2;
                    this.ctx.stroke();
                }

            } else if (obj.type === 'emitter') {
                if (obj.showInExport === false && (!this.isEditor || this.isEditorPreview)) {
                    // Invisible in runtime/preview, only emit particles
                } else {
                    // Emitter logic handles its own rotation usually, but now inherited
                    this.ctx.rotate((obj.angle || 0) * Math.PI / 180);

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
                }

            } else if (obj.type === 'rect') {
                const w = obj.width;
                const h = obj.height;
                const x = -w / 2;
                const y = -h / 2;

                this.ctx.fillStyle = obj.fill || '#2ecc71';
                this.ctx.fillRect(x, y, w, h);

                if (obj.stroke) {
                    this.ctx.strokeStyle = obj.stroke;
                    this.ctx.lineWidth = obj.strokeWidth || 2;
                    this.ctx.strokeRect(x, y, w, h);
                }
            } else if (obj.type === 'text') {
                this.ctx.font = `${obj.fontWeight || ''} ${obj.fontSize || 20}px ${obj.fontFamily || 'Arial'}`;
                this.ctx.fillStyle = obj.fill || '#ffffff';
                this.ctx.textAlign = obj.align || 'center';
                this.ctx.textBaseline = 'middle';

                const text = obj.text !== undefined && obj.text !== null ? obj.text : '';
                const fontSize = obj.fontSize || 20;
                const lineHeight = (obj.lineHeight || 1.2) * fontSize;
                const maxWidth = obj.wordWrap ? (obj.width || 300) : null;

                let lines = [];
                const rawLines = String(text).split('\n');

                rawLines.forEach(rawLine => {
                    if (!maxWidth) {
                        lines.push(rawLine);
                    } else {
                        const words = rawLine.split(' ');
                        let currentLine = words[0] || '';

                        for (let i = 1; i < words.length; i++) {
                            const word = words[i];
                            const width = this.ctx.measureText(currentLine + " " + word).width;
                            if (width < maxWidth) {
                                currentLine += " " + word;
                            } else {
                                lines.push(currentLine);
                                currentLine = word;
                            }
                        }
                        lines.push(currentLine);
                    }
                });

                const totalHeight = lines.length * lineHeight;
                let startY = 0 - (totalHeight / 2) + (lineHeight / 2); // Center is 0,0

                if (obj.verticalAlign === 'top') {
                    startY = 0 - obj.height / 2 + (lineHeight / 2);
                } else if (obj.verticalAlign === 'bottom') {
                    startY = 0 - obj.height / 2 + (totalHeight) - (lineHeight / 2);
                }

                lines.forEach((line, i) => {
                    if (obj.align === 'justify' && obj.wordWrap && maxWidth) {
                        const isLastLine = i === lines.length - 1;
                        if (isLastLine) {
                            this.ctx.textAlign = 'left';
                            this.ctx.fillText(line, -maxWidth / 2, startY + (i * lineHeight));
                        } else {
                            this.ctx.textAlign = 'left';
                            this.ctx.fillText(line, -maxWidth / 2, startY + (i * lineHeight));
                        }
                    } else {
                        // Standard Rendering
                        let align = obj.align === 'justify' ? 'left' : (obj.align || 'center');
                        this.ctx.textAlign = align;
                        this.ctx.fillText(line, 0, startY + (i * lineHeight));
                    }
                });

            } else if (obj.type === 'symbol') {
                this.ctx.font = `${obj.size !== undefined ? obj.size : 48}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                // Already translated
                this.ctx.fillText(obj.symbol || '😀', 0, 0);
            }

            this.ctx.restore();

            // Draw selection handles
            if (obj.selected) {
                this.drawSelectionHandles(obj);
            }
        });

        // Render controls
        this.controls.forEach(control => {
            if (control.render) {
                control.render(this.ctx);
            }
        });

        // Render graphs
        this.graphs.forEach(graph => {
            if (graph.render) {
                graph.render(this.ctx);
            }
        });
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

        } else if (obj.type === 'rect') {
            // Rect outline
            this.ctx.strokeRect(obj.x - obj.width / 2 - 5, obj.y - obj.height / 2 - 5, obj.width + 10, obj.height + 10);

            // 8 resize handles
            const w = obj.width;
            const h = obj.height;
            const x = obj.x;
            const y = obj.y;

            const handlePositions = [
                { x: x - w / 2, y: y - h / 2, cursor: 'nwse-resize', dir: 'nw' },
                { x: x + w / 2, y: y - h / 2, cursor: 'nesw-resize', dir: 'ne' },
                { x: x + w / 2, y: y + h / 2, cursor: 'nwse-resize', dir: 'se' },
                { x: x - w / 2, y: y + h / 2, cursor: 'nesw-resize', dir: 'sw' },
                { x: x, y: y - h / 2, cursor: 'ns-resize', dir: 'n' },
                { x: x, y: y + h / 2, cursor: 'ns-resize', dir: 's' },
                { x: x - w / 2, y: y, cursor: 'ew-resize', dir: 'w' },
                { x: x + w / 2, y: y, cursor: 'ew-resize', dir: 'e' }
            ];

            handlePositions.forEach(pos => {
                this.drawHandle(pos.x, pos.y, `resize-${pos.dir}`, pos.cursor, obj);
            });

            // Rotation Handle
            this.drawRotationHandle(x, y - h / 2 - 25, 'rotation-handle', obj);

        } else if (obj.type === 'text') {
            // Text selection box
            this.ctx.font = `${obj.fontWeight || ''} ${obj.fontSize || 20}px ${obj.fontFamily || 'Arial'}`;
            const metrics = this.ctx.measureText(obj.text || 'Text');
            // This metric is simplistic for wrapped text. 
            // Better to rely on approximated width/height stored in Obj or calculated in updateInput
            const w = obj.width || metrics.width;
            const fontSize = parseFloat(obj.fontSize) || 20;
            const lines = (obj.text || "").split('\n').length;
            const h = obj.height || (lines * fontSize * 1.2);

            const finalWidth = w;
            const finalHeight = h;

            // Position depends on Alignment
            // X: Defaults to center align in this engine
            // Y: Defaults to middle vertical align
            let boxX = obj.x - finalWidth / 2;
            let boxY = obj.y - finalHeight / 2;

            // Vertical Align Adjustments
            if (obj.verticalAlign === 'top') {
                boxY = obj.y;
            } else if (obj.verticalAlign === 'bottom') {
                boxY = obj.y - finalHeight;
            }

            // Horizontal Align Adjustments (Rendering is already adjusted, so box should follow center anchor relative to text)
            if (obj.align === 'left' || obj.align === 'justify') {
                boxX = obj.x;
            } else if (obj.align === 'right') {
                boxX = obj.x - finalWidth;
            }

            this.ctx.strokeRect(boxX - 5, boxY - 5, finalWidth + 10, finalHeight + 10);

            // 4 Corner handles for text
            const handlePositions = [
                { x: boxX - 5, y: boxY - 5, cursor: 'nwse-resize', dir: 'nw' },
                { x: boxX + finalWidth + 5, y: boxY - 5, cursor: 'nesw-resize', dir: 'ne' },
                { x: boxX + finalWidth + 5, y: boxY + finalHeight + 5, cursor: 'nwse-resize', dir: 'se' },
                { x: boxX - 5, y: boxY + finalHeight + 5, cursor: 'nesw-resize', dir: 'sw' }
            ];

            handlePositions.forEach(pos => {
                this.drawHandle(pos.x, pos.y, `text-resize-${pos.dir}`, pos.cursor, obj);
            });
        } else if (obj.type === 'symbol') {
            const size = obj.size !== undefined ? obj.size : 48;
            const half = size / 2;
            this.ctx.strokeRect(obj.x - half, obj.y - half, size, size);

            // 4 Corner handles
            const handlePositions = [
                { x: obj.x - half, y: obj.y - half, cursor: 'nwse-resize', dir: 'nw' },
                { x: obj.x + half, y: obj.y - half, cursor: 'nesw-resize', dir: 'ne' },
                { x: obj.x + half, y: obj.y + half, cursor: 'nwse-resize', dir: 'se' },
                { x: obj.x - half, y: obj.y + half, cursor: 'nesw-resize', dir: 'sw' }
            ];

            handlePositions.forEach(pos => {
                this.drawHandle(pos.x, pos.y, `symbol-resize-${pos.dir}`, pos.cursor, obj);
            });
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
}
