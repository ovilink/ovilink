/**
 * FlowchartShapes
 * Specific shape implementations for flowchart diagrams.
 */
import BaseShape from './BaseShape.js';

// process shape (Rectangle)
export class FlowchartProcess extends BaseShape {
    constructor(options) {
        super(options);
    }

    // Uses BaseShape's draw() which draws a rectangle

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },           // Top
            { x: x + width, y: y + height / 2 },  // Right
            { x: x + width / 2, y: y + height },  // Bottom
            { x: x, y: y + height / 2 }           // Left
        ];
    }
}

// Start/End shape (Rounded Rectangle)
export class FlowchartStartEnd extends BaseShape {
    constructor(options) {
        super(options);
        this.subtype = options.subtype || 'start'; // 'start' or 'end'

        // Semantic Styling
        if (this.subtype === 'start') {
            this.fillStyle = options.fillStyle || '#e6f4ea'; // Light Green
            this.strokeStyle = options.strokeStyle || '#137333'; // Dark Green
        } else {
            this.fillStyle = options.fillStyle || '#fce8e6'; // Light Red
            this.strokeStyle = options.strokeStyle || '#c5221f'; // Dark Red
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(26, 115, 232, 0.2)'; // Blue shadow
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#174ea6' : this.strokeStyle; // Darker blue selection
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const radius = Math.min(this.width, this.height) / 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.x, this.y, this.width, this.height, radius);
        } else {
            // Fallback for older browsers
            ctx.rect(this.x, this.y, this.width, this.height);
        }
        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        ];
    }
}

// Decision shape (Diamond)
export class FlowchartDecision extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 140;
        this.height = options.height || 80;
        this.fillStyle = options.fillStyle || '#feefc3'; // Light Orange/Yellow
        this.strokeStyle = options.strokeStyle || '#b06000'; // Darker Orange/Brown for contrast
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(176, 96, 0, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#e37400' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const h = this.width / 2;
        const k = this.height / 2;

        ctx.beginPath();
        ctx.moveTo(this.x + h, this.y);
        ctx.lineTo(this.x + this.width, this.y + k);
        ctx.lineTo(this.x + h, this.y + this.height);
        ctx.lineTo(this.x, this.y + k);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    isPointInside(x, y) {
        const h = this.width / 2;
        const k = this.height / 2;
        const px = x - (this.x + h);
        const py = y - (this.y + k);
        return (Math.abs(px) / h) + (Math.abs(py) / k) <= 1;
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        ];
    }
}

// Input/Output shape (Parallelogram)
export class FlowchartInputOutput extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 140;
        this.fillStyle = options.fillStyle || '#e8f0fe'; // Light Blue
        this.strokeStyle = options.strokeStyle || '#174ea6'; // Dark Blue
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(23, 78, 166, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#1967d2' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const skew = this.width * 0.2;
        ctx.beginPath();
        ctx.moveTo(this.x + skew, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width - skew, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const w = this.width;
        const h = this.height;
        const skew = w * 0.2;
        return [
            { x: this.x + w / 2, y: this.y },
            { x: this.x + w - skew / 2, y: this.y + h / 2 },
            { x: this.x + w / 2, y: this.y + h },
            { x: this.x + skew / 2, y: this.y + h / 2 }
        ];
    }
}

