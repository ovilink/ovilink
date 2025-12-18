/**
 * Enhanced HTML5 Exporter
 * Creates self-contained, production-ready HTML5 animations
 * Bundles actual runtime libraries for full fidelity.
 */

// Source Code Storage (Simulated Bundle)
const LIBS = {
    // --- PARTICLE SYSTEM ---
    particles: `
    // Helper for color interpolation
    function lerpColor(a, b, amount) {
        var ah = parseInt(a.replace(/#/g, ''), 16),
            bh = parseInt(b.replace(/#/g, ''), 16),
            ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + amount * (br - ar),
            rg = ag + amount * (bg - ag),
            rb = ab + amount * (bb - ab);
        return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + (rb | 0)).toString(16).slice(1);
    }

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = 0;
            this.y = 0;
            this.vx = 0;
            this.vy = 0;
            this.life = 0;
            this.maxLife = 1;

            this.color = '#ffffff';
            this.startColor = '#ffffff';
            this.endColor = '#ffffff';

            this.size = 2;
            this.startSize = 2;
            this.endSize = 2;

            this.gravity = 0;
            this.active = false;
            this.alpha = 1;
        }
    }

    class ParticleSystem {
        constructor() {
            this.pool = [];
            this.activeParticles = [];
            this.maxParticles = 1000; // Increased limit

            // Pre-warm pool
            for (let i = 0; i < this.maxParticles; i++) {
                this.pool.push(new Particle());
            }
        }

        spawn(x, y, config) {
            let p = null;
            if (this.pool.length > 0) {
                p = this.pool.pop();
            } else {
                return;
            }

            p.active = true;
            p.x = x;
            p.y = y;

            const angle = (config.angle || 0) + (Math.random() - 0.5) * (config.spread || 0);
            const speed = (config.speed || 100) * (0.8 + Math.random() * 0.4);

            // Convert angle (degrees) to radians
            const rad = angle * (Math.PI / 180);
            p.vx = Math.cos(rad) * speed;
            p.vy = Math.sin(rad) * speed;

            p.maxLife = (config.lifetime || 1) * (0.8 + Math.random() * 0.4);
            p.life = p.maxLife;

            p.startColor = config.color || '#ff0000';
            p.endColor = config.endColor || p.startColor;
            p.color = p.startColor;

            p.startSize = config.size || 3;
            p.endSize = config.endSize !== undefined ? config.endSize : p.startSize;
            p.size = p.startSize;

            p.gravity = config.gravity || 0;
            p.alpha = 1;

            this.activeParticles.push(p);
        }

        update(dt) {
            for (let i = this.activeParticles.length - 1; i >= 0; i--) {
                const p = this.activeParticles[i];

                p.life -= dt;
                if (p.life <= 0) {
                    // Return to pool
                    p.active = false;
                    this.pool.push(p);
                    this.activeParticles.splice(i, 1);
                    continue;
                }

                // Physics
                p.vy += p.gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;

                // Interpolation
                const progress = 1 - (p.life / p.maxLife); // 0 to 1

                // Size
                p.size = p.startSize + (p.endSize - p.startSize) * progress;

                // Color
                if (p.startColor !== p.endColor) {
                    try {
                        p.color = lerpColor(p.startColor, p.endColor, progress);
                    } catch (e) { /* fallback if color format bad */ }
                }

                // Fade out
                p.alpha = p.life / p.maxLife;
            }
        }

        draw(ctx) {
            this.activeParticles.forEach(p => {
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
        }
    }
    `,

    // 1. Core Runtime (OviStateRuntime)
    core: `
class OviStateRuntime {
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

    addObject(obj) {
        this.objects.push(obj);
        console.log(\`➕ Added \${ obj.type } object: \`, obj.id, "Total objects:", this.objects.length);
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
                const lines = safeText.split('\\n').length;
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

        console.log(\`📏 Runtime Resized to \${ width }x\${ height }\`);

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
                this.ctx.font = \`\${obj.fontWeight || ''} \${obj.fontSize || 20}px \${obj.fontFamily || 'Arial'}\`;
                this.ctx.fillStyle = obj.fill || '#ffffff';
                this.ctx.textAlign = obj.align || 'center';
                this.ctx.textBaseline = 'middle';
                
                const text = obj.text || '';
                const fontSize = obj.fontSize || 20;
                const lineHeight = (obj.lineHeight || 1.2) * fontSize;
                const maxWidth = obj.wordWrap ? (obj.width || 300) : null;
                
                let lines = [];
                const rawLines = String(text).split('\\n');

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
                    startY = 0 - obj.height/2 + (lineHeight / 2); // If we had valid height passed or estimated
                }
                // Text alignment is tricky when translated to center. 
                // Core.js assumed obj.y was baseline or center. 
                // Now 0,0 is center.

                lines.forEach((line, i) => {
                    this.ctx.textAlign = obj.align || 'center';
                    this.ctx.fillText(line, 0, startY + (i * lineHeight));
                });

            } else if (obj.type === 'symbol') {
                this.ctx.font = (obj.size !== undefined ? obj.size : 48) + 'px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                // No translate needed, already at 0,0
                this.ctx.fillText(obj.symbol || '😀', 0, 0);
            }
            this.ctx.restore();
        });
        this.ctx.restore();

        // Draw Particles
        if (this.particleSystem) this.particleSystem.draw(this.ctx);

        // Draw UI
        if (this.ui) this.ui.render(this.ctx);
    }
    
    attachUI(ui) { this.ui = ui; }
}
`,

    // 2. Runtime UI
    ui: `
class RuntimeUI {
    constructor(runtime, container) {
        this.runtime = runtime;
        this.container = container;
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none';
        this.container.style.overflow = 'hidden';
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.runtime.controls.forEach(control => {
            this.renderComponent(control);
        });
    }

    render(ctx) {
        // Overlay rendering (graphs, etc) if needed
    }

    update(dt) {
         this.runtime.controls.forEach(control => {
            if (control.binding && control.binding.property) {
                // Only update graphs or displays every frame (Data -> UI)
                // Inputs are Event-Driven (UI -> Data) to avoid overwriting simulation logic
                if (control.type === 'graph' || control.type === 'display') {
                    const targetIds = (control.binding.targets && control.binding.targets.length > 0) 
                        ? control.binding.targets 
                        : (control.binding.targetId ? [control.binding.targetId] : []);

                    targetIds.forEach((id, index) => {
                        const target = this.runtime.objects.find(o => o.id === id);
                        if (target) {
                            if (control.type === 'graph') {
                                if (index === 0) this.updateGraph(control, target);
                            } else if (control.type === 'display') {
                                // Implement display update if needed, for now placeholder
                            }
                        }
                    });
                }
            }
         });
    }

    applyBinding(control) {
        if (control.binding && control.binding.property) {
            const targetIds = (control.binding.targets && control.binding.targets.length > 0) 
                ? control.binding.targets 
                : (control.binding.targetId ? [control.binding.targetId] : []);

            targetIds.forEach(id => {
                const target = this.runtime.objects.find(o => o.id === id);
                if (target) {
                    let value;
                    if (control.type === 'checkbox') {
                         value = control.checked;
                    } else if (control.type === 'slider' || control.type === 'number') {
                         value = parseFloat(control.value);
                    } else {
                         value = control.value; // Strings for color, text, dropdown
                    }

                    console.log('🔗 Binding: ' + control.binding.property + ' = ' + value + ' on ' + target.id);

                    if (control.binding.property.includes('.')) {
                        const parts = control.binding.property.split('.');
                        if (parts[0] === 'physics') {
                             if (target.physics) target.physics[parts[1]] = value;
                        } else {
                            const behaviorId = parts[0];
                            const paramName = parts[1];
                            if (this.runtime.registry) {
                                if (!target.behaviorParams) target.behaviorParams = {};
                                if (!target.behaviorParams[behaviorId]) target.behaviorParams[behaviorId] = {};
                                target.behaviorParams[behaviorId][paramName] = value;
                            }
                        }
                    } else {
                        target[control.binding.property] = value;
                    }
                }
            });
        }
    }

    updateGraph(control, target) {
        let val = target[control.binding.property];
        if (target.physics && control.binding.property.startsWith('velocity.')) {
            val = target.physics.velocity[control.binding.property.split('.')[1]];
        }
        if (val !== undefined) {
             if (!control.data) control.data = [];
             control.data.push(val);
             if (control.data.length > (control.maxPoints||200)) control.data.shift();
             this.renderGraph(control);
        }
    }

    renderComponent(control) {
        const wrapper = document.createElement('div');
        wrapper.dataset.id = control.id;
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.pointerEvents = 'auto';
        
        let content = '';
        if (control.type === 'button') {
            content = \`<button style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">\${control.label || 'Button'}</button>\`;
        } else if (control.type === 'slider') {
            const showLabel = control.showLabel !== false; // Default to true
            content = \`
                <div style="background: rgba(30,30,30,0.8); padding: 5px; border-radius: 4px; color: white; font-family: sans-serif; font-size: 12px;">
                    \${showLabel ? \`<label style="display:block; margin-bottom:2px;">\${control.label || 'Slider'}</label>\` : ''}
                    <input type="range" min="\${control.min || 0}" max="\${control.max || 100}" value="\${control.value || 0}" step="\${control.step || 1}" style="width: 120px;">
                </div>
            \`;
        } else if (control.type === 'checkbox') {
            content = \`<div style="background:white; padding:4px; border-radius:4px; border:1px solid #ccc; display:flex; align-items:center;"><input type="checkbox" \${control.checked ? 'checked' : ''}> <span style="font-size:12px; margin-left:4px;">\${control.label}</span></div>\`;
        } else if (control.type === 'dropdown') {
            const rawOpts = control.options || [];
            const safeOpts = Array.isArray(rawOpts) ? rawOpts : (typeof rawOpts === 'string' ? rawOpts.split(',') : []);
            const opts = safeOpts.map(o => \`<option value="\${o.trim()}" \${control.value === o.trim() ? 'selected' : ''}>\${o.trim()}</option>\`).join('');
            content = \`<select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; background: white; font-size: 12px; min-width: 100px;">\${opts}</select>\`;
        } else if (control.type === 'color_picker') {
            content = \`<div style="background:white; padding:4px; border-radius:4px; border:1px solid #ccc; display:flex; align-items:center;"><input type="color" value="\${control.value||'#ff0000'}" style="border:none; width:30px; height:30px; cursor:pointer;"> <span style="font-size:12px; margin-left:6px;">Color</span></div>\`;
        } else if (control.type === 'text_input') {
            content = \`<input type="text" placeholder="\${control.placeholder||''}" value="\${control.value||''}" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; font-size: 12px; width: 120px;">\`;
        } else if (control.type === 'display') {
             content = \`<div style="background: white; border: 1px solid #ccc; padding: 5px; text-align: center; width: 80px;">0.00</div>\`;
        } else if (control.type === 'graph') {
             control.data = control.data || [];
             content = \`
                <div style="background:rgba(255,255,255,0.9); border:1px solid #ccc; border-radius:4px; width:\${control.width||250}px; height:\${control.height||150}px;">
                    <div style="padding:5px; font-size:10px; color:#333; display:flex; justify-content:space-between;">
                        <span>\${control.binding?.property || 'Graph'}</span>
                        <span class="graph-value">--</span>
                    </div>
                    <canvas width="\${control.width||250}" height="\${(control.height||150)-25}" style="width:100%; height:80%; display:block;"></canvas>
                </div>
             \`;
        }

        wrapper.innerHTML = content;
        this.container.appendChild(wrapper);

        // Interaction Listeners
        if (control.type === 'button') {
            const btn = wrapper.querySelector('button');
            if (btn) btn.onclick = (e) => { 
                e.stopPropagation(); 
                if (control.binding && control.binding.action) {
                     // Multi-target support
                     const targetIds = (control.binding.targets && control.binding.targets.length > 0) 
                         ? control.binding.targets 
                         : (control.binding.targetId ? [control.binding.targetId] : []);

                     targetIds.forEach(id => {
                        const target = this.runtime.objects.find(o => o.id === id);
                        if (target) {
                            this.triggerAction(control.binding.action, target, control.binding.actionId);
                        }
                     });
                }
            };
        } else {
             // Unified Input Handler (Slider, Checkbox, Color, Text, Dropdown)
             const input = wrapper.querySelector('input, select');
             if(input) {
                 const updateState = (e) => {
                     e.stopPropagation();
                     if (control.type === 'checkbox') {
                         control.checked = e.target.checked;
                     } else {
                         control.value = e.target.value;
                     }
                     // In runtime export, we might need two-way binding if we want UI to update too?
                     // But for now, just apply to objects
                     this.applyBinding(control); // Export uses applyBinding() helper specifically
                 };
                 
                 input.addEventListener('input', updateState);
                 input.addEventListener('change', updateState);
             }
        }
    }

    triggerAction(action, target, actionId) {
        if (!target) return;
        console.log("⚡ Executing action:", action, "on", target.id);

        switch(action) {
            case 'reset_pos': target.x=100; target.y=100; if(target.physics) target.physics.velocity={x:0,y:0}; break;
            case 'jump': if(target.physics) target.physics.velocity.y = -600; break;
            case 'stop': if(target.physics) target.physics.velocity = {x:0, y:0}; break;
            case 'toggle_physics': if(target.physics) target.physics.enabled = !target.physics.enabled; break;
            case 'random_color': target.fill = '#' + Math.floor(Math.random()*16777215).toString(16); break;
            case 'start_behavior': if (actionId) this.setBehaviorStateByEventId(target, actionId, true); break;
            case 'stop_behavior': if (actionId) this.setBehaviorStateByEventId(target, actionId, false); break;
            case 'toggle_behavior': if (actionId) this.toggleBehaviorStateByEventId(target, actionId); break;
        }
    }

    setBehaviorStateByEventId(obj, eventId, state) {
        if (!obj.behaviors) return;
        // In Export, obj.behaviors is list of IDs? Yes.
        // We need to look up parameters.
        if (this.runtime.registry) {
             obj.behaviors.forEach(bId => {
                 const actId = this.runtime.registry.getParameter(obj, bId, 'activationId');
                 if (actId === eventId) {
                     if (!obj._behaviorState) obj._behaviorState = {};
                     obj._behaviorState[bId] = state;
                 }
             });
        }
    }

    toggleBehaviorStateByEventId(obj, eventId) {
         if (!obj.behaviors) return;
         if (this.runtime.registry) {
             obj.behaviors.forEach(bId => {
                 const actId = this.runtime.registry.getParameter(obj, bId, 'activationId');
                 if (actId === eventId) {
                     if (!obj._behaviorState) obj._behaviorState = {};
                     obj._behaviorState[bId] = !obj._behaviorState[bId];
                 }
             });
        }
    }

    renderGraph(control) {
        const wrapper = this.container.querySelector(\`[data-id="\${control.id}"]\`);
        if(!wrapper) return;
        const cvs = wrapper.querySelector('canvas');
        if(!cvs) return;
        const ctx = cvs.getContext('2d');
        const w = cvs.width, h=cvs.height;
        ctx.clearRect(0,0,w,h);
        
        const valDisplay = wrapper.querySelector('.graph-value');
        if(valDisplay && control.data.length>0) valDisplay.textContent = control.data[control.data.length-1].toFixed(2);
        
        if(control.data.length>1) {
            ctx.strokeStyle = control.style?.color || '#007acc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            let min = Math.min(...control.data), max = Math.max(...control.data);
            if(min===max) {max++; min--;}
            const step = w / (control.data.length-1);
            control.data.forEach((val, i) => {
                const y = h - ((val-min)/(max-min)*h);
                if(i===0) ctx.moveTo(i*step, y); else ctx.lineTo(i*step, y);
            });
            ctx.stroke();
        }
    }
}
`,

    // 3. Behaviors (Simplified Registry for Export)
    behaviors: `
/* Behavior Registry */
class BehaviorRegistry {
    constructor(runtime) {
        this.runtime = runtime;
        this.runtime.registry = this; // Attach self
    }
    register(id, def) {
        // Register update function directly to runtime
        if(def.update) {
            this.runtime.registerBehavior(id, (obj, dt, rt) => {
                // --- ACTIVATION LOGIC (Bundled) ---
                const actMode = this.getParameter(obj, id, 'activationMode') || 'on_enter';
                
                if (!obj._behaviorState) obj._behaviorState = {};
                if (obj._behaviorState[id] === undefined) {
                    obj._behaviorState[id] = (actMode === 'on_enter');
                }

                let shouldRun = false;
                if (actMode === 'on_enter') shouldRun = true;
                else if (actMode === 'on_hover') shouldRun = obj.isHovered;
                else if (actMode === 'on_click') {
                    if (obj._justClicked) obj._behaviorState[id] = true;
                    shouldRun = obj._behaviorState[id];
                } else if (actMode === 'on_click_toggle') {
                    if (obj._justClicked) obj._behaviorState[id] = !obj._behaviorState[id];
                    shouldRun = obj._behaviorState[id];
                } else if (actMode === 'manual') {
                    shouldRun = obj._behaviorState[id];
                }

                if (shouldRun) {
                    // console.log("Running behavior:", id); // Un-comment for deep debug
                    def.update(obj, dt, rt, this);
                } else {
                    // Special handling for typewriter in manual mode - clear text when not running
                    if (id === 'typewriter' && actMode === 'manual' && obj.type === 'text') {
                        // Preserve original text for export if not already stored
                        if (!obj._lastFullText && obj.text && obj.text.trim()) {
                            obj._lastFullText = obj.text;
                        }
                        obj.text = '';
                    }
                }
            });
        }
    }
    getParameter(obj, behaviorId, paramName) {
        // 1. Check runtime object params first (Custom values + Activation props)
        if (obj.behaviorParams && obj.behaviorParams[behaviorId] && 
            obj.behaviorParams[behaviorId][paramName] !== undefined) {
             return obj.behaviorParams[behaviorId][paramName];
        }
        
        // 2. Fallback to defaults (This part is tricky in export as we don't have full definitions)
        // In the simplified export registry, we might rely entirely on behaviorParams being correct.
        return 0; 
    }
}

// --- Motion Behaviors ---
function registerMotion(registry) {
    registry.register('wiggle', {
        update(obj, dt, runtime, reg) {
            const intensity = reg.getParameter(obj,'wiggle','intensity')||2;
            const speed = reg.getParameter(obj,'wiggle','speed')||1;
            obj.x += (Math.random()-0.5)*intensity*speed;
            obj.y += (Math.random()-0.5)*intensity*speed;
        }
    });
    registry.register('shake', {
        init(obj) {
            if(!obj._sT) obj._sT=0;
            if(!obj._sOX) obj._sOX=obj.x;
            if(!obj._sOY) obj._sOY=obj.y;
        },
        update(obj, dt, rt, reg) {
            if(!obj._sT) this.init(obj);
            const amp = reg.getParameter(obj,'shake','amplitude')||5;
            const freq = reg.getParameter(obj,'shake','frequency')||5;
            obj._sT += dt*freq;
            obj.x = obj._sOX + Math.sin(obj._sT*10)*amp;
            obj.y = obj._sOY + Math.cos(obj._sT*7)*amp;
        }
    });
    registry.register('float', {
         init(obj) { if(!obj._fY) obj._fY=obj.y; if(!obj._fT) obj._fT=0; },
         update(obj, dt, rt, reg) {
             if(!obj._fY) this.init(obj);
             const h = reg.getParameter(obj,'float','height')||30;
             const s = reg.getParameter(obj,'float','speed')||1;
             obj._fT += dt*s;
             obj.y = obj._fY + Math.sin(obj._fT)*h;
         }
    });
    registry.register('spiral', {
        init(obj) { if(!obj._spA) obj._spA=0; if(!obj._spR) obj._spR=50; },
        update(obj, dt, rt, reg) {
            if(!obj._spA) this.init(obj);
            const speed = reg.getParameter(obj, 'spiral', 'speed')||1;
            const expansion = reg.getParameter(obj, 'spiral', 'expansion')||0.5;
            const centerX = reg.getParameter(obj, 'spiral', 'centerX')||400;
            const centerY = reg.getParameter(obj, 'spiral', 'centerY')||300;
            obj._spA += dt * speed;
            obj._spR += expansion * dt * 10;
            obj.x = centerX + Math.cos(obj._spA) * obj._spR;
            obj.y = centerY + Math.sin(obj._spA) * obj._spR;
        }
    });
    registry.register('zigzag', {
        init(obj) { 
            if(!obj._zzT) obj._zzT=0; 
            if(!obj._zzO) obj._zzO={x:obj.x, y:obj.y}; 
        },
        update(obj, dt, rt, reg) {
            if(!obj._zzT) this.init(obj);
            const amp = reg.getParameter(obj, 'zigzag', 'amplitude')||40;
            const freq = reg.getParameter(obj, 'zigzag', 'frequency')||3;
            const dir = reg.getParameter(obj, 'zigzag', 'direction')||'horizontal';
            obj._zzT += dt * freq;
            const offset = Math.sin(obj._zzT * Math.PI) * amp;
            if (dir === 'horizontal') {
                obj.y = obj._zzO.y + offset;
                obj.x += dt * 50; 
            } else {
                obj.x = obj._zzO.x + offset;
                obj.y += dt * 50;
            }
        }
    });
     registry.register('wave_motion', {
        init(obj) { if(!obj._wY) obj._wY=obj.y; if(!obj._wT) obj._wT=0; },
        update(obj, dt, rt, reg) {
            if(!obj._wY) this.init(obj);
            const amp = reg.getParameter(obj,'wave_motion','amplitude')||50;
            const wave = reg.getParameter(obj,'wave_motion','wavelength')||100;
            const spd = reg.getParameter(obj,'wave_motion','speed')||1;
            obj._wT += dt*spd;
            obj.x += dt*30; 
            obj.y = obj._wY + Math.sin((obj.x/wave)*Math.PI*2)*amp;
        }
    });

    registry.register('bounce', {
        update(obj, dt, rt, reg) {
            if (!obj.physics) obj.physics = { enabled: true, velocity: { x: 0, y: 0 } };
            obj.physics.enabled = true;
            const bounciness = reg.getParameter(obj, 'bounce', 'bounciness');
            if(bounciness!==undefined) obj.physics.bounciness = bounciness;
            
            // Note: Bounds collision handled by core physics loop in export
            // We just ensure physics properties are set correctly here.
        }
    });

    registry.register('orbit', {
        init(obj) { if(!obj._oA) obj._oA=0; },
        update(obj, dt, rt, reg) {
            if(!obj._oA && obj._oA!==0) this.init(obj);
            const speed = reg.getParameter(obj, 'orbit', 'speed')||1;
            const radius = reg.getParameter(obj, 'orbit', 'radius')||100;
            const cx = reg.getParameter(obj, 'orbit', 'centerX')||400;
            const cy = reg.getParameter(obj, 'orbit', 'centerY')||300;
            obj._oA += dt * speed;
            obj.x = cx + Math.cos(obj._oA) * radius;
            obj.y = cy + Math.sin(obj._oA) * radius;
        }
    });
}

// --- Transform Behaviors ---
function registerTransform(registry) {
    registry.register('rotate_continuous', {
        init(obj) { if(obj.rotation===undefined) obj.rotation=0; },
        update(obj, dt, rt, reg) {
            const s = reg.getParameter(obj,'rotate_continuous','speed')||2;
            const cw = reg.getParameter(obj,'rotate_continuous','clockwise')!==false;
            obj.rotation += (cw?1:-1)*s*dt; 
        }
    });
    registry.register('scale_breath', {
        init(obj) {
            if(!obj._sbT) obj._sbT=0;
            if(!obj._sbOR) obj._sbOR=obj.radius||30;
            if(!obj._sbOW) obj._sbOW=obj.width||60;
            if(!obj._sbOH) obj._sbOH=obj.height||60;
        },
        update(obj, dt, rt, reg) {
            if(!obj._sbT) this.init(obj);
            const min = reg.getParameter(obj,'scale_breath','minScale')||0.8;
            const max = reg.getParameter(obj,'scale_breath','maxScale')||1.2;
            const spd = reg.getParameter(obj,'scale_breath','speed')||1;
            obj._sbT += dt*spd;
            const scale = min + (max-min) * (Math.sin(obj._sbT)*0.5+0.5);
            if(obj.type==='circle') obj.radius = obj._sbOR*scale;
            else { obj.width = obj._sbOW*scale; obj.height = obj._sbOH*scale; }
        }
    });
     registry.register('color_cycle', {
        init(obj) { if(!obj._cH) obj._cH=0; },
        update(obj, dt, rt, reg) {
            if(!obj._cH) this.init(obj);
            const s = reg.getParameter(obj,'color_cycle','speed')||1;
            const sat = reg.getParameter(obj,'color_cycle','saturation')||70;
            const lig = reg.getParameter(obj,'color_cycle','lightness')||50;
             obj._cH += dt*s*60;
             if(obj._cH>360) obj._cH-=360;
             obj.fill = \`hsl(\${obj._cH}, \${sat}%, \${lig}%)\`;
        }
    });
    registry.register('glow', {
        init(obj) { if(!obj._glT) obj._glT=0; },
        update(obj, dt, rt, reg) {
             if(!obj._glT) this.init(obj);
             const intensity = reg.getParameter(obj,'glow','intensity')||0.3;
             const speed = reg.getParameter(obj,'glow','speed')||2;
             obj._glT += dt*speed;
             // Note: Render logic must support glow property separately, 
             // but here we just animate a property that render can use
             obj.shadowBlur = (Math.sin(obj._glT*Math.PI)*0.5+0.5)*20*intensity; 
             obj.shadowColor = reg.getParameter(obj,'glow','color')||'#ffffff';
        }
    });
    registry.register('fade_cycle', {
        init(obj) { if(!obj._fcT) obj._fcT=0; },
        update(obj, dt, rt, reg) {
            if(!obj._fcT) this.init(obj);
            const min = reg.getParameter(obj,'fade_cycle','minOpacity')||0.2;
            const max = reg.getParameter(obj,'fade_cycle','maxOpacity')||1;
            const spd = reg.getParameter(obj,'fade_cycle','speed')||1;
            obj._fcT += dt*spd;
            obj.opacity = min + (max-min)*(Math.sin(obj._fcT)*0.5+0.5);
        }
    });
    registry.register('pulse', {
        init(obj) {
            if(!obj._pT) obj._pT=0;
            if(!obj._pOR) obj._pOR=obj.radius||30;
            if(!obj._pOW) obj._pOW=obj.width||60;
            if(!obj._pOH) obj._pOH=obj.height||60;
            if(!obj._pOS) obj._pOS=obj.size||24;
        },
        update(obj, dt, rt, reg) {
            if(!obj._pT) this.init(obj);
            const max = reg.getParameter(obj,'pulse','scale')||1.2;
            const spd = reg.getParameter(obj,'pulse','speed')||1;
            obj._pT += dt*spd;
            const factor = (Math.sin(obj._pT*Math.PI*2)+1)/2; 
            const scale = 1 + factor * (max - 1);
            if(obj.type==='circle') obj.radius = obj._pOR*scale;
            else if(obj.type==='symbol') obj.size = obj._pOS*scale;
            else { obj.width = obj._pOW*scale; obj.height = obj._pOH*scale; }
        }
    });
    registry.register('fade', {
        init(obj) { if(!obj._afT) obj._afT=0; },
        update(obj, dt, rt, reg) {
            const spd = reg.getParameter(obj,'fade','speed')||1;
            const mode = reg.getParameter(obj,'fade','mode')||'loop';
            if(mode==='out') obj.opacity = Math.max(0, (obj.opacity||1)-dt*spd);
            else if(mode==='in') obj.opacity = Math.min(1, (obj.opacity||0)+dt*spd);
            else {
                 if(!obj._afT) this.init(obj);
                 obj._afT += dt*spd;
                 obj.opacity = 0.5 + Math.sin(obj._afT)*0.5;
            }
        }
    });
}

// --- Interactive Behaviors ---
function registerInteractive(registry) {
    registry.register('click_response', {
        init(obj) { if(obj._crA===undefined) { obj._crA=false; obj._crT=0; } },
        update(obj, dt, rt, reg) {
             if(obj._crA===undefined) this.init(obj);
             // Trigger logic usually relies on event listeners logic in main registry wrapper
             // If this behavior is ACTIVE (via on_click), then run effect
             // BUT wrapper sets _behaviorState[id] = true on click.
             // We need to auto-reset after effect done?
             // Since on_click creates a one-frame pulse usually?
             // No, standard wrapper keeps it true?
             // For one-shot click effects, we handle time ourselves.
             
             // If just clicked (global flag) AND this behavior is active/running
             // Let's assume wrapper runs this update if active.
             obj._crT += dt;
             const intensity = reg.getParameter(obj,'click_response','intensity')||5;
             const action = reg.getParameter(obj,'click_response','action')||'bounce';
             
             if(action==='bounce') obj.y -= Math.sin(obj._crT*10)*intensity;
             else if(action==='grow') {
                  const s = 1 + Math.sin(obj._crT*5)*0.2;
                  if(obj.type==='circle') obj.radius = (obj._sbOR||30)*s;
             }
             
             if(obj._crT > 1) { obj._crT = 0; } // Resets visual cycle?
        }
    });
    registry.register('hover_grow', {
        init(obj) { if(!obj._oR) obj._oR = obj.radius||30; if(!obj._hS) obj._hS=1; },
        update(obj, dt, rt, reg) {
             if(!obj._oR) this.init(obj);
             // With activationMode='on_hover', this runs ONLY when hovered
             // But hover_grow expects to run ALWAYS to handle mouse-out transition smoothly!
             // CRITICAL: hover_grow behavior logic relies on continuous execution
             // to check mouse distance and lerp back to 1.
             // If Activation=On Hover, it STOPS running when mouse leaves, freezing the scale!
             // So hover_grow should probably have Activation=On Enter (Always) and handle logic internally?
             // OR our Activation system needs to support "Exit" state?
             // For now, assume it runs always (default) or handle internal check.
             
             const mx = rt.mouseX||-999, my = rt.mouseY||-999;
             const dist = Math.sqrt((mx-obj.x)**2 + (my-obj.y)**2);
             const isHover = dist < (obj.radius||30);
             const target = isHover ? (reg.getParameter(obj,'hover_grow','scale')||1.5) : 1;
             obj._hS += (target - obj._hS) * 5 * dt;
             if(obj.type==='circle') obj.radius = obj._oR * obj._hS;
        }
    });
    registry.register('magnet', {
        update(obj, dt, rt, reg) {
            if(!rt.mouseX) return;
            const str = reg.getParameter(obj,'magnet','strength')||100;
            const rng = reg.getParameter(obj,'magnet','range')||200;
            const dx = rt.mouseX - obj.x;
            const dy = rt.mouseY - obj.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < rng && dist > 0) {
                 const f = (1 - dist/rng) * str;
                 obj.x += (dx/dist)*f*dt;
                 obj.y += (dy/dist)*f*dt;
            }
        }
    });
    registry.register('repel', {
        update(obj, dt, rt, reg) {
            if(!rt.mouseX) return;
            const str = reg.getParameter(obj,'repel','strength')||150;
            const rng = reg.getParameter(obj,'repel','range')||150;
            const dx = obj.x - rt.mouseX;
            const dy = obj.y - rt.mouseY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < rng && dist > 0) {
                 const f = (1 - dist/rng) * str;
                 obj.x += (dx/dist)*f*dt;
                 obj.y += (dy/dist)*f*dt;
            }
        }
    });
     registry.register('follow_mouse_smooth', {
         update(obj, dt, rt, reg) {
             if(!rt.mouseX) return;
             const s = reg.getParameter(obj,'follow_mouse_smooth','speed')||1;
             const smooth = reg.getParameter(obj,'follow_mouse_smooth','smoothness')||0.2;
             
             const dx = rt.mouseX - obj.x;
             const dy = rt.mouseY - obj.y;
             
             const lerpFactor = Math.min(smooth * s * dt, 1.0);
             obj.x += dx * lerpFactor;
             obj.y += dy * lerpFactor;
         }
    });
     registry.register('look_at', {
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return;
            const speed = reg.getParameter(obj, 'look_at', 'speed') || 10;
            const offset = reg.getParameter(obj, 'look_at', 'offset') || 0;
            
            const dx = rt.mouseX - obj.x;
            const dy = rt.mouseY - obj.y;
            const targetAngle = Math.atan2(dy, dx) + (offset * Math.PI / 180);
            
            let currentAngle = obj.rotation || 0;
            let diff = targetAngle - currentAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            
            obj.rotation = currentAngle + diff * speed * dt;
        }
    });

    registry.register('spring_follow', {
        init(obj) { if (!obj._springVel) obj._springVel = { x: 0, y: 0 }; },
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return;
            if (!obj._springVel) this.init(obj);
            
            const stiffness = reg.getParameter(obj, 'spring_follow', 'stiffness') || 5;
            const damping = reg.getParameter(obj, 'spring_follow', 'damping') || 0.8;
            
            const dx = rt.mouseX - obj.x;
            const dy = rt.mouseY - obj.y;
            
            obj._springVel.x += (dx * stiffness) * dt;
            obj._springVel.y += (dy * stiffness) * dt;
            
            obj._springVel.x *= Math.pow(damping, dt * 60);
            obj._springVel.y *= Math.pow(damping, dt * 60);
            
            obj.x += obj._springVel.x * dt;
            obj.y += obj._springVel.y * dt;
        }
    });

    registry.register('draggable', {
        init(obj) { obj._dragVel = { x: 0, y: 0 }; },
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return;
            // Drag Start
            if (obj.isHovered && rt.isMouseDown && !obj._isDragging && !rt._draggingObj) {
                obj._isDragging = true;
                rt._draggingObj = obj;
            }
            // Drag End
            if (!rt.isMouseDown && obj._isDragging) {
                obj._isDragging = false;
                if (rt._draggingObj === obj) rt._draggingObj = null;
                const throwPhysics = reg.getParameter(obj, 'draggable', 'throwPhysics') === undefined ? true : reg.getParameter(obj, 'draggable', 'throwPhysics');
                if (throwPhysics && obj.physics) {
                     obj.physics.velocity.x = obj._dragVel.x;
                     obj.physics.velocity.y = obj._dragVel.y;
                     obj.physics.enabled = true;
                }
            }
            // Dragging
            if (obj._isDragging) {
                if (obj.physics) obj.physics.enabled = false;
                const vx = (rt.mouseX - obj.x) / dt;
                const vy = (rt.mouseY - obj.y) / dt;
                obj._dragVel.x = obj._dragVel.x * 0.5 + vx * 0.5;
                obj._dragVel.y = obj._dragVel.y * 0.5 + vy * 0.5;
                obj.x = rt.mouseX;
                obj.y = rt.mouseY;
            }
        }
    });

    registry.register('parallax', {
        init(obj) { if (!obj._paraBase) obj._paraBase = { x: obj.x, y: obj.y }; },
        update(obj, dt, rt, reg) {
            if (!rt.mouseX) return;
            if (!obj._paraBase) this.init(obj);
            const depth = reg.getParameter(obj, 'parallax', 'depth') || 10;
            const cx = rt.width / 2;
            const cy = rt.height / 2;
            const mx = (rt.mouseX - cx) / cx;
            const my = (rt.mouseY - cy) / cy;
            const tx = obj._paraBase.x + (mx * depth * -1);
            const ty = obj._paraBase.y + (my * depth * -1);
            obj.x += (tx - obj.x) * 5 * dt;
            obj.y += (ty - obj.y) * 5 * dt;
        }
    });

    registry.register('collision_trigger', {
        update(obj, dt, rt, reg) {
            if (!obj.activeCollisions || obj.activeCollisions.length === 0) return;
            const targetTag = reg.getParameter(obj, 'collision_trigger', 'targetTag');
            const action = reg.getParameter(obj, 'collision_trigger', 'action');
            if (!targetTag) return;
            
            const hit = obj.activeCollisions.find(other => other.tags && other.tags.includes(targetTag));
            if (hit) {
                if (action === 'bounce') {
                    if (obj.physics && obj.physics.velocity) {
                        const dx = obj.x - hit.x;
                        const dy = obj.y - hit.y;
                        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                        obj.physics.velocity.x = (dx/dist) * 300;
                        obj.physics.velocity.y = (dy/dist) * 300;
                    }
                } else if (action === 'destroy') {
                    obj._shouldDestroy = true;
                } else if (action === 'color_change') {
                    const col = reg.getParameter(obj, 'collision_trigger', 'color');
                    obj.fill = col;
                } else if (action === 'fade_out') {
                    obj.opacity = (obj.opacity || 1) - dt * 2;
                    if (obj.opacity < 0) obj._shouldDestroy = true;
                }
            }
        }
    });
}

// --- Text Behaviors ---
function registerText(registry) {
    registry.register('typewriter', {
        init(obj, rt, reg) {
            if (obj._typewriterInited && !obj._forceReset) return;

            if (obj._forceReset && obj._lastFullText) {
                 obj._fullText = obj._lastFullText;
            } else {
                 obj._fullText = obj.text || '';
                 if (obj.text === '') obj._fullText = obj._lastFullText || 'New Text';
                 obj._lastFullText = obj._fullText;
            }
            
            obj._forceReset = false;
            obj.text = '';
            const delay = Number(reg.getParameter(obj, 'typewriter', 'delay') || 0);
            obj._lastDelay = delay;
            obj._typeStartTime = Date.now() + delay;
            obj._typewriterInited = true;
        },
        update(obj, dt, runtime, registry) {
             if (obj.type !== 'text') return;
             
             // NEW: Check if manual mode and not yet activated
             const actMode = registry.getParameter(obj, 'typewriter', 'activationMode') || 'on_enter';
             if (actMode === 'manual') {
                 // Check if behavior state exists and is false (not activated yet)
                 if (!obj._behaviorState || !obj._behaviorState['typewriter']) {
                     obj.text = ''; // Keep text hidden until activated
                     return;
                 }
             }
             
             if (!obj._typewriterInited) this.init(obj, runtime, registry);

             const now = Date.now();
             if (now < obj._typeStartTime) { obj.text = ''; return; }

             const speed = registry.getParameter(obj, 'typewriter', 'speed') || 10;
             const loop = registry.getParameter(obj, 'typewriter', 'loop');
             const loopDelayMs = registry.getParameter(obj, 'typewriter', 'loopDelay') || 1000;
             const showCursor = registry.getParameter(obj, 'typewriter', 'showCursor');
             const cursorChar = registry.getParameter(obj, 'typewriter', 'cursorChar') || '|';

             const elapsed = (now - obj._typeStartTime) / 1000;
             const totalChars = obj._fullText.length;
             let showCount = Math.floor(elapsed * speed);
             let isFinished = false;

             if (loop) {
                 const loopPauseSec = loopDelayMs / 1000;
                 const cycleDuration = (totalChars / speed) + loopPauseSec; 
                 const cycleTime = elapsed % cycleDuration;
                 if (cycleTime > (totalChars / speed)) { showCount = totalChars; isFinished = true; }
                 else showCount = Math.floor(cycleTime * speed);
             } else {
                 showCount = Math.min(showCount, totalChars);
                 if (showCount === totalChars) isFinished = true;
             }

             let currentText = obj._fullText.substring(0, showCount);
             if (showCursor && (Math.floor(elapsed * 2) % 2 === 0 || !isFinished)) {
                 currentText += cursorChar;
             }
             obj.text = currentText;
        }
    });
    registry.register('pulse_text', {
        init(obj) { if(!obj._baseFS) obj._baseFS = obj.fontSize||20; if(!obj._pT) obj._pT=0; },
        update(obj, dt, rt, reg) {
             if(!obj._baseFS) this.init(obj);
             const s = reg.getParameter(obj,'pulse_text','speed')||2;
             const m = reg.getParameter(obj,'pulse_text','scale')||1.5;
             obj._pT += dt;
             const sine = (Math.sin(obj._pT * s) + 1) / 2;
             obj.fontSize = obj._baseFS * (1 + (sine * (m - 1)));
        }
    });
    registry.register('rainbow_text', {
        init(obj) { if(obj._rT===undefined) obj._rT=0; },
        update(obj, dt, rt, reg) {
             if(obj._rT===undefined) this.init(obj);
             const s = reg.getParameter(obj,'rainbow_text','speed')||5;
             obj._rT += dt*s;
             obj.fill = \`hsl(\${Math.floor(obj._rT * 50) % 360}, 100%, 50%)\`;
        }
    });
}
`
};

