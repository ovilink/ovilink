/**
 * Interactive Behaviors
 * Behaviors that respond to user interaction
 */

export function registerInteractiveBehaviors(registry) {

    // Click Response - React to clicks
    registry.register('click_response', {
        name: 'Click Response',
        category: 'interactive',
        icon: '👆',
        description: 'React when clicked',
        parameters: {
            action: { type: 'select', options: ['bounce', 'grow', 'spin', 'flash'], default: 'bounce', label: 'Action' },
            intensity: { type: 'slider', min: 0, max: 10, default: 5, label: 'Intensity' },
            enableSound: { type: 'checkbox', default: true, label: 'Enable Sound' },
            enableRipple: { type: 'checkbox', default: true, label: 'Enable Ripple Effect' }
        },
        init(obj, runtime) {
            if (!obj._clickSetup) {
                obj._clickSetup = true;
                obj._clickActive = false;
                obj._clickTime = 0;
            }
        },
        update(obj, dt, runtime, registry) {
            if (!obj._clickSetup) this.init(obj, runtime);
            const bId = 'click_response';
            const signal = obj._behaviorState && obj._behaviorState[bId];
            const triggered = obj._justClicked || (signal && !obj._clickActive);
            if (signal) obj._behaviorState[bId] = false;

            if (triggered) {
                obj._clickActive = true;
                obj._clickTime = 0;
                obj._clickStore = {
                    y: obj.y,
                    rotation: obj.rotation || 0,
                    radius: obj.radius || 30,
                    width: obj.width || 60,
                    height: obj.height || 60,
                    scaleX: obj.scaleX || 1,
                    scaleY: obj.scaleY || 1,
                    opacity: obj.opacity || 1
                };

                if (registry.getParameter(obj, bId, 'enableSound') !== false) playPopSound();
                if (registry.getParameter(obj, bId, 'enableRipple') !== false) spawnRipple(obj, runtime);
            }

            if (obj._clickActive) {
                obj._clickTime += dt;
                const dur = 0.6;
                const t = Math.min(1.0, obj._clickTime / dur);
                const s = obj._clickStore;
                const intensity = registry.getParameter(obj, bId, 'intensity') || 5;
                const action = registry.getParameter(obj, bId, 'action') || 'bounce';

                const pop = Math.sin(t * Math.PI) * Math.pow(2, -4 * t) * (intensity / 5);
                const elastic = (t) => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;

                if (action === 'bounce') obj.y = s.y - (pop * 50);
                else if (action === 'grow') {
                    const sc = 1 + pop * 0.5;
                    if (obj.type === 'circle') obj.radius = s.radius * sc;
                    else if (obj.width && obj.height) {
                        obj.width = s.width * sc;
                        obj.height = s.height * (1 - pop * 0.2); // Squash effect
                    } else {
                        obj.scaleX = s.scaleX * sc;
                        obj.scaleY = s.scaleY * (1 - pop * 0.2);
                    }
                } else if (action === 'spin') obj.rotation = s.rotation + (elastic(t) * 360 * (intensity / 5));
                else if (action === 'flash') obj.opacity = s.opacity * (1 - pop * 0.8);

                if (t >= 1.0) {
                    obj._clickActive = false;
                    obj.y = s.y; obj.rotation = s.rotation; obj.opacity = s.opacity;
                    if (obj.type === 'circle') obj.radius = s.radius;
                    else if (obj.width && obj.height) { obj.width = s.width; obj.height = s.height; }
                    else { obj.scaleX = s.scaleX; obj.scaleY = s.scaleY; }
                    if (obj._behaviorState) obj._behaviorState[bId] = false;
                } else {
                    const params = obj._behaviorParams[bId] || {};
                    const mode = params.activationMode || 'on_click';
                    if (obj._behaviorState && (mode === 'on_click' || mode === 'manual')) {
                        obj._behaviorState[bId] = true;
                    }
                }
            }
        }
    });

    function playPopSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
            g.gain.setValueAtTime(0.2, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) { }
    }

    function spawnRipple(obj, runtime) {
        if (!runtime || !runtime.addObject) return;
        const ripple = {
            id: 'ripple_' + Date.now(), type: 'circle', x: obj.x, y: obj.y, radius: 5,
            fill: 'transparent', stroke: '#fff', strokeWidth: 1.5, opacity: 0.6,
            physics: { enabled: false }, _life: 0
        };
        runtime.addObject(ripple);
        ripple.update = (dt) => {
            ripple._life += dt;
            const p = ripple._life / 0.4;
            ripple.radius = 5 + (p * 80); ripple.opacity = 0.6 * (1 - p);
            if (p >= 1) { runtime.removeObject(ripple.id); return false; }
            return true;
        };
    }



    // Hover Grow - Grow on hover
    registry.register('hover_grow', {
        name: 'Hover Grow',
        category: 'interactive',
        icon: '🔍',
        description: 'Grow when mouse hovers',
        parameters: {
            scale: { type: 'slider', min: 1, max: 3, default: 1.5, label: 'Hover Scale' },
            speed: { type: 'slider', min: 0, max: 10, default: 5, label: 'Transition Speed' },
            resetOnExit: { type: 'checkbox', default: true, label: 'Reset on Exit' }
        },
        init(obj) {
            if (!obj._hoverSetup) {
                obj._hoverSetup = true;
                obj._hoverScale = 1;
                obj._originalRadius = obj.radius || 30;
                obj._originalWidth = obj.width || 60;
                obj._originalHeight = obj.height || 60;
                obj._originalScaleX = obj.scaleX || 1;
                obj._originalScaleY = obj.scaleY || 1;
            }
        },
        update(obj, dt, runtime, registry) {
            if (!obj._hoverSetup) this.init(obj);

            const targetScale = registry.getParameter(obj, 'hover_grow', 'scale') || 1.5;
            const speed = registry.getParameter(obj, 'hover_grow', 'speed') || 5;
            const resetOnExit = registry.getParameter(obj, 'hover_grow', 'resetOnExit') !== false;

            // Use robust hit detection from runtime
            const isHovering = obj.isHovered;

            const target = isHovering ? targetScale : 1;
            obj._hoverScale += (target - obj._hoverScale) * speed * dt;

            // Apply transformations
            if (obj.type === 'circle') {
                obj.radius = obj._originalRadius * obj._hoverScale;
            } else if (obj.width && obj.height) {
                obj.width = obj._originalWidth * obj._hoverScale;
                obj.height = obj._originalHeight * obj._hoverScale;
            } else {
                obj.scaleX = obj._originalScaleX * obj._hoverScale;
                obj.scaleY = obj._originalScaleY * obj._hoverScale;
            }

            // --- Reset / Keep Alive Logic ---
            const behaviorId = 'hover_grow';
            if (isHovering) {
                // Stay alive while hovering
                if (obj._behaviorState) obj._behaviorState[behaviorId] = true;
            } else {
                // If hover finished, check if we reached reset target
                const isFinished = Math.abs(obj._hoverScale - 1) < 0.01;
                if (!resetOnExit || isFinished) {
                    if (obj._behaviorState) obj._behaviorState[behaviorId] = false;
                    if (resetOnExit) {
                        // Snap to final 1.0 to avoid drift
                        obj._hoverScale = 1;
                        if (obj.type === 'circle') obj.radius = obj._originalRadius;
                        else if (obj.width && obj.height) { obj.width = obj._originalWidth; obj.height = obj._originalHeight; }
                        else { obj.scaleX = obj._originalScaleX; obj.scaleY = obj._originalScaleY; }
                    }
                } else {
                    // Keep updating until we reach 1.0
                    if (obj._behaviorState) obj._behaviorState[behaviorId] = true;
                }
            }
        }
    });

    // Magnet - Attract to mouse
    registry.register('magnet', {
        name: 'Magnet',
        category: 'interactive',
        icon: '🧲',
        description: 'Attract towards mouse',
        parameters: {
            strength: { type: 'slider', min: 0, max: 500, default: 100, label: 'Strength' },
            range: { type: 'slider', min: 0, max: 500, default: 200, label: 'Range' }
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX || !runtime.mouseY) return;

            const strength = registry.getParameter(obj, 'magnet', 'strength');
            const range = registry.getParameter(obj, 'magnet', 'range');

            const dx = runtime.mouseX - obj.x;
            const dy = runtime.mouseY - obj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < range && distance > 0) {
                const force = (1 - distance / range) * strength;
                obj.x += (dx / distance) * force * dt;
                obj.y += (dy / distance) * force * dt;
            }
        }
    });

    // Repel - Repel from mouse
    registry.register('repel', {
        name: 'Repel',
        category: 'interactive',
        icon: '💨',
        description: 'Repel away from mouse',
        parameters: {
            strength: { type: 'slider', min: 0, max: 500, default: 150, label: 'Strength' },
            range: { type: 'slider', min: 0, max: 500, default: 150, label: 'Range' }
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX || !runtime.mouseY) return;

            const strength = registry.getParameter(obj, 'repel', 'strength');
            const range = registry.getParameter(obj, 'repel', 'range');

            const dx = obj.x - runtime.mouseX;
            const dy = obj.y - runtime.mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < range && distance > 0) {
                const force = (1 - distance / range) * strength;
                obj.x += (dx / distance) * force * dt;
                obj.y += (dy / distance) * force * dt;
            }
        }
    });

    // Follow Target (Unified)
    registry.register('follow_target', {
        name: 'Follow Target',
        category: 'interactive',
        icon: '🎯',
        description: 'Follow mouse or another object with smooth or elastic physics',
        parameters: {
            targetType: {
                type: 'select',
                options: [
                    { val: 'mouse', label: 'Mouse Cursor' },
                    { val: 'object', label: 'Specific Object' }
                ],
                default: 'mouse',
                label: 'Target Type'
            },
            targetId: { type: 'select', options: 'objects:all', label: 'Target Object' },
            moveMode: { type: 'select', options: ['lerp', 'spring'], default: 'lerp', label: 'Movement Mode' },
            speed: { type: 'slider', min: 1, max: 100, default: 20, label: 'Lerp Speed' },
            smoothness: { type: 'slider', min: 0.1, max: 1, step: 0.01, default: 0.8, label: 'Lerp Smoothness' },
            stiffness: { type: 'slider', min: 1, max: 500, default: 50, label: 'Spring Stiffness' },
            damping: { type: 'slider', min: 0.1, max: 1, step: 0.01, default: 0.8, label: 'Spring Damping' },
            autoRotate: { type: 'checkbox', default: false, label: 'Face Target' },
            proximityEffect: {
                type: 'select',
                options: [
                    { val: 'none', label: 'None' },
                    { val: 'scale', label: 'Grow Near Target' },
                    { val: 'opacity', label: 'Fade Near Target' }
                ],
                default: 'none',
                label: 'Proximity Effect'
            }
        },
        init(obj) {
            if (!obj._followVel) obj._followVel = { x: 0, y: 0 };
            if (!obj._followSetup) {
                obj._followSetup = true;
                obj._origRadius = obj.radius || 30;
                obj._origWidth = obj.width || 60;
                obj._origHeight = obj.height || 60;
                obj._origOpacity = obj.opacity || 1;
            }
        },
        update(obj, dt, runtime, registry, callerId) {
            if (!obj._followSetup) this.init(obj);
            const bId = callerId || 'follow_target';

            const targetType = registry.getParameter(obj, bId, 'targetType');
            const moveMode = registry.getParameter(obj, bId, 'moveMode');
            const proximityEffect = registry.getParameter(obj, bId, 'proximityEffect');
            const autoRotate = registry.getParameter(obj, bId, 'autoRotate');

            let tx = runtime.mouseX;
            let ty = runtime.mouseY;

            if (targetType === 'object') {
                const targetId = registry.getParameter(obj, bId, 'targetId');
                const targetObj = runtime.getObject(targetId);
                if (targetObj) {
                    tx = targetObj.x;
                    ty = targetObj.y;
                } else return;
            }

            if (tx === undefined || ty === undefined) return;

            const dx = tx - obj.x;
            const dy = ty - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (moveMode === 'spring' || bId === 'spring_follow') {
                const stiffness = registry.getParameter(obj, bId, 'stiffness') ?? 50;
                const damping = registry.getParameter(obj, bId, 'damping') ?? 0.8;

                const ax = dx * stiffness;
                const ay = dy * stiffness;

                obj._followVel.x += ax * dt;
                obj._followVel.y += ay * dt;

                const d = Math.pow(damping, dt * 60);
                obj._followVel.x *= d;
                obj._followVel.y *= d;

                obj.x += obj._followVel.x * dt;
                obj.y += obj._followVel.y * dt;
            } else {
                const speed = registry.getParameter(obj, bId, 'speed') ?? 20;
                const smoothness = registry.getParameter(obj, bId, 'smoothness') ?? 0.8;

                // Advanced lerp: 1 - damping^dt * speed
                const lerpFactor = 1 - Math.pow(1 - (1 - smoothness), dt * speed);
                obj.x += dx * Math.min(lerpFactor, 1.0);
                obj.y += dy * Math.min(lerpFactor, 1.0);
            }

            if (autoRotate && dist > 2) {
                const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                let currentAngle = obj.rotation || 0;
                let adiff = targetAngle - currentAngle;
                while (adiff > 180) adiff -= 360;
                while (adiff < -180) adiff += 360;
                obj.rotation += adiff * Math.min(dt * 10, 1.0);
            }

            if (proximityEffect !== 'none') {
                const range = 300;
                const p = 1 - Math.min(dist / range, 1.0);
                if (proximityEffect === 'scale') {
                    const sc = 1 + p * 0.5;
                    if (obj.type === 'circle') obj.radius = obj._origRadius * sc;
                    else if (obj.width) { obj.width = obj._origWidth * sc; obj.height = obj._origHeight * sc; }
                } else if (proximityEffect === 'opacity') {
                    obj.opacity = obj._origOpacity * (0.4 + p * 0.6);
                }
            }
        }
    });

    // Backward compatibility aliases
    registry.register('follow_mouse_smooth', {
        name: 'Follow Mouse (Legacy)',
        category: 'hidden',
        parameters: {
            speed: { type: 'slider', min: 1, max: 100, default: 20, label: 'Speed' },
            smoothness: { type: 'slider', min: 0.1, max: 1, step: 0.01, default: 0.8, label: 'Smoothness' }
        },
        update(obj, dt, rt, reg) { registry.get('follow_target').update(obj, dt, rt, reg, 'follow_mouse_smooth'); }
    });
    registry.register('spring_follow', {
        name: 'Spring Follow (Legacy)',
        category: 'hidden',
        parameters: {
            stiffness: { type: 'slider', min: 1, max: 500, default: 50, label: 'Spring Stiffness' },
            damping: { type: 'slider', min: 0.1, max: 1, step: 0.01, default: 0.8, label: 'Spring Damping' }
        },
        update(obj, dt, rt, reg) { registry.get('follow_target').update(obj, dt, rt, reg, 'spring_follow'); }
    });

    // Look At - Rotate towards target
    registry.register('look_at', {
        name: 'Look At',
        category: 'interactive',
        icon: '👀',
        description: 'Rotate to face mouse or object',
        parameters: {
            targetType: {
                type: 'select',
                options: [
                    { val: 'mouse', label: 'Mouse Cursor' },
                    { val: 'object', label: 'Specific Object' }
                ],
                default: 'mouse',
                label: 'Target Type'
            },
            targetId: { type: 'select', options: 'objects:all', label: 'Target Object' },
            speed: { type: 'slider', min: 10, max: 1000, default: 360, label: 'Speed (deg/s)' },
            offset: { type: 'slider', min: -180, max: 180, default: 0, label: 'Angle Offset' }
        },
        update(obj, dt, runtime, registry) {
            const targetType = registry.getParameter(obj, 'look_at', 'targetType');
            const speed = registry.getParameter(obj, 'look_at', 'speed');
            const offset = registry.getParameter(obj, 'look_at', 'offset');

            let targetX, targetY;

            if (targetType === 'object') {
                const targetId = registry.getParameter(obj, 'look_at', 'targetId');
                const targetObj = runtime.getObject(targetId);
                if (targetObj) {
                    targetX = targetObj.x;
                    targetY = targetObj.y;
                }
            } else {
                targetX = runtime.mouseX;
                targetY = runtime.mouseY;
            }

            if (targetX === undefined || targetY === undefined) return;

            const dx = targetX - obj.x;
            const dy = targetY - obj.y;
            let targetAngle = (Math.atan2(dy, dx) * 180 / Math.PI) + offset;
            let currentAngle = obj.rotation || 0;
            let diff = targetAngle - currentAngle;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;

            const step = speed * dt;
            if (Math.abs(diff) < step) {
                obj.rotation = targetAngle;
            } else {
                obj.rotation += Math.sign(diff) * step;
            }
        }
    });

    // Collision Trigger - React to collisions
    registry.register('collision_trigger', {
        name: 'Collision Trigger',
        category: 'interactive',
        icon: '💥',
        description: 'React when hitting a tagged object',
        parameters: {
            targetTag: { type: 'text', default: '', label: 'Target Tag' },
            action: { type: 'select', options: ['bounce', 'destroy', 'color_change', 'fade_out'], default: 'bounce', label: 'On Collision' },
            color: { type: 'color', default: '#ff0000', label: 'Color (if Change)' },
            activationMode: { type: 'select', options: ['on_enter'], default: 'on_enter', label: 'Mode' },
            killParticles: { type: 'checkbox', default: false, label: 'Kill Particles on Contact' }
        },
        update(obj, dt, runtime, registry) {
            // Sync killParticles property
            obj.killParticles = registry.getParameter(obj, 'collision_trigger', 'killParticles');

            // Check active collisions populated by Core.js
            if (!obj.activeCollisions || obj.activeCollisions.length === 0) return;

            const targetTag = registry.getParameter(obj, 'collision_trigger', 'targetTag');
            const action = registry.getParameter(obj, 'collision_trigger', 'action');

            if (!targetTag) return;

            // Find collision match
            const hit = obj.activeCollisions.find(other => other.tags && other.tags.includes(targetTag));

            if (hit) {
                if (action === 'bounce') {
                    // Simple reversal away from hit center
                    if (obj.physics && obj.physics.velocity) {
                        const dx = obj.x - hit.x;
                        const dy = obj.y - hit.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        // Normalize and Bounce
                        obj.physics.velocity.x = (dx / dist) * 300; // Force bounce
                        obj.physics.velocity.y = (dy / dist) * 300;
                    }
                } else if (action === 'destroy') {
                    // Mark self for deletion (Need to handle this in Core)
                    obj._shouldDestroy = true;
                    // Also maybe destroy target? For now just self.
                } else if (action === 'color_change') {
                    const col = registry.getParameter(obj, 'collision_trigger', 'color');
                    obj.fill = col;
                } else if (action === 'fade_out') {
                    obj.opacity = (obj.opacity || 1) - dt * 2;
                    if (obj.opacity < 0) obj._shouldDestroy = true;
                }
            }
        }
    });

    // Look At - Rotate towards target
    // Look At - Rotate towards target
    registry.register('look_at', {
        name: 'Look At',
        category: 'interactive',
        icon: '👀',
        description: 'Rotate to face mouse or object',
        parameters: {
            targetType: {
                type: 'select',
                options: [
                    { val: 'mouse', label: 'Mouse Cursor' },
                    { val: 'object', label: 'Specific Object' }
                ],
                default: 'mouse',
                label: 'Target Type'
            },
            targetId: { type: 'select', options: 'objects:all', label: 'Target Object' },
            speed: { type: 'slider', min: 10, max: 1000, default: 360, label: 'Speed (deg/s)' },
            offset: { type: 'slider', min: -180, max: 180, default: 0, label: 'Angle Offset' }
        },
        update(obj, dt, runtime, registry) {
            const targetType = registry.getParameter(obj, 'look_at', 'targetType');
            const speed = registry.getParameter(obj, 'look_at', 'speed');
            const offset = registry.getParameter(obj, 'look_at', 'offset');

            let targetX, targetY;

            if (targetType === 'object') {
                const targetId = registry.getParameter(obj, 'look_at', 'targetId');
                const targetObj = runtime.getObject(targetId);
                if (targetObj) {
                    targetX = targetObj.x;
                    targetY = targetObj.y;
                }
            } else {
                // Default to mouse
                targetX = runtime.mouseX;
                targetY = runtime.mouseY;
            }

            if (targetX === undefined || targetY === undefined) return;

            const dx = targetX - obj.x;
            const dy = targetY - obj.y;

            // Convert to Degrees and apply offset
            let targetAngle = (Math.atan2(dy, dx) * 180 / Math.PI) + offset;

            // Normalize target angle
            // targetAngle = (targetAngle + 360) % 360; 

            // Current Angle
            let currentAngle = obj.rotation || 0;

            // Shortest path difference
            let diff = targetAngle - currentAngle;
            // Normalize diff to -180 to 180
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;

            // Apply constant turn speed
            const step = speed * dt;

            if (Math.abs(diff) < step) {
                obj.rotation = targetAngle; // Snap if close
            } else {
                obj.rotation += Math.sign(diff) * step;
            }
        }
    });

    // Draggable (Throw)
    registry.register('draggable', {
        name: 'Draggable',
        category: 'interactive',
        icon: '✋',
        description: 'Drag and throw object',
        parameters: {
            throwPhysics: { type: 'checkbox', default: true, label: 'Throw Physics' }
        },
        init(obj) {
            obj._isDragging = false;
            obj._dragLastPos = { x: obj.x, y: obj.y };
            obj._dragVel = { x: 0, y: 0 };
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX) return;

            // Mouse Down logic is in Core usually, but we can check global + hover
            // We need a robust "isPressed" check. 
            // Runtime exposes: isMouseDown, clickProcessed
            // obj exposes: isHovered (calculated in Runtime loop)

            // Start Drag
            if (obj.isHovered && runtime.isMouseDown && !obj._isDragging) {
                // If the runtime core already identified this object as being dragged, sync with it.
                // Otherwise, if nothing is being dragged, we start the drag.
                if (runtime._draggingObj === obj || !runtime._draggingObj) {
                    obj._isDragging = true;
                    runtime._draggingObj = obj; // Lock global drag
                }
            }

            // End Drag (Global Mouse Up)
            if (!runtime.isMouseDown && obj._isDragging) {
                obj._isDragging = false;
                if (runtime._draggingObj === obj) runtime._draggingObj = null;

                // Apply throw velocity
                const throwPhysics = registry.getParameter(obj, 'draggable', 'throwPhysics');
                if (throwPhysics && obj.physics) {
                    // Transfer drag velocity to physics velocity
                    obj.physics.velocity.x = obj._dragVel.x;
                    obj.physics.velocity.y = obj._dragVel.y;
                    obj.physics.enabled = true; // Wake up physics
                }
            }

            if (obj._isDragging) {
                // Disable physics while dragging
                if (obj.physics) obj.physics.enabled = false;

                // Calculate velocity for throw
                const vx = (runtime.mouseX - obj.x) / dt;
                const vy = (runtime.mouseY - obj.y) / dt;

                // Smooth velocity capture
                obj._dragVel.x = obj._dragVel.x * 0.5 + vx * 0.5;
                obj._dragVel.y = obj._dragVel.y * 0.5 + vy * 0.5;

                obj.x = runtime.mouseX;
                obj.y = runtime.mouseY;
            }
        }
    });

    // Parallax Depth
    registry.register('parallax', {
        name: 'Parallax Depth',
        category: 'interactive',
        icon: '🌌',
        description: 'Mouse parallax effect',
        parameters: {
            depth: { type: 'slider', min: -50, max: 50, default: 10, label: 'Depth' }
        },
        init(obj) {
            if (!obj._paraBase) obj._paraBase = { x: obj.x, y: obj.y };
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX) return;
            if (!obj._paraBase) this.init(obj);

            const depth = registry.getParameter(obj, 'parallax', 'depth');

            // Calculate mouse offset from center
            const cx = runtime.width / 2;
            const cy = runtime.height / 2;
            const mx = (runtime.mouseX - cx) / cx; // -1 to 1
            const my = (runtime.mouseY - cy) / cy;

            // Target position
            const tx = obj._paraBase.x + (mx * depth * -1); // Opposite move for depth
            const ty = obj._paraBase.y + (my * depth * -1);

            // Lerp to it
            obj.x += (tx - obj.x) * 5 * dt;
            obj.y += (ty - obj.y) * 5 * dt;
        }
    });


    // Drag Reactor - Drive other objects by dragging
    registry.register('drag_reactor', {
        name: 'Drag Reactor',
        category: 'interactive',
        icon: '🎛️',
        description: 'Control another object by dragging',
        parameters: {
            targetName: { type: 'text', default: '', label: 'Target Name (ID)' },
            axis: { type: 'select', options: ['x', 'y'], default: 'x', label: 'Drag Axis' },
            targetProperty: { type: 'select', options: ['rotation', 'x', 'y', 'scale', 'opacity'], default: 'rotation', label: 'Target Property' },
            sensitivity: { type: 'slider', min: -10, max: 10, default: 1, label: 'Sensitivity' }
        },
        init(obj) {
            obj._isDragging = false;
            obj._lastMouse = { x: 0, y: 0 };
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX) return;

            // Simple Drag Detection Logic (similar to draggable)
            if (obj.isHovered && runtime.isMouseDown && !obj._isDragging && !runtime._draggingObj) {
                obj._isDragging = true;
                runtime._draggingObj = obj;
                obj._lastMouse = { x: runtime.mouseX, y: runtime.mouseY };
            }

            if (!runtime.isMouseDown && obj._isDragging) {
                obj._isDragging = false;
                if (runtime._draggingObj === obj) runtime._draggingObj = null;
            }

            if (obj._isDragging) {
                const currentMouse = { x: runtime.mouseX, y: runtime.mouseY };
                const axis = registry.getParameter(obj, 'drag_reactor', 'axis');
                const delta = (axis === 'x') ? (currentMouse.x - obj._lastMouse.x) : (currentMouse.y - obj._lastMouse.y);

                // Update Self Position (It's a drag interaction after all, usually user wants to move the controller too)
                // If they strictly want a slider behavior without moving the object, we'd need a "Lock Position" flag.
                // For "Car", the car moves.
                obj.x += (currentMouse.x - obj._lastMouse.x);
                obj.y += (currentMouse.y - obj._lastMouse.y);

                obj._lastMouse = currentMouse;

                // Apply to Target
                const targetName = registry.getParameter(obj, 'drag_reactor', 'targetName');
                const targetProp = registry.getParameter(obj, 'drag_reactor', 'targetProperty');
                const sensitivity = registry.getParameter(obj, 'drag_reactor', 'sensitivity');

                if (targetName) {
                    // Try exact ID match first, then Name
                    let target = runtime.getObject(targetName) || runtime.findByName(targetName);

                    if (target) {
                        if (targetProp === 'rotation') {
                            // Convert linear delta to rotation (radians)
                            // Sensitivity 1 = 1 radian per 100px? Adjusted for usability.
                            target.rotation = (target.rotation || 0) + (delta * sensitivity * 0.05);
                        } else if (targetProp === 'x') {
                            target.x += delta * sensitivity;
                        } else if (targetProp === 'y') {
                            target.y += delta * sensitivity;
                        } else if (targetProp === 'scale') {
                            target.scale = (target.scale || 1) + (delta * sensitivity * 0.01);
                        } else if (targetProp === 'opacity') {
                            target.opacity = Math.max(0, Math.min(1, (target.opacity || 1) + (delta * sensitivity * 0.01)));
                        }
                    }
                }
            }
        }
    });

    // Impulse - Trigger a physics push via Action ID
    registry.register('impulse', {
        name: 'Physics Impulse',
        category: 'interaction',
        icon: '💥',
        description: 'Apply force on Action ID',
        parameters: {
            actionID: { type: 'text', default: 'push', label: 'Action ID' },
            direction: {
                type: 'select',
                default: 'custom',
                label: 'Direction',
                options: [
                    { val: 'custom', label: 'Custom (Manual X/Y)' },
                    { val: 'right', label: 'Right' },
                    { val: 'left', label: 'Left' },
                    { val: 'up', label: 'Up' },
                    { val: 'down', label: 'Down' }
                ]
            },
            strength: { type: 'number', default: 500, label: 'Strength' },
            forceX: { type: 'number', default: 500, label: 'Force X' },
            forceY: { type: 'number', default: 0, label: 'Force Y' },
            torque: { type: 'number', default: 0, label: 'Torque' }
        },
        update(obj, dt, runtime, registry) {
            const actionID = registry.getParameter(obj, 'impulse', 'actionID');
            if (runtime.lastAction === actionID && obj.physics) {
                if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };

                const direction = registry.getParameter(obj, 'impulse', 'direction') || 'custom';
                const strength = registry.getParameter(obj, 'impulse', 'strength') || 500;

                let fx = 0;
                let fy = 0;

                if (direction === 'custom') {
                    fx = registry.getParameter(obj, 'impulse', 'forceX') || 0;
                    fy = registry.getParameter(obj, 'impulse', 'forceY') || 0;
                } else if (direction === 'right') {
                    fx = strength;
                } else if (direction === 'left') {
                    fx = -strength;
                } else if (direction === 'up') {
                    fy = -strength;
                } else if (direction === 'down') {
                    fy = strength;
                }

                obj.physics.velocity.x += fx;
                obj.physics.velocity.y += fy;
                obj.physics.angularVelocity = (obj.physics.angularVelocity || 0) + (registry.getParameter(obj, 'impulse', 'torque') || 0) * 0.1;
            }
        }
    });

    // Shake Behavior - Now generic, relies on Engine activation
    registry.register('shake', {
        name: 'Shake',
        category: 'interaction',
        icon: '📳',
        description: 'Shake object (use Manual activation to trigger on Event)',
        parameters: {
            intensity: { type: 'slider', min: 1, max: 20, default: 5, label: 'Intensity' },
            duration: { type: 'slider', min: 0.1, max: 2, default: 0.5, label: 'Duration' }
        },
        init(obj) {
            obj._shakeTime = 0;
            obj._shakeActive = false;
            obj._shakeStarted = false;
        },
        update(obj, dt, runtime, registry) {
            const intensity = registry.getParameter(obj, 'shake', 'intensity');
            const duration = registry.getParameter(obj, 'shake', 'duration');
            const actMode = registry.getParameter(obj, 'shake', 'activationMode') || 'on_enter';

            // 1. Resolve Triggers
            if (obj._behaviorState && obj._behaviorState['shake']) {
                obj._shakeActive = true;
                obj._shakeTime = duration;
                obj._behaviorState['shake'] = false; // CONSUME
            }

            // 2. Handle Continuous/Special Modes
            if (actMode === 'manual') {
                const actId = registry.getParameter(obj, 'shake', 'activationId');
                // Check Global Action
                if (actId && runtime.lastAction === actId) {
                    obj._shakeActive = true;
                    obj._shakeTime = duration;
                }
            }

            if (actMode === 'on_hover' && obj.isHovered) {
                obj._shakeActive = true;
                obj._shakeTime = Math.max(obj._shakeTime || 0, 0.1); // Keep alive while hovered
            }

            if (actMode === 'on_enter' && !obj._shakeStarted) {
                obj._shakeActive = true;
                obj._shakeTime = duration;
                obj._shakeStarted = true;
            }

            // 3. Perform Shake
            if (obj._shakeActive && obj._shakeTime > 0) {
                obj._shakeTime -= dt;

                const factor = intensity * 200;
                const rx = (Math.random() - 0.5) * factor;
                const ry = (Math.random() - 0.5) * factor;

                if (obj.physics && obj.physics.enabled) {
                    if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
                    obj.physics.velocity.x += rx;
                    obj.physics.velocity.y += ry;
                } else {
                    // Manual position jitter if physics is disabled
                    if (!obj._shakeOrigX) {
                        obj._shakeOrigX = obj.x;
                        obj._shakeOrigY = obj.y;
                    }
                    obj.x = obj._shakeOrigX + (Math.random() - 0.5) * intensity * 5;
                    obj.y = obj._shakeOrigY + (Math.random() - 0.5) * intensity * 5;
                }

                if (obj._shakeTime <= 0) {
                    obj._shakeActive = false;
                    // Reset position if we were jittering manually
                    if (obj._shakeOrigX !== undefined) {
                        obj.x = obj._shakeOrigX;
                        obj.y = obj._shakeOrigY;
                        delete obj._shakeOrigX;
                        delete obj._shakeOrigY;
                    }
                }
            }
        }
    });

    // Tale Pop - Universal Narrative Message System
    registry.register('tale_pop', {
        name: 'Tale Pop',
        category: 'interactive',
        icon: '💬',
        description: 'Shows narrative messages with animations and choices',
        parameters: {
            message: { type: 'text', default: 'A new discovery!', label: 'Message' },
            title: { type: 'text', default: '', label: 'Title (Optional)' },
            position: { type: 'select', options: ['top', 'center', 'bottom'], default: 'center', label: 'Position' },
            animationType: { type: 'select', options: ['fade', 'slide', 'bounce', 'typewriter'], default: 'fade', label: 'Animation' },
            duration: { type: 'number', min: 0.1, max: 5, step: 0.1, default: 0.5, label: 'Animation Duration (s)' },
            autoClose: { type: 'checkbox', default: false, label: 'Auto Close' },
            closeDelay: { type: 'number', min: 1, max: 30, default: 5, label: 'Close Delay (s)' },
            showAvatar: { type: 'checkbox', default: false, label: 'Show Avatar' },
            avatarUrl: { type: 'text', default: '', label: 'Avatar URL' },
            characterName: { type: 'text', default: '', label: 'Character Name' },
            soundUrl: { type: 'text', default: '', label: 'Sound URL' },
            backgroundColor: { type: 'color', default: '#1a1a1a', label: 'Background Color' },
            textColor: { type: 'color', default: '#ffffff', label: 'Text Color' },
            fontSize: { type: 'number', min: 12, max: 32, default: 16, label: 'Font Size' },
            bubbleMode: { type: 'select', options: ['screen', 'anchored'], default: 'screen', label: 'Bubble Mode' },
            typewriterSound: { type: 'checkbox', default: false, label: 'Typewriter Sound' },
            voiceUrl: { type: 'text', default: '', label: 'Voice URL' },
            avatarSvg: { type: 'textarea', default: '', label: 'Avatar SVG (Raw)' },
            emotions: { type: 'text', default: '', label: 'Emotions (JSON)' },
            emotion: { type: 'text', default: '', label: 'Active Emotion' },
            enableChoices: { type: 'checkbox', default: false, label: 'Enable Choices' },
            choices: { type: 'text', default: '', label: 'Choices (JSON)' }
        },
        init(obj, runtime) {
            if (!obj._talePopSetup) {
                obj._talePopSetup = true;
                obj._talePopShown = false;
            }
        },
        update(obj, dt, runtime, registry) {
            if (!obj._talePopSetup) this.init(obj, runtime);

            const bId = 'tale_pop';
            const signal = obj._behaviorState && obj._behaviorState[bId];
            const triggered = obj._justClicked || (signal && !obj._talePopShown);

            if (triggered && !obj._talePopShown) {
                obj._talePopShown = true;
                if (signal) obj._behaviorState[bId] = false;

                // Get parameters
                const message = registry.getParameter(obj, bId, 'message') || 'A new discovery!';
                const title = registry.getParameter(obj, bId, 'title') || '';
                const position = registry.getParameter(obj, bId, 'position') || 'center';
                const animationType = registry.getParameter(obj, bId, 'animationType') || 'fade';
                const duration = registry.getParameter(obj, bId, 'duration') || 0.5;
                const autoClose = registry.getParameter(obj, bId, 'autoClose');
                const closeDelay = registry.getParameter(obj, bId, 'closeDelay') || 5;
                const showAvatar = registry.getParameter(obj, bId, 'showAvatar');
                const avatarUrl = registry.getParameter(obj, bId, 'avatarUrl') || '';
                const characterName = registry.getParameter(obj, bId, 'characterName') || '';
                const soundUrl = registry.getParameter(obj, bId, 'soundUrl') || '';
                const backgroundColor = registry.getParameter(obj, bId, 'backgroundColor') || '#1a1a1a';
                const textColor = registry.getParameter(obj, bId, 'textColor') || '#ffffff';
                const fontSize = registry.getParameter(obj, bId, 'fontSize') || 16;
                const enableChoices = registry.getParameter(obj, bId, 'enableChoices');
                const choicesStr = registry.getParameter(obj, bId, 'choices') || '';

                // Parse choices
                let choices = [];
                if (enableChoices && choicesStr) {
                    try {
                        choices = JSON.parse(choicesStr);
                    } catch (e) {
                        console.warn('[TalePop] Invalid choices JSON:', e);
                    }
                }

                // Show tale pop
                showTalePop({
                    message, title, position, animationType, duration,
                    autoClose, closeDelay, showAvatar, avatarUrl, characterName,
                    soundUrl, backgroundColor, textColor, fontSize,
                    enableChoices, choices, runtime
                });
            }
        }
    });

    // Progress Tracker - Universal Score/Progress System
    registry.register('progress_tracker', {
        name: 'Progress Tracker',
        category: 'interactive',
        icon: '📊',
        description: 'Track scores, health, XP, and other progress values',
        parameters: {
            trackerId: { type: 'text', default: 'score', label: 'Tracker ID' },
            amount: { type: 'number', default: 10, label: 'Amount' },
            operation: { type: 'select', options: ['add', 'subtract', 'set'], default: 'add', label: 'Operation' },
            showNotification: { type: 'checkbox', default: true, label: 'Show Notification' },
            notificationText: { type: 'text', default: '', label: 'Custom Text (Optional)' },
            tooltip: { type: 'text', default: '', label: 'Hover Tooltip (Bangla)' },
            notificationColor: { type: 'color', default: '#4CAF50', label: 'Notification Color' },
            playSound: { type: 'checkbox', default: false, label: 'Play Sound' },
            soundUrl: { type: 'text', default: '', label: 'Sound URL' },
            particleEffect: { type: 'checkbox', default: false, label: 'Spawn Particles' },
            particleColor: { type: 'color', default: '#FFD700', label: 'Particle Color' },
            updateUI: { type: 'checkbox', default: false, label: 'Update UI Element' },
            uiElementId: { type: 'text', default: '', label: 'UI Element ID' },
            saveToStorage: { type: 'checkbox', default: true, label: 'Save to localStorage' },
            maxValue: { type: 'number', default: 100, label: 'Max Value' },
            minValue: { type: 'number', default: 0, label: 'Min Value' }
        },
        init(obj, runtime) {
            if (!obj._trackerSetup) {
                obj._trackerSetup = true;
                // Initialize global tracker registry
                if (!window.OviTrackers) window.OviTrackers = {};
            }
        },
        update(obj, dt, runtime, registry) {
            if (!obj._trackerSetup) this.init(obj, runtime);

            const bId = 'progress_tracker';
            const signal = obj._behaviorState && obj._behaviorState[bId];
            const triggered = obj._justClicked || (signal && !obj._trackerTriggered);

            if (triggered) {
                obj._trackerTriggered = true;
                if (signal) obj._behaviorState[bId] = false;
                setTimeout(() => obj._trackerTriggered = false, 100);

                const trackerId = registry.getParameter(obj, bId, 'trackerId') || 'score';
                const amount = registry.getParameter(obj, bId, 'amount') || 10;
                const operation = registry.getParameter(obj, bId, 'operation') || 'add';
                const showNotification = registry.getParameter(obj, bId, 'showNotification');
                const notificationText = registry.getParameter(obj, bId, 'notificationText') || '';
                const notificationColor = registry.getParameter(obj, bId, 'notificationColor') || '#4CAF50';
                const playSound = registry.getParameter(obj, bId, 'playSound');
                const soundUrl = registry.getParameter(obj, bId, 'soundUrl') || '';
                const particleEffect = registry.getParameter(obj, bId, 'particleEffect');
                const particleColor = registry.getParameter(obj, bId, 'particleColor') || '#FFD700';
                const updateUI = registry.getParameter(obj, bId, 'updateUI');
                const uiElementId = registry.getParameter(obj, bId, 'uiElementId') || '';
                const saveToStorage = registry.getParameter(obj, bId, 'saveToStorage');
                const maxValue = registry.getParameter(obj, bId, 'maxValue') || 100;
                const minValue = registry.getParameter(obj, bId, 'minValue') || 0;

                // Update tracker value
                updateTracker({
                    trackerId, amount, operation, maxValue, minValue, saveToStorage,
                    showNotification, notificationText, notificationColor,
                    playSound, soundUrl, particleEffect, particleColor,
                    updateUI, uiElementId, obj, runtime
                });
            }
        }
    });

}

