/**
 * RuntimeUI
 * Handles interactive UI logic, data binding, and manual event triggers during runtime.
 */
export default class RuntimeUI {
    constructor(runtime) {
        this.runtime = runtime;
        // In the Editor, the DOM is managed by Editor.js, but we need to manage the Logic.
        // In the Exporter, this class also manages the DOM.
        // For Editor usage, we primarily focus on update().

        this.setupInteractiveListeners();
    }

    setupInteractiveListeners() {
        // Event Delegation for UI Controls
        document.addEventListener('input', (e) => {
            if (e.target.matches('.ui-widget-input')) {
                const id = e.target.dataset.id;
                const control = this.runtime.controls.find(c => c.id === id);
                if (control) {
                    control.value = e.target.value;
                    // Also update label if present (for sliders)
                    const valDisplay = e.target.parentElement.querySelector('.val-display');
                    if (valDisplay) valDisplay.textContent = control.value;
                }
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('.ui-widget-checkbox')) {
                const id = e.target.dataset.id;
                const control = this.runtime.controls.find(c => c.id === id);
                if (control) {
                    control.checked = e.target.checked;
                }
            }
        });

        document.addEventListener('click', (e) => {
            // Button Actions
            if (e.target.matches('.ui-widget-button')) {
                const id = e.target.dataset.id;
                const control = this.runtime.controls.find(c => c.id === id);
                if (control && control.binding && control.binding.action) {
                    // Determine Targets: Support both .targets (Array) and .targetId (Legacy)
                    const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);

                    targetIds.forEach(tid => {
                        const target = this.runtime.objects.find(o => o.id === tid);
                        if (target) {
                            this.triggerAction(control.binding.action, target, control.binding.actionId);
                        }
                    });
                }
            }
        });
    }

    update(dt) {
        // Debug Log (Throttle to avoid spam, e.g. every 60 frames or once per play)
        // console.log(`RuntimeUI Update: ${this.runtime.controls.length} controls`);

        this.runtime.controls.forEach(control => {
            // 1. DATA BINDING (Control -> Object)
            if (control.binding && control.binding.property) {
                // Determine Targets: Support both .targets (Array) and .targetId (Legacy/Single)
                const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);

                targetIds.forEach(tid => {
                    const target = this.runtime.objects.find(o => o.id === tid);
                    if (target) {
                        // Check if it's a Graph (Object -> Control) -> Only usually 1 source supported for simple graph
                        if (control.type === 'graph') {
                            // Graph usually monitors one target. If multiple, we just monitor the first/last?
                            // Let's allow multi-monitor if graph supports it. Current implementation pushes to data array.
                            // If multiple targets push to same data array, it might be chaotic.
                            // For now, let's assume Graph uses single targetId usually.
                            // But if user used multi-target UI, we try.
                            this.updateGraph(control, target);
                        }
                        // Otherwise it's Control -> Object (Slider, etc.)
                        else {
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

        // DEBUG: Verify value application
        // console.log(`Setting ${property} on ${target.id} to ${value}`);

        // A. Behavior Parameter Binding (e.g. "typewriter.speed")
        if (property.includes('.')) {
            const parts = property.split('.');
            // Check if first part is a behavior ID?
            // "typewriter.speed"
            // "physics.mass" (Nested property)

            // Heuristic warnings: "physics" is a property, "typewriter" is a behavior.
            // We check if target has property "physics".
            if (parts[0] === 'physics') {
                if (target.physics) target.physics[parts[1]] = value;
            } else {
                // Assume Behavior Parameter
                const behaviorId = parts[0];
                const paramName = parts[1];

                // Use Registry to set parameter
                if (this.runtime.registry) {
                    this.runtime.registry.setParameter(target, behaviorId, paramName, value);
                } else {
                    // Fallback if no registry attached to runtime (Exporter bundle might need fix)
                    // In Editor, behavior parameters are in behaviorSystem.registry.
                    // But Runtime might not have reference?
                    // Verify Core.js has behavior registry.
                    // In my EnhancedExporter update, I attached registry to runtime. 
                    // In Editor? Editor.js has behaviorSystem.
                }
            }
        }
        // B. Standard Property Binding (e.g. "x", "opacity")
        else {
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
            if (control.data.length > (control.maxPoints || 200)) control.data.shift();

            // In Editor, we rely on Editor.js or this class to render? 
            // Editor.js calls renderGraph based on control.data.
            // But Editor.js render loop calls `core.render` which calls `ui.render`?
            // No, Editor.js puts graph in DOM. DOM needs canvas redraw.
            // We need to find the canvas in DOM and draw.
            const graphCanvas = document.querySelector(`[data-id="${control.id}"] canvas`);
            if (graphCanvas) {
                this.drawGraph(graphCanvas, control.data, control);
            }
        }
    }

    drawGraph(canvas, data, control) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = control.style?.color || '#007acc';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const min = control.min || -100;
        const max = control.max || 100;
        const range = max - min;

        data.forEach((val, i) => {
            const x = (i / (control.maxPoints || 200)) * w;
            const norm = (val - min) / range; // 0..1
            const y = h - (norm * h);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Update value text
        const wrapper = canvas.parentElement;
        if (wrapper) {
            const valDisplay = wrapper.querySelector('.graph-value');
            if (valDisplay && data.length > 0) valDisplay.textContent = data[data.length - 1].toFixed(2);
        }
    }

    // Manual Event Trigger (Called by Button click listeners)
    triggerAction(action, target, actionId) {
        if (!target) return;
        console.log(`⚡ RuntimeUI: Triggering ${action} on ${target.id}`);

        switch (action) {
            case 'reset_pos':
                target.x = 100; target.y = 100;
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

            // NEW: Behavior Manual Triggers
            case 'start_behavior':
                if (actionId) {
                    // We need to set state for the behavior with this Activation ID
                    // The behaviors map ID to State. user provides ID.
                    // We need to find which behavior has this activationId.
                    // This is inefficient. Better: `actionId` IS the behavior name?
                    // User requested "Manual (via Event)". Inspector shows "Activation Event ID".
                    // Code checks: `actId === obj._behaviorState[behaviorId]`?
                    // No, `obj._behaviorState` stores Boolean (Active/Inactive).
                    // We need to find behaviors on this object that match the `actionId`.

                    if (this.runtime.registry) {
                        this.setBehaviorStateByEventId(target, actionId, true);
                    }
                }
                break;
            case 'stop_behavior':
                if (actionId) this.setBehaviorStateByEventId(target, actionId, false);
                break;
            case 'toggle_behavior':
                if (actionId) this.toggleBehaviorStateByEventId(target, actionId);
                break;
        }
    }

    setBehaviorStateByEventId(obj, eventId, state) {
        // Find behaviors on this object with matching activationId
        if (!obj.behaviors) return;
        obj.behaviors.forEach(bId => {
            const actId = this.runtime.registry.getParameter(obj, bId, 'activationId');
            if (actId === eventId) {
                if (!obj._behaviorState) obj._behaviorState = {};
                obj._behaviorState[bId] = state;
            }
        });
    }

    toggleBehaviorStateByEventId(obj, eventId) {
        if (!obj.behaviors) return;
        obj.behaviors.forEach(bId => {
            const actId = this.runtime.registry.getParameter(obj, bId, 'activationId');
            if (actId === eventId) {
                if (!obj._behaviorState) obj._behaviorState = {};
                obj._behaviorState[bId] = !obj._behaviorState[bId];
            }
        });
    }
}
