/**
 * Particle System Engine
 * Handles high-performance particle pooling, emitters, and rendering.
 */
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
        this.size = 2;
        this.active = false;
        this.alpha = 1;
    }
}

export class ParticleSystem {
    constructor() {
        this.pool = [];
        this.activeParticles = [];
        this.maxParticles = 500;

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
        p.color = config.color || '#ff0000';
        p.size = config.size || 3;
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

            p.x += p.vx * dt;
            p.y += p.vy * dt;

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