// Progress Tracker System
function updateTracker(config) {
    const { trackerId, amount, operation, maxValue, minValue, saveToStorage, showNotification, notificationText, notificationColor, playSound, soundUrl, particleEffect, particleColor, updateUI, uiElementId, obj, runtime } = config;

    // Initialize tracker if not exists
    if (!window.OviTrackers) window.OviTrackers = {};
    if (window.OviTrackers[trackerId] === undefined) {
        // Try to load from localStorage
        if (saveToStorage) {
            const saved = localStorage.getItem(`ovi_tracker_${trackerId}`);
            window.OviTrackers[trackerId] = saved ? parseFloat(saved) : 0;
        } else {
            window.OviTrackers[trackerId] = 0;
        }
    }

    const oldValue = window.OviTrackers[trackerId];
    let newValue = oldValue;

    // Perform operation
    if (operation === 'add') newValue = oldValue + amount;
    else if (operation === 'subtract') newValue = oldValue - amount;
    else if (operation === 'set') newValue = amount;

    // Clamp to min/max
    newValue = Math.max(minValue, Math.min(maxValue, newValue));
    window.OviTrackers[trackerId] = newValue;

    // Save to localStorage
    if (saveToStorage) {
        localStorage.setItem(`ovi_tracker_${trackerId}`, newValue.toString());
    }

    // Show notification
    if (showNotification) {
        const delta = newValue - oldValue;
        const text = notificationText || (delta >= 0 ? `+${delta}` : `${delta}`);
        showTrackerNotification(text, notificationColor, obj);
    }

    // Play sound
    if (playSound && soundUrl) {
        try { new Audio(soundUrl).play().catch(e => { }); } catch (e) { }
    }

    // Spawn particles
    if (particleEffect && obj) {
        spawnTrackerParticles(obj, particleColor, runtime);
    }

    // Update UI element
    if (updateUI && uiElementId) {
        const uiElement = document.getElementById(uiElementId);
        if (uiElement) {
            if (uiElement.tagName === 'PROGRESS' || uiElement.tagName === 'INPUT') {
                uiElement.value = newValue;
            } else {
                uiElement.textContent = Math.round(newValue).toString();
            }
        }
    }
}

