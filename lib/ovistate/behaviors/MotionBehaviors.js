/**
 * Motion Behaviors
 * Behaviors that control object movement patterns
 */

export function registerMotionBehaviors(registry) {

    // Wiggle - Random jittery movement
    registry.register('wiggle', {
        name: 'Wiggle',
        category: 'motion',
        icon: '〰️',
        description: 'Random jittery movement',
        parameters: {
            intensity: { type: 'slider', min: 0, max: 10, default: 2, label: 'Intensity' },
            speed: { type: 'slider', min: 0, max: 5, default: 1, label: 'Speed' }
        },
        update(obj, dt, runtime, registry) {
            const intensity = registry.getParameter(obj, 'wiggle', 'intensity');
            const speed = registry.getParameter(obj, 'wiggle', 'speed');

            obj.x += (Math.random() - 0.5) * intensity * speed;
            obj.y += (Math.random() - 0.5) * intensity * speed;
        }
    });

    // Shake - Earthquake effect
    registry.register('shake', {
        name: 'Shake',
        category: 'motion',
        icon: '📳',
        description: 'Earthquake shaking effect',
        parameters: {
            amplitude: { type: 'slider', min: 0, max: 20, default: 5, label: 'Amplitude' },
            frequency: { type: 'slider', min: 0, max: 10, default: 5, label: 'Frequency' }
        },
        init(obj) {
            if (!obj._shakeTime) obj._shakeTime = 0;
            if (!obj._shakeOriginX) obj._shakeOriginX = obj.x;
            if (!obj._shakeOriginY) obj._shakeOriginY = obj.y;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._shakeTime) this.init(obj);

            const amplitude = registry.getParameter(obj, 'shake', 'amplitude');
            const frequency = registry.getParameter(obj, 'shake', 'frequency');

            obj._shakeTime += dt * frequency;
            obj.x = obj._shakeOriginX + Math.sin(obj._shakeTime * 10) * amplitude;
            obj.y = obj._shakeOriginY + Math.cos(obj._shakeTime * 7) * amplitude;
        }
    });

    // Float - Smooth up/down floating
    registry.register('float', {
        name: 'Float',
        category: 'motion',
        icon: '☁️',
        description: 'Smooth floating motion',
        parameters: {
            height: { type: 'slider', min: 0, max: 100, default: 30, label: 'Float Height' },
            speed: { type: 'slider', min: 0, max: 5, default: 1, label: 'Speed' }
        },
        init(obj) {
            if (!obj._floatTime) obj._floatTime = 0;
            if (!obj._floatOriginY) obj._floatOriginY = obj.y;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._floatTime) this.init(obj);

            const height = registry.getParameter(obj, 'float', 'height');
            const speed = registry.getParameter(obj, 'float', 'speed');

            obj._floatTime += dt * speed;
            obj.y = obj._floatOriginY + Math.sin(obj._floatTime) * height;
        }
    });

    // Spiral - Spiral motion pattern
    registry.register('spiral', {
        name: 'Spiral',
        category: 'motion',
        icon: '🌀',
        description: 'Spiral motion outward or inward',
        parameters: {
            speed: { type: 'slider', min: 0, max: 5, default: 1, label: 'Speed' },
            expansion: { type: 'slider', min: -2, max: 2, default: 0.5, label: 'Expansion' },
            centerX: { type: 'number', default: 400, label: 'Center X' },
            centerY: { type: 'number', default: 300, label: 'Center Y' }
        },
        init(obj, runtime, registry) {
            if (!obj._spiralAngle) obj._spiralAngle = 0;
            if (!obj._spiralRadius) obj._spiralRadius = 50;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._spiralAngle) this.init(obj, runtime, registry);

            const speed = registry.getParameter(obj, 'spiral', 'speed');
            const expansion = registry.getParameter(obj, 'spiral', 'expansion');
            const centerX = registry.getParameter(obj, 'spiral', 'centerX');
            const centerY = registry.getParameter(obj, 'spiral', 'centerY');

            obj._spiralAngle += dt * speed;
            obj._spiralRadius += expansion * dt * 10;

            obj.x = centerX + Math.cos(obj._spiralAngle) * obj._spiralRadius;
            obj.y = centerY + Math.sin(obj._spiralAngle) * obj._spiralRadius;
        }
    });

    // Zigzag - Zigzag movement
    registry.register('zigzag', {
        name: 'Zigzag',
        category: 'motion',
        icon: '⚡',
        description: 'Zigzag movement pattern',
        parameters: {
            amplitude: { type: 'slider', min: 0, max: 100, default: 40, label: 'Amplitude' },
            frequency: { type: 'slider', min: 0, max: 10, default: 3, label: 'Frequency' },
            direction: { type: 'select', options: ['horizontal', 'vertical'], default: 'horizontal', label: 'Direction' }
        },
        init(obj) {
            if (!obj._zigzagTime) obj._zigzagTime = 0;
            if (!obj._zigzagOrigin) obj._zigzagOrigin = { x: obj.x, y: obj.y };
        },
        update(obj, dt, runtime, registry) {
            if (!obj._zigzagTime) this.init(obj);

            const amplitude = registry.getParameter(obj, 'zigzag', 'amplitude');
            const frequency = registry.getParameter(obj, 'zigzag', 'frequency');
            const direction = registry.getParameter(obj, 'zigzag', 'direction');

            obj._zigzagTime += dt * frequency;
            const offset = Math.sin(obj._zigzagTime * Math.PI) * amplitude;

            if (direction === 'horizontal') {
                obj.y = obj._zigzagOrigin.y + offset;
                obj.x += dt * 50; // Move forward
            } else {
                obj.x = obj._zigzagOrigin.x + offset;
                obj.y += dt * 50;
            }
        }
    });

    // Wave Motion - Sine wave path
    registry.register('wave_motion', {
        name: 'Wave Motion',
        category: 'motion',
        icon: '🌊',
        description: 'Follow a sine wave path',
        parameters: {
            amplitude: { type: 'slider', min: 0, max: 100, default: 50, label: 'Wave Height' },
            wavelength: { type: 'slider', min: 10, max: 200, default: 100, label: 'Wavelength' },
            speed: { type: 'slider', min: 0, max: 5, default: 1, label: 'Speed' }
        },
        init(obj) {
            if (!obj._waveTime) obj._waveTime = 0;
            if (!obj._waveOriginY) obj._waveOriginY = obj.y;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._waveTime) this.init(obj);

            const amplitude = registry.getParameter(obj, 'wave_motion', 'amplitude');
            const wavelength = registry.getParameter(obj, 'wave_motion', 'wavelength');
            const speed = registry.getParameter(obj, 'wave_motion', 'speed');

            obj._waveTime += dt * speed;
            obj.x += dt * 30; // Move forward
            obj.y = obj._waveOriginY + Math.sin((obj.x / wavelength) * Math.PI * 2) * amplitude;
        }
    });


    // Bounce - Physics bounds bouncing
    registry.register('bounce', {
        name: 'Bounce',
        category: 'motion',
        icon: '🏀',
        description: 'Bounce off container edges (requires physics)',
        parameters: {
            bounciness: { type: 'slider', min: 0, max: 1.5, default: 0.8, label: 'Bounciness' },
            friction: { type: 'slider', min: 0, max: 1, default: 0.1, label: 'Friction' }
        },
        update(obj, dt, runtime, registry) {
            // Ensure physics is enabled for this behavior to work effectively
            if (!obj.physics) obj.physics = { enabled: true, velocity: { x: 0, y: 0 } };
            obj.physics.enabled = true;

            const bounciness = registry.getParameter(obj, 'bounce', 'bounciness');
            // Update physical property if changed
            obj.physics.bounciness = bounciness;

            // Bounds collision handled by PhysicsEngine usually, 
            // but we can enforce strict bounds here if PhysicsEngine doesn't (or to be safe)
            const bounds = runtime.physics?.bounds || { width: 800, height: 600 };
            const halfWidth = (obj.width || obj.radius * 2) / 2 || 10;
            const halfHeight = (obj.height || obj.radius * 2) / 2 || 10;

            // Allow a bit of overlap logic usually handled by engine, but ensuring we trigger the bounce
            // Note: Real physics loop usually handles this. If "Bounce" behavior is added, 
            // it implies we might want to override or ensure bounciness.
            // Since PhysicsEngine handles the actual movement/collision, this behavior 
            // primarily acts as a configuration interface for the physics properties for now.
        }
    });

    // Orbit
    registry.register('orbit', {
        name: 'Orbit',
        category: 'motion',
        icon: '🪐',
        description: 'Orbit around center',
        parameters: {
            speed: { type: 'slider', min: -5, max: 5, default: 1, label: 'Speed' },
            radius: { type: 'slider', min: 10, max: 300, default: 100, label: 'Radius' },
            centerX: { type: 'number', default: 400, label: 'Center X' },
            centerY: { type: 'number', default: 300, label: 'Center Y' }
        },
        init(obj, runtime) {
            if (!obj._orbitAngle) obj._orbitAngle = 0;
        },
        update(obj, dt, runtime, registry) {
            const speed = registry.getParameter(obj, 'orbit', 'speed');
            const radius = registry.getParameter(obj, 'orbit', 'radius');
            const cx = registry.getParameter(obj, 'orbit', 'centerX');
            const cy = registry.getParameter(obj, 'orbit', 'centerY');

            obj._orbitAngle += dt * speed;
            obj.x = cx + Math.cos(obj._orbitAngle) * radius;
            obj.y = cy + Math.sin(obj._orbitAngle) * radius;
        }
    });
}