// Document shape (Rectangle with wavy bottom)
export class FlowchartDocument extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 120;
        this.height = options.height || 80;
        this.fillStyle = options.fillStyle || '#f3e8fd'; // Light Purple
        this.strokeStyle = options.strokeStyle || '#8e24aa'; // Dark Purple
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(142, 36, 170, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#7b1fa2' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Draw wavy bottom rectangle
        // Draw wavy bottom rectangle
        ctx.beginPath();
        const waveHeight = 8; // Amplitude
        const width = this.width;
        const height = this.height;

        ctx.moveTo(this.x, this.y); // Top Left
        ctx.lineTo(this.x + width, this.y);  // Top Right
        ctx.lineTo(this.x + width, this.y + height - 5);   // Bottom Right (Start slightly up)

        // Reflected Wave: Right->Up, Left->Down
        // 2 Quadratic Curves for S-shape
        // Curve 1: Right to Middle (Concave Up / Bump Up)
        // Control point: x + 0.75w, y + h - wave
        // End point: x + 0.5w, y + h
        ctx.quadraticCurveTo(
            this.x + width * 0.75, this.y + height - waveHeight - 5,
            this.x + width * 0.5, this.y + height - 5
        );

        // Curve 2: Middle to Left (Concave Down / Bump Down)
        // Control point: x + 0.25w, y + h + wave
        // End point: x, y + h
        ctx.quadraticCurveTo(
            this.x + width * 0.25, this.y + height + waveHeight - 5,
            this.x, this.y + height - 5
        );

        ctx.lineTo(this.x, this.y); // Close path to Top Left
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },           // Top
            { x: x + width, y: y + height / 2 },  // Right
            { x: x + width / 2, y: y + height - 5 },  // Bottom (Aligned with wave baseline)
            { x: x, y: y + height / 2 }           // Left
        ];
    }
}

// Preparation shape (Hexagon)
export class FlowchartPreparation extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 140;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#f3f3f3'; // Light Gray
        this.strokeStyle = options.strokeStyle || '#5f6368'; // Dark Grey
        this.textPadding = 40; // Avoid overlapping side lines
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(0, 137, 123, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#00796b' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Draw Hexagon
        const w = this.width / 2;
        const h = this.height / 2;
        const cx = this.x + w;
        const cy = this.y + h;
        const indent = 20;

        ctx.beginPath();
        ctx.moveTo(this.x, cy);
        ctx.lineTo(this.x + indent, this.y);
        ctx.lineTo(this.x + this.width - indent, this.y);
        ctx.lineTo(this.x + this.width, cy);
        ctx.lineTo(this.x + this.width - indent, this.y + this.height);
        ctx.lineTo(this.x + indent, this.y + this.height);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },           // Top
            { x: x + width, y: y + height / 2 },  // Right
            { x: x + width / 2, y: y + height },  // Bottom
            { x: x, y: y + height / 2 }           // Left
        ];
    }
}

// Database shape (Cylinder)
export class FlowchartDatabase extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 100;
        this.height = options.height || 120;
        this.fillStyle = options.fillStyle || '#eceff1'; // Silver/Grey
        this.strokeStyle = options.strokeStyle || '#546e7a'; // Blue Grey
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(84, 110, 122, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#455a64' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Dimensions
        const rx = this.width / 2;
        const ry = this.height * 0.15;
        const cx = this.x + rx;
        const bottomY = this.y + this.height - ry;
        const topY = this.y + ry;

        // 1. Draw Body Background
        ctx.fillStyle = this.fillStyle;
        ctx.beginPath();
        ctx.moveTo(this.x, topY);
        ctx.lineTo(this.x, bottomY);
        // Bottom Curve: Left (PI) to Right (0) via Bottom -> Anticlockwise (Decreasing Angle PI->0)
        ctx.ellipse(cx, bottomY, rx, ry, 0, Math.PI, 0, true);
        ctx.lineTo(this.x + this.width, topY);
        // Top Back Curve: Right (0) to Left (PI) via Top -> Anticlockwise (true)
        ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI, true);
        ctx.closePath();
        ctx.fill();

        // 2. Draw Top Cap (Full Ellipse)
        ctx.beginPath();
        ctx.ellipse(cx, topY, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // 3. Draw Body Outlines (Left, Bottom, Right)
        ctx.beginPath();
        ctx.moveTo(this.x, topY);
        ctx.lineTo(this.x, bottomY);
        // Bottom Curve
        ctx.ellipse(cx, bottomY, rx, ry, 0, Math.PI, 0, true);
        ctx.lineTo(this.x + this.width, topY);
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },            // Top
            { x: x + width, y: y + height / 2 },   // Right
            { x: x + width / 2, y: y + height },   // Bottom
            { x: x, y: y + height / 2 }            // Left
        ];
    }
}

