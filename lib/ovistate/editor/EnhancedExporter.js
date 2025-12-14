/**
 * Enhanced HTML5 Exporter
 * Creates self-contained, production-ready HTML5 animations
 * Bundles actual runtime libraries for full fidelity.
 */

// Source Code Storage (Simulated Bundle)
const LIBS = {
    // 1. Core Runtime (OviStateRuntime)
    core: `
class OviStateRuntime {
    constructor(container, config = {}) {
        if (config.canvas) {
            this.canvas = config.canvas;
        } else if (container) {
            this.canvas = document.createElement('canvas');
            container.appendChild(this.canvas);
        } else {
            throw new Error("OviStateRuntime requires either a canvas or container");
        }

        this.ctx = this.canvas.getContext('2d');
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.objects = [];
        this.controls = [];
        this.graphs = [];
        this.behaviors = new Map();
        this.globalScript = null;

        this.isRunning = false;
        this.lastTime = 0;

        // Physics
        this.gravity = config.gravity || 9.8; // Default to correct 9.8
        this.gravityX = config.gravityX || 0;
        this.friction = config.friction !== undefined ? config.friction : 0.1;
        this.timeScale = config.timeScale !== undefined ? config.timeScale : 1;
        this.wallBounciness = config.wallBounciness !== undefined ? config.wallBounciness : 0.8;
        this.enablePhysics = config.enablePhysics !== undefined ? config.enablePhysics : true;

        // Input State
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.clickProcessed = false;
        
        this.setupInputListeners();
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
            this.clickProcessed = false;
        });
    }

    addObject(obj) { this.objects.push(obj); }
    addControl(control) { this.controls.push(control); }
    addGraph(graph) { this.graphs.push(graph); }
    registerBehavior(id, behaviorFn) { this.behaviors.set(id, behaviorFn); }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop();
    }

    loop() {
        if (!this.isRunning) return;
        const currentTime = performance.now();
        // Limit max dt to avoid spiraling
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); 
        this.lastTime = currentTime;
        this.update(dt);
        this.updateInput();
        this.render();
        requestAnimationFrame(() => this.loop());
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
             this.isMouseDown = false;
        });
        this.canvas.addEventListener('mousedown', () => {
            if (!this.isRunning) return;
            this.isMouseDown = true;
            this.clickProcessed = false;
        });
        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
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
                const lines = (obj.text || "").split('\\n').length;
                const approxW = obj.wordWrap ? (obj.width || 300) : (obj.text || "").length * fontSize * 0.6;
                const approxH = (obj.wordWrap && obj.height) ? obj.height : lines * fontSize * 1.2;
                
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

    update(dt) {
        // Apply Time Scale
        const timeScaledDt = dt * this.timeScale;

        // Behaviors
        this.objects.forEach(obj => {
            if (obj.behaviors && obj.behaviors.length > 0) {
                obj.behaviors.forEach(behaviorId => {
                    const behavior = this.behaviors.get(behaviorId);
                    if (behavior) behavior(obj, this, timeScaledDt);
                });
            }
        });

        // Physics
        if (this.enablePhysics) {
            this.objects.forEach(obj => {
                if (obj.physics && obj.physics.enabled) {
                    // Init
                    if (!obj.physics.velocity) obj.physics.velocity = {x:0, y:0};

                    // Gravity (Y)
                    obj.physics.velocity.y += this.gravity * timeScaledDt;
                    
                    // Wind (Gravity X)
                    obj.physics.velocity.x += this.gravityX * timeScaledDt;

                    // Friction
                    obj.physics.velocity.x *= (1 - this.friction * timeScaledDt);
                    obj.physics.velocity.y *= (1 - this.friction * timeScaledDt);

                    // Position
                    obj.x += obj.physics.velocity.x * timeScaledDt;
                    obj.y += obj.physics.velocity.y * timeScaledDt;

                    // Global Bounciness Default
                    const bounciness = obj.physics.bounciness !== undefined ? obj.physics.bounciness : this.wallBounciness;


                    // Bounce
                    if (obj.type === 'circle') {
                        if (obj.y + obj.radius > this.height) {
                            obj.y = this.height - obj.radius;
                            obj.physics.velocity.y *= -bounciness;
                        }
                        // Ceiling
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
                         if (obj.y + obj.height/2 > this.height) {
                            obj.y = this.height - obj.height/2;
                            obj.physics.velocity.y *= -bounciness;
                        }
                        // Ceiling
                        if (obj.y - obj.height/2 < 0) {
                            obj.y = obj.height/2;
                            obj.physics.velocity.y *= -bounciness;
                        }

                        if (obj.x + obj.width/2 > this.width) {
                            obj.x = this.width - obj.width/2;
                            obj.physics.velocity.x *= -bounciness;
                        }
                        if (obj.x - obj.width/2 < 0) {
                            obj.x = obj.width/2;
                            obj.physics.velocity.x *= -bounciness;
                        }
                    } else if (obj.type === 'symbol') {
                        const size = obj.size !== undefined ? obj.size : 48;
                        const half = size / 2;
                        if (obj.y + half > this.height) {
                            obj.y = this.height - half;
                            obj.physics.velocity.y *= -bounciness;
                        }
                         // Ceiling
                        if (obj.y - half < 0) {
                            obj.y = half;
                            obj.physics.velocity.y *= -bounciness;
                        }

                        if (obj.x + half > this.width) {
                            obj.x = this.width - half;
                            obj.physics.velocity.x *= -bounciness;
                        }
                        if (obj.x - half < 0) {
                            obj.x = half;
                            obj.physics.velocity.x *= -bounciness;
                        }
                    }
                }
            });
        }
        
        // UI Update
        if (this.ui) this.ui.update(dt);
    }

    updateInput() {
        this.objects.forEach(obj => {
            let isHit = false;
            // Simple bounding box hit test
            if (obj.width && obj.height) {
                 isHit = (this.mouseX >= obj.x && this.mouseX <= obj.x + obj.width &&
                          this.mouseY >= obj.y && this.mouseY <= obj.y + obj.height);
            } else if (obj.radius) {
                const dx = this.mouseX - obj.x;
                const dy = this.mouseY - obj.y;
                isHit = (dx * dx + dy * dy <= obj.radius * obj.radius);
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

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.objects.forEach(obj => {
            this.ctx.save();
             if (obj.opacity !== undefined) this.ctx.globalAlpha = obj.opacity;
            if (obj.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = obj.fill || '#3498db';
                this.ctx.fill();
                if(obj.stroke) { this.ctx.strokeStyle = obj.stroke; this.ctx.stroke(); }
            } else if (obj.type === 'rect') {
                const x = obj.x - obj.width/2;
                const y = obj.y - obj.height/2;
                this.ctx.fillStyle = obj.fill || '#2ecc71';
                this.ctx.fillRect(x, y, obj.width, obj.height);
                if(obj.stroke) { this.ctx.strokeStyle = obj.stroke; this.ctx.strokeRect(x,y,obj.width,obj.height); }
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
                const rawLines = text.split('\\n');

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
                let startY = obj.y - (totalHeight / 2) + (lineHeight / 2); // Default Middle

                if (obj.verticalAlign === 'top') {
                    startY = obj.y + (lineHeight / 2);
                } else if (obj.verticalAlign === 'bottom') {
                    startY = obj.y - totalHeight + (lineHeight / 2);
                }

                lines.forEach((line, i) => {
                    if (obj.align === 'justify' && obj.wordWrap && maxWidth) {
                        const isLastLine = i === lines.length - 1;
                        if (isLastLine) {
                             this.ctx.textAlign = 'left';
                             this.ctx.fillText(line, obj.x, startY + (i * lineHeight));
                        } else {
                            const words = line.trim().split(' ');
                            if (words.length > 1) {
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
                        let align = obj.align === 'justify' ? 'left' : (obj.align || 'center');
                        this.ctx.textAlign = align;
                        this.ctx.fillText(line, obj.x, startY + (i * lineHeight));
                    }
                });
            } else if (obj.type === 'symbol') {
                this.ctx.font = (obj.size !== undefined ? obj.size : 48) + 'px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.translate(obj.x, obj.y);
                if (obj.rotation) this.ctx.rotate(obj.rotation);
                this.ctx.fillText(obj.symbol || '😀', 0, 0);
            }
            this.ctx.restore();
        });
        
         // Render controls via runtime? No, UI handles own DOM, but graphs might need canvas if not overlay. 
         // Actually RuntimeUI renders DOM elements ON TOP of canvas usually, or inside a container.
         // In our implementation, RuntimeUI uses a separate container.
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

    update(dt) {
         this.runtime.controls.forEach(control => {
            if (control.binding && control.binding.property) {
                // Multi-target support
                const targetIds = (control.binding.targets && control.binding.targets.length > 0) 
                    ? control.binding.targets 
                    : (control.binding.targetId ? [control.binding.targetId] : []);

                targetIds.forEach((id, index) => {
                    const target = this.runtime.objects.find(o => o.id === id);
                    if (target) {
                        if (control.type === 'graph') {
                            // Graph only tracks the first target to avoid noise/conflict
                            if (index === 0) this.updateGraph(control, target);
                        } else {
                            this.applyBinding(control, target);
                        }
                    }
                });
            }
         });
    }

    applyBinding(control, target) {
        const property = control.binding.property;
        const value = (control.type === 'checkbox') ? control.checked : Number(control.value);

        console.log('🔗 Binding: ' + property + ' = ' + value + ' on ' + target.id);

        if (property.includes('.')) {
            const parts = property.split('.');
            if (parts[0] === 'physics') {
                 if (target.physics) target.physics[parts[1]] = value;
            } else {
                const behaviorId = parts[0];
                const paramName = parts[1];
                if (this.runtime.registry) {
                    // Start of fix: Initialize if missing
                    if (!target.behaviorParams) target.behaviorParams = {};
                    if (!target.behaviorParams[behaviorId]) target.behaviorParams[behaviorId] = {};
                    // End of fix
                    
                    target.behaviorParams[behaviorId][paramName] = value;
                }
            }
        } else {
            target[property] = value;
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
            const opts = (control.options || []).map(o => \`<option>\${o.trim()}</option>\`).join('');
            content = \`<select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; background: white; font-size: 12px; min-width: 100px;">\${opts}</select>\`;
        } else if (control.type === 'color_picker') {
            content = \`<div style="background:white; padding:4px; border-radius:4px; border:1px solid #ccc; display:flex; align-items:center;"><input type="color" value="#ff0000" style="border:none; width:30px; height:30px; cursor:pointer;"> <span style="font-size:12px; margin-left:6px;">Color</span></div>\`;
        } else if (control.type === 'text_input') {
            content = \`<input type="text" placeholder="\${control.placeholder}" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; font-size: 12px; width: 120px;">\`;
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
        } else if (control.type === 'slider' || control.type === 'checkbox' || control.type === 'color_picker' || control.type === 'dropdown') {
             const input = wrapper.querySelector('input, select');
             if(input) {
                 const updateState = (e) => {
                     e.stopPropagation();
                     if (control.type === 'checkbox') {
                         control.checked = e.target.checked;
                     } else {
                         control.value = e.target.value;
                     }
                 };
                 
                 // Listen to both to cover all cases (Slider=input, Checkbox=change, etc)
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
            this.runtime.registerBehavior(id, (obj, rt, dt) => {
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
             
             // Use proper interpolation: lerp factor should be clamped
             const lerpFactor = Math.min(smooth * s * dt, 1.0);
             obj.x += dx * lerpFactor;
             obj.y += dy * lerpFactor;
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

        const data = JSON.parse(JSON.stringify(simulationData));
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
                if (originalText && originalText.trim()) {
                    obj.text = originalText;
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