function showTrackerNotification(text, color, obj) {
    if (!document.getElementById('ovi-tracker-styles')) {
        const style = document.createElement('style');
        style.id = 'ovi-tracker-styles';
        style.textContent = `
            .ovi-tracker-notification {
                position: fixed;
                font-size: 24px;
                font-weight: 700;
                pointer-events: none;
                z-index: 9999;
                animation: trackerFloat 1.5s ease-out forwards;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }
            @keyframes trackerFloat {
                0% { opacity: 1; transform: translateY(0) scale(0.8); }
                50% { opacity: 1; transform: translateY(-40px) scale(1.2); }
                100% { opacity: 0; transform: translateY(-80px) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    const notification = document.createElement('div');
    notification.className = 'ovi-tracker-notification';
    notification.textContent = text;
    notification.style.color = color;

    // Position at object location if available
    if (obj && obj.x !== undefined && obj.y !== undefined) {
        notification.style.left = `${obj.x}px`;
        notification.style.top = `${obj.y}px`;
    } else {
        notification.style.left = '50%';
        notification.style.top = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
    }

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 1500);
}

function spawnTrackerParticles(obj, color, runtime) {
    if (!runtime || !runtime.particles) return;

    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const speed = 2 + Math.random() * 3;
        runtime.particles.push({
            x: obj.x || 0,
            y: obj.y || 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            size: 4 + Math.random() * 4,
            color: color,
            gravity: 0.1
        });
    }
}

// Tale Pop DOM Rendering System
function showTalePop(config) {
    const {
        message, title, position, animationType, duration,
        autoClose, closeDelay, showAvatar, avatarUrl, characterName,
        soundUrl, backgroundColor, textColor, fontSize,
        enableChoices, choices, runtime
    } = config;

    // Inject styles if not already present
    if (!document.getElementById('ovi-talepop-styles')) {
        const style = document.createElement('style');
        style.id = 'ovi-talepop-styles';
        style.textContent = `
            .ovi-talepop-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                pointer-events: auto;
            }
            .ovi-talepop-overlay.position-top {
                align-items: flex-start;
                padding-top: 50px;
            }
            .ovi-talepop-overlay.position-bottom {
                align-items: flex-end;
                padding-bottom: 50px;
            }
            .ovi-talepop-box {
                max-width: 500px;
                width: 90%;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                opacity: 0;
                transform: scale(0.9);
            }
            .ovi-talepop-box.anim-fade {
                animation: taleFadeIn var(--duration) ease-out forwards;
            }
            .ovi-talepop-box.anim-slide {
                animation: taleSlideIn var(--duration) ease-out forwards;
            }
            .ovi-talepop-box.anim-bounce {
                animation: taleBounceIn var(--duration) cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
            }
            @keyframes taleFadeIn {
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes taleSlideIn {
                from { opacity: 0; transform: translateY(-30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes taleBounceIn {
                0% { opacity: 0; transform: scale(0.3); }
                50% { opacity: 1; transform: scale(1.05); }
                100% { opacity: 1; transform: scale(1); }
            }
            .ovi-talepop-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .ovi-talepop-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(255, 255, 255, 0.2);
            }
            .ovi-talepop-character {
                font-weight: 700;
                font-size: 14px;
                opacity: 0.8;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .ovi-talepop-title {
                font-size: 20px;
                font-weight: 700;
                margin-bottom: 12px;
            }
            .ovi-talepop-message {
                line-height: 1.6;
                margin-bottom: 16px;
            }
            .ovi-talepop-choices {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-top: 20px;
            }
            .ovi-talepop-choice-btn {
                flex: 1;
                min-width: 120px;
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                background: rgba(255, 255, 255, 0.1);
                color: inherit;
            }
            .ovi-talepop-choice-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            .ovi-talepop-close {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 32px;
                height: 32px;
                border: none;
                background: rgba(255, 255, 255, 0.1);
                color: inherit;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                transition: background 0.2s;
            }
            .ovi-talepop-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        `;
        document.head.appendChild(style);
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = `ovi-talepop-overlay position-${position}`;

    // Create box
    const box = document.createElement('div');
    box.className = `ovi-talepop-box anim-${animationType}`;
    box.style.cssText = `
        background: ${backgroundColor};
        color: ${textColor};
        font-size: ${fontSize}px;
        --duration: ${duration}s;
        position: relative;
    `;

    // Build content
    let html = '';

    // Header (Avatar + Character Name)
    if (showAvatar || characterName) {
        html += '<div class="ovi-talepop-header">';
        if (showAvatar && avatarUrl) {
            html += `<img src="${avatarUrl}" class="ovi-talepop-avatar" alt="Avatar">`;
        }
        if (characterName) {
            html += `<div class="ovi-talepop-character">${characterName}</div>`;
        }
        html += '</div>';
    }

    // Title
    if (title) {
        html += `<div class="ovi-talepop-title">${title}</div>`;
    }

    // Message
    if (animationType === 'typewriter') {
        html += `<div class="ovi-talepop-message" data-typewriter="${message}"></div>`;
    } else {
        html += `<div class="ovi-talepop-message">${message}</div>`;
    }

    // Choices
    if (enableChoices && choices.length > 0) {
        html += '<div class="ovi-talepop-choices">';
        choices.forEach((choice, index) => {
            html += `<button class="ovi-talepop-choice-btn" data-choice-index="${index}">${choice.text || `Choice ${index + 1}`}</button>`;
        });
        html += '</div>';
    }

    // Close button
    html += '<button class="ovi-talepop-close">×</button>';

    box.innerHTML = html;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Play sound
    if (soundUrl) {
        try {
            const audio = new Audio(soundUrl);
            audio.play().catch(e => console.warn('[TalePop] Sound play failed:', e));
        } catch (e) {
            console.warn('[TalePop] Sound error:', e);
        }
    }

    // Typewriter effect
    if (animationType === 'typewriter') {
        const messageEl = box.querySelector('.ovi-talepop-message');
        const text = messageEl.getAttribute('data-typewriter');
        messageEl.textContent = '';
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                messageEl.textContent += text[i];
                i++;
            } else {
                clearInterval(typeInterval);
            }
        }, 50);
    }

    // Close handler
    const closePopup = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };

    box.querySelector('.ovi-talepop-close').onclick = closePopup;
    overlay.onclick = (e) => {
        if (e.target === overlay) closePopup();
    };

    // Choice handlers
    if (enableChoices) {
        box.querySelectorAll('.ovi-talepop-choice-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.getAttribute('data-choice-index'));
                const choice = choices[index];
                if (choice && choice.actionId && runtime) {
                    runtime.emitAction(choice.actionId);
                }
                closePopup();
            };
        });
    }

    // Auto close
    if (autoClose) {
        setTimeout(closePopup, closeDelay * 1000);
    }
}