// Manual Input shape (Sloped Top Rectangle)
export class FlowchartManualInput extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 120;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#e1f5fe'; // Very Light Blue
        this.strokeStyle = options.strokeStyle || '#0277bd'; // Medium Blue
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(2, 119, 189, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#01579b' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Shape: Rectangle with top sloping UP from Left to Right
        // Typically: Left height ~2/3 of Right height? 
        // Or Top edge is y + offset on left?
        // Let's do: Top-Left is lower (y + offset). Top-Right is highest (y).

        const slope = 20;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y + slope); // Top-Left (lower)
        ctx.lineTo(this.x + this.width, this.y); // Top-Right (highest)
        ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom-Right
        ctx.lineTo(this.x, this.y + this.height); // Bottom-Left
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        const slope = 20;
        return [
            { x: x + width / 2, y: y + (slope / 2) }, // Top (approx midpoint of slope)
            { x: x + width, y: y + height / 2 },      // Right
            { x: x + width / 2, y: y + height },      // Bottom
            { x: x, y: y + height / 2 + (slope / 2) } // Left (midpoint of left side)
        ];
    }
}

// Connector shape (Small Circle)
export class FlowchartConnector extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 40;
        this.height = options.height || 40;
        this.fillStyle = options.fillStyle || '#ffffff';
        this.strokeStyle = options.strokeStyle || '#5f6368';
        this.labelPosition = 'bottom'; // Smart solution: Label below circle
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#1a73e8' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const r = Math.min(this.width, this.height) / 2;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const r = Math.min(width, height) / 2;

        return [
            { x: cx, y: cy - r }, // Top
            { x: cx + r, y: cy }, // Right
            { x: cx, y: cy + r }, // Bottom
            { x: cx - r, y: cy }  // Left
        ];
    }
}

// Delay shape (D-shape / Bullet)
export class FlowchartDelay extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 120;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#fef7e0';
        this.strokeStyle = options.strokeStyle || '#f9ab00';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(249, 171, 0, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#e37400' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const r = this.height / 2;
        const w = this.width - r;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + w, this.y);
        ctx.arc(this.x + w, this.y + r, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.centerLabelInRect(ctx);
        ctx.restore();
    }

    centerLabelInRect(ctx) {
        if (!this.label) return;

        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Center in the geometric middle of the entire shape
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // Max width calculation to avoid hitting the curved edge too much
        // Rectangle ends at width - (height/2)
        const r = this.height / 2;
        const rectEnd = this.width - r;
        // Padding from the right curve start or edge
        const maxWidth = (rectEnd - (this.width / 2)) * 2 - 10;

        // Simple wrap logic
        const words = this.label.split(' ');
        let line = '';
        const lines = [];
        const lineHeight = this.fontSize * 1.2;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        let startY = cy - ((lines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], cx, startY + (i * lineHeight));
        }
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        ];
    }
}

// Predefined Process shape (Subroutine)
export class FlowchartPredefinedProcess extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 140; // Wider default
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#f3f3f3';
        this.strokeStyle = options.strokeStyle || '#5f6368';
        this.textPadding = 30; // 12px inset + 3px gap * 2
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#1a73e8' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Main Rectangle
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Inner Vertical Lines
        const inset = 12; // Reduced inset
        ctx.beginPath();
        ctx.moveTo(this.x + inset, this.y);
        ctx.lineTo(this.x + inset, this.y + this.height);
        ctx.moveTo(this.x + this.width - inset, this.y);
        ctx.lineTo(this.x + this.width - inset, this.y + this.height);
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        ];
    }
}

