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

        this.gravity = 0;
        this.active = false;
        this.alpha = 1;
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
            // Optional: Expand pool or reuse oldest?
            // For now, cap limit
            return;
        }

        p.active = true;
        p.x = x;
        p.y = y;

        const angle = (config.angle || 0) + (Math.random() - 0.5) * (config.spread || 0);
        const speed = (config.speed || 100) * (0.8 + Math.random() * 0.4);

        // Convert angle (degrees) to radians
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

        p.gravity = config.gravity || 0;
        p.alpha = 1;

        this.activeParticles.push(p);
    }


    update(dt) {
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

            // Physics
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Interpolation
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
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}
