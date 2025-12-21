/**
 * BaseRenderer
 * Handles standard rendering operations for diagrams.
 */
export default class BaseRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.settings = {
            background: '#f8f9fa', // Clean light background
            gridType: 'dot',
            gridColor: '#dadce0',
            gridSize: 20
        };
    }

    drawBackground() {
        const { width, height } = this.ctx.canvas;
        this.ctx.fillStyle = this.settings.background;
        this.ctx.fillRect(0, 0, width, height);

        if (this.settings.gridType === 'dot') {
            this.ctx.fillStyle = this.settings.gridColor;
            for (let x = 0; x < width; x += this.settings.gridSize) {
                for (let y = 0; y < height; y += this.settings.gridSize) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 1, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }

    /**
     * Factory method to create specific shapes.
     * Should be overridden by subclasses.
     */
    createNode(nodeData, existingNodes = []) {
        return null;
    }
}
