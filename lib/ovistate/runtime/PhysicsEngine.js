/**
 * PhysicsEngine - Lightweight physics simulation
 * Designed to be embeddable in HTML5 exports
 */
export default class PhysicsEngine {
    constructor(config = {}) {
        this.gravity = config.gravity !== undefined ? config.gravity : 9.8;
        this.gravityX = config.gravityX !== undefined ? config.gravityX : 0; // Wind
        this.friction = config.friction !== undefined ? config.friction : 0.1;
        this.timeScale = config.timeScale !== undefined ? config.timeScale : 1;

        // Global option: Override object bounciness if set to a global value?
        // Or just a default. Let's make it a default base property.
        this.wallBounciness = config.wallBounciness !== undefined ? config.wallBounciness : 0.8;

        this.bounds = config.bounds || { width: 800, height: 600 };
    }

    update(objects, dt) {
        // Apply Time Scale
        const timeScaledDt = dt * this.timeScale;

        objects.forEach(obj => {
            if (!obj.physics || !obj.physics.enabled) return;

            // Initialize physics properties if missing
            if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
            if (obj.physics.mass === undefined) obj.physics.mass = 1;

            // Apply gravity (Y)
            obj.physics.velocity.y += this.gravity * timeScaledDt;

            // Apply Wind (Gravity X)
            obj.physics.velocity.x += this.gravityX * timeScaledDt;

            // Apply friction
            obj.physics.velocity.x *= (1 - this.friction * timeScaledDt);
            obj.physics.velocity.y *= (1 - this.friction * timeScaledDt);

            // Update position
            obj.x += obj.physics.velocity.x * timeScaledDt;
            obj.y += obj.physics.velocity.y * timeScaledDt;

            // Collision with bounds
            this.checkBoundsCollision(obj);
        });

        // Object-to-object collisions
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                if (objects[i].physics?.enabled && objects[j].physics?.enabled) {
                    this.checkObjectCollision(objects[i], objects[j]);
                }
            }
        }
    }

    checkBoundsCollision(obj) {
        // Use global wall bounciness if not overridden by object
        const bounciness = obj.physics.bounciness !== undefined ? obj.physics.bounciness : this.wallBounciness;

        // Get object bounds based on type
        let radius = 0;
        if (obj.type === 'circle') {
            radius = obj.radius || 20;
        } else if (obj.type === 'rect') {
            radius = Math.max(obj.width || 50, obj.height || 50) / 2;
        } else if (obj.type === 'symbol') {
            radius = (obj.size || 48) / 2;
        }

        // Floor collision
        if (obj.y + radius > this.bounds.height) {
            obj.y = this.bounds.height - radius;
            obj.physics.velocity.y *= -bounciness;

            // Stop bouncing if velocity is too small
            if (Math.abs(obj.physics.velocity.y) < 0.5) {
                obj.physics.velocity.y = 0;
            }
        }

        // Ceiling collision
        if (obj.y - radius < 0) {
            obj.y = radius;
            obj.physics.velocity.y *= -bounciness;
        }

        // Right wall collision
        if (obj.x + radius > this.bounds.width) {
            obj.x = this.bounds.width - radius;
            obj.physics.velocity.x *= -bounciness;
        }

        // Left wall collision
        if (obj.x - radius < 0) {
            obj.x = radius;
            obj.physics.velocity.x *= -bounciness;
        }
    }

    checkObjectCollision(obj1, obj2) {
        // Simple circle-circle collision
        if (obj1.type === 'circle' && obj2.type === 'circle') {
            const r1 = obj1.radius || 20;
            const r2 = obj2.radius || 20;
            const dx = obj2.x - obj1.x;
            const dy = obj2.y - obj1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < r1 + r2) {
                // Collision detected
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                // Separate objects
                const overlap = (r1 + r2) - distance;
                obj1.x -= overlap * cos / 2;
                obj1.y -= overlap * sin / 2;
                obj2.x += overlap * cos / 2;
                obj2.y += overlap * sin / 2;

                // Exchange velocities (simplified elastic collision)
                const v1 = obj1.physics.velocity;
                const v2 = obj2.physics.velocity;
                const temp = { x: v1.x, y: v1.y };
                v1.x = v2.x;
                v1.y = v2.y;
                v2.x = temp.x;
                v2.y = temp.y;
            }
        }
    }

    setGravity(value) { this.gravity = value; }
    setFriction(value) { this.friction = value; }
}
