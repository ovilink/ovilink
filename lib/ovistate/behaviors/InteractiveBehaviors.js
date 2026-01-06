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

}

