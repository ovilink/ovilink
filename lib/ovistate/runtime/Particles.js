/**
 * Particle System Engine
 * Handles high-performance particle pooling, emitters, and rendering.
 */

// Helper for color interpolation
function lerpColor(a, b, amount) {
    var ah = parseInt(a.replace(/#/g, ''), 16),
        bh = parseInt(b.replace(/#/g, ''), 16),
        ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
        br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
        rr = ar + amount * (br - ar),
        rg = ag + amount * (bg - ag),
        rb = ab + amount * (bb - ab);
    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + (rb | 0)).toString(16).slice(1);
}

export class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 1;

        this.color = '#ffffff';
        this.startColor = '#ffffff';
        this.endColor = '#ffffff';

        this.size = 2;
        this.startSize = 2;
        this.endSize = 2;

        this.rotation = 0;
        this.rotationSpeed = 0;

        this.gravity = 0;
        this.active = false;
        this.alpha = 1;
        this.texture = null;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = [];
        this.activeParticles = [];
        this.maxParticles = 1000; // Increased limit

        // Pre-warm pool
        for (let i = 0; i < this.maxParticles; i++) {
            this.pool.push(new Particle());
        }
    }

    spawn(x, y, config) {
        let p = null;
        if (this.pool.length > 0) {
            p = this.pool.pop();
        } else {
            return;
        }

        p.active = true;

        // Area Spawn
        let sx = x;
        let sy = y;
        if (config.spawnType === 'box') {
            sx += (Math.random() - 0.5) * (config.boxWidth || 0);
            sy += (Math.random() - 0.5) * (config.boxHeight || 0);
        } else if (config.spawnType === 'circle' || config.spawnRadius) {
            const r = (config.spawnRadius || 0) * Math.sqrt(Math.random());
            const theta = Math.random() * Math.PI * 2;
            sx += Math.cos(theta) * r;
            sy += Math.sin(theta) * r;
        }

        p.x = sx;
        p.y = sy;

        const angle = (config.angle || 0) + (Math.random() - 0.5) * (config.spread || 0);
        const speedVar = config.speedVariation !== undefined ? config.speedVariation : 0.4;
        const speed = (config.speed || 100) * (1 - speedVar / 2 + Math.random() * speedVar);

        const rad = angle * (Math.PI / 180);
        p.vx = Math.cos(rad) * speed;
        p.vy = Math.sin(rad) * speed;

        p.maxLife = (config.lifetime || 1) * (0.8 + Math.random() * 0.4);
        p.life = p.maxLife;

        p.startColor = config.color || '#ff0000';
        p.endColor = config.endColor || p.startColor;
        p.color = p.startColor;

        p.startSize = config.size || 3;
        p.endSize = config.endSize !== undefined ? config.endSize : p.startSize;
        p.size = p.startSize;

        p.rotation = config.rotation || 0;
        p.rotationSpeed = (config.rotationSpeed || 0) * (Math.random() - 0.5) * 2;

        p.gravity = config.gravity || 0;
        p.alpha = 1;
        p.texture = config.texture || null;

        this.activeParticles.push(p);
    }


    update(dt, objects = []) {
        // Filter force fields once per update for performance
        const forceFields = objects ? objects.filter(o => o.type === 'force_field') : [];

        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];

            p.life -= dt;
            if (p.life <= 0) {
                // Return to pool
                p.active = false;
                this.pool.push(p);
                this.activeParticles.splice(i, 1);
                continue;
            }

            // --- 1. Physics (Forces) ---

            // Gravity
            p.vy += p.gravity * dt;

            // Force Fields (Wind / Magnet)
            if (forceFields.length > 0) {
                forceFields.forEach(field => {
                    if (field.subtype === 'wind') {
                        // Wind Physics
                        const dx = p.x - field.x;
                        const dy = p.y - field.y;
                        const angle = (field.direction || 0) * (Math.PI / 180);
                        const rad = -angle;
                        const cos = Math.cos(rad), sin = Math.sin(rad);
                        const lx = dx * cos - dy * sin;
                        const ly = dx * sin + dy * cos;

                        const range = field.range || 400;
                        const zoneWidth = field.zoneWidth || 200;

                        let isInside = false;
                        if (field.shape === 'circle') {
                            const r = field.radius || 30;
                            isInside = (dx * dx + dy * dy <= r * r);
                        } else {
                            isInside = (lx >= -range / 2 && lx <= range / 2 && Math.abs(ly) <= zoneWidth / 2);
                        }

                        if (isInside) {
                            const strength = (field.strength !== undefined ? field.strength : 500) * dt;
                            let fx = Math.cos(angle) * strength;
                            let fy = Math.sin(angle) * strength;

                            if (field.turbulence > 0) {
                                fx += (Math.random() - 0.5) * 2 * strength * field.turbulence;
                                fy += (Math.random() - 0.5) * 2 * strength * field.turbulence;
                            }
                            p.vx += fx;
                            p.vy += fy;
                        }
                    } else if (field.subtype === 'magnet') {
                        // Magnet Physics
                        const dx = p.x - field.x;
                        const dy = p.y - field.y;
                        const distSq = dx * dx + dy * dy;
                        const dist = Math.sqrt(distSq);
                        const radius = field.radius || 150;
                        const innerRadius = field.innerRadius || 0;

                        if (dist < radius && dist > innerRadius) {
                            let strength = (field.strength !== undefined ? field.strength : 500);
                            const t = (dist - innerRadius) / (radius - innerRadius);
                            const falloff = field.falloff || 'quadratic';
                            if (falloff === 'linear') strength *= (1 - t);
                            else if (falloff === 'quadratic') strength *= (1 - t) * (1 - t);

                            const maxForce = field.maxForce || 2000;
                            strength = Math.min(strength, maxForce) * dt;
                            const sign = field.mode === 'repel' ? 1 : -1;
                            p.vx += (dx / dist) * strength * sign;
                            p.vy += (dy / dist) * strength * sign;
                        }
                    }
                });
            }

            // Integration
            const oldX = p.x;
            const oldY = p.y;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rotation += p.rotationSpeed * dt;

            // --- 2. Particle Collisions (Optional) ---
            if (objects && objects.length > 0) {
                // For performance, we could spatial-hash objects, but for now simple loop
                for (let j = 0; j < objects.length; j++) {
                    const obj = objects[j];
                    if (obj.type === 'emitter' || obj.type === 'force_field') continue;

                    // Check if object is a collider
                    if (obj.isSolid || obj.isCollider || (obj.physics && obj.physics.enabled)) {
                        const w = obj.width || 50;
                        const h = obj.height || 50;

                        // Simple AABB for particles (treat as points or small circles)
                        const hw = w / 2;
                        const hh = h / 2;

                        if (p.x >= obj.x - hw && p.x <= obj.x + hw &&
                            p.y >= obj.y - hh && p.y <= obj.y + hh) {

                            if (obj.killParticles) {
                                p.life = 0; // Destroy particle
                                break;
                            } else {
                                // Robust Bounce logic (using previous position)
                                const wasOutsideX = oldX < obj.x - hw || oldX > obj.x + hw;
                                const wasOutsideY = oldY < obj.y - hh || oldY > obj.y + hh;

                                if (wasOutsideY && !wasOutsideX) {
                                    // Hit Top or Bottom
                                    p.vy *= -0.8;
                                    p.y = oldY < obj.y ? obj.y - hh - p.size : obj.y + hh + p.size;
                                } else if (wasOutsideX && !wasOutsideY) {
                                    // Hit Left or Right
                                    p.vx *= -0.8;
                                    p.x = oldX < obj.x ? obj.x - hw - p.size : obj.x + hw + p.size;
                                } else {
                                    // Fallback for corners or extreme velocity
                                    const dx = p.x - obj.x;
                                    const dy = p.y - obj.y;
                                    if (Math.abs(dx / hw) > Math.abs(dy / hh)) {
                                        p.vx *= -0.8;
                                        p.x = obj.x + (dx > 0 ? hw + p.size : -hw - p.size);
                                    } else {
                                        p.vy *= -0.8;
                                        p.y = obj.y + (dy > 0 ? hh + p.size : -hh - p.size);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // --- 3. Visuals (Interpolation) ---
            const progress = 1 - (p.life / p.maxLife); // 0 to 1

            // Size
            p.size = p.startSize + (p.endSize - p.startSize) * progress;

            // Color
            if (p.startColor !== p.endColor) {
                try {
                    p.color = lerpColor(p.startColor, p.endColor, progress);
                } catch (e) { /* fallback if color format bad */ }
            }

            // Fade out
            p.alpha = p.life / p.maxLife;
        }
    }

    draw(ctx) {
        // ctx.globalCompositeOperation = 'lighter'; // REMOVED: Invisible on white background
        this.activeParticles.forEach(p => {
            ctx.globalAlpha = p.alpha;

            if (p.texture && p.texture.complete) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                const drawSize = p.size * 2;
                ctx.drawImage(p.texture, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
                ctx.restore();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}
