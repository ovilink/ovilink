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
            isStatic: { type: 'checkbox', default: true, label: 'Static (Fixed)' },
            killParticles: { type: 'checkbox', default: false, label: 'Kill Particles on Contact' }
        },
        init(obj, runtime, registry) {
            obj.isSolid = true;
            // Transfer parameters to object for fast access in physics loop
            obj.solidBounciness = registry.getParameter(obj, 'solid_body', 'bounciness');
            obj.solidFriction = registry.getParameter(obj, 'solid_body', 'friction');
            obj.isStaticSolid = registry.getParameter(obj, 'solid_body', 'isStatic');
            obj.killParticles = registry.getParameter(obj, 'solid_body', 'killParticles');
        },
        update(obj, dt, runtime, registry) {
            // Ensure properties are synced if changed in inspector
            obj.isSolid = true;
            obj.solidBounciness = registry.getParameter(obj, 'solid_body', 'bounciness');
            obj.solidFriction = registry.getParameter(obj, 'solid_body', 'friction');
            obj.isStaticSolid = registry.getParameter(obj, 'solid_body', 'isStatic');
            obj.killParticles = registry.getParameter(obj, 'solid_body', 'killParticles');
        }
    });

    // Timeline Physics Bridge - Combines Timeline animation with Physics collision
    registry.register('timeline_physics_bridge', {
        name: 'Timeline Physics Bridge',
        category: 'physics',
        icon: '🔗',
        description: 'Enables physics collision while Timeline animation is playing',
        parameters: {
            enabled: { type: 'checkbox', default: true, label: 'Enable Collision' },
            collisionMode: { 
                type: 'select', 
                options: ['push', 'bounce', 'stop'], 
                default: 'push', 
                label: 'Collision Mode' 
            },
            pushForce: { type: 'slider', min: 0, max: 500, default: 150, label: 'Push Force' },
            bounceAmount: { type: 'slider', min: 0, max: 2, default: 0.8, label: 'Bounce Amount' },
            targetTag: { type: 'text', default: 'obstacle', label: 'Target Tag' },
            targetID: { type: 'text', default: '', label: 'Target ID (optional)' },
            useTimelineDirection: { type: 'checkbox', default: true, label: 'Use Timeline Direction' },
            customAngle: { type: 'slider', min: 0, max: 360, default: 0, label: 'Custom Angle (deg)' },
            timelineBehavior: { 
                type: 'select', 
                options: ['continue', 'pause', 'reverse'], 
                default: 'continue', 
                label: 'Timeline on Collision' 
            },
            collisionRadius: { type: 'slider', min: 10, max: 200, default: 50, label: 'Collision Radius' }
        },
        init(obj, runtime, registry) {
            // Store previous position to calculate velocity
            obj._tpb_prevX = obj.x;
            obj._tpb_prevY = obj.y;
            obj._tpb_velocity = { x: 0, y: 0 };
            obj._tpb_collidingWith = new Set();
        },
        update(obj, dt, runtime, registry) {
            const enabled = registry.getParameter(obj, 'timeline_physics_bridge', 'enabled');
            if (!enabled) return;

            // Initialize if needed
            if (obj._tpb_prevX === undefined) this.init(obj, runtime, registry);

            // Calculate velocity from timeline movement
            const dx = obj.x - obj._tpb_prevX;
            const dy = obj.y - obj._tpb_prevY;
            obj._tpb_velocity.x = dx / (dt || 0.016);
            obj._tpb_velocity.y = dy / (dt || 0.016);

            // Get parameters
            const mode = registry.getParameter(obj, 'timeline_physics_bridge', 'collisionMode');
            const pushForce = registry.getParameter(obj, 'timeline_physics_bridge', 'pushForce');
            const bounceAmount = registry.getParameter(obj, 'timeline_physics_bridge', 'bounceAmount');
            const targetTag = registry.getParameter(obj, 'timeline_physics_bridge', 'targetTag');
            const targetID = registry.getParameter(obj, 'timeline_physics_bridge', 'targetID');
            const useTimelineDir = registry.getParameter(obj, 'timeline_physics_bridge', 'useTimelineDirection');
            const customAngle = registry.getParameter(obj, 'timeline_physics_bridge', 'customAngle');
            const timelineBehavior = registry.getParameter(obj, 'timeline_physics_bridge', 'timelineBehavior');
            const collisionRadius = registry.getParameter(obj, 'timeline_physics_bridge', 'collisionRadius');

            // Check collision with target objects
            runtime.objects.forEach(target => {
                // Skip self
                if (target === obj) return;

                // Check if target matches criteria
                const matchesTag = targetTag && target.tag === targetTag;
                const matchesID = targetID && target.id === targetID;
                
                if (!matchesTag && !matchesID && targetTag !== '' && targetID !== '') return;
                if (targetTag === '' && targetID === '') return; // No target specified

                // Calculate distance
                const distX = target.x - obj.x;
                const distY = target.y - obj.y;
                const distance = Math.sqrt(distX * distX + distY * distY);

                // Check collision
                const objRadius = obj.radius || obj.width / 2 || 20;
                const targetRadius = target.radius || target.width / 2 || 20;
                const totalRadius = Math.min(collisionRadius, objRadius + targetRadius);

                if (distance < totalRadius) {
                    // Collision detected!
                    const wasColliding = obj._tpb_collidingWith.has(target.id || target);
                    obj._tpb_collidingWith.add(target.id || target);

                    // Handle collision based on mode
                    if (mode === 'push') {
                        // Push target object
                        if (!target.velocity) target.velocity = { x: 0, y: 0 };
                        
                        // Calculate push direction
                        let pushAngle;
                        if (useTimelineDir) {
                            // Use timeline movement direction
                            pushAngle = Math.atan2(obj._tpb_velocity.y, obj._tpb_velocity.x);
                        } else {
                            // Use custom angle
                            pushAngle = (customAngle * Math.PI) / 180;
                        }

                        // Apply force
                        const force = pushForce * dt;
                        target.velocity.x += Math.cos(pushAngle) * force;
                        target.velocity.y += Math.sin(pushAngle) * force;

                        // Move target if it has velocity
                        if (target.velocity) {
                            target.x += target.velocity.x * dt;
                            target.y += target.velocity.y * dt;
                            
                            // Apply friction
                            target.velocity.x *= 0.95;
                            target.velocity.y *= 0.95;
                        }

                    } else if (mode === 'bounce') {
                        // Bounce both objects
                        const angle = Math.atan2(distY, distX);
                        const targetVelX = target.velocity?.x || 0;
                        const targetVelY = target.velocity?.y || 0;

                        // Separate objects
                        const overlap = totalRadius - distance;
                        const separateX = Math.cos(angle) * overlap / 2;
                        const separateY = Math.sin(angle) * overlap / 2;
                        
                        obj.x -= separateX;
                        obj.y -= separateY;
                        target.x += separateX;
                        target.y += separateY;

                        // Apply bounce velocity to target
                        if (!target.velocity) target.velocity = { x: 0, y: 0 };
                        target.velocity.x = Math.cos(angle) * obj._tpb_velocity.x * bounceAmount;
                        target.velocity.y = Math.sin(angle) * obj._tpb_velocity.y * bounceAmount;

                    } else if (mode === 'stop') {
                        // Stop timeline movement
                        if (!wasColliding) {
                            // First frame of collision
                            if (timelineBehavior === 'pause') {
                                // Pause timeline (requires timeline reference)
                                if (obj._timeline) obj._timeline.pause();
                            } else if (timelineBehavior === 'reverse') {
                                // Reverse timeline
                                if (obj._timeline) obj._timeline.reverse();
                            }
                        }
                    }

                    // Handle timeline behavior
                    if (mode !== 'stop' && !wasColliding) {
                        if (timelineBehavior === 'pause') {
                            if (obj._timeline) obj._timeline.pause();
                        } else if (timelineBehavior === 'reverse') {
                            if (obj._timeline) obj._timeline.reverse();
                        }
                    }

                } else {
                    // No longer colliding
                    obj._tpb_collidingWith.delete(target.id || target);
                }
            });

            // Update previous position
            obj._tpb_prevX = obj.x;
            obj._tpb_prevY = obj.y;
        }
    });
}