export default class EnhancedExporter {
    static export(simulationData) {
        console.log('📦 Exporting bundled HTML5...');

        // Deep clone and sanitize data
        // Deep clone and sanitize data
        // Convert Sets to Arrays before stringification
        if (simulationData.objects) {
            simulationData.objects.forEach(o => {
                if (o.behaviors instanceof Set) o.behaviors = Array.from(o.behaviors);
            });
        }

        const data = JSON.parse(JSON.stringify(simulationData, (key, value) => {
            if (key === 'activeCollisions') return undefined;
            return value;
        }));
        data.objects.forEach(obj => {
            // 🔧 RESTORE INITIAL POSITIONS BEFORE EXPORT
            // Objects may have moved during runtime (especially with behaviors like follow_mouse)
            // We need to export their original design positions, not current runtime positions
            if (obj.initialX !== undefined) {
                obj.x = obj.initialX;
            }
            if (obj.initialY !== undefined) {
                obj.y = obj.initialY;
            }

            // 🔧 FIX ACTIVATION MODE FOR SLIDER-ONLY CONTROLS
            // Manual mode ONLY works with explicit button triggers (matching editor behavior)
            // If manual mode is set but no button uses the activationId, change to 'on_enter'
            if (obj.behaviorParams || obj._behaviorParams) {
                const params = obj.behaviorParams || obj._behaviorParams;
                Object.keys(params).forEach(behaviorId => {
                    const behaviorParams = params[behaviorId];
                    if (behaviorParams.activationMode === 'manual') {
                        const activationId = behaviorParams.activationId;
                        // Check if any button uses this activationId
                        const hasButton = data.controls.some(ctrl =>
                            ctrl.type === 'button' &&
                            ctrl.binding?.actionId === activationId
                        );
                        // If no button, change to 'on_enter' so slider controls work
                        if (!hasButton) {
                            behaviorParams.activationMode = 'on_enter';
                            delete behaviorParams.activationId; // Clean up unused ID
                        }
                    }
                });
            }

            // Preserve behavior parameters (rename _behaviorParams -> behaviorParams)
            if (obj._behaviorParams) {
                obj.behaviorParams = obj._behaviorParams;
            }

            // Restore full text content (fix for Typewriter partial export)
            if (obj.type === 'text') {
                // For typewriter behavior, we need to ensure the full text is preserved
                // Priority: _fullText > _lastFullText > text (if not empty)
                let originalText = obj.text;

                if (obj._fullText && obj._fullText.trim()) {
                    originalText = obj._fullText;
                } else if (obj._lastFullText && obj._lastFullText.trim()) {
                    originalText = obj._lastFullText;
                }

                // Only update if we found a non-empty source
                if (originalText && String(originalText).trim()) {
                    obj.text = String(originalText);
                }
            }

            // Remove private runtime properties
            Object.keys(obj).forEach(key => {
                if (key.startsWith('_')) delete obj[key];
            });
        });

        // Generate HTML with sanitized data
        const html = this.generateHTML(data);
        this.downloadFile(html, `${data.metadata.title || 'game'}.html`);
        console.log('✅ Export complete!');
    }

