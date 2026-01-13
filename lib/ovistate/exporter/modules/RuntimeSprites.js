
// Sprite Player Module
export class SpritePlayer {
    constructor() {
        this._textures = new Map();
    }

    getTexture(url) {
        if (!url) return null;
        if (this._textures.has(url)) return this._textures.get(url);
        const img = new Image();
        img.src = url;
        this._textures.set(url, img);
        return img;
    }

    update(obj, dt) {
        if (!obj.spriteSheet) return;
        if (obj._frame === undefined) obj._frame = 0;
        if (obj._timer === undefined) obj._timer = 0;
        const fps = obj.spriteFPS || 12;
        const frameCount = obj.frameCount || 1;
        const interval = 1 / fps;
        obj._timer += dt;
        if (obj._timer >= interval) {
            obj._timer -= interval;
            obj._frame++;
            if (obj._frame >= frameCount) {
                if (obj.loop !== false) obj._frame = 0;
                else obj._frame = frameCount - 1;
            }
        }
    }

    draw(ctx, obj) {
        const img = this.getTexture(obj.spriteSheet);
        if (!img || !img.complete) {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(-(obj.width || 64) / 2, -(obj.height || 64) / 2, obj.width || 64, obj.height || 64);
            return;
        }
        const cols = obj.spriteCols || 1;
        const rows = obj.spriteRows || 1;
        const frame = obj._frame || 0;
        const sw = img.width / cols;
        const sh = img.height / rows;
        const col = frame % cols;
        const row = Math.floor(frame / cols);
        const sx = col * sw;
        const sy = row * sh;
        const dw = obj.width || sw;
        const dh = obj.height || sh;
        ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    }
}