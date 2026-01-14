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
            centerY: { type: 'number', default: 300, label: 'Center Y' },
            orient: { type: 'toggle', default: true, label: 'Orient to Path' }
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
            const orient = registry.getParameter(obj, 'figure_eight', 'orient');

            obj._figureTime += dt * speed;
            const t = obj._figureTime;

            obj.x = centerX + width * Math.sin(t);
            obj.y = centerY + height * Math.sin(t) * Math.cos(t);

            if (orient) {
                // Derivatives
                // x' = w * cos(t)
                // y' = h * (cos^2(t) - sin^2(t)) = h * cos(2t)
                const dx = width * Math.cos(t);
                const dy = height * Math.cos(2 * t);
                obj.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
            }
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
            centerY: { type: 'number', default: 300, label: 'Center Y' },
            orient: { type: 'toggle', default: true, label: 'Orient to Path' }
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
            const orient = registry.getParameter(obj, 'circle_path', 'orient');

            obj._circleAngle += dt * speed;
            obj.x = centerX + Math.cos(obj._circleAngle) * radius;
            obj.y = centerY + Math.sin(obj._circleAngle) * radius;

            if (orient) {
                // Tangent of a circle is angle + 90 degrees (or -90 depending on direction)
                // Math.atan2(dy, dx) correctly handles speed direction
                const dx = -radius * Math.sin(obj._circleAngle) * speed;
                const dy = radius * Math.cos(obj._circleAngle) * speed;
                obj.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
            }
        }
    });

    // Random Walk - Random wandering
    registry.register('random_walk', {
        name: 'Random Walk',
        category: 'path',
        icon: '🎲',
        description: 'Random wandering movement',
        parameters: {
            speed: { type: 'slider', min: 0, max: 500, default: 100, label: 'Speed' },
            turnIntensity: { type: 'slider', min: 0, max: 1, default: 0.5, label: 'Turn Intensity' },
            smoothness: { type: 'slider', min: 0, max: 0.99, default: 0.8, label: 'Smoothness' },
            changeFrequency: { type: 'slider', min: 0.1, max: 5, default: 1, label: 'Change Freq' },
            orient: { type: 'toggle', default: true, label: 'Orient to Path' },
            stayInBounds: { type: 'toggle', default: true, label: 'Stay In Bounds' }
        },
        init(obj) {
            if (obj._walkAngle === undefined) {
                obj._walkAngle = Math.random() * Math.PI * 2;
                obj._targetAngle = obj._walkAngle;
                obj._walkTimer = 0;
            }
        },
        update(obj, dt, runtime, registry) {
            if (obj._walkAngle === undefined) this.init(obj);

            const speed = registry.getParameter(obj, 'random_walk', 'speed');
            const turnIntensity = registry.getParameter(obj, 'random_walk', 'turnIntensity');
            const smoothness = registry.getParameter(obj, 'random_walk', 'smoothness');
            const changeFrequency = registry.getParameter(obj, 'random_walk', 'changeFrequency');
            const orient = registry.getParameter(obj, 'random_walk', 'orient');
            const stayInBounds = registry.getParameter(obj, 'random_walk', 'stayInBounds');

            // 1. Direction Logic
            obj._walkTimer += dt * changeFrequency;
            if (obj._walkTimer > 1) {
                // Pick a new target angle based on turn intensity
                const variance = turnIntensity * Math.PI; // Max 180 deg turn
                obj._targetAngle += (Math.random() - 0.5) * variance;
                obj._walkTimer = 0;
            }

            // 2. Smooth Interpolation (Steering)
            // Use lerp for angles but handle wrapping
            let angleDiff = obj._targetAngle - obj._walkAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            const lerpFactor = 1 - smoothness;
            obj._walkAngle += angleDiff * lerpFactor;

            // 3. Move
            obj.x += Math.cos(obj._walkAngle) * speed * dt;
            obj.y += Math.sin(obj._walkAngle) * speed * dt;

            // 4. Stay In Bounds (Bounce logic)
            if (stayInBounds && runtime && runtime.width) {
                const padding = 20;
                let bounced = false;
                if (obj.x < padding) { obj.x = padding; obj._targetAngle = 0; bounced = true; }
                if (obj.x > runtime.width - padding) { obj.x = runtime.width - padding; obj._targetAngle = Math.PI; bounced = true; }
                if (obj.y < padding) { obj.y = padding; obj._targetAngle = Math.PI / 2; bounced = true; }
                if (obj.y > runtime.height - padding) { obj.y = runtime.height - padding; obj._targetAngle = -Math.PI / 2; bounced = true; }

                if (bounced) {
                    obj._walkAngle = obj._targetAngle; // Immediate snap on bounce for better feel
                    obj._walkTimer = 0;
                }
            }

            // 5. Orient
            if (orient) {
                obj.rotation = obj._walkAngle * 180 / Math.PI;
            }
        }
    });

    // Bounce Path - Diagonal bouncing
    // Bounce Path - Hybrid Physics (Projectile & Ricochet)
    registry.register('bounce_path', {
        name: 'Bounce Path',
        category: 'path',
        icon: '🏀',
        description: 'Hybrid Physics: Projectile Jumps & Wall Ricochet',
        parameters: {
            mode: { type: 'select', options: ['projectile', 'ricochet'], default: 'projectile', label: 'Mode' },
            speed: { type: 'slider', min: 0, max: 800, default: 300, label: 'Speed' },
            angle: { type: 'slider', min: -180, max: 180, default: -45, label: 'Initial Angle' },
            gravity: { type: 'slider', min: 0, max: 2000, default: 800, label: 'Gravity' },
            bounciness: { type: 'slider', min: 0, max: 1.2, default: 0.7, label: 'Bounciness' },
            groundY: { type: 'number', default: 550, label: 'Ground Y (Proj)' },
            friction: { type: 'slider', min: 0, max: 1, default: 0.01, label: 'Friction' },
            randomness: { type: 'slider', min: 0, max: 0.5, default: 0.1, label: 'Randomness' },
            orient: { type: 'toggle', default: true, label: 'Orient to Path' }
        },
        init(obj, runtime, registry) {
            const speed = registry.getParameter(obj, 'bounce_path', 'speed');
            const angleDeg = registry.getParameter(obj, 'bounce_path', 'angle');
            const angleRad = angleDeg * Math.PI / 180;

            obj._bounceVelX = Math.cos(angleRad) * speed;
            obj._bounceVelY = Math.sin(angleRad) * speed;
            obj._isBounceInit = true;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._isBounceInit) this.init(obj, runtime, registry);

            const mode = registry.getParameter(obj, 'bounce_path', 'mode');
            const gravity = registry.getParameter(obj, 'bounce_path', 'gravity');
            const bounciness = registry.getParameter(obj, 'bounce_path', 'bounciness');
            const groundY = registry.getParameter(obj, 'bounce_path', 'groundY');
            const friction = registry.getParameter(obj, 'bounce_path', 'friction');
            const randomness = registry.getParameter(obj, 'bounce_path', 'randomness');
            const orient = registry.getParameter(obj, 'bounce_path', 'orient');

            // 1. Physics Logic
            if (mode === 'projectile') {
                obj._bounceVelY += gravity * dt;
            }

            // Apply friction
            const speedMag = Math.sqrt(obj._bounceVelX * obj._bounceVelX + obj._bounceVelY * obj._bounceVelY);
            if (speedMag > 0) {
                const loss = 1 - (friction * dt);
                obj._bounceVelX *= loss;
                obj._bounceVelY *= loss;
            }

            obj.x += obj._bounceVelX * dt;
            obj.y += obj._bounceVelY * dt;

            // 2. Collision Logic
            const width = obj.width || 50;
            const height = obj.height || 50;
            const halfW = width / 2;
            const halfH = height / 2;

            if (mode === 'projectile') {
                // Bounce off Ground
                if (obj.y + halfH > groundY) {
                    obj.y = groundY - halfH;
                    obj._bounceVelY *= -bounciness;

                    // Add some horizontal randomness to make it feel organic
                    obj._bounceVelX += (Math.random() - 0.5) * randomness * 100;

                    // Squash juice if available (Editor might handle, but we can do simple)
                    if (obj.scaleY) {
                        obj._squashTime = 0.2;
                    }
                }

                // Walls
                if (obj.x - halfW < 0 || obj.x + halfW > runtime.width) {
                    obj._bounceVelX *= -bounciness;
                    obj.x = obj.x < halfW ? halfW : runtime.width - halfW;
                }
            } else {
                // Ricochet Mode (Bounce off all edges)
                let collided = false;
                if (obj.x - halfW < 0 || obj.x + halfW > runtime.width) {
                    obj._bounceVelX *= -1;
                    obj.x = obj.x < halfW ? halfW : runtime.width - halfW;
                    collided = true;
                }
                if (obj.y - halfH < 0 || obj.y + halfH > runtime.height) {
                    obj._bounceVelY *= -1;
                    obj.y = obj.y < halfH ? halfH : runtime.height - halfH;
                    collided = true;
                }

                if (collided && randomness > 0) {
                    // Refract angle slightly
                    const currentAngle = Math.atan2(obj._bounceVelY, obj._bounceVelX);
                    const currentSpeed = Math.sqrt(obj._bounceVelX ** 2 + obj._bounceVelY ** 2);
                    const newAngle = currentAngle + (Math.random() - 0.5) * randomness;
                    obj._bounceVelX = Math.cos(newAngle) * currentSpeed;
                    obj._bounceVelY = Math.sin(newAngle) * currentSpeed;
                }
            }

            // 3. Orient
            if (orient) {
                obj.rotation = Math.atan2(obj._bounceVelY, obj._bounceVelX) * 180 / Math.PI;
            }

            // 4. Visual Juice (Squash/Stretch)
            if (obj._squashTime > 0) {
                obj._squashTime -= dt;
                // Simplified juice: obj.scaleY could be modulated if system supports it
            }
        }
    });

    // Follow Path - Follow a 'path' object
    registry.register('follow_path', {
        name: 'Follow Path',
        category: 'path',
        icon: '🧬',
        description: 'Follow a waypoint path object',
        parameters: {
            pathId: { type: 'select', options: 'objects:path', label: 'Path Object' },
            speed: { type: 'slider', min: 0, max: 2, default: 0.2, step: 0.01, label: 'Speed' },
            loop: { type: 'toggle', default: true, label: 'Loop' },
            pingPong: { type: 'toggle', default: false, label: 'Ping Pong' },
            orient: { type: 'toggle', default: true, label: 'Orient to Path' }
        },
        init(obj) {
            if (obj._pathProgress === undefined) obj._pathProgress = 0;
            if (obj._pathDir === undefined) obj._pathDir = 1;
        },
        update(obj, dt, runtime, registry) {
            const pathId = registry.getParameter(obj, 'follow_path', 'pathId');
            const pathObj = runtime.getObject(pathId);
            if (!pathObj || (pathObj.type !== 'path' && pathObj.type !== 'vector_path')) return;

            const speed = registry.getParameter(obj, 'follow_path', 'speed');
            const loop = registry.getParameter(obj, 'follow_path', 'loop');
            const pingPong = registry.getParameter(obj, 'follow_path', 'pingPong');
            const orient = registry.getParameter(obj, 'follow_path', 'orient');

            if (obj._pathProgress === undefined) this.init(obj);
            if (obj._pathDir === undefined) obj._pathDir = 1;

            // Advance progress
            obj._pathProgress += dt * speed * obj._pathDir;

            if (obj._pathProgress > 1) {
                if (pingPong) {
                    obj._pathProgress = 1;
                    obj._pathDir = -1;
                } else if (loop) {
                    obj._pathProgress %= 1;
                } else {
                    obj._pathProgress = 1;
                }
            } else if (obj._pathProgress < 0) {
                if (pingPong) {
                    obj._pathProgress = 0;
                    obj._pathDir = 1;
                } else if (loop) {
                    obj._pathProgress = 1;
                } else {
                    obj._pathProgress = 0;
                }
            }

            // Get point on spline
            const tension = pathObj.tension !== undefined ? pathObj.tension : 0.5;
            const pos = runtime.getSplinePoint(pathObj.points, tension, obj._pathProgress, pathObj.closed);

            // If orient to path, calculate tangent
            if (orient) {
                const nextT = Math.max(0, Math.min(1, obj._pathProgress + 0.01 * obj._pathDir));
                const nextPos = runtime.getSplinePoint(pathObj.points, tension, nextT, pathObj.closed);
                const angle = Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x) * 180 / Math.PI;
                obj.rotation = angle;
            }

            obj.x = pos.x + (pathObj.x || 0);
            obj.y = pos.y + (pathObj.y || 0);
        }
    });

    // Scrub Path 2.0 - Manual, Variable, or Scroll driven
    registry.register('scrub_path', {
        name: 'Scrub Path 2.0',
        category: 'path',
        icon: '🎚️',
        description: 'Interactive path control via variables or scroll',
        parameters: {
            pathId: { type: 'select', options: 'objects:path', label: 'Path Object' },
            inputMode: { type: 'select', options: ['manual', 'variable', 'scroll'], default: 'manual', label: 'Input Mode' },
            progress: { type: 'slider', min: 0, max: 1, default: 0, step: 0.01, label: 'Manual Progress' },
            targetVariable: { type: 'text', default: 'myProgress', label: 'Variable Name' },
            smoothing: { type: 'slider', min: 0, max: 0.99, default: 0.8, label: 'Smoothing' },
            rangeMin: { type: 'slider', min: 0, max: 1, default: 0, step: 0.01, label: 'Range Min' },
            rangeMax: { type: 'slider', min: 0, max: 1, default: 1, step: 0.01, label: 'Range Max' },
            orient: { type: 'toggle', default: true, label: 'Orient to Path' }
        },
        init(obj) {
            obj._scrubTarget = 0;
            obj._scrubCurrent = 0;
            obj._isScrubInit = true;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._isScrubInit) this.init(obj);

            const pathId = registry.getParameter(obj, 'scrub_path', 'pathId');
            const pathObj = runtime.getObject(pathId);
            if (!pathObj || (pathObj.type !== 'path' && pathObj.type !== 'vector_path')) return;

            const mode = registry.getParameter(obj, 'scrub_path', 'inputMode');
            const smoothing = registry.getParameter(obj, 'scrub_path', 'smoothing');
            const rangeMin = registry.getParameter(obj, 'scrub_path', 'rangeMin');
            const rangeMax = registry.getParameter(obj, 'scrub_path', 'rangeMax');
            const orient = registry.getParameter(obj, 'scrub_path', 'orient');
            const tension = pathObj.tension !== undefined ? pathObj.tension : 0.5;

            // 1. Get Target Input
            let targetInput = 0;
            if (mode === 'manual') {
                targetInput = registry.getParameter(obj, 'scrub_path', 'progress');
            } else if (mode === 'variable') {
                const varName = registry.getParameter(obj, 'scrub_path', 'targetVariable');
                // Use runtime's variable system if available
                targetInput = (runtime.variables && runtime.variables[varName] !== undefined) ? runtime.variables[varName] : 0;
            } else if (mode === 'scroll') {
                // Determine scroll percentage (for export primarily)
                if (typeof window !== 'undefined') {
                    const scrollY = window.scrollY || document.documentElement.scrollTop;
                    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                    targetInput = maxScroll > 0 ? scrollY / maxScroll : 0;
                }
            }

            // Clamp input
            targetInput = Math.max(0, Math.min(1, targetInput));

            // Map range
            const mappedTarget = rangeMin + targetInput * (rangeMax - rangeMin);
            obj._scrubTarget = mappedTarget;

            // 2. Smoothing (Lerp)
            const lerpFactor = 1 - smoothing;
            obj._scrubCurrent += (obj._scrubTarget - obj._scrubCurrent) * lerpFactor;

            // 3. Update Position
            const pos = runtime.getSplinePoint(pathObj.points, tension, obj._scrubCurrent, pathObj.closed);
            obj.x = pos.x + (pathObj.x || 0);
            obj.y = pos.y + (pathObj.y || 0);

            // 4. Update Orientation
            if (orient) {
                // Use a small offset to calculate tangent
                const step = 0.005;
                const nextT = Math.min(1, obj._scrubCurrent + step);
                const prevT = Math.max(0, obj._scrubCurrent - step);

                const p1 = runtime.getSplinePoint(pathObj.points, tension, prevT, pathObj.closed);
                const p2 = runtime.getSplinePoint(pathObj.points, tension, nextT, pathObj.closed);

                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
                obj.rotation = angle;
            }
        }
    });
}
