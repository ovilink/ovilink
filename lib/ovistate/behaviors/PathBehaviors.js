/**
 * Path Behaviors
 * Behaviors that follow predefined paths
 */

export function registerPathBehaviors(registry) {

    // Figure Eight - Figure-8 pattern
    registry.register('figure_eight', {
        name: 'Figure Eight',
        category: 'path',
        icon: '∞',
        description: 'Follow figure-8 pattern',
        parameters: {
            width: { type: 'slider', min: 10, max: 200, default: 100, label: 'Width' },
            height: { type: 'slider', min: 10, max: 200, default: 80, label: 'Height' },
            speed: { type: 'slider', min: 0, max: 5, default: 1, label: 'Speed' },
            centerX: { type: 'number', default: 400, label: 'Center X' },
            centerY: { type: 'number', default: 300, label: 'Center Y' }
        },
        init(obj) {
            if (!obj._figureTime) obj._figureTime = 0;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._figureTime) this.init(obj);

            const width = registry.getParameter(obj, 'figure_eight', 'width');
            const height = registry.getParameter(obj, 'figure_eight', 'height');
            const speed = registry.getParameter(obj, 'figure_eight', 'speed');
            const centerX = registry.getParameter(obj, 'figure_eight', 'centerX');
            const centerY = registry.getParameter(obj, 'figure_eight', 'centerY');

            obj._figureTime += dt * speed;
            const t = obj._figureTime;

            obj.x = centerX + width * Math.sin(t);
            obj.y = centerY + height * Math.sin(t) * Math.cos(t);
        }
    });

    // Circle Path - Circular motion
    registry.register('circle_path', {
        name: 'Circle Path',
        category: 'path',
        icon: '⭕',
        description: 'Follow circular path',
        parameters: {
            radius: { type: 'slider', min: 10, max: 300, default: 100, label: 'Radius' },
            speed: { type: 'slider', min: -5, max: 5, default: 1, label: 'Speed' },
            centerX: { type: 'number', default: 400, label: 'Center X' },
            centerY: { type: 'number', default: 300, label: 'Center Y' }
        },
        init(obj) {
            if (!obj._circleAngle) obj._circleAngle = 0;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._circleAngle) this.init(obj);

            const radius = registry.getParameter(obj, 'circle_path', 'radius');
            const speed = registry.getParameter(obj, 'circle_path', 'speed');
            const centerX = registry.getParameter(obj, 'circle_path', 'centerX');
            const centerY = registry.getParameter(obj, 'circle_path', 'centerY');

            obj._circleAngle += dt * speed;
            obj.x = centerX + Math.cos(obj._circleAngle) * radius;
            obj.y = centerY + Math.sin(obj._circleAngle) * radius;
        }
    });

    // Random Walk - Random wandering
    registry.register('random_walk', {
        name: 'Random Walk',
        category: 'path',
        icon: '🎲',
        description: 'Random wandering movement',
        parameters: {
            stepSize: { type: 'slider', min: 0, max: 20, default: 5, label: 'Step Size' },
            changeFrequency: { type: 'slider', min: 0, max: 10, default: 2, label: 'Change Frequency' }
        },
        init(obj) {
            if (!obj._walkDirection) {
                obj._walkDirection = Math.random() * Math.PI * 2;
                obj._walkTimer = 0;
            }
        },
        update(obj, dt, runtime, registry) {
            if (!obj._walkDirection) this.init(obj);

            const stepSize = registry.getParameter(obj, 'random_walk', 'stepSize');
            const changeFrequency = registry.getParameter(obj, 'random_walk', 'changeFrequency');

            obj._walkTimer += dt * changeFrequency;

            if (obj._walkTimer > 1) {
                obj._walkDirection += (Math.random() - 0.5) * Math.PI / 2;
                obj._walkTimer = 0;
            }

            obj.x += Math.cos(obj._walkDirection) * stepSize * dt;
            obj.y += Math.sin(obj._walkDirection) * stepSize * dt;

            // Keep in bounds
            if (obj.x < 0 || obj.x > runtime.width) obj._walkDirection = Math.PI - obj._walkDirection;
            if (obj.y < 0 || obj.y > runtime.height) obj._walkDirection = -obj._walkDirection;
        }
    });

    // Bounce Path - Diagonal bouncing
    registry.register('bounce_path', {
        name: 'Bounce Path',
        category: 'path',
        icon: '⚡',
        description: 'Diagonal bouncing movement',
        parameters: {
            speedX: { type: 'slider', min: -200, max: 200, default: 100, label: 'Speed X' },
            speedY: { type: 'slider', min: -200, max: 200, default: 80, label: 'Speed Y' }
        },
        init(obj) {
            if (!obj._bounceVelX) {
                obj._bounceVelX = 100;
                obj._bounceVelY = 80;
            }
        },
        update(obj, dt, runtime, registry) {
            if (!obj._bounceVelX) this.init(obj);

            const speedX = registry.getParameter(obj, 'bounce_path', 'speedX');
            const speedY = registry.getParameter(obj, 'bounce_path', 'speedY');

            obj.x += speedX * dt;
            obj.y += speedY * dt;

            // Bounce off edges
            const radius = obj.radius || 30;
            if (obj.x - radius < 0 || obj.x + radius > runtime.width) {
                obj._bounceVelX *= -1;
                obj.x = Math.max(radius, Math.min(runtime.width - radius, obj.x));
            }
            if (obj.y - radius < 0 || obj.y + radius > runtime.height) {
                obj._bounceVelY *= -1;
                obj.y = Math.max(radius, Math.min(runtime.height - radius, obj.y));
            }
        }
    });
}