// Manual Operation (Inverted Trapezoid)
export class FlowchartManualOperation extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 120;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#f3e5f5'; // Light Purple/Pink tint
        this.strokeStyle = options.strokeStyle || '#8e24aa';
        this.textOffsetY = -20; // Shift text up more as requested
        this.textPadding = 30;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(142, 36, 170, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#7b1fa2' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Inverted Trapezoid
        // Top: Full width
        // Bottom: Narrower (inset)
        const inset = 20;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y); // Top Left
        ctx.lineTo(this.x + this.width, this.y); // Top Right
        ctx.lineTo(this.x + this.width - inset, this.y + this.height); // Bottom Right
        ctx.lineTo(this.x + inset, this.y + this.height); // Bottom Left
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        const inset = 20;
        return [
            { x: x + width / 2, y: y }, // Top
            { x: x + width - inset / 2, y: y + height / 2 }, // Right slope approx
            { x: x + width / 2, y: y + height }, // Bottom
            { x: x + inset / 2, y: y + height / 2 } // Left slope approx
        ];
    }
}

// Display (Bullet Shape)
export class FlowchartDisplay extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 120;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#e1f5fe'; // Light Blue
        this.strokeStyle = options.strokeStyle || '#0277bd';
        this.textPadding = 25;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(2, 119, 189, 0.2)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#01579b' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Bullet Shape:
        // Left, Top, Bottom lines.
        // Right side is two lines meeting at a point (Triangle tip).

        // Reflected Point Width
        const pointerWidth = 20;

        ctx.beginPath();
        ctx.moveTo(this.x + pointerWidth, this.y); // Top Left segment
        ctx.lineTo(this.x + this.width, this.y); // Top Right
        ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom Right
        ctx.lineTo(this.x + pointerWidth, this.y + this.height); // Bottom Left segment
        ctx.lineTo(this.x, this.y + this.height / 2); // Point Tip (Left side)
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.centerLabelInRect(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 } // Tip (Left)
        ];
    }

    centerLabelInRect(ctx) {
        if (!this.label) return;

        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Center in the rectangular part (right side)
        const pointerWidth = 20;
        const rectW = this.width - pointerWidth;
        const cx = this.x + pointerWidth + rectW / 2;
        const cy = this.y + this.height / 2;

        const maxWidth = rectW - 10;

        // Simple wrap logic
        const words = this.label.split(' ');
        let line = '';
        const lines = [];
        const lineHeight = this.fontSize * 1.2;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        let startY = cy - ((lines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], cx, startY + (i * lineHeight));
        }
    }
}

// Merge (Inverted Triangle)
export class FlowchartMerge extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 70; // Slightly larger
        this.height = options.height || 60;
        this.fillStyle = options.fillStyle || '#f3f3f3';
        this.strokeStyle = options.strokeStyle || '#5f6368';
        this.textOffsetY = -14; // Shifted down 2px from -16
        this.textPadding = 15; // Ensure it fits in the top area
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#1a73e8' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Inverted Triangle
        ctx.beginPath();
        ctx.moveTo(this.x, this.y); // Top Left
        ctx.lineTo(this.x + this.width, this.y); // Top Right
        ctx.lineTo(this.x + this.width / 2, this.y + this.height); // Bottom Point
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y }, // Top Middle
            { x: x + width * 0.75, y: y + height / 2 }, // Right slope
            { x: x + width / 2, y: y + height }, // Bottom Point
            { x: x + width * 0.25, y: y + height / 2 }, // Left slope
            { x: x, y: y }, // Top Left Corner
            { x: x + width, y: y } // Top Right Corner
        ];
    }
}

// Annotation / Note (Folded Corner Rectangle)
export class FlowchartAnnotation extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 100;
        this.height = options.height || 60; // Typically smaller
        this.fillStyle = options.fillStyle || '#fffde7'; // Post-it Yellow
        this.strokeStyle = options.strokeStyle || '#fbc02d'; // Golden
        this.textPadding = 15; // Increased padding for fold
        this.fontSize = options.fontSize || 12;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(251, 192, 45, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#f57f17' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Folded Corner Rectangle (Post-it)
        const foldSize = 15;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y); // Top Left
        ctx.lineTo(this.x + this.width - foldSize, this.y); // Top Right (start of fold)
        ctx.lineTo(this.x + this.width, this.y + foldSize); // Right Fold End
        ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom Right
        ctx.lineTo(this.x, this.y + this.height); // Bottom Left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Fold
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width - foldSize, this.y);
        ctx.lineTo(this.x + this.width - foldSize, this.y + foldSize);
        ctx.lineTo(this.x + this.width, this.y + foldSize);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x, y: y + height / 2 },          // Left
            { x: x + width / 2, y: y },           // Top
            { x: x + width / 2, y: y + height },  // Bottom
            { x: x + width, y: y + height / 2 }   // Right
        ];
    }
}

