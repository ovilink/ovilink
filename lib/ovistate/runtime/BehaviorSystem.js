/**
 * Behavior System
 * Pre-built behaviors that can be attached to objects
 */

import BehaviorRegistry from '../behaviors/BehaviorRegistry.js';
import { registerMotionBehaviors } from '../behaviors/MotionBehaviors.js';
import { registerTransformBehaviors } from '../behaviors/TransformBehaviors.js';
import { registerInteractiveBehaviors } from '../behaviors/InteractiveBehaviors.js';
import { registerPathBehaviors } from '../behaviors/PathBehaviors.js';
import { registerTextBehaviors } from '../behaviors/TextBehaviors.js';

export default class BehaviorSystem {
    constructor(runtime) {
        this.runtime = runtime;
        this.registry = new BehaviorRegistry();
        this.behaviors = new Map(); // Legacy support

        // Register all behaviors
        this.registerAllBehaviors();
        this.registerDefaultBehaviors(); // Keep old behaviors for compatibility
    }

    registerAllBehaviors() {
        registerMotionBehaviors(this.registry);
        registerTransformBehaviors(this.registry);
        registerInteractiveBehaviors(this.registry);
        registerPathBehaviors(this.registry);
        registerTextBehaviors(this.registry);

        console.log(`✅ Registered ${this.registry.getAll().length} behaviors`);
    }

    registerDefaultBehaviors() {
        // Follow Mouse
        this.register('follow_mouse', {
            name: 'Follow Mouse',
            update(obj, dt, runtime) {
                if (!runtime.mouseX || !runtime.mouseY) return;

                const speed = 200; // pixels per second
                const dx = runtime.mouseX - obj.x;
                const dy = runtime.mouseY - obj.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 5) {
                    obj.x += (dx / distance) * speed * dt;
                    obj.y += (dy / distance) * speed * dt;
                }
            }
        });

        // Orbit Around Center
        this.register('orbit', {
            name: 'Orbit Around',
            init(obj, runtime) {
                if (!obj._orbitAngle) {
                    obj._orbitAngle = 0;
                    obj._orbitRadius = 100;
                    obj._orbitCenterX = runtime.width / 2;
                    obj._orbitCenterY = runtime.height / 2;
                }
            },
            update(obj, dt, runtime) {
                if (!obj._orbitAngle) this.init(obj, runtime);

                obj._orbitAngle += 2 * dt; // 2 radians per second
                obj.x = obj._orbitCenterX + Math.cos(obj._orbitAngle) * obj._orbitRadius;
                obj.y = obj._orbitCenterY + Math.sin(obj._orbitAngle) * obj._orbitRadius;
            }
        });

        // Bounce (Enhanced physics bounce)
        this.register('bounce', {
            name: 'Bounce',
            update(obj, dt, runtime) {
                if (!obj.physics || !obj.physics.enabled) return;

                // Enhanced bounce with energy
                const bounds = runtime.physics?.bounds || { width: runtime.width, height: runtime.height };

                if (obj.type === 'circle') {
                    // Bottom
                    if (obj.y + obj.radius >= bounds.height) {
                        obj.y = bounds.height - obj.radius;
                        obj.physics.velocity.y *= -(obj.physics.bounciness || 0.9);
                    }
                    // Top
                    if (obj.y - obj.radius <= 0) {
                        obj.y = obj.radius;
                        obj.physics.velocity.y *= -(obj.physics.bounciness || 0.9);
                    }
                    // Right
                    if (obj.x + obj.radius >= bounds.width) {
                        obj.x = bounds.width - obj.radius;
                        obj.physics.velocity.x *= -(obj.physics.bounciness || 0.9);
                    }
                    // Left
                    if (obj.x - obj.radius <= 0) {
                        obj.x = obj.radius;
                        obj.physics.velocity.x *= -(obj.physics.bounciness || 0.9);
                    }
                }
            }
        });

        // Pulse Effect
        this.register('pulse', {
            name: 'Pulse',
            init(obj) {
                if (!obj._pulseTime) {
                    obj._pulseTime = 0;
                    obj._originalRadius = obj.radius || 30;
                    obj._originalWidth = obj.width || 60;
                    obj._originalHeight = obj.height || 60;
                }
            },
            update(obj, dt) {
                if (!obj._pulseTime) this.init(obj);

                obj._pulseTime += dt;
                const scale = 1 + Math.sin(obj._pulseTime * 3) * 0.2; // Pulse 3 times per second

                if (obj.type === 'circle') {
                    obj.radius = obj._originalRadius * scale;
                } else if (obj.type === 'rect') {
                    obj.width = obj._originalWidth * scale;
                    obj.height = obj._originalHeight * scale;
                }
            }
        });

