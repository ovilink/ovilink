/**
 * BaseShape
 * The foundational class for all drawable shapes in OviDiagram.
 * Implements common properties like position, dimensions, style, and hit testing.
 */
export default class BaseShape {
    constructor(options = {}) {
        this.id = options.id || `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = options.type || 'Base';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 120; // Slightly more compact default
        this.height = options.height || 60;
        this.label = options.label || '';

        // State
        this.isSelected = false;
        this.isHovered = false; // For hover effects
        this.isContainer = options.isContainer || false;

        // Visual Style - Professional Defaults
        this.fillStyle = options.fillStyle || '#ffffff';
        this.strokeStyle = options.strokeStyle || '#5f6368'; // Google/Material grey
        this.lineWidth = options.lineWidth || 2;
        this.opacity = options.opacity || 1.0;

        // Text Style
        this.textColor = options.textColor || '#202124';
        this.fontSize = options.fontSize || 14;
        this.fontFamily = options.fontFamily || 'Inter, "Segoe UI", sans-serif'; // Modern font stack
        this.textAlign = options.textAlign || 'center';
        this.verticalAlign = options.verticalAlign || 'middle';
    }

    // Capability Checks
    canConnectOutgoing() { return true; }
    canConnectIncoming() { return true; }

    /**
     * Draws the shape on the provided context.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Shadow for depth (Professional touch)
        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#1a73e8' : this.strokeStyle; // Google Blue for selection
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Draw path (Rectangle by default)
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    drawLabel(ctx) {
        if (!this.label) return;

        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let cx = this.x + this.width / 2 + (this.textOffsetX || 0);
        let cy = this.y + this.height / 2 + (this.textOffsetY || 0);

        // Position Logic
        if (this.labelPosition === 'bottom') {
            ctx.textBaseline = 'top';
            cy = this.y + this.height + 8; // Padding below shape
        }

        // Text Wrapping Logic (Simple)
        // Text Wrapping Logic (Enhanced for \n and width)
        const paragraphs = this.label.split('\n');
        const lines = [];
        const maxWidth = this.labelPosition === 'bottom' ? 120 : (this.width - (this.textPadding || 10));
        const lineHeight = this.fontSize * 1.2;

        paragraphs.forEach(paragraph => {
            const words = paragraph.split(' ');
            let line = '';

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
        });

        // Draw Lines
        if (lines.length > 1) {
            // Adjust start Y for center vertical alignment if inside
            if (this.labelPosition !== 'bottom') {
                cy -= ((lines.length - 1) * lineHeight) / 2;
            }

            lines.forEach((l, i) => {
                ctx.fillText(l.trim(), cx, cy + (i * lineHeight));
            });
        } else {
            ctx.fillText(this.label, cx, cy);
        }
    }

    /**
     * Checks if point (x, y) is inside the shape.
     */
    isPointInside(x, y) {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }

    /**
     * Returns connection points. To be overridden.
     */
    getConnectionPoints() {
        return [];
    }
}
