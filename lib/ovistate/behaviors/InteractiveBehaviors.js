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
            intensity: { type: 'slider', min: 0, max: 10, default: 5, label: 'Intensity' }
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

            if (obj._clickActive) {
                obj._clickTime += dt;
                const intensity = registry.getParameter(obj, 'click_response', 'intensity');
                const action = registry.getParameter(obj, 'click_response', 'action');

                if (action === 'bounce') {
                    obj.y -= Math.sin(obj._clickTime * 10) * intensity;
                } else if (action === 'grow') {
                    const scale = 1 + Math.sin(obj._clickTime * 5) * 0.2;
                    if (obj.type === 'circle') obj.radius = (obj._originalRadius || 30) * scale;
                }

                if (obj._clickTime > 1) {
                    obj._clickActive = false;
                    obj._clickTime = 0;
                }
            }
        }
    });

    // Hover Grow - Grow on hover
    registry.register('hover_grow', {
        name: 'Hover Grow',
        category: 'interactive',
        icon: '🔍',
        description: 'Grow when mouse hovers',
        parameters: {
            scale: { type: 'slider', min: 1, max: 3, default: 1.5, label: 'Hover Scale' },
            speed: { type: 'slider', min: 0, max: 10, default: 5, label: 'Transition Speed' }
        },
        init(obj) {
            if (!obj._hoverScale) obj._hoverScale = 1;
            if (!obj._originalRadius) obj._originalRadius = obj.radius || 30;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._hoverScale) this.init(obj);

            const targetScale = registry.getParameter(obj, 'hover_grow', 'scale');
            const speed = registry.getParameter(obj, 'hover_grow', 'speed');

            // Check if mouse is over object
            const dx = (runtime.mouseX || 0) - obj.x;
            const dy = (runtime.mouseY || 0) - obj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const isHovering = distance < (obj.radius || 30);

            const target = isHovering ? targetScale : 1;
            obj._hoverScale += (target - obj._hoverScale) * speed * dt;

            if (obj.type === 'circle') {
                obj.radius = obj._originalRadius * obj._hoverScale;
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

    // Follow Mouse (Enhanced)
    registry.register('follow_mouse_smooth', {
        name: 'Follow Mouse (Smooth)',
        category: 'interactive',
        icon: '🖱️',
        description: 'Smoothly follow mouse cursor',
        parameters: {
            speed: { type: 'slider', min: 0, max: 2, default: 1, label: 'Follow Speed' },
            smoothness: { type: 'slider', min: 0, max: 0.5, default: 0.2, label: 'Smoothness' }
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX || !runtime.mouseY) return;

            const speed = registry.getParameter(obj, 'follow_mouse_smooth', 'speed');
            const smoothness = registry.getParameter(obj, 'follow_mouse_smooth', 'smoothness');

            const dx = runtime.mouseX - obj.x;
            const dy = runtime.mouseY - obj.y;

            // Use clamped lerp to prevent over-shooting
            const lerpFactor = Math.min(smoothness * speed * dt, 1.0);
            obj.x += dx * lerpFactor;
            obj.y += dy * lerpFactor;
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
            activationMode: { type: 'select', options: ['on_enter'], default: 'on_enter', label: 'Mode' }
        },
        update(obj, dt, runtime, registry) {
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
    registry.register('look_at', {
        name: 'Look At',
        category: 'interactive',
        icon: '👀',
        description: 'Rotate to face mouse',
        parameters: {
            speed: { type: 'slider', min: 0.1, max: 20, default: 10, label: 'Speed' },
            offset: { type: 'slider', min: -180, max: 180, default: 0, label: 'Angle Offset' }
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX) return;

            const speed = registry.getParameter(obj, 'look_at', 'speed');
            const offset = registry.getParameter(obj, 'look_at', 'offset');

            const dx = runtime.mouseX - obj.x;
            const dy = runtime.mouseY - obj.y;
            const targetAngle = Math.atan2(dy, dx) + (offset * Math.PI / 180);

            // Lerp angle
            let currentAngle = obj.rotation || 0;
            // Shortest path interpolation
            let diff = targetAngle - currentAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            obj.rotation = currentAngle + diff * speed * dt;
        }
    });

    // Spring Follow - Elastic follow
    registry.register('spring_follow', {
        name: 'Spring Follow',
        category: 'interactive',
        icon: '🪀',
        description: 'Elastic mouse follow',
        parameters: {
            stiffness: { type: 'slider', min: 1, max: 20, default: 5, label: 'Stiffness' },
            damping: { type: 'slider', min: 0.1, max: 1, default: 0.8, label: 'Damping' }
        },
        init(obj) {
            if (!obj._springVel) obj._springVel = { x: 0, y: 0 };
        },
        update(obj, dt, runtime, registry) {
            if (!runtime.mouseX) return;
            if (!obj._springVel) this.init(obj);

            const stiffness = registry.getParameter(obj, 'spring_follow', 'stiffness');
            const damping = registry.getParameter(obj, 'spring_follow', 'damping');

            const dx = runtime.mouseX - obj.x;
            const dy = runtime.mouseY - obj.y;

            // F = -kx (Spring Force)
            const ax = dx * stiffness;
            const ay = dy * stiffness;

            obj._springVel.x += ax * dt;
            obj._springVel.y += ay * dt;

            // Damping
            obj._springVel.x *= Math.pow(damping, dt * 60); // Time-corrected damping estimate
            obj._springVel.y *= Math.pow(damping, dt * 60);

            obj.x += obj._springVel.x * dt;
            obj.y += obj._springVel.y * dt;
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
            if (obj.isHovered && runtime.isMouseDown && !obj._isDragging && !runtime._draggingObj) {
                obj._isDragging = true;
                runtime._draggingObj = obj; // Lock global drag
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

}