// Loop Limit (Chamfered Rectangle)
export class FlowchartLoopLimit extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 120;
        this.height = options.height || 60;
        this.fillStyle = options.fillStyle || '#e1f5fe'; // Light Blue
        this.strokeStyle = options.strokeStyle || '#0277bd';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(2, 119, 189, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#01579b' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const chamfer = 15;

        ctx.beginPath();
        ctx.moveTo(this.x + chamfer, this.y); // Top Left start
        ctx.lineTo(this.x + this.width - chamfer, this.y); // Top Right
        ctx.lineTo(this.x + this.width, this.y + chamfer); // Right Top
        ctx.lineTo(this.x + this.width, this.y + this.height - chamfer); // Right Bottom
        ctx.lineTo(this.x + this.width - chamfer, this.y + this.height); // Bottom Right
        ctx.lineTo(this.x + chamfer, this.y + this.height); // Bottom Left
        ctx.lineTo(this.x, this.y + this.height - chamfer); // Left Bottom
        ctx.lineTo(this.x, this.y + chamfer); // Left Top
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        ];
    }
}

// Internal Storage (Grid Rectangle)
export class FlowchartInternalStorage extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 120;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#f3f3f3';
        this.strokeStyle = options.strokeStyle || '#5f6368';
        this.textOffsetX = 7; // Fine-tuned shift
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#1a73e8' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Rectangle
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Grid Lines (One vertical ~20px from left, One horizontal ~20px from top)
        const offset = 15;

        ctx.beginPath();
        // Vertical
        ctx.moveTo(this.x + offset, this.y);
        ctx.lineTo(this.x + offset, this.y + this.height);
        // Horizontal
        ctx.moveTo(this.x, this.y + offset);
        ctx.lineTo(this.x + this.width, this.y + offset);
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        ];
    }
}

// Summing Junction (Circle with Plus)
export class FlowchartSummingJunction extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 50; // Small circle
        this.height = options.height || 50;
        this.fillStyle = options.fillStyle || '#ffffff';
        this.strokeStyle = options.strokeStyle || '#000000';
        this.labelPosition = 'bottom'; // Place label below to avoid symbol overlap
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#1a73e8' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const r = this.width / 2;
        const cx = this.x + r;
        const cy = this.y + r;

        // Circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Plus Sign (Standard Upright)
        const size = r * 0.6;

        ctx.beginPath();
        // Vertical
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx, cy + size);
        // Horizontal
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.stroke();

        if (this.label) this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const r = this.width / 2;
        return [
            { x: cx, y: cy - r }, // Top
            { x: cx + r, y: cy }, // Right
            { x: cx, y: cy + r }, // Bottom
            { x: cx - r, y: cy }  // Left
        ];
    }
}

// Collate (Hourglass / Bowtie)
export class FlowchartCollate extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 100;
        this.height = options.height || 80;
        this.fillStyle = options.fillStyle || '#ffe0b2'; // Light Orange
        this.strokeStyle = options.strokeStyle || '#ef6c00'; // Dark Orange
        this.labelPosition = 'bottom'; // Move label below to avoid hourglass waist
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(239, 108, 0, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#e65100' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Hourglass / Bowtie
        ctx.beginPath();
        ctx.moveTo(this.x, this.y); // Top Left
        ctx.lineTo(this.x + this.width, this.y); // Top Right
        ctx.lineTo(this.x, this.y + this.height); // Bottom Left;
        ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom Right
        ctx.closePath(); // Connects Bottom Right to Top Left (Z-shape fill = Bowtie)

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y }, // Top Middle
            { x: x + width * 0.75, y: y + height / 2 }, // Right intersection
            { x: x + width / 2, y: y + height }, // Bottom Middle
            { x: x + width * 0.25, y: y + height / 2 }  // Left intersection
        ];
    }
}

