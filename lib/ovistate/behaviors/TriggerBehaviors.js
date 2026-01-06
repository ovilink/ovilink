/**
 * Trigger Behaviors
 * One-off animations triggered by Action IDs
 */

export function registerTriggerBehaviors(registry) {

    // Action Animation - One-off bump, flash, shake, etc.
    registry.register('action_animation', {
        name: 'Action Animation',
        category: 'interaction',
        icon: '🎬',
        description: 'Trigger a one-off animation via Action ID',
        parameters: {
            actionID: { type: 'text', default: 'trigger', label: 'Action ID' },
            animation: {
                type: 'select',
                options: ['bump', 'flash', 'spin', 'shake', 'float_up'],
                default: 'bump',
                label: 'Animation'
            },
            duration: { type: 'slider', min: 0.1, max: 2, default: 0.5, label: 'Duration (s)' },
            intensity: { type: 'slider', min: 0.1, max: 5, default: 1, label: 'Intensity' }
        },
        init(obj) {
            obj._animTime = 0;
            obj._animActive = false;
            // Backups for restoration
            obj._origScale = obj.scale || 1;
            obj._origOpacity = obj.opacity !== undefined ? obj.opacity : 1;
            obj._origRotation = obj.rotation || 0;
            obj._origX = obj.x;
            obj._origY = obj.y;
        },
        update(obj, dt, runtime, registry) {
            const actionID = registry.getParameter(obj, 'action_animation', 'actionID');
            const animation = registry.getParameter(obj, 'action_animation', 'animation');
            const duration = registry.getParameter(obj, 'action_animation', 'duration');
            const intensity = registry.getParameter(obj, 'action_animation', 'intensity');

            // 1. Trigger detection
            if (runtime.lastAction === actionID && !obj._animActive) {
                obj._animActive = true;
                obj._animTime = 0;
                // Refresh backups
                obj._origScale = obj.scale || 1;
                obj._origOpacity = obj.opacity !== undefined ? obj.opacity : 1;
                obj._origRotation = obj.rotation || 0;
                obj._origX = obj.x;
                obj._origY = obj.y;
            }

            // 2. Animation Logic
            if (obj._animActive) {
                obj._animTime += dt;
                const progress = obj._animTime / duration; // 0 to 1

                if (progress >= 1) {
                    // End and Reset
                    obj._animActive = false;
                    obj.scale = obj._origScale;
                    obj.opacity = obj._origOpacity;
                    obj.rotation = obj._origRotation;
                    obj.x = obj._origX;
                    obj.y = obj._origY;
                    return;
                }

                if (animation === 'bump') {
                    // Ease out back and forth
                    const s = Math.sin(progress * Math.PI);
                    obj.scale = obj._origScale + (s * 0.2 * intensity);
                } else if (animation === 'flash') {
                    const s = Math.sin(progress * Math.PI);
                    obj.opacity = Math.max(0, obj._origOpacity - (s * 0.8 * intensity));
                } else if (animation === 'spin') {
                    obj.rotation = obj._origRotation + (progress * 360 * intensity);
                } else if (animation === 'shake') {
                    const shake = Math.sin(progress * Math.PI * 10) * 5 * intensity * (1 - progress);
                    obj.x = obj._origX + shake;
                } else if (animation === 'float_up') {
                    obj.y = obj._origY - (progress * 50 * intensity);
                    obj.opacity = obj._origOpacity * (1 - progress);
                }
            }
        }
    });

}
