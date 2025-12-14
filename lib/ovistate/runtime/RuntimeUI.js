export default class RuntimeUI {
    constructor(runtime, container) {
        this.runtime = runtime;
        this.container = container;

        // Ensure container is positioned for overlay
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none'; // Allow clicks to pass through to canvas
        this.container.style.overflow = 'hidden';

        this.init();
    }

    init() {
        console.log("🎮 RuntimeUI Initializing with", this.runtime.controls.length, "controls");
        this.container.innerHTML = '';
        this.runtime.controls.forEach(control => {
            this.renderComponent(control);
        });
    }

    update(dt) {
        // Handle Data Binding & Graph Updates
        this.runtime.controls.forEach(control => {
            if (control.binding && control.binding.targetId && control.binding.property) {
                const target = this.runtime.objects.find(o => o.id === control.binding.targetId);

                if (target) {
                    if (control.type === 'graph') {
                        // READ: Object -> Graph
                        let val = target[control.binding.property];

                        // Physics prop check
                        if (target.physics && (control.binding.property === 'velocity.x' || control.binding.property === 'velocity.y')) {
                            const axis = control.binding.property.split('.')[1];
                            val = target.physics.velocity[axis];
                        }

                        if (val !== undefined) {
                            // Push data
                            if (!control.data) control.data = [];
                            control.data.push(val);
                            if (control.data.length > (control.maxPoints || 200)) {
                                control.data.shift();
                            }

                            // Draw Graph
                            this.renderGraph(control);
                        }
                    } else if (control.type !== 'button') {
                        // WRITE: Control -> Object (for sliders/inputs)
                        // Note: For sliders, we update on 'input' event usually, but 'binding' might imply continuous sync?
                        // In Editor we did event-based update. Here we can use events too.
                        // But if we want to reflect object changes back to UI (Two-way), we need to read here.

                        // Let's implement READ back (Object -> UI) for smooth sync
                        // (Skipping for now to avoid conflicts with user input, unless we track active interaction)
                    }
                }
            }
        });
    }

    renderComponent(control) {
        const wrapper = document.createElement('div');
        wrapper.dataset.id = control.id;
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px'; // In Runtime, x/y are relative to canvas
        wrapper.style.top = control.y + 'px';
        wrapper.style.pointerEvents = 'auto'; // Re-enable pointer events for controls

        let content = '';
        if (control.type === 'button') {
            content = `<button style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">${control.text || 'Button'}</button>`;
        } else if (control.type === 'slider') {
            content = `
                <div style="background: rgba(30,30,30,0.8); padding: 5px; border-radius: 4px; color: white; font-family: sans-serif; font-size: 12px;">
                    <label style="display:block; margin-bottom:2px;">${control.label || 'Slider'}</label>
                    <input type="range" min="${control.min || 0}" max="${control.max || 100}" value="${control.value || 0}" style="width: 120px;">
                </div>
            `;
        } else if (control.type === 'label') {
            content = `<div style="color: ${control.color || 'white'}; font-family: sans-serif; font-size: 14px;">${control.text || 'Label'}</div>`;
        } else if (control.type === 'checkbox') {
            content = `
                <div style="background: rgba(30,30,30,0.8); padding: 5px; border-radius: 4px; color: white; font-family: sans-serif; font-size: 12px;">
                    <label><input type="checkbox" ${control.checked ? 'checked' : ''}> ${control.label || 'Checkbox'}</label>
                </div>
            `;
        } else if (control.type === 'graph') {
            // Placeholder for graph canvas, will be rendered by renderGraph
            // Initial setup
            control.data = control.data || [];
            control.width = control.width || 250;
            control.height = control.height || 150;
            control.style = control.style || { background: 'white', color: '#007acc' };

            wrapper.style.width = control.width + 'px';
            wrapper.style.height = control.height + 'px';
            wrapper.style.background = 'rgba(255,255,255,0.9)';
            wrapper.style.border = '1px solid #ccc';
            wrapper.style.borderRadius = '4px';
            wrapper.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

            // Inner structure
            content = `
                <div style="padding: 5px 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 10px; color: #333; display: flex; justify-content: space-between;">
                    <span>${control.binding?.property || 'Graph'}</span>
                    <span class="graph-value" style="color: ${control.style.color};">--</span>
                </div>
                <div style="position: relative; width: 100%; height: ${control.height - 25}px;">
                    <canvas width="${control.width}" height="${control.height - 25}" style="width:100%; height:100%; display:block;"></canvas>
                </div>
             `;
        }

        wrapper.innerHTML = content;
        this.container.appendChild(wrapper);

        // --- Event Listeners ---

        // Button Click
        if (control.type === 'button') {
            const btn = wrapper.querySelector('button');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.triggerAction(control);
                });
            }
        }

        // Inputs (Slider, Checkbox)
        const input = wrapper.querySelector('input');
        if (input) {
            input.addEventListener('input', (e) => {
                // Update Control Model
                if (control.type === 'checkbox') {
                    control.checked = e.target.checked;
                } else if (control.type === 'slider') {
                    control.value = parseFloat(e.target.value);
                }

                // Update Bound Object
                this.updateBoundObject(control);
            });
        }
    }

    triggerAction(control) {
        if (control.binding && control.binding.action) {
            // Determine targets: Array or Single
            const targetIds = (control.binding.targets && control.binding.targets.length > 0)
                ? control.binding.targets
                : (control.binding.targetId ? [control.binding.targetId] : []);

            targetIds.forEach(id => {
                const target = this.runtime.objects.find(o => o.id === id);
                if (target) {
                    console.log(`⚡ Action ${control.binding.action} triggered on ${target.id}`);
                    switch (control.binding.action) {
                        case 'reset_pos':
                            target.x = target.initialX || 100; // Assuming we stored initial? If not, default 100
                            target.y = target.initialY || 100;
                            if (target.physics) target.physics.velocity = { x: 0, y: 0 };
                            break;
                        case 'stop':
                            if (target.physics) target.physics.velocity = { x: 0, y: 0 };
                            break;
                        case 'jump':
                            if (target.physics) target.physics.velocity.y = -10;
                            break;
                        case 'toggle_physics':
                            if (target.physics) target.physics.enabled = !target.physics.enabled;
                            break;
                        case 'random_color':
                            target.fill = '#' + Math.floor(Math.random() * 16777215).toString(16);
                            break;

                        // Behavior Actions
                        case 'start_behavior':
                        case 'stop_behavior':
                        case 'toggle_behavior':
                            if (target.behaviorParams && control.binding.actionId) {
                                // We store 'isActive' state in the params
                                // Note: The behavior logic needs to RESPECT this param.
                                const bId = control.binding.actionId;
                                // Initialize if missing
                                if (!target.behaviorParams[bId]) target.behaviorParams[bId] = {};

                                if (control.binding.action === 'start_behavior') target.behaviorParams[bId].active = true;
                                if (control.binding.action === 'stop_behavior') target.behaviorParams[bId].active = false;
                                if (control.binding.action === 'toggle_behavior') {
                                    target.behaviorParams[bId].active = !target.behaviorParams[bId].active;
                                }
                            }
                            break;
                    }
                }
            });
        }
    }

    updateBoundObject(control) {
        if (control.binding && control.binding.property) {
            // Determine targets: Array or Single
            const targetIds = (control.binding.targets && control.binding.targets.length > 0)
                ? control.binding.targets
                : (control.binding.targetId ? [control.binding.targetId] : []);

            targetIds.forEach(id => {
                const target = this.runtime.objects.find(o => o.id === id);
                if (target) {
                    let val = control.type === 'checkbox' ? control.checked : control.value;

                    // Handle nested properties (Format: 'namespace.property')
                    if (control.binding.property.includes('.')) {
                        const parts = control.binding.property.split('.');

                        // Physics Binding
                        if (parts[0] === 'physics') {
                            const prop = parts[1]; // e.g. 'bounciness'
                            if (target.physics) target.physics[prop] = val;
                        }
                        // Behavior Parameter Binding (e.g. 'wiggle.intensity')
                        else {
                            const behaviorId = parts[0];
                            const paramName = parts[1];

                            // Initialize param structure if missing
                            if (!target.behaviorParams) target.behaviorParams = {};
                            if (!target.behaviorParams[behaviorId]) target.behaviorParams[behaviorId] = {};

                            target.behaviorParams[behaviorId][paramName] = val;
                        }
                    } else {
                        // Direct Property
                        target[control.binding.property] = val;
                    }
                }
            });
        }
    }

    renderGraph(control) {
        const wrapper = this.container.querySelector(`[data-id="${control.id}"]`);
        if (!wrapper) return;

        const cvs = wrapper.querySelector('canvas');
        if (!cvs) return;

        const ctx = cvs.getContext('2d');
        const w = cvs.width;
        const h = cvs.height;

        ctx.clearRect(0, 0, w, h);

        // Update value display
        const valDisplay = wrapper.querySelector('.graph-value');
        if (valDisplay && control.data.length > 0) {
            valDisplay.textContent = control.data[control.data.length - 1].toFixed(2);
        }

        if (control.data.length > 1) {
            ctx.strokeStyle = control.style.color || '#007acc';
            ctx.lineWidth = 2;
            ctx.beginPath();

            // Auto-scale Y
            let min = Math.min(...control.data);
            let max = Math.max(...control.data);
            if (max === min) { max++; min--; } // Prevent divide by zero
            const range = max - min;

            // X-scale
            const step = w / (control.data.length - 1);

            control.data.forEach((val, i) => {
                const x = i * step;
                const y = h - ((val - min) / range * h);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
    }
}