// Or (Circle with Cross)
export class FlowchartOr extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 50; // Small circle
        this.height = options.height || 50;
        this.fillStyle = options.fillStyle || '#ffffff';
        this.strokeStyle = options.strokeStyle || '#000000';
        this.labelPosition = 'bottom'; // Place label below to avoid symbol overlap
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#1a73e8' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const r = this.width / 2;
        const cx = this.x + r;
        const cy = this.y + r;

        // Circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Cross Sign (Rotated 'X')
        const size = r * 0.6;

        ctx.beginPath();
        // Diagonal 1
        ctx.moveTo(cx - size * 0.707, cy - size * 0.707);
        ctx.lineTo(cx + size * 0.707, cy + size * 0.707);
        // Diagonal 2
        ctx.moveTo(cx + size * 0.707, cy - size * 0.707);
        ctx.lineTo(cx - size * 0.707, cy + size * 0.707);
        ctx.stroke();

        if (this.label) this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const r = this.width / 2;
        return [
            { x: cx, y: cy - r }, // Top
            { x: cx + r, y: cy }, // Right
            { x: cx, y: cy + r }, // Bottom
            { x: cx - r, y: cy }  // Left
        ];
    }
}

// Off-Page Connector (Inverted Pentagon / Home Plate)
export class FlowchartOffPageConnector extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 60;
        this.height = options.height || 60;
        this.fillStyle = options.fillStyle || '#fce8e6'; // Light Red/Pink
        this.strokeStyle = options.strokeStyle || '#c5221f';
        this.labelPosition = 'bottom';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(197, 34, 31, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#b71c1c' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Inverted Pentagon
        ctx.beginPath();
        ctx.moveTo(this.x, this.y); // Top Left
        ctx.lineTo(this.x + this.width, this.y); // Top Right
        ctx.lineTo(this.x + this.width, this.y + this.height * 0.7); // Right Middle
        ctx.lineTo(this.x + this.width / 2, this.y + this.height); // Bottom Point
        ctx.lineTo(this.x, this.y + this.height * 0.7); // Left Middle
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y }, // Top
            { x: x + width, y: y + height * 0.35 }, // Right (approx)
            { x: x + width / 2, y: y + height }, // Bottom
            { x: x, y: y + height * 0.35 } // Left (approx)
        ];
    }
}

// Sort (Diamond with Horizontal Line)
export class FlowchartSort extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 100;
        this.height = options.height || 80;
        this.fillStyle = options.fillStyle || '#ffe0b2'; // Orange
        this.strokeStyle = options.strokeStyle || '#ef6c00';
        this.labelPosition = 'bottom'; // Moved to bottom to avoid line conflict
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(239, 108, 0, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#e65100' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const h = this.width / 2;
        const k = this.height / 2;

        ctx.beginPath();
        ctx.moveTo(this.x + h, this.y); // Top
        ctx.lineTo(this.x + this.width, this.y + k); // Right
        ctx.lineTo(this.x + h, this.y + this.height); // Bottom
        ctx.lineTo(this.x, this.y + k); // Left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Horizontal Line
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + k);
        ctx.lineTo(this.x + this.width, this.y + k);
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        ];
    }
}

// Extract (Triangle Point Up)
export class FlowchartExtract extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 80;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#fff9c4'; // Light Yellow
        this.strokeStyle = options.strokeStyle || '#fbc02d';
        // Label inside, pushed down
        this.textOffsetY = 20;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(251, 192, 45, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#f9a825' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Isosceles Triangle Point Up
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y); // Top Peak
        ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom Right
        ctx.lineTo(this.x, this.y + this.height); // Bottom Left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y }, // Top
            { x: x + width * 0.75, y: y + height / 2 }, // Right (approx)
            { x: x + width / 2, y: y + height }, // Bottom Middle
            { x: x + width * 0.25, y: y + height / 2 }, // Left (approx)
            // Extra bottom corners
            { x: x, y: y + height }, // Bottom Left
            { x: x + width, y: y + height } // Bottom Right
        ];
    }
}

