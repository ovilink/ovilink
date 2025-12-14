/**
 * Transform Behaviors
 * Behaviors that transform object appearance
 */

export function registerTransformBehaviors(registry) {

    // Rotate Continuous - Constant rotation
    registry.register('rotate_continuous', {
        name: 'Rotate Continuous',
        category: 'transform',
        icon: '🔄',
        description: 'Continuous rotation',
        parameters: {
            speed: { type: 'slider', min: -10, max: 10, default: 2, label: 'Speed' },
            clockwise: { type: 'checkbox', default: true, label: 'Clockwise' }
        },
        init(obj) {
            if (!obj.rotation) obj.rotation = 0;
        },
        update(obj, dt, runtime, registry) {
            if (!obj.rotation) this.init(obj);

            const speed = registry.getParameter(obj, 'rotate_continuous', 'speed');
            const clockwise = registry.getParameter(obj, 'rotate_continuous', 'clockwise');

            obj.rotation += (clockwise ? 1 : -1) * speed * dt;
        }
    });

    // Scale Breath - Breathing scale effect
    registry.register('scale_breath', {
        name: 'Scale Breath',
        category: 'transform',
        icon: '💨',
        description: 'Breathing scale animation',
        parameters: {
            minScale: { type: 'slider', min: 0.1, max: 1, default: 0.8, label: 'Min Scale' },
            maxScale: { type: 'slider', min: 1, max: 3, default: 1.2, label: 'Max Scale' },
            speed: { type: 'slider', min: 0, max: 5, default: 1, label: 'Speed' }
        },
        init(obj) {
            if (!obj._breathTime) obj._breathTime = 0;
            if (!obj._originalRadius) obj._originalRadius = obj.radius || 30;
            if (!obj._originalWidth) obj._originalWidth = obj.width || 60;
            if (!obj._originalHeight) obj._originalHeight = obj.height || 60;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._breathTime) this.init(obj);

            const minScale = registry.getParameter(obj, 'scale_breath', 'minScale');
            const maxScale = registry.getParameter(obj, 'scale_breath', 'maxScale');
            const speed = registry.getParameter(obj, 'scale_breath', 'speed');

            obj._breathTime += dt * speed;
            const scale = minScale + (maxScale - minScale) * (Math.sin(obj._breathTime) * 0.5 + 0.5);

            if (obj.type === 'circle') {
                obj.radius = obj._originalRadius * scale;
            } else if (obj.type === 'rect') {
                obj.width = obj._originalWidth * scale;
                obj.height = obj._originalHeight * scale;
            }
        }
    });

    // Color Cycle - Color transition
    registry.register('color_cycle', {
        name: 'Color Cycle',
        category: 'transform',
        icon: '🎨',
        description: 'Cycle through colors',
        parameters: {
            speed: { type: 'slider', min: 0, max: 5, default: 1, label: 'Speed' },
            saturation: { type: 'slider', min: 0, max: 100, default: 70, label: 'Saturation' },
            lightness: { type: 'slider', min: 0, max: 100, default: 50, label: 'Lightness' }
        },
        init(obj) {
            if (!obj._colorHue) obj._colorHue = 0;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._colorHue) this.init(obj);

            const speed = registry.getParameter(obj, 'color_cycle', 'speed');
            const saturation = registry.getParameter(obj, 'color_cycle', 'saturation');
            const lightness = registry.getParameter(obj, 'color_cycle', 'lightness');

            obj._colorHue += dt * speed * 60;
            if (obj._colorHue >= 360) obj._colorHue -= 360;

            obj.fill = `hsl(${obj._colorHue}, ${saturation}%, ${lightness}%)`;
        }
    });

    // Glow - Pulsing glow effect
    registry.register('glow', {
        name: 'Glow',
        category: 'transform',
        icon: '✨',
        description: 'Pulsing glow effect',
        parameters: {
            intensity: { type: 'slider', min: 0, max: 1, default: 0.3, label: 'Intensity' },
            speed: { type: 'slider', min: 0, max: 5, default: 2, label: 'Speed' },
            color: { type: 'color', default: '#ffffff', label: 'Glow Color' }
        },
        init(obj) {
            if (!obj._glowTime) obj._glowTime = 0;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._glowTime) this.init(obj);

            const intensity = registry.getParameter(obj, 'glow', 'intensity');
            const speed = registry.getParameter(obj, 'glow', 'speed');

            obj._glowTime += dt * speed;
            obj._glowIntensity = intensity * (Math.sin(obj._glowTime * Math.PI) * 0.5 + 0.5);

            // Note: Glow rendering needs to be handled in the render method
        }
    });

    // Fade Cycle - Fade in/out continuously
    registry.register('fade_cycle', {
        name: 'Fade Cycle',
        category: 'transform',
        icon: '👻',
        description: 'Continuous fade in/out',
        parameters: {
            minOpacity: { type: 'slider', min: 0, max: 1, default: 0.2, label: 'Min Opacity' },
            maxOpacity: { type: 'slider', min: 0, max: 1, default: 1, label: 'Max Opacity' },
            speed: { type: 'slider', min: 0, max: 5, default: 1, label: 'Speed' }
        },
        init(obj) {
            if (!obj._fadeTime) obj._fadeTime = 0;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._fadeTime) this.init(obj);

            const minOpacity = registry.getParameter(obj, 'fade_cycle', 'minOpacity');
            const maxOpacity = registry.getParameter(obj, 'fade_cycle', 'maxOpacity');
            const speed = registry.getParameter(obj, 'fade_cycle', 'speed');

            obj._fadeTime += dt * speed;
            obj.opacity = minOpacity + (maxOpacity - minOpacity) * (Math.sin(obj._fadeTime) * 0.5 + 0.5);
        }
    });
}
