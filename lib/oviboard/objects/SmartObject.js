import OviStateRuntime from '../../ovistate/runtime/Core.js';

/**
 * SmartObject
 * Universal container for OviBoard items (Images, OviState Embeds, Text boxes)
 */
export default class SmartObject {
    constructor(config) {
        this.id = config.id || `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = config.type || 'generic'; // 'ovistate', 'image', 'text'
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = config.width || 200;
        this.height = config.height || 200;

        // Content Data (JSON, URL, Text String)
        this.content = config.content || null;

        this.selected = false;
        this.rotation = config.rotation || 0;

        // Runtime Environment
        this.runtime = null;
        this.runtimeCanvas = null;

        if (this.type === 'ovistate' && this.content) {
            this.initRuntime();
        }
    }

    initRuntime() {
        console.log("🚀 SmartObject: Initializing Runtime...");

        // High DPI Support
        // const dpr = window.devicePixelRatio || 1; // Unused variable

        // Match internal resolution (usually 800x600 in OviState, or custom)
        this.internalW = this.content.canvas ? this.content.canvas.width : 800;
        this.internalH = this.content.canvas ? this.content.canvas.height : 600;

        this.runtimeCanvas = document.createElement('canvas');
        this.runtimeCanvas.width = this.internalW;
        this.runtimeCanvas.height = this.internalH;

        console.log(`📏 Internal Resolution: ${this.internalW}x${this.internalH}`);

        // Initialize Engine
        try {
            this.runtime = new OviStateRuntime(null, {
                canvas: this.runtimeCanvas,
                width: this.internalW,
                height: this.internalH,
                gravity: this.content.physics ? this.content.physics.gravity : 1500,
                enablePhysics: true
            });
            console.log("✅ Runtime Instance Created");

            // Load Objects, Controls, and Graphs
            const objects = JSON.parse(JSON.stringify(this.content.objects || []));
            const controls = JSON.parse(JSON.stringify(this.content.controls || []));
            const graphs = JSON.parse(JSON.stringify(this.content.graphs || []));

            console.log(`📦 Loading Objects: ${objects.length}, Controls: ${controls.length}`);

            objects.forEach(obj => this.runtime.addObject(obj));
            controls.forEach(ctl => this.runtime.addControl(ctl));
            graphs.forEach(g => this.runtime.addGraph(g));

            // Start it
            this.runtime.start();
            console.log("▶️ Runtime Started");

        } catch (e) {
            console.error("❌ Failed to init runtime:", e);
        }
    }

    processInput(type, worldX, worldY) {
        if (!this.runtime) return;

        // 1. Convert World -> Local (0,0 is top-left of object)
        // Note: This needs to account for rotation in the future! 
        const localX = worldX - this.x;
        const localY = worldY - this.y;

        const scaleX = this.internalW / this.width;
        const scaleY = this.internalH / this.height;

        const simX = localX * scaleX;
        const simY = localY * scaleY;

        // UI HIT TEST (Top-most priority)
        let uiHit = false;
        let captureInput = false;

        if (this.runtime.controls) {
            for (const control of this.runtime.controls) {
                // UI coords are in sim-space (internalW/H)
                const cx = control.x || 0;
                const cy = control.y || 0;
                const cw = control.width || 100;
                const ch = control.height || 40;

                // Hit test
                if (simX >= cx && simX <= cx + cw && simY >= cy && simY <= cy + ch) {
                    uiHit = true;
                    control._isHovered = true;

                    if (type === 'down') {
                        control._isPressed = true;
                        this.triggerControlAction(control);

                        // Capture slider dragging
                        if (control.type === 'slider') {
                            this.activeControl = control;
                            captureInput = true;
                            this.updateSliderValue(control, simX);
                        }
                    }
                } else {
                    control._isHovered = false;
                    // Dont clear pressed if we are actively dragging this specific slider
                    if (this.activeControl !== control) {
                        // But for buttons, we clear if mouse leaves? Usually yes.
                    }
                }
            }
        }

        // Handle Global Dragging for active controls (Sliders)
        if (this.activeControl && this.activeControl.type === 'slider') {
            captureInput = true; // Still capturing
            if (type === 'move') {
                this.updateSliderValue(this.activeControl, simX);
            } else if (type === 'up') {
                this.activeControl._isPressed = false;
                this.activeControl = null;
            }
        } else if (type === 'up') {
            // Clear all presses
            if (this.runtime.controls) {
                this.runtime.controls.forEach(c => c._isPressed = false);
            }
        }

        // 3. Inject into Physics (if not hitting UI)
        if (!captureInput && !uiHit && this.runtime.injectInput) {
            this.runtime.injectInput(type, simX, simY);
        }

        return uiHit || captureInput;
    }

    triggerControlAction(control) {
        if (control.type !== 'button') return;

        console.log("🔘 Button Clicked:", control.label || control.text);

        if (control.binding && control.binding.action) {
            const targetIds = (control.binding.targets && control.binding.targets.length > 0)
                ? control.binding.targets
                : (control.binding.targetId ? [control.binding.targetId] : []);

            targetIds.forEach(id => {
                const target = this.runtime.objects.find(o => o.id === id);
                if (target) {
                    const action = control.binding.action;
                    if (action === 'reset_pos') {
                        target.x = target.initialX || 100; // Basic reset
                        target.y = target.initialY || 100;
                        if (target.physics) target.physics.velocity = { x: 0, y: 0 };
                    } else if (action === 'jump') {
                        if (target.physics) target.physics.velocity.y = -600;
                    } else if (action === 'toggle_physics') {
                        if (target.physics) target.physics.enabled = !target.physics.enabled;
                    } else if (action === 'random_color') {
                        target.fill = '#' + Math.floor(Math.random() * 16777215).toString(16);
                    }
                    // Behavior Actions
                    else if (['start_behavior', 'stop_behavior', 'toggle_behavior'].includes(action)) {
                        if (control.binding.actionId) {
                            const bId = control.binding.actionId;
                            if (!target._behaviorState) target._behaviorState = {};
                            if (action === 'start_behavior') target._behaviorState[bId] = true;
                            if (action === 'stop_behavior') target._behaviorState[bId] = false;
                            if (action === 'toggle_behavior') target._behaviorState[bId] = !target._behaviorState[bId];
                        }
                    }
                }
            });
        }
    }

    updateSliderValue(control, simX) {
        const cx = control.x || 0;
        const cw = control.width || 100;

        let pct = (simX - cx) / cw;
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;

        const min = control.min !== undefined ? control.min : 0;
        const max = control.max !== undefined ? control.max : 100;
        const step = control.step || 1;

        let rawVal = min + pct * (max - min);

        // Snap to step
        if (step > 0) {
            rawVal = Math.round(rawVal / step) * step;
        }

        // Clamp
        if (rawVal < min) rawVal = min;
        if (rawVal > max) rawVal = max;

        // Apply
        control.value = rawVal;

        // Bind to object
        this.updateBoundObject(control);
    }

    updateBoundObject(control) {
        if (control.binding && control.binding.property) {
            const targets = this.getTargets(control);
            targets.forEach(target => {
                const val = typeof control.value === 'string' ? parseFloat(control.value) : control.value; // Ensure number for physics

                if (control.binding.property.includes('.')) {
                    const parts = control.binding.property.split('.');
                    if (parts[0] === 'physics') {
                        if (target.physics) target.physics[parts[1]] = val;
                    } else if (parts[0] === 'transform') {
                        target[parts[1]] = val;
                    }
                } else {
                    target[control.binding.property] = val;
                }
            });
        }
    }

    getTargets(control) {
        if (!control.binding) return [];
        const ids = (control.binding.targets && control.binding.targets.length > 0)
            ? control.binding.targets
            : (control.binding.targetId ? [control.binding.targetId] : []);
        return ids.map(id => this.runtime.objects.find(o => o.id === id)).filter(o => o);
    }

    update(dt) {
        if (this.runtime && this.runtime.isRunning) {
            // Core.js loop() handles its own RAF.
            // We rely on it to update the offscreen canvas.
        }

        // Collect Graph Data
        if (this.runtime && this.runtime.controls) {
            this.runtime.controls.forEach(control => {
                if (control.type === 'graph' && control.binding) {
                    const targets = this.getTargets(control);
                    if (targets.length > 0) {
                        const target = targets[0]; // Graph usually tracks one object
                        let val = 0;

                        // Read Property
                        if (control.binding.property.includes('.')) {
                            const parts = control.binding.property.split('.');
                            if (parts[0] === 'physics' && target.physics) {
                                // e.g. velocity.x
                                if (parts[1] === 'velocity') {
                                    const axis = parts[2] || 'x'; // velocity.x
                                    val = target.physics.velocity[axis];
                                } else {
                                    val = target.physics[parts[1]];
                                }
                            } else {
                                val = target[parts[1]];
                            }
                        } else {
                            val = target[control.binding.property];
                        }

                        // Push
                        if (!control.data) control.data = [];
                        control.data.push(val);
                        if (control.data.length > (control.maxPoints || 100)) control.data.shift();
                    }
                }
            });
        }
    }

    render(ctx, allObjects = []) {
        // Special Case: Connector
        // Connectors draw in World Space between two other objects.
        if (this.type === 'connector' && this.content.from && this.content.to) {
            const fromObj = allObjects.find(o => o.id === this.content.from);
            const toObj = allObjects.find(o => o.id === this.content.to);

            if (fromObj && toObj) {
                // Get Centers
                const x1 = fromObj.x + fromObj.width / 2;
                const y1 = fromObj.y + fromObj.height / 2;
                const x2 = toObj.x + toObj.width / 2;
                const y2 = toObj.y + toObj.height / 2;

                ctx.save();
                // We are already in Camera Space (World Space), so we can just draw.
                // But wait, the standard render() below does a translation to this.x.
                // We are intercepting BEFORE that translation.

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = this.content.color || 'black';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Arrowhead
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const headLen = 10;
                ctx.beginPath();
                ctx.moveTo(x2, y2);
                ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(x2, y2);
                ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();

                ctx.restore();
                return; // SKIP STANDARD RENDER
            }
        }

        ctx.save();
        // Transform to Object Space
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.translate(-this.width / 2, -this.height / 2);

        // 1. Draw Content
        // 1. Draw Content
        if (this.type === 'shape') {
            const st = this.content.shapeType;
            ctx.beginPath();
            if (st === 'circle') {
                ctx.arc(this.width / 2, this.height / 2, this.width / 2, 0, Math.PI * 2);
            } else if (st === 'rectangle') {
                ctx.rect(0, 0, this.width, this.height);
            } else if (st === 'line') {
                ctx.moveTo(0, 0);
                ctx.lineTo(this.width, this.height);
            }

            ctx.strokeStyle = this.content.color || 'black';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (this.content.fill) {
                ctx.fillStyle = this.content.fill;
                ctx.fill();
            }

        } else if (this.type === 'text') {
            const style = this.content.fontStyle || 'normal';
            ctx.font = `${style} ${this.content.fontSize}px ${this.content.fontFamily}`;
            ctx.fillStyle = this.content.color;
            ctx.textBaseline = 'top';

            // Auto-Resize Logic
            const metrics = ctx.measureText(this.content.text);
            const newW = metrics.width + 20; // 10px padding each side
            const newH = this.content.fontSize * 1.2;

            if (Math.abs(this.width - newW) > 1 || Math.abs(this.height - newH) > 1) {
                this.width = newW;
                this.height = newH;
            }

            ctx.fillText(this.content.text, 10, 0);

        } else if (this.type === 'image') {
            if (this.content.src) {
                // We should cache the image element instead of creating new one every frame?
                // For now, let's assume we can't create `new Image()` every frame.
                // The `content.src` is a string (DataURL).
                // We need a resilient way. 
                // Better: Store the `Image()` object in `this.cache` or property.
                if (!this._imgCache) {
                    this._imgCache = new Image();
                    this._imgCache.src = this.content.src;
                }
                if (this._imgCache.complete) {
                    ctx.drawImage(this._imgCache, 0, 0, this.width, this.height);
                }
            }

        } else if (this.runtime && this.runtimeCanvas) {
            // Draw Background (White) so transparency doesn't hide it
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, this.width, this.height);

            // Draw the offscreen canvas, scaled to this object's dimensions
            ctx.drawImage(this.runtimeCanvas, 0, 0, this.width, this.height);

            // Render UI Controls ON TOP (Mapped to Object Space)
            // We need to scale context to match internal resolution if we want to use direct coords?
            // Or simpler: Draw them using scaling.
            if (this.runtime.controls) {
                const scaleX = this.width / this.internalW;
                const scaleY = this.height / this.internalH;

                ctx.save();
                ctx.scale(scaleX, scaleY);
                this.renderControls(ctx);
                ctx.restore();
            }

            // Border so we can see it
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, this.width, this.height);

        } else {
            // Fallback
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, this.width, this.height);

            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, this.width, this.height);

            // Type Label
            ctx.fillStyle = '#999';
            ctx.font = '12px sans-serif';
            ctx.fillText(this.type, 5, 15);
        }

        // 2. Draw Selection Border (if selected)
        if (this.selected) {
            ctx.strokeStyle = '#007acc';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, this.width, this.height);

            // Resize Handles (Corners)
            const handleSize = 8;
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#007acc';
            ctx.lineWidth = 1;

            // TL, TR, BR, BL
            const handles = [
                { x: 0, y: 0 },
                { x: this.width, y: 0 },
                { x: this.width, y: this.height },
                { x: 0, y: this.height }
            ];

            handles.forEach(h => {
                ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
                ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
            });
        }

        ctx.restore();
    }

    renderControls(ctx) {
        if (!this.runtime.controls) return;

        this.runtime.controls.forEach(ctl => {
            const x = ctl.x || 10;
            const y = ctl.y || 10;
            const w = ctl.width || 100;
            const h = ctl.height || 40;

            if (ctl.type === 'button') {
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(x + 2, y + 2, w, h);

                // Body
                let bgColor = '#007bff';
                if (ctl.style && ctl.style.background) bgColor = ctl.style.background;

                if (ctl._isPressed) bgColor = this.darkenColor(bgColor, 20);
                else if (ctl._isHovered) bgColor = this.darkenColor(bgColor, 10);

                ctx.fillStyle = bgColor;
                ctx.fillRect(x, y, w, h);

                // Text
                ctx.fillStyle = (ctl.style && ctl.style.color) ? ctl.style.color : 'white';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ctl.label || ctl.text || 'Button', x + w / 2, y + h / 2);

            } else if (ctl.type === 'slider') {
                // Label
                ctx.fillStyle = 'black';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(ctl.label || 'Slider', x, y - 5);

                // Track
                ctx.fillStyle = '#ddd';
                ctx.fillRect(x, y, w, 6);

                // Fill
                const min = ctl.min || 0;
                const max = ctl.max || 100;
                const val = ctl.value !== undefined ? ctl.value : min;
                const pct = (val - min) / (max - min);

                ctx.fillStyle = '#007acc';
                ctx.fillRect(x, y, w * pct, 6);

                // Thumb
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x + w * pct, y + 3, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#999';
                ctx.stroke();

            } else if (ctl.type === 'graph') {
                // Background
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#ccc';
                ctx.strokeRect(x, y, w, h);

                // Title
                ctx.fillStyle = '#333';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(ctl.binding ? ctl.binding.property : 'Graph', x + 5, y + 5);

                // Data Line
                if (ctl.data && ctl.data.length > 1) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#007acc';
                    ctx.lineWidth = 1.5;

                    const min = Math.min(...ctl.data);
                    const max = Math.max(...ctl.data);
                    const range = (max - min) || 1;

                    ctl.data.forEach((val, i) => {
                        const px = x + (i / (ctl.maxPoints || 100)) * w;
                        // Normalize val to 0-1, flip Y (h)
                        const norm = (val - min) / range;
                        const py = (y + h) - (norm * (h - 20)) - 5; // padding

                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    });
                    ctx.stroke();
                }

            } else if (ctl.type === 'label') {
                ctx.fillStyle = (ctl.style && ctl.style.color) ? ctl.style.color : 'black';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(ctl.text || ctl.label || 'Label', x, y);
            }
        });
    }

    // Helper for hover effect
    darkenColor(col, amt) {
        // Very basic mock, return same or simple logic
        // For MVP just return the color or a hardcoded active color
        return col;
    }

    containsPoint(x, y) {
        // Simple AABB hit test (rotate not supported for hit test in MVP)
        return (x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height);
    }
}
