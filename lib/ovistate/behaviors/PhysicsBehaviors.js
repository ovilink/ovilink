/**
 * Physics Behaviors
 * Behaviors related to physical properties and interactions
 */

export function registerPhysicsBehaviors(registry) {

    // Solid Body - Makes the object act as a physical obstacle
    registry.register('solid_body', {
        name: 'Solid Body',
        category: 'physics',
        icon: '🧱',
        description: 'Makes this object a solid obstacle for physics objects',
        parameters: {
            bounciness: { type: 'slider', min: 0, max: 1.5, default: 0.8, label: 'Bounciness' },
            friction: { type: 'slider', min: 0, max: 1, default: 0.1, label: 'Friction' },
            isStatic: { type: 'checkbox', default: true, label: 'Static (Fixed)' }
        },
        init(obj, runtime, registry) {
            obj.isSolid = true;
            // Transfer parameters to object for fast access in physics loop
            obj.solidBounciness = registry.getParameter(obj, 'solid_body', 'bounciness');
            obj.solidFriction = registry.getParameter(obj, 'solid_body', 'friction');
            obj.isStaticSolid = registry.getParameter(obj, 'solid_body', 'isStatic');
        },
        update(obj, dt, runtime, registry) {
            // Ensure properties are synced if changed in inspector
            obj.isSolid = true;
            obj.solidBounciness = registry.getParameter(obj, 'solid_body', 'bounciness');
            obj.solidFriction = registry.getParameter(obj, 'solid_body', 'friction');
            obj.isStaticSolid = registry.getParameter(obj, 'solid_body', 'isStatic');
        }
    });
}
