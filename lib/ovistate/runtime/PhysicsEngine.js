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

        // Apply Force Fields
        const forceFields = objects.filter(obj => obj.type === 'force_field');
        const physicsObjects = objects.filter(obj => obj.physics && obj.physics.enabled);

        if (forceFields.length > 0) {
            this.applyForceFields(physicsObjects, forceFields, timeScaledDt);
        }

        objects.forEach(obj => {
            if (!obj.physics || !obj.physics.enabled) return;

            // Initialize physics properties if missing
            if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
            if (obj.physics.mass === undefined) obj.physics.mass = 1;

            // Apply Wind (Gravity X)
            obj.physics.velocity.x += this.gravityX * timeScaledDt;

            // Apply angular velocity to rotation
            if (!obj.physics.lockRotation) {
                if (obj.physics.angularVelocity === undefined) obj.physics.angularVelocity = 0;
                obj.rotation = (obj.rotation || 0) + obj.physics.angularVelocity * timeScaledDt * (180 / Math.PI);
            }

            // Apply friction
            obj.physics.velocity.x *= (1 - this.friction * timeScaledDt);
            obj.physics.velocity.y *= (1 - this.friction * timeScaledDt);

            // Angular friction
            if (obj.physics.angularVelocity) {
                obj.physics.angularVelocity *= (1 - this.friction * timeScaledDt * 2);
            }

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

        // Apply Constraints (Joints)
        const joints = objects.filter(obj => obj.type === 'joint');
        if (joints.length > 0) {
            this.solveJoints(objects, joints, timeScaledDt);
        }
    }

    solveJoints(objects, joints, dt) {
        joints.forEach(joint => {
            const bodyA = objects.find(o => o.id === joint.targetA);
            const bodyB = objects.find(o => o.id === joint.targetB);
            if (!bodyA || !bodyB) return;

            // Anchor relative to object centers
            const ax = joint.anchorA?.x || 0, ay = joint.anchorA?.y || 0;
            const bx = joint.anchorB?.x || 0, by = joint.anchorB?.y || 0;

            // Transform anchors to world space
            const radA = (bodyA.rotation || 0) * Math.PI / 180, cosA = Math.cos(radA), sinA = Math.sin(radA);
            const p1x = bodyA.x + (ax * cosA - ay * sinA);
            const p1y = bodyA.y + (ax * sinA + ay * cosA);

            const radB = (bodyB.rotation || 0) * Math.PI / 180, cosB = Math.cos(radB), sinB = Math.sin(radB);
            const p2x = bodyB.x + (bx * cosB - by * sinB);
            const p2y = bodyB.y + (bx * sinB + by * cosB);

            const dx = p2x - p1x, dy = p2y - p1y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Breakable logic
            if (joint.breakable && joint.breakForce > 0) {
                if (dist > joint.breakForce) {
                    joint._broken = true;
                    return;
                }
            }
            if (joint._broken) return;

            const invMA = (bodyA.physics && bodyA.physics.enabled) ? 1 / (bodyA.physics.mass || 1) : 0;
            const invMB = (bodyB.physics && bodyB.physics.enabled) ? 1 / (bodyB.physics.mass || 1) : 0;
            if (invMA + invMB === 0) return;

            const strength = joint.strength !== undefined ? joint.strength : 0.5;

            if (joint.subtype === 'motor') {
                // Motor: Apply torque to rotate bodyB relative to bodyA
                const speed = joint.motorSpeed || 0;
                const torque = (joint.motorTorque || 100) * strength;

                if (bodyB.physics && !bodyB.physics.lockRotation) {
                    if (bodyB.physics.angularVelocity === undefined) bodyB.physics.angularVelocity = 0;
                    const diff = speed - bodyB.physics.angularVelocity;
                    bodyB.physics.angularVelocity += diff * torque * dt;
                }
                // Motor also acts as a hinge usually
                this.resolveDistanceConstraint(bodyA, bodyB, dx, dy, 0, strength, invMA, invMB);
            }
            else if (joint.subtype === 'hinge' || joint.subtype === 'fixed') {
                this.resolveDistanceConstraint(bodyA, bodyB, dx, dy, 0, strength, invMA, invMB);

                if (joint.subtype === 'fixed') {
                    // Fixed also constrains orientation
                    const targetRotDiff = joint._initialRotDiff || 0;
                    if (joint._initialRotDiff === undefined) {
                        joint._initialRotDiff = (bodyB.rotation || 0) - (bodyA.rotation || 0);
                    } else {
                        const currentDiff = (bodyB.rotation || 0) - (bodyA.rotation || 0);
                        const rotError = targetRotDiff - currentDiff;
                        if (bodyB.physics && !bodyB.physics.lockRotation) {
                            bodyB.rotation += rotError * strength;
                        }
                    }
                }
            }
            else if (joint.subtype === 'rope') {
                const maxDist = joint.length || 100;
                if (dist > maxDist) {
                    this.resolveDistanceConstraint(bodyA, bodyB, dx, dy, maxDist, strength, invMA, invMB);
                }
            }
            else if (joint.subtype === 'prismatic') {
                // Prismatic: Constraint along an axis
                const axisAngle = (joint.axisAngle || 0) * Math.PI / 180;
                const axisX = Math.cos(axisAngle), axisY = Math.sin(axisAngle);

                // Keep objects aligned to the axis passing through p1
                const dot = dx * axisX + dy * axisY;
                const projX = axisX * dot, projY = axisY * dot;
                const perpX = dx - projX, perpY = dy - projY;

                // Resolve perpendicular error (locking to axis)
                bodyA.x += perpX * (invMA / (invMA + invMB)) * strength;
                bodyA.y += perpY * (invMA / (invMA + invMB)) * strength;
                bodyB.x -= perpX * (invMB / (invMA + invMB)) * strength;
                bodyB.y -= perpY * (invMB / (invMA + invMB)) * strength;
            }
        });
    }

    resolveDistanceConstraint(bodyA, bodyB, dx, dy, targetDist, strength, invMA, invMB) {
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const diff = dist - targetDist;
        const nx = dx / dist, ny = dy / dist;

        const correctionX = nx * diff * strength;
        const correctionY = ny * diff * strength;

        const ratioA = invMA / (invMA + invMB);
        const ratioB = invMB / (invMA + invMB);

        bodyA.x += correctionX * ratioA;
        bodyA.y += correctionY * ratioA;
        bodyB.x -= correctionX * ratioB;
        bodyB.y -= correctionY * ratioB;
    }

    applyForceFields(objects, forceFields, dt) {
        forceFields.forEach(field => {
            objects.forEach(obj => {
                if (field.subtype === 'wind') {
                    this.applyWindForce(obj, field, dt);
                } else if (field.subtype === 'magnet') {
                    this.applyMagnetForce(obj, field, dt);
                }
            });
        });
    }

    applyWindForce(obj, field, dt) {
        // Check if object is inside wind zone (Projected Rectangle)
        // Zone defined by: start (field.x,y), direction, range, zoneWidth
        const angleRad = (field.direction || 0) * (Math.PI / 180);
        const range = field.range || 400;
        const zoneWidth = field.zoneWidth || 200;

        // Transform object position to field's local space
        // 1. Translate relative to field center
        const dx = obj.x - field.x;
        const dy = obj.y - field.y;

        // 2. Rotate inverse to align with X axis
        const cos = Math.cos(-angleRad);
        const sin = Math.sin(-angleRad);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // 3. Check bounds in local space
        // Zone spans x: [0, range], y: [-zoneWidth/2, zoneWidth/2]
        let isInside = false;
        if (localX >= 0 && localX <= range && Math.abs(localY) <= zoneWidth / 2) {
            isInside = true;
        }

        if (isInside) {
            // Calculate force vector
            const angleRad = (field.direction || 0) * (Math.PI / 180);
            const strength = field.strength !== undefined ? field.strength : 500;

            let fx = Math.cos(angleRad) * strength;
            let fy = Math.sin(angleRad) * strength;

            // Turbulence (Simple Random Variation)
            if (field.turbulence > 0) {
                const noiseX = (Math.random() - 0.5) * 2;
                const noiseY = (Math.random() - 0.5) * 2;
                fx += noiseX * strength * field.turbulence;
                fy += noiseY * strength * field.turbulence;
            }

            // Apply force (F = ma => a = F/m)
            // We add velocity: v = a * dt
            obj.physics.velocity.x += (fx / (obj.physics.mass || 1)) * dt;
            obj.physics.velocity.y += (fy / (obj.physics.mass || 1)) * dt;

            // Optional Rotation
            if (field.affectRotation) {
                obj.rotation = (obj.rotation || 0) + (field.turbulence * 10 * (Math.random() - 0.5));
            }
        }
    }

    applyMagnetForce(obj, field, dt) {
        // Target Filtering
        if (field.affectMode === 'tag' && field.targetTag) {
            if (!obj.tags || !obj.tags.includes(field.targetTag)) return;
        }

        let dx = obj.x - field.x;
        let dy = obj.y - field.y;
        let distSq = dx * dx + dy * dy;
        let dist = Math.sqrt(distSq);

        // Surface Attraction: Attract toward nearest point on bounds instead of center
        if (field.surfaceAttraction) {
            const w = field.width || 50;
            const h = field.height || 50;
            const rot = (field.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(-rot);
            const sin = Math.sin(-rot);

            // Rotate object to local space
            const lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;

            // Closest point on AABB in local space
            const tx = Math.max(-w / 2, Math.min(lx, w / 2));
            const ty = Math.max(-h / 2, Math.min(ly, h / 2));

            // World distance to that point
            const wdx = lx - tx;
            const wdy = ly - ty;
            const surfaceDist = Math.sqrt(wdx * wdx + wdy * wdy);

            // Update dx, dy, dist to use surface-relative values
            if (surfaceDist > 0.1) {
                // Direction from surface to object
                const wcos = Math.cos(rot);
                const wsin = Math.sin(rot);
                dx = (wdx * wcos - wdy * wsin);
                dy = (wdx * wsin + wdy * wcos);
                dist = surfaceDist;
            } else {
                // Object is INSIDE the magnet surface, use very small dist or zero
                dist = 0.1;
                dx = 0; dy = 0;
            }
        }

        const radius = field.radius || 150;
        const innerRadius = field.innerRadius || 0;

        // Global check: if not global, must be within radius
        if (!field.isGlobal && dist > radius) return;

        // Apply force if inside radius OR if it's Global
        // Ensure force is applied even if dist < innerRadius (for sticking)

        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;

        // Calculate Force Magnitude
        let strength = field.strength !== undefined ? field.strength : 500;
        const falloff = field.falloff || 'quadratic';

        // Normalize distance (0 at inner, 1 at outer)
        // If dist < innerRadius, t is capped at 0 (maximum strength)
        const t = Math.max(0, (dist - innerRadius) / (Math.max(1, radius - innerRadius)));

        if (falloff === 'linear') {
            strength *= Math.max(0, 1 - t);
        } else if (falloff === 'quadratic') {
            strength *= Math.max(0, (1 - t) * (1 - t));
        }

        // Pulsation Logic
        if (field.pulsate) {
            if (field._pulseTime === undefined) field._pulseTime = 0;
            field._pulseTime += dt;
            const pSpeed = field.pulseSpeed || 5;
            const pMag = field.pulseMagnitude || 0.5;
            const modulation = 1 + Math.sin(field._pulseTime * pSpeed) * pMag;
            strength *= modulation;
        }

        // Cap Max Force
        const maxForce = field.maxForce || 2000;
        strength = Math.min(strength, maxForce);

        // Mode Logic
        let fx = 0, fy = 0;
        const sign = field.mode === 'repel' ? 1 : -1;

        if (field.isDipole || obj.isDipole) {
            this.applyDipoleInteraction(obj, field, strength, dt);
            return; // Dipole handling is specialized
        }

        if (field.mode === 'orbit' || field.mode === 'vortex') {
            const orbitStrength = field.orbitStrength || strength;
            const direction = field.orbitDirection === 'ccw' ? -1 : 1;

            // Tangential vector (perpendicular to normal)
            const tx = -ny * direction;
            const ty = nx * direction;

            // Orbit force
            fx += tx * orbitStrength;
            fy += ty * orbitStrength;

            // Vortex adds pull/push
            if (field.mode === 'vortex') {
                fx += nx * strength * sign;
                fy += ny * strength * sign;
            }
        } else {
            // Standard Attract/Repel
            fx = nx * strength * sign;
            fy = ny * strength * sign;
        }

        // Local Damping (Stays centered in orbit)
        if (field.damping > 0) {
            const damping = field.damping;
            obj.physics.velocity.x *= (1 - damping * dt);
            obj.physics.velocity.y *= (1 - damping * dt);
        }

        obj.physics.velocity.x += (fx / (obj.physics.mass || 1)) * dt;
        obj.physics.velocity.y += (fy / (obj.physics.mass || 1)) * dt;
    }

    applyDipoleInteraction(obj, field, strength, dt) {
        const pDistA = field.poleDistance || 40;
        const pDistB = obj.poleDistance || 40;
        const rotA = (field.rotation || 0) * Math.PI / 180;
        const rotB = (obj.rotation || 0) * Math.PI / 180;

        // Field Poles (N/S)
        const fNx = field.x + Math.cos(rotA) * pDistA, fNy = field.y + Math.sin(rotA) * pDistA;
        const fSx = field.x - Math.cos(rotA) * pDistA, fSy = field.y - Math.sin(rotA) * pDistA;

        // Target Poles (N/S)
        // If target is NOT a dipole, just use its center as its only pole (North)
        const polesB = obj.isDipole ? [
            { x: obj.x + Math.cos(rotB) * pDistB, y: obj.y + Math.sin(rotB) * pDistB, type: 'n' },
            { x: obj.x - Math.cos(rotB) * pDistB, y: obj.y - Math.sin(rotB) * pDistB, type: 's' }
        ] : [
            { x: obj.x, y: obj.y, type: obj.polarity || 'n' }
        ];

        polesB.forEach(pB => {
            // Force from Field North
            const dNx = pB.x - fNx, dNy = pB.y - fNy;
            const distN = Math.sqrt(dNx * dNx + dNy * dNy) || 0.1;
            const forceN = (pB.type === 'n' ? 1 : -1) * (strength / (distN * 0.05)); // Stronger at close range

            // Force from Field South
            const dSx = pB.x - fSx, dSy = pB.y - fSy;
            const distS = Math.sqrt(dSx * dSx + dSy * dSy) || 0.1;
            const forceS = (pB.type === 's' ? 1 : -1) * (strength / (distS * 0.05));

            // Apply translation to object
            obj.physics.velocity.x += ((dNx / distN) * forceN + (dSx / distS) * forceS) * dt;
            obj.physics.velocity.y += ((dNy / distN) * forceN + (dSy / distS) * forceS) * dt;

            // Apply Torque (if target is dipole)
            if (obj.isDipole) {
                const rx = pB.x - obj.x;
                const ry = pB.y - obj.y;
                const tx = (dNx / distN) * forceN + (dSx / distS) * forceS;
                const ty = (dNy / distN) * forceN + (dSy / distS) * forceS;

                // 2D Cross Product for Torque: r x F
                const torque = (rx * ty - ry * tx);
                const inertia = 1000 * (obj.physics.mass || 1);
                if (!obj.physics.angularVelocity) obj.physics.angularVelocity = 0;
                obj.physics.angularVelocity += (torque / inertia) * dt;
            }
        });
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
