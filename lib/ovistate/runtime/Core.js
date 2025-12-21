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
        return this.objects.find(obj => obj.id === id);
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
        return this.objects.find(obj => obj.name === name);
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
        this._clickHandled = false;

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
            } else if (obj.width && obj.height) {
                isHit = (lx >= -obj.width / 2 && lx <= obj.width / 2 && ly >= -obj.height / 2 && ly <= obj.height / 2);
            } else if (obj.type === 'symbol') {
                const s = obj.size || 48;
                isHit = (lx >= -s / 2 && lx <= s / 2 && ly >= -s / 2 && ly <= s / 2);
            }

            obj.isHovered = isHit;

            if (this.isMouseDown && !this.clickProcessed && isHit && !this._clickHandled) {
                obj._justClicked = true;
                this._clickHandled = true;
                this._draggingObj = obj;
            } else {
                obj._justClicked = false;
            }
        });

        if (this.isMouseDown) {
            this.clickProcessed = true;
        }
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
        // Registry Shim for Runtime
        const registry = {
            getParameter: (obj, behaviorId, paramName) => {
                if (obj.behaviorParams && obj.behaviorParams[behaviorId] && obj.behaviorParams[behaviorId][paramName] !== undefined) {
                    return obj.behaviorParams[behaviorId][paramName];
                }
                if (obj[paramName] !== undefined) return obj[paramName];
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
            // 1. Integration & Bounds
            this.objects.forEach(obj => {
                if (obj.physics && obj.physics.enabled) {
                    if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
                    if (obj.physics.angularVelocity === undefined) obj.physics.angularVelocity = 0;
                    if (obj.physics.mass === undefined) obj.physics.mass = 1;

                    obj.physics.velocity.y += this.gravity * dt;
                    obj.physics.velocity.x += this.gravityX * dt;

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

                    if (obj.type !== 'group') {
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
                    if (b.isSolid || (b.physics && b.physics.enabled)) resolveCollision(a, b);
                }
            }

            // 3. Update activeCollisions
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
        this.objects = this.objects.filter(obj => !obj._shouldDestroy);
        this.objects.forEach(obj => {
            if (obj.type === 'emitter') {
                if (!obj._lastEmit) obj._lastEmit = 0;
                const interval = 1 / (obj.rate || 10);
                obj._lastEmit += dt;
                while (obj._lastEmit > interval) {
                    this.particleSystem.spawn(obj.x, obj.y, {
                        speed: obj.speed || 100,
                        angle: (obj.angle || -90) + (obj.rotation || 0) * 180 / Math.PI,
                        spread: obj.spread || 30, color: obj.color || '#ffaa00', endColor: obj.endColor || obj.color || '#ffaa00',
                        lifetime: obj.lifetime || 1.0, size: obj.particleSize || 3, endSize: obj.endSize !== undefined ? obj.endSize : (obj.particleSize || 3),
                        gravity: obj.particleGravity || 0
                    });
                    obj._lastEmit -= interval;
                }
            }
        });
        this.particleSystem.update(dt);
        if (this.ui) this.ui.update(dt);
    }

    attachUI(ui) {
        this.ui = ui;
        console.log("✅ RuntimeUI attached to Core");
    }

    setGlobalScript(code) {
        try {
            // Robust parsing: detect if code is already wrapped or needs wrapping
            let cleanCode = code.trim();

            // Remove trailing semicolon if present
            if (cleanCode.endsWith(';')) {
                cleanCode = cleanCode.slice(0, -1);
            }

            // If it doesn't look like a full object literal, wrap it
            if (!cleanCode.startsWith('{')) {
                cleanCode = '{\n' + cleanCode + '\n}';
            }

            const createScript = new Function('return ' + cleanCode + ';');
            this.globalScript = createScript();
            this.globalScriptSource = code;
            console.log("✅ OviHub: Global Script Compiled Successfully");
        } catch (e) {
            console.error("❌ OviHub: Script Compilation Error:", e);
            console.log("Source Code Snippet:", code.substring(0, 100) + "...");
            alert("Script Syntax Error: " + e.message);
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
                this.ctx.restore();
                return;
            }

            if (obj.type === 'vector_path') {
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
            } else if (obj.type === 'text') {
                this.ctx.font = `${obj.fontWeight || ''} ${obj.fontSize || 20}px ${obj.fontFamily || 'Arial'}`;
                this.ctx.fillStyle = obj.fill || '#ffffff';
                this.ctx.textAlign = obj.align || 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(obj.text || '', 0, 0);
            } else if (obj.type === 'symbol') {
                this.ctx.font = `${obj.size || 48}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(obj.symbol || '😀', 0, 0);
            }

            this.ctx.restore();
        });

        // Controls
        this.controls.forEach(control => { if (control.render) control.render(this.ctx); });
        this.graphs.forEach(graph => { if (graph.render) graph.render(this.ctx); });
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

        } else if (obj.type === 'rect' || obj.type === 'vector_path' || obj.type === 'emitter') {
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
            // Text selection box
            this.ctx.font = `${obj.fontWeight || ''} ${obj.fontSize || 20}px ${obj.fontFamily || 'Arial'}`;
            const metrics = this.ctx.measureText(obj.text || 'Text');
            const w = obj.width || metrics.width;
            const h = obj.height || ((obj.text || "").split('\n').length * (parseFloat(obj.fontSize) || 20) * 1.2);

            let boxX = -w / 2;
            let boxY = -h / 2;

            if (obj.align === 'left') boxX = 0;
            else if (obj.align === 'right') boxX = -w;
            if (obj.verticalAlign === 'top') boxY = 0;
            else if (obj.verticalAlign === 'bottom') boxY = -h;

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
}
