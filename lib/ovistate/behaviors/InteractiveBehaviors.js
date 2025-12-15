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
}
