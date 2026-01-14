
// Particle System Module
export class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.life = 0; this.maxLife = 1;
        this.color = '#ffffff'; this.startColor = '#ffffff'; this.endColor = '#ffffff';
        this.size = 2; this.startSize = 2; this.endSize = 2;
        this.rotation = 0; this.rotationSpeed = 0; this.gravity = 0; this.active = false; this.alpha = 1;
        this.texture = null;
    }
}
export class ParticleSystem {
    constructor() {
        this.pool = []; this.activeParticles = []; this.maxParticles = 1000;
        this.textureCache = {}; // Cache for particle textures
        for (let i = 0; i < this.maxParticles; i++) this.pool.push(new Particle());
    }

    getTexture(url) {
        if (!url) return null;
        if (this.textureCache[url]) return this.textureCache[url];
        const img = new Image();
        img.src = url;
        this.textureCache[url] = img;
        return img;
    }

    spawn(x, y, config) {
        let p = this.pool.length > 0 ? this.pool.pop() : null; if (!p) return;
        p.active = true;

        // --- 1. Spawn Location (Spawn Shapes) ---
        let sx = x, sy = y;
        if (config.spawnType === 'box') {
            sx += (Math.random() - 0.5) * (config.boxWidth || 100);
            sy += (Math.random() - 0.5) * (config.boxHeight || 100);
        } else if (config.spawnType === 'circle') {
            const r = (config.spawnRadius || 50) * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            sx += r * Math.cos(theta);
            sy += r * Math.sin(theta);
        }
        p.x = sx;
        p.y = sy;

        // --- 2. Dynamics (Velocity & Rotation) ---
        const angleBase = config.angle !== undefined ? config.angle : -90;
        const spread = config.spread || 0;
        const angle = angleBase + (Math.random() - 0.5) * spread;
        const rad = angle * (Math.PI / 180);

        // Speed Variation
        const speedVar = config.speedVariation !== undefined ? config.speedVariation : 0.4;
        const speed = (config.speed || 100) * (1.0 + (Math.random() - 0.5) * speedVar * 2);

        p.vx = Math.cos(rad) * speed;
        p.vy = Math.sin(rad) * speed;

        p.rotation = (config.particleRotation || 0) * Math.PI / 180;
        p.rotationSpeed = (config.particleRotationSpeed || 0) * Math.PI / 180;

        p.maxLife = (config.lifetime || 1) * (0.8 + Math.random() * 0.4);
        p.life = p.maxLife;

        // --- 3. Properties ---
        p.startColor = config.color || '#ff0000';
        p.endColor = config.endColor || p.startColor;
        p.color = p.startColor;

        const baseSize = config.particleSize || config.size || 3;
        const endSize = config.endSize !== undefined ? config.endSize : baseSize;

        p.startSize = baseSize;
        p.endSize = endSize;
        p.size = baseSize;

        p.gravity = config.particleGravity !== undefined ? config.particleGravity : (config.gravity || 0);

        // Texture
        if (config.textureUrl) {
            p.texture = this.getTexture(config.textureUrl);
        } else {
            p.texture = null;
        }

        this.activeParticles.push(p);
    }

    // Helper for Hex Color Interpolation
    lerpColor(a, b, t) {
        const ah = parseInt(a.replace(/#/g, ''), 16), ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16), br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
            rr = ar + t * (br - ar), rg = ag + t * (bg - ag), rb = ab + t * (bb - ab);
        return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + (rb | 0)).toString(16).slice(1);
    }

    update(dt, objects = []) {
        // Filter force fields once per update for performance
        const forceFields = (objects && Array.isArray(objects)) ? objects.filter(o => o.type === 'force_field') : [];

        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i]; p.life -= dt;
            if (p.life <= 0) { p.active = false; this.pool.push(p); this.activeParticles.splice(i, 1); continue; }

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
                        const radius = field.radius || (field.width ? field.width / 2 : 150);
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

            // --- 2. Particle Collisions (Optional / Existing) ---
            if (objects && objects.length > 0) {
                for (const obj of objects) {
                    // Check against objects with physics enabled (or explicit collider flag)
                    if ((obj.physics && obj.physics.enabled) || obj.isSolid || obj.isCollider) {
                        const w = obj.width || 50;
                        const h = obj.height || 50;
                        // AABB Collision (Simple)
                        const hw = w / 2;
                        const hh = h / 2;

                        if (p.x >= obj.x - hw && p.x <= obj.x + hw &&
                            p.y >= obj.y - hh && p.y <= obj.y + hh) {

                            if (obj.killParticles) {
                                p.life = 0; // Destroy particle
                                break;
                            }

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

            const t = 1 - (p.life / p.maxLife); // 0 to 1
            p.alpha = 1 - t; // Fade out
            p.size = p.startSize + (p.endSize - p.startSize) * t;

            // Color Interpolation
            if (p.startColor !== p.endColor) {
                p.color = this.lerpColor(p.startColor, p.endColor, t);
            }
        }
    }
    draw(ctx) {
        this.activeParticles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;

            if (p.texture && p.texture.complete && p.texture.naturalWidth !== 0) {
                const s = p.size < 0 ? 0 : p.size * 2; // Treat size as radius approx
                ctx.drawImage(p.texture, -s / 2, -s / 2, s, s);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(0, 0, p.size < 0 ? 0 : p.size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        });
        ctx.globalAlpha = 1.0;
    }
}