    static generateHTML(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.metadata.title || 'OviState Game'}</title>
    <style>
        body { margin: 0; overflow: hidden; background: #202020; font-family: system-ui, sans-serif; }
        #game-container { position: relative; width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }
        /* Use a wrapper that matches canvas size for correct UI positioning */
        #sim-wrapper { position: relative; width: ${data.canvas.width}px; height: ${data.canvas.height}px; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
        canvas { display: block; }
        #ui-overlay { position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none; z-index: 100; }
    </style>
</head>
<body>
    <div id="game-container">
        <div id="sim-wrapper">
             <!-- Canvas injected by Runtime -->
             <div id="ui-overlay"></div>
        </div>
    </div>

    <script type="module">
        // 1. Inject Libraries
        ${LIBS.particles}
        ${LIBS.core}
        ${LIBS.ui}
        ${LIBS.behaviors}

        // 2. Game Data
        const GAME_DATA = ${JSON.stringify(data)};

        // 3. User & Default Scripts
        
        // 4. Initialization

        // --- Runtime Setup ---
        const container = document.getElementById('sim-wrapper');
        const overlay = document.getElementById('ui-overlay');
        
        // Initialize Runtime
                const runtime = new OviStateRuntime(container, {
                    width: ${data.canvas.width},
                    height: ${data.canvas.height},
                    background: '${data.canvas.background}',
                    gravity: ${data.physics.gravity || 9.8},
                    gravityX: ${data.physics.gravityX || 0},
                    friction: ${data.physics.friction !== undefined ? data.physics.friction : 0.1},
                    timeScale: ${data.physics.timeScale !== undefined ? data.physics.timeScale : 1},
                    wallBounciness: ${data.physics.wallBounciness !== undefined ? data.physics.wallBounciness : 0.8},
                    enablePhysics: true
                });

        // Track Mouse
        runtime.canvas.addEventListener('mousemove', e => {
            const rect = runtime.canvas.getBoundingClientRect();
            runtime.mouseX = e.clientX - rect.left;
            runtime.mouseY = e.clientY - rect.top;
        });

        // Initialize Behaviors
        const registry = new BehaviorRegistry(runtime);
        registerMotion(registry);
        registerTransform(registry);
        registerInteractive(registry);
        registerText(registry);

        // Load Objects & Controls BEFORE UI Init
        GAME_DATA.objects.forEach(obj => {
            obj.initialX = obj.x;
            obj.initialY = obj.y; // For Reset

            // Re-inflate physics if partial or missing
            if (!obj.physics) obj.physics = { enabled: true };
            if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
            if (obj.physics.mass === undefined) obj.physics.mass = 1;
            if (obj.physics.bounciness === undefined) obj.physics.bounciness = 0.8;

            runtime.addObject(obj);
        });
        
        GAME_DATA.controls.forEach(c => runtime.addControl(c));

        // Initialize UI (Now it sees the controls)
        const ui = new RuntimeUI(runtime, overlay);
        runtime.attachUI(ui);

        // Start
        console.log("🚀 Starting Game...");
        runtime.start();
        
    </script>
</body>
</html>`;
    }

    static downloadFile(content, filename) {
        // Strip 'export default' from bundle to make it valid inline script
        // Simple regex replace for the specific classes we know
        content = content.replace('export default class OviStateRuntime', 'class OviStateRuntime');
        content = content.replace('export default class RuntimeUI', 'class RuntimeUI');

        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