        // Fade In/Out
        this.register('fade', {
            name: 'Fade In/Out',
            init(obj) {
                if (!obj._fadeTime) {
                    obj._fadeTime = 0;
                    obj._fadeDirection = 1;
                }
            },
            update(obj, dt) {
                if (!obj._fadeTime) this.init(obj);

                obj._fadeTime += dt * obj._fadeDirection;

                if (obj._fadeTime >= 1) {
                    obj._fadeTime = 1;
                    obj._fadeDirection = -1;
                } else if (obj._fadeTime <= 0) {
                    obj._fadeTime = 0;
                    obj._fadeDirection = 1;
                }

                // Update opacity (will need to be handled in render)
                obj.opacity = obj._fadeTime;
            }
        });
    }

    register(id, behavior) {
        this.behaviors.set(id, behavior);
    }

    execute(obj, dt) {
        if (!obj.behaviors || obj.behaviors.length === 0) return;

        obj.behaviors.forEach(behaviorId => {
            // Try registry first (new behaviors)
            const registryBehavior = this.registry.get(behaviorId);
            if (registryBehavior && registryBehavior.update) {
                // --- ACTIVATION LOGIC ---
                const actMode = this.registry.getParameter(obj, behaviorId, 'activationMode') || 'on_enter';
                const actId = this.registry.getParameter(obj, behaviorId, 'activationId');

                // Initialize State Map
                if (!obj._behaviorState) obj._behaviorState = {};
                if (obj._behaviorState[behaviorId] === undefined) {
                    obj._behaviorState[behaviorId] = (actMode === 'on_enter');
                }

                let shouldRun = false;

                if (actMode === 'on_enter') {
                    shouldRun = true;
                } else if (actMode === 'on_hover') {
                    shouldRun = obj.isHovered;
                } else if (actMode === 'on_click') {
                    if (obj._justClicked) obj._behaviorState[behaviorId] = true;
                    shouldRun = obj._behaviorState[behaviorId];
                } else if (actMode === 'on_click_toggle') {
                    if (obj._justClicked) {
                        obj._behaviorState[behaviorId] = !obj._behaviorState[behaviorId];
                        // Reset behaviors on toggle OFF? Optional.
                        // if (!obj._behaviorState[behaviorId] && registryBehavior.reset) registryBehavior.reset(obj);
                    }
                    shouldRun = obj._behaviorState[behaviorId];
                } else if (actMode === 'manual') {
                    // Manual is controlled by events setting the state
                    shouldRun = obj._behaviorState[behaviorId];
                }

                if (shouldRun) {
                    registryBehavior.update(obj, dt, this.runtime, this.registry);
                } else {
                    // Special handling for typewriter in manual mode - clear text when not running
                    if (behaviorId === 'typewriter' && actMode === 'manual' && obj.type === 'text') {
                        // Preserve original text for export if not already stored
                        if (!obj._lastFullText && obj.text && obj.text.trim()) {
                            obj._lastFullText = obj.text;
                        }
                        obj.text = '';
                    }
                }
                return;
            }

            // Fall back to legacy behaviors
            const behavior = this.behaviors.get(behaviorId);
            if (behavior && behavior.update) {
                behavior.update(obj, dt, this.runtime);
            }
        });
    }

    addBehaviorTo(obj, behaviorId) {
        if (!obj.behaviors) obj.behaviors = [];
        if (!obj.behaviors.includes(behaviorId)) {
            obj.behaviors.push(behaviorId);
            console.log(`✅ BehaviorSystem: Added '${behaviorId}' to object '${obj.id}'`);

            // Trigger init immediately if possible
            const registryBehavior = this.registry.get(behaviorId);
            if (registryBehavior && registryBehavior.init) {
                try {
                    registryBehavior.init(obj, this.runtime, this.registry);
                } catch (e) {
                    console.error("Error initializing behavior:", e);
                }
            }
        } else {
            console.log(`⚠️ BehaviorSystem: Object '${obj.id}' already has '${behaviorId}'`);
        }
    }

    removeBehavior(obj, behaviorId) {
        if (!obj.behaviors) return;

        const index = obj.behaviors.indexOf(behaviorId);
        if (index > -1) {
            obj.behaviors.splice(index, 1);
            console.log(`✅ BehaviorSystem: Removed '${behaviorId}' from object '${obj.id}'`);

            // Clean up any private state if possible (optional)
            // e.g. delete obj._pulseTime;
        }
    }

    executeAll(objects, dt) {
        objects.forEach(obj => this.execute(obj, dt));
    }

    /**
     * Get all available behaviors (registry + legacy)
     */
    getAllBehaviors() {
        return this.registry.getAll();
    }

    /**
     * Get behaviors by category
     */
    getBehaviorsByCategory(category) {
        return this.registry.getByCategory(category);
    }

    getEmbeddableCode() {
        // Return the entire BehaviorSystem class as a string for embedding
        return this.constructor.toString().replace(/^export default /, '');
    }
}
