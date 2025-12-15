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
        });
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
                isHit = (this.mouseX >= obj.x && this.mouseX <= obj.x + obj.width &&
                    this.mouseY >= obj.y && this.mouseY <= obj.y + obj.height);
            } else if (obj.radius) {
                const dx = this.mouseX - obj.x;
                const dy = this.mouseY - obj.y;
                isHit = (dx * dx + dy * dy <= obj.radius * obj.radius);
            } else if (obj.type === 'text') {
                // Approximate hit box if not calculated
                const fontSize = parseFloat(obj.fontSize) || 16;
                const lines = (obj.text || "").split('\n').length;
                const approxW = (obj.width && obj.width > 0) ? obj.width : (obj.text || "").length * fontSize * 0.6;
                const approxH = (obj.height && obj.height > 0) ? obj.height : lines * fontSize * 1.2;

                // Text is drawn from (x, y) baseline or top-left depending on baseline settings.
                // Standard fillText uses baseline. Core.js seems to use top-left for wrapped text or manual y.
                // Assuming top-left for simplicity
                isHit = (this.mouseX >= obj.x && this.mouseX <= obj.x + approxW &&
                    this.mouseY >= obj.y && this.mouseY <= obj.y + approxH);
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

    update(dt) {
        // Apply behaviors
        this.objects.forEach(obj => {
            if (obj.behaviors && obj.behaviors.length > 0) {
                obj.behaviors.forEach(behaviorId => {
                    const behavior = this.behaviors.get(behaviorId);
                    if (behavior) {
                        behavior(obj, this, dt);
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
                    // Approximation: v *= (1 - friction * dt)
                    if (this.friction) {
                        obj.physics.velocity.x *= (1 - this.friction * dt);
                        obj.physics.velocity.y *= (1 - this.friction * dt);
                    }

                    // 3. Integrate Position
                    obj.x += obj.physics.velocity.x * dt;
                    obj.y += obj.physics.velocity.y * dt;

                    // Global Bounciness Default
                    const bounciness = obj.physics.bounciness !== undefined ? obj.physics.bounciness : this.wallBounciness;

                    // Bounce off edges
                    if (obj.type === 'circle') {
                        if (obj.y + obj.radius > this.height) {
                            obj.y = this.height - obj.radius;
                            obj.physics.velocity.y *= -bounciness;
                        }
                        // Ceiling collision
                        if (obj.y - obj.radius < 0) {
                            obj.y = obj.radius;
                            obj.physics.velocity.y *= -bounciness;
                        }

                        if (obj.x + obj.radius > this.width) {
                            obj.x = this.width - obj.radius;
                            obj.physics.velocity.x *= -bounciness;
                        }
                        if (obj.x - obj.radius < 0) {
                            obj.x = obj.radius;
                            obj.physics.velocity.x *= -bounciness;
                        }

                    } else if (obj.type === 'rect') {
                        if (obj.y + obj.height / 2 > this.height) {
                            obj.y = this.height - obj.height / 2;
                            obj.physics.velocity.y *= -bounciness;
                        }
                        // Ceiling
                        if (obj.y - obj.height / 2 < 0) {
                            obj.y = obj.height / 2;
                            obj.physics.velocity.y *= -bounciness;
                        }

                        if (obj.x + obj.width / 2 > this.width) {
                            obj.x = this.width - obj.width / 2;
                            obj.physics.velocity.x *= -bounciness;
                        }
                        if (obj.x - obj.width / 2 < 0) {
                            obj.x = obj.width / 2;
                            obj.physics.velocity.x *= -bounciness;
                        }
                    } else {
                        // Generic Collision (Text, Symbol, etc.) - Treat as AABB
                        // Estimate dimensions if not explicit
                        let w = obj.width || 40;
                        let h = obj.height || 40;

                        // For Symbols
                        if (obj.type === 'symbol') {
                            const size = obj.size || 48;
                            w = size;
                            h = size;
                        }
                        // For Text (Approximation)
                        if (obj.type === 'text') {
                            // Rough estimate based on font size if width not set
                            // Note: Accurate text metrics require canvas context, which is expensive in loop.
                            // We use a safe safe box or user-defined width if wrapping.
                            const fs = obj.fontSize || 20;
                            if (!obj.width) w = (obj.text || "").length * (fs * 0.6);
                            h = (obj.lineHeight || 1.2) * fs;
                        }

                        // Floor
                        if (obj.y + h / 2 > this.height) {
                            obj.y = this.height - h / 2;
                            obj.physics.velocity.y *= -bounciness;
                        }
                        // Ceiling
                        if (obj.y - h / 2 < 0) {
                            obj.y = h / 2;
                            obj.physics.velocity.y *= -bounciness;
                        }
                        // Right Wall
                        if (obj.x + w / 2 > this.width) {
                            obj.x = this.width - w / 2;
                            obj.physics.velocity.x *= -bounciness;
                        }
                        // Left Wall
                        if (obj.x - w / 2 < 0) {
                            obj.x = w / 2;
                            obj.physics.velocity.x *= -bounciness;
                        }
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

                    // Circle-Circle
                    if (a.type === 'circle' && b.type === 'circle') {
                        const dx = a.x - b.x;
                        const dy = a.y - b.y;
                        const distSq = dx * dx + dy * dy;
                        const radSum = a.radius + b.radius;
                        if (distSq < radSum * radSum) hit = true;
                    }
                    // AABB-AABB (Treat everything else as Rect for trigger simplicity)
                    else {
                        // Get bounds A
                        let bA = { x: a.x, y: a.y, w: 0, h: 0 };
                        if (a.type === 'circle') { bA.w = a.radius * 2; bA.h = a.radius * 2; }
                        else if (a.type === 'rect') { bA.w = a.width; bA.h = a.height; }
                        else if (a.type === 'symbol') { const s = a.size || 48; bA.w = s; bA.h = s; }
                        else { bA.w = a.width || 40; bA.h = a.height || 40; } // Fallback

                        // Get bounds B
                        let bB = { x: b.x, y: b.y, w: 0, h: 0 };
                        if (b.type === 'circle') { bB.w = b.radius * 2; bB.h = b.radius * 2; }
                        else if (b.type === 'rect') { bB.w = b.width; bB.h = b.height; }
                        else if (b.type === 'symbol') { const s = b.size || 48; bB.w = s; bB.h = s; }
                        else { bB.w = b.width || 40; bB.h = b.height || 40; }

                        // Check AABB Overlap (Center-based coords)
                        if (Math.abs(bA.x - bB.x) < (bA.w + bB.w) / 2 &&
                            Math.abs(bA.y - bB.y) < (bA.h + bB.h) / 2) {
                            hit = true;
                        }
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
                // Rate Limiting (Particles per second)
                if (!obj._lastEmit) obj._lastEmit = 0;
                const interval = 1 / (obj.rate || 10);
                obj._lastEmit += dt;

                while (obj._lastEmit > interval) {
                    this.particleSystem.spawn(obj.x, obj.y, {
                        speed: obj.speed || 100,
                        angle: obj.angle || -90, // Up
                        spread: obj.spread || 30,
                        color: obj.color || '#ffaa00',
                        lifetime: obj.lifetime || 1.0,
                        size: obj.particleSize || 3
                    });
                    obj._lastEmit -= interval;
                }
            }
        });

        this.particleSystem.update(dt);

        // Update UI (Graphs, Bindings)
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

        if (this.objects.length > 0 && Math.random() < 0.01) {
            console.log('🎨 Rendering', this.objects.length, 'objects');
            console.log('First object:', this.objects[0]);
        }

        // Clear handles from previous frame
        this.handles = [];

        this.objects.forEach(obj => {
            this.ctx.save();

            // Apply opacity
            if (obj.opacity !== undefined) {
                this.ctx.globalAlpha = obj.opacity;
            }

            // Render based on type
            if (obj.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = obj.fill || '#3498db';
                this.ctx.fill();

                if (obj.stroke) {
                    this.ctx.strokeStyle = obj.stroke;
                    this.ctx.lineWidth = obj.strokeWidth || 2;
                    this.ctx.stroke();
                }

                // Debug: Log first circle render
                if (Math.random() < 0.01) {
                    console.log('🔵 Rendered circle at', obj.x, obj.y, 'radius', obj.radius, 'color', obj.fill);
                }
            } else if (obj.type === 'emitter') {
                // Draw Emitter Source Visualization
                this.ctx.save();
                this.ctx.translate(obj.x, obj.y);
                this.ctx.rotate((obj.angle || 0) * Math.PI / 180);

                // Icon (funnel shape)
                this.ctx.fillStyle = obj.color || '#ffa500';
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0); // Origin
                this.ctx.lineTo(-10, -20);
                this.ctx.lineTo(10, -20);
                this.ctx.closePath();
                this.ctx.fill();

                // Selection Box hint
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(-16, -16, 32, 32);

                this.ctx.restore();
            } else if (obj.type === 'rect') {
                // Center-based rendering
                const x = obj.x - obj.width / 2;
                const y = obj.y - obj.height / 2;

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

                const text = obj.text || '';
                const fontSize = obj.fontSize || 20;
                const lineHeight = (obj.lineHeight || 1.2) * fontSize;
                const maxWidth = obj.wordWrap ? (obj.width || 300) : null;

                // 1. Process Text into Lines (Handling \n and Wrapping)
                let lines = [];
                const rawLines = text.split('\n');

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

                // 2. Render Lines centered vertically or based on alignment
                const totalHeight = lines.length * lineHeight;
                let startY = obj.y - (totalHeight / 2) + (lineHeight / 2); // Default Middle

                if (obj.verticalAlign === 'top') {
                    startY = obj.y + (lineHeight / 2);
                } else if (obj.verticalAlign === 'bottom') {
                    startY = obj.y - totalHeight + (lineHeight / 2);
                }

                lines.forEach((line, i) => {
                    if (obj.align === 'justify' && obj.wordWrap && maxWidth) {
                        // Justify logic (all lines except last one)
                        // Note: If line was forced break due to \n, we might not want to justify it? 
                        // For simplicity, we justify if it reached wrapping point, but current split logic doesn't differentiate \n vs wrap easily without looking at raw text structure again.
                        // Better check: Is this the last line of the block? Definitely don't justify.
                        // Does it look "full"? 

                        const isLastLine = i === lines.length - 1;
                        if (isLastLine) {
                            // Left align last line
                            this.ctx.textAlign = 'left';
                            this.ctx.fillText(line, obj.x, startY + (i * lineHeight));
                        } else {
                            const words = line.trim().split(' ');
                            if (words.length > 1) {
                                // Calculate total word width
                                const lineString = words.join('');
                                // Helper to measure pure text without spaces
                                // Actually easier: Measure total string with single spaces, calculate diff
                                const nativeWidth = this.ctx.measureText(line).width;
                                const totalGapSpace = maxWidth - this.ctx.measureText(words.join('')).width;
                                // measureText(words.join('')) is width with NO spaces? No.
                                // Let's measure each word
                                const totalWordWidth = words.reduce((acc, w) => acc + this.ctx.measureText(w).width, 0);
                                const availableSpace = maxWidth - totalWordWidth;
                                const spacePerGap = availableSpace / (words.length - 1);

                                let currentX = obj.x;
                                this.ctx.textAlign = 'left';

                                words.forEach((w, wIndex) => {
                                    this.ctx.fillText(w, currentX, startY + (i * lineHeight));
                                    currentX += this.ctx.measureText(w).width + spacePerGap;
                                });
                            } else {
                                this.ctx.textAlign = 'left';
                                this.ctx.fillText(line, obj.x, startY + (i * lineHeight));
                            }
                        }

                    } else {
                        // Standard Rendering
                        // Justify without wrap falls back to Center/Left (based on vertical align? No, horizontal).
                        // If align is 'justify' but no wrap, treat as left or center? Treat as Left for safety or Center?
                        // Let's coerce 'justify' -> 'left' if no wrap
                        let align = obj.align === 'justify' ? 'left' : (obj.align || 'center');
                        this.ctx.textAlign = align;
                        this.ctx.fillText(line, obj.x, startY + (i * lineHeight));
                    }
                });
            } else if (obj.type === 'symbol') {
                // Symbol rendering (emoji as large text)
                this.ctx.font = `${obj.size !== undefined ? obj.size : 48}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.translate(obj.x, obj.y);
                if (obj.rotation) this.ctx.rotate(obj.rotation);
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
                this.drawHandle(pos.x, pos.y, `circle-resize-${pos.dir}`, pos.cursor, obj);
            });

            // Rotation handle
            const rotHandleY = obj.y - obj.radius - 30;
            this.drawRotationHandle(obj.x, rotHandleY, 'circle-rotate', obj);

            // Line to rotation handle
            this.ctx.strokeStyle = '#3b82f6';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([2, 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(obj.x, obj.y - obj.radius);
            this.ctx.lineTo(obj.x, rotHandleY);
            this.ctx.stroke();

        } else if (obj.type === 'rect') {
            // Rectangle outline
            const x = obj.x - obj.width / 2;
            const y = obj.y - obj.height / 2;
            this.ctx.strokeRect(x - 5, y - 5, obj.width + 10, obj.height + 10);

            // 8 resize handles
            const handlePositions = [
                { x: x, y: y, cursor: 'nwse-resize', dir: 'nw' },
                { x: x + obj.width / 2, y: y, cursor: 'ns-resize', dir: 'n' },
                { x: x + obj.width, y: y, cursor: 'nesw-resize', dir: 'ne' },
                { x: x + obj.width, y: y + obj.height / 2, cursor: 'ew-resize', dir: 'e' },
                { x: x + obj.width, y: y + obj.height, cursor: 'nwse-resize', dir: 'se' },
                { x: x + obj.width / 2, y: y + obj.height, cursor: 'ns-resize', dir: 's' },
                { x: x, y: y + obj.height, cursor: 'nesw-resize', dir: 'sw' },
                { x: x, y: y + obj.height / 2, cursor: 'ew-resize', dir: 'w' }
            ];

            handlePositions.forEach(pos => {
                this.drawHandle(pos.x, pos.y, `rect-resize-${pos.dir}`, pos.cursor, obj);
            });

            // Rotation handle
            const rotHandleY = y - 30;
            this.drawRotationHandle(obj.x, rotHandleY, 'rect-rotate', obj);

            // Line to rotation handle
            this.ctx.strokeStyle = '#3b82f6';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([2, 2]);
            this.ctx.beginPath();
            this.ctx.moveTo(obj.x, y);
            this.ctx.lineTo(obj.x, rotHandleY);
            this.ctx.stroke();
        } else if (obj.type === 'text') {
            this.ctx.setLineDash([5, 5]); // Reset dash
            this.ctx.strokeStyle = '#3b82f6';

            // Calculate Text Metrics (Multi-line aware)
            this.ctx.font = `${obj.fontWeight || ''} ${obj.fontSize || 20}px ${obj.fontFamily || 'Arial'}`;
            const text = obj.text || '';
            const fontSize = obj.fontSize || 20;
            const lineHeight = (obj.lineHeight || 1.2) * fontSize;
            const maxWidth = obj.wordWrap ? (obj.width || 300) : null;

            let lines = [];
            const rawLines = text.split('\n');

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

            // Determine actual bounding box
            let finalWidth = 0;
            if (obj.wordWrap) {
                finalWidth = obj.width; // Use box width if wrapping
            } else {
                // Find max line width
                lines.forEach(line => {
                    const w = this.ctx.measureText(line).width;
                    if (w > finalWidth) finalWidth = w;
                });
            }

            const finalHeight = lines.length * lineHeight;

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