// Card (Clipped Top Left Corner)
export class FlowchartCard extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 100;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#f3e5f5'; // Light Purple
        this.strokeStyle = options.strokeStyle || '#8e24aa';
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        if (this.isSelected || this.isHovered) {
            ctx.shadowColor = 'rgba(142, 36, 170, 0.2)';
            ctx.shadowBlur = 8;
        }

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#7b1fa2' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        const clip = 20;

        ctx.beginPath();
        ctx.moveTo(this.x + clip, this.y); // Top after clip
        ctx.lineTo(this.x + this.width, this.y); // Top Right
        ctx.lineTo(this.x + this.width, this.y + this.height); // Bottom Right
        ctx.lineTo(this.x, this.y + this.height); // Bottom Left
        ctx.lineTo(this.x, this.y + clip); // Left before clip
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Corner line (optional, adds detail)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + clip);
        ctx.lineTo(this.x + clip, this.y);
        ctx.stroke();

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },
            { x: x + width, y: y + height / 2 },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 }
        ];
    }
}

// Multiple Documents (Stacked)
export class FlowchartMultipleDocuments extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 100;
        this.height = options.height || 70;
        this.fillStyle = options.fillStyle || '#e1f5fe'; // Blue ish
        this.strokeStyle = options.strokeStyle || '#0277bd';
        this.textPadding = 30; // Increased padding to force text wrapping inside the front doc
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Helpers
        const offset = 8; // Stack offset
        // Constrain documents to fit INSIDE the bounding box
        const docW = this.width - (offset * 2);
        const docH = this.height - (offset * 2);
        const waveHeight = 6;

        const drawDoc = (x, y, w, h) => {
            ctx.beginPath();
            ctx.moveTo(x, y); // Top Left
            ctx.lineTo(x + w, y); // Top Right
            ctx.lineTo(x + w, y + h - waveHeight); // Right Bottom Start

            // Wave Bottom
            ctx.bezierCurveTo(
                x + w / 2, y + h + waveHeight, // Control 1
                x + w / 2, y + h - waveHeight * 2, // Control 2
                x, y + h - waveHeight // Left Bottom End
            );

            ctx.lineTo(x, y); // Back to Top Left
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };

        ctx.fillStyle = this.fillStyle;
        ctx.strokeStyle = this.isSelected ? '#01579b' : this.strokeStyle;
        ctx.lineWidth = this.isSelected ? 2 : this.lineWidth;

        // Draw Back Doc (Top Right aligned within bounds)
        // Starts at x + 2*offset, y
        drawDoc(this.x + offset * 2, this.y, docW, docH);

        // Draw Middle Doc
        drawDoc(this.x + offset, this.y + offset, docW, docH);

        // Draw Front Doc (Bottom Left aligned within bounds)
        // Starts at x, y + 2*offset
        drawDoc(this.x, this.y + offset * 2, docW, docH);

        // Adjust Label Position to center on Front Doc
        // Front Doc Center is shifted (-offset, +offset) relative to bounding box center
        const oldOX = this.textOffsetX;
        const oldOY = this.textOffsetY;

        this.textOffsetX = -offset;
        this.textOffsetY = offset;

        this.drawLabel(ctx);

        // Restore
        this.textOffsetX = oldOX;
        this.textOffsetY = oldOY;

        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        const offset = 8;
        const docW = width - (offset * 2);
        const docH = height - (offset * 2);

        return [
            // Top: Center of Back Doc Top Edge
            { x: x + (offset * 2) + docW / 2, y: y },

            // Right: Center of Back Doc Right Edge
            { x: x + width, y: y + docH / 2 },

            // Bottom: Center of Front Doc Bottom Edge (approx wave bottom)
            { x: x + docW / 2, y: y + height - 2 },

            // Left: Center of Front Doc Left Edge
            { x: x, y: y + (offset * 2) + docH / 2 }
        ];
    }
}
