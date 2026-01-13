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
            const element = this.container.querySelector(`[data-id="${control.id}"]`);

            // Determine targets/sources
            const allLinks = [];
            if (control.binding && control.binding.targetId && control.binding.property) {
                allLinks.push({ targetId: control.binding.targetId, property: control.binding.property });
            }
            if (control.bindings) {
                Object.entries(control.bindings).forEach(([prop, targetId]) => {
                    allLinks.push({ targetId, property: prop });
                });
            }

            allLinks.forEach(link => {
                const source = this.runtime.objects.find(o => o.id === link.targetId);
                if (source) {
                    const val = this._getProperty(source, link.property);
                    if (val !== undefined) {
                        if (control.type === 'label' && (link.property === 'text' || link.property === 'value' || !control.text)) {
                            control.text = String(val);
                        } else {
                            control.value = val;
                        }
                    }
                }
            });

            // Update DOM Visuals (for reactive displays like Labels or Progress)
            if (element) {
                if (control.type === 'label') {
                    if (element.textContent !== control.text) element.textContent = control.text || '';
                } else if (control.type === 'progress_bar') {
                    const fill = element.querySelector('div > div:first-child');
                    if (fill) {
                        const pct = Math.min(100, Math.max(0, (((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100));
                        fill.style.width = pct + '%';
                    }
                }
            }

            // Specialized Control Logic
            allLinks.forEach(link => {
                const target = this.runtime.objects.find(o => o.id === link.targetId);
                if (target) {
                    if (control.type === 'graph') {
                        let val = this._getProperty(target, link.property);
                        if (val !== undefined) {
                            if (!control.data) control.data = [];
                            control.data.push(val);
                            if (control.data.length > (control.maxPoints || 200)) {
                                control.data.shift();
                            }
                            this.renderGraph(control);
                        }
                    } else if (control.type === 'joystick') {
                        this.updateBoundObject(control);
                    }
                }
            });
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
        } else if (control.type === 'dropdown') {
            const rawOpts = control.options || [];
            const safeOpts = Array.isArray(rawOpts) ? rawOpts : (typeof rawOpts === 'string' ? rawOpts.split(',') : []);
            const options = safeOpts.map(opt => `<option value="${opt.trim()}" ${control.value === opt.trim() ? 'selected' : ''}>${opt.trim()}</option>`).join('');
            content = `
                <select style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; background: white; font-size: 12px; min-width: 100px; color: #333;">
                    ${options}
                </select>
            `;
        } else if (control.type === 'color_picker') {
            const colorValue = (typeof control.value === 'string' && control.value.startsWith('#')) ? control.value : '#ff0000';
            content = `
                <div style="background: rgba(30,30,30,0.8); padding: 5px; border-radius: 4px; color: white; font-family: sans-serif; font-size: 12px; display: flex; align-items: center; gap: 6px;">
                    <input type="color" value="${colorValue}" style="width: 30px; height: 30px; padding: 0; border: none; cursor: pointer;">
                    <span>${control.label || 'Color'}</span>
                </div>
            `;
        } else if (control.type === 'text_input') {
            content = `
                <input type="text" value="${control.value || ''}" placeholder="${control.placeholder || 'Enter text...'}" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; font-size: 12px; width: 120px; color: #333;">
            `;
        } else if (control.type === 'joystick') {
            control.width = control.width || 100;
            control.height = control.height || 100;
            const r = (control.joystick?.radius || 50);
            const hr = (control.joystick?.handleRadius || 20);

            wrapper.style.width = control.width + 'px';
            wrapper.style.height = control.height + 'px';
            wrapper.style.borderRadius = '50%';
            wrapper.style.background = 'rgba(255,255,255,0.1)';
            wrapper.style.border = '1px solid rgba(255,255,255,0.2)';
            wrapper.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.2)';
            wrapper.style.pointerEvents = 'auto';
            wrapper.style.touchAction = 'none';

            content = `
                <div class="joystick-base" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${r * 2 * 0.8}px; height: ${r * 2 * 0.8}px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.1);"></div>
                <div class="joystick-handle" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${hr * 2}px; height: ${hr * 2}px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #666 0%, #333 100%); border: 2px solid #222; box-shadow: 0 4px 8px rgba(0,0,0,0.4); cursor: grab;"></div>
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

                    // Determine Targets: Support both .targets (Array) and .targetId (Legacy)
                    const targetIds = control.binding?.targets || (control.binding?.targetId ? [control.binding.targetId] : []);

                    targetIds.forEach(tid => {
                        const target = this.runtime.getObject ? this.runtime.getObject(tid) : this.runtime.objects.find(o => o.id === tid);
                        if (target) {
                            this.triggerAction(control, target);
                        }
                    });

                    // Broadcast Action ID globally (for behaviors like state_switcher and action_animation)
                    if (control.binding?.actionId) {
                        this.runtime.emitAction(control.binding.actionId);
                    }
                });
            }
        }

        // Inputs (Slider, Checkbox, Dropdown, Color, Text)
        const input = wrapper.querySelector('input, select');
        if (input) {
            const updateHandler = (e) => {
                e.stopPropagation();
                // Update Control Model
                if (control.type === 'checkbox') {
                    control.checked = e.target.checked;
                } else {
                    control.value = e.target.value;
                }
                // Update Bound Object
                this.updateBoundObject(control);
            };

            input.addEventListener('input', updateHandler);
            input.addEventListener('change', updateHandler); // For Select and Checkbox completeness
        }

        // Joystick Interaction
        if (control.type === 'joystick') {
            const handle = wrapper.querySelector('.joystick-handle');
            const r = (control.joystick?.radius || 50);
            const sensitivity = (control.joystick?.sensitivity || 1.0);
            const returnToCenter = (control.joystick?.returnToCenter !== false);

            let isDragging = false;

            const updateJoystick = (clientX, clientY) => {
                const rect = wrapper.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                let dx = clientX - centerX;
                let dy = clientY - centerY;

                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = r * 0.8;

                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }

                handle.style.left = `calc(50% + ${dx}px)`;
                handle.style.top = `calc(50% + ${dy}px)`;

                // Normalized values (-1 to 1)
                control.joystick.axisX = (dx / maxDist) * sensitivity;
                control.joystick.axisY = (dy / maxDist) * sensitivity;

                this.updateBoundObject(control);
            };

            const onStart = (e) => {
                isDragging = true;
                handle.style.cursor = 'grabbing';
                const pos = e.touches ? e.touches[0] : e;
                updateJoystick(pos.clientX, pos.clientY);
                e.preventDefault();
            };

            const onMove = (e) => {
                if (!isDragging) return;
                const pos = e.touches ? e.touches[0] : e;
                updateJoystick(pos.clientX, pos.clientY);
            };

            const onEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                handle.style.cursor = 'grab';

                if (returnToCenter) {
                    handle.style.left = '50%';
                    handle.style.top = '50%';
                    control.joystick.axisX = 0;
                    control.joystick.axisY = 0;
                    this.updateBoundObject(control);
                }
            };

            wrapper.addEventListener('mousedown', onStart);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);

            wrapper.addEventListener('touchstart', onStart, { passive: false });
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);
        }
    }

    // Manual Event Trigger (Called by Button click listeners)
    triggerAction(control, target) {
        if (!target || !control?.binding) return;
        const action = control.binding.action;
        if (action) {
            this.runtime.executeAction(action, target, control.binding);
        }
    }

    // New helper to handle Event IDs
    setBehaviorStateByEventId(target, eventId, state) {
        if (!target.behaviors) return;
        // Search through behavior configs on the registry to find activationId matches
        const behaviorConfigs = this.runtime.registry.getAll();

        // We need to know which behaviors ARE ON the target
        // Usually target._behaviorState stores activation status
        for (const bId in target._behaviorState) {
            const config = this.runtime.registry.get(bId);
            if (config) {
                const actId = this.runtime.registry.getParameter(target, bId, 'activationId');
                if (actId === eventId) {
                    target._behaviorState[bId] = state;
                }
            }
        }
    }

    toggleBehaviorStateByEventId(target, eventId) {
        if (!target._behaviorState) return;
        for (const bId in target._behaviorState) {
            const actId = this.runtime.registry.getParameter(target, bId, 'activationId');
            if (actId === eventId) {
                target._behaviorState[bId] = !target._behaviorState[bId];
            }
        }
    }

    // Helper to get property (DEPRECATED: Use this.runtime._getProperty)
    _getProperty(target, property) {
        return this.runtime._getProperty(target, property);
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
                    // Joystick Special Case: Two axes
                    if (control.type === 'joystick' && control.joystick) {
                        this._applyProperty(target, control.binding.property, control.joystick.axisX);
                        if (control.binding.propertyY) {
                            this._applyProperty(target, control.binding.propertyY, control.joystick.axisY);
                        }
                        return;
                    }

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
                            if (!target._behaviorParams) target._behaviorParams = {};
                            if (!target._behaviorParams[behaviorId]) target._behaviorParams[behaviorId] = {};

                            target._behaviorParams[behaviorId][paramName] = val;
                        }
                    } else {
                        // Direct Property
                        target[control.binding.property] = val;
                    }
                }
            });
        }
    }

    // Helper to apply property (DEPRECATED: Use this.runtime._applyProperty)
    _applyProperty(target, property, value) {
        this.runtime._applyProperty(target, property, value);
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

        const lastVal = control.data.length > 0 ? control.data[control.data.length - 1] : 0;

        // Update value display
        const valDisplay = wrapper.querySelector('.graph-value');
        if (valDisplay) {
            valDisplay.textContent = lastVal.toFixed(2);
        }

        // --- GAUGE RENDERER ---
        if (control.subtype === 'gauge') {
            const min = control.min || 0;
            const max = control.max || 100;
            const range = max - min;
            const pct = Math.max(0, Math.min(1, (lastVal - min) / range));

            const cx = w / 2, cy = h * 0.85; // Lower center because half-circle usually
            const r = Math.min(w, h) * 0.55;
            const startAngle = (control.gauge?.startAngle !== undefined) ? control.gauge.startAngle : -Math.PI;
            const endAngle = (control.gauge?.endAngle !== undefined) ? control.gauge.endAngle : 0;
            const totalAngle = endAngle - startAngle;

            // Background Arc
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.lineWidth = 12;
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Value Arc
            const currentAngle = startAngle + (totalAngle * pct);
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, currentAngle);
            ctx.lineWidth = 12;

            let color = control.style.color || '#007acc';
            // Segment Color Logic
            if (control.gauge?.segments) {
                control.gauge.segments.forEach(seg => {
                    if (pct >= seg.percent) color = seg.color;
                });
            }
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Text Value (Large Center)
            ctx.fillStyle = '#444';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(lastVal.toFixed(1), cx, cy - 10);

            return;
        }

        // --- LINE GRAPH RENDERER ---
        if (control.data.length > 1) {
            ctx.strokeStyle = control.style.color || '#007acc';
            ctx.lineWidth = 2;
            ctx.beginPath();

            // Auto-scale Y
            let min = control.autoScale ? Math.min(...control.data) : (control.min || 0);
            let max = control.autoScale ? Math.max(...control.data) : (control.max || 100);

            if (control.autoScale && max === min) { max++; min--; }

            const range = max - min;
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
