/**
 * BpmnShapes
 * Specific shape implementations for BPMN 2.0 diagrams.
 */
import BaseShape from './BaseShape.js';

// BPMN Event (Circle)
export class BpmnEvent extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 40;
        this.height = options.height || 40;
        this.eventType = options.eventType || 'start'; // start, end, intermediate

        // Smart Defaults
        this.labelPosition = 'bottom'; // Label outside

        // Semantic Colors
        if (this.eventType === 'start') {
            this.fillStyle = options.fillStyle || '#e6f4ea'; // Soft Green
            this.strokeStyle = options.strokeStyle || '#137333'; // Deep Green
            this.strokeWidth = 1;
        } else if (this.eventType === 'end') {
            this.fillStyle = options.fillStyle || '#fce8e6'; // Soft Red
            this.strokeStyle = options.strokeStyle || '#c5221f'; // Deep Red
            this.strokeWidth = 3;
        } else if (this.eventType === 'intermediate') {
            this.fillStyle = options.fillStyle || '#fef7e0'; // Soft Yellow
            this.strokeStyle = options.strokeStyle || '#e37400'; // Deep Orange
            this.strokeWidth = 1;
        } else {
            this.fillStyle = options.fillStyle || '#ffffff';
            this.strokeStyle = options.strokeStyle || '#000000';
        }
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
        ctx.lineWidth = this.isSelected ? 2 : (this.strokeWidth || 1);

        // Draw Circle
        ctx.beginPath();
        const radius = this.width / 2;
        ctx.arc(this.x + radius, this.y + radius, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Intermediate: Double circle
        if (this.eventType === 'intermediate') {
            ctx.beginPath();
            ctx.arc(this.x + radius, this.y + radius, radius - 4, 0, 2 * Math.PI);
            ctx.stroke();
        }

        this.drawLabel(ctx);
        ctx.restore();
    }

    // Connection points: cardinal directions on circle
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

    canConnectOutgoing() {
        return this.eventType !== 'end';
    }

    canConnectIncoming() {
        return this.eventType !== 'start';
    }
}

// BPMN Task (Rounded Rectangle)
export class BpmnTask extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 100;
        this.height = options.height || 80;
        this.taskType = options.taskType || 'none'; // none, user, service, etc.

        // Semantic Colors
        this.fillStyle = options.fillStyle || '#e8f0fe'; // Soft Blue
        this.strokeStyle = options.strokeStyle || '#1a73e8'; // Google Blue
        this.labelPosition = 'center';
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
        ctx.lineWidth = this.isSelected ? 2 : 1;

        // Rounded Rect
        // Rounded Rect (Manual implementation for compatibility)
        const radius = 10;
        ctx.beginPath();
        ctx.moveTo(this.x + radius, this.y);
        ctx.lineTo(this.x + this.width - radius, this.y);
        ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + radius);
        ctx.lineTo(this.x + this.width, this.y + this.height - radius);
        ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - radius, this.y + this.height);
        ctx.lineTo(this.x + radius, this.y + this.height);
        ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - radius);
        ctx.lineTo(this.x, this.y + radius);
        ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Markers (Simple icons for now)
        if (this.taskType === 'user') {
            // Little person icon top left
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#174ea6';
            ctx.fillText('👤', this.x + 5, this.y + 15);
        } else if (this.taskType === 'service') {
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#174ea6';
            ctx.fillText('⚙️', this.x + 5, this.y + 15);
        }

        this.drawLabel(ctx);
        ctx.restore();
    }

    getConnectionPoints() {
        const { x, y, width, height } = this;
        return [
            { x: x + width / 2, y: y },             // Top
            { x: x + width, y: y + height / 2 },    // Right
            { x: x + width / 2, y: y + height },    // Bottom
            { x: x, y: y + height / 2 }             // Left
        ];
    }
}

// BPMN Gateway (Diamond)
export class BpmnGateway extends BaseShape {
    constructor(options) {
        super(options);
        this.width = options.width || 50;
        this.height = options.height || 50;
        this.gatewayType = options.gatewayType || 'exclusive'; // exclusive, parallel, inclusive

        // Semantic Colors
        this.fillStyle = options.fillStyle || '#fef7e0'; // Soft Orange
        this.strokeStyle = options.strokeStyle || '#ea8600'; // Deep Orange
        this.labelPosition = 'bottom';
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
        ctx.lineWidth = this.isSelected ? 2 : 1;

        // Diamond
        const w = this.width / 2;
        const h = this.height / 2;
        ctx.beginPath();
        ctx.moveTo(this.x + w, this.y);
        ctx.lineTo(this.x + this.width, this.y + h);
        ctx.lineTo(this.x + w, this.y + this.height);
        ctx.lineTo(this.x, this.y + h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner Marker
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cx = this.x + w;
        const cy = this.y + h;

        ctx.font = '24px sans-serif'; // Bigger font for symbol

        if (this.gatewayType === 'exclusive') {
            // X
            ctx.fillText('×', cx, cy);
        } else if (this.gatewayType === 'parallel') {
            // +
            ctx.fillText('+', cx, cy);
        } else if (this.gatewayType === 'inclusive') {
            // O
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
            ctx.stroke();
        }

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
