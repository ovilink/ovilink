/**
 * Eraser Tool
 * Simple implementation: Paints with Background color (Effective "Whiteout")
 * Advanced would be vector removal or layer masking.
 */
export default class EraserTool {
    constructor(editor) {
        this.editor = editor;
        this.isDrawing = false;
        this.currentStroke = null;
    }

    onDown(pos, e) {
        this.isDrawing = true;
        this.currentStroke = {
            type: 'eraser',
            color: '#f5f5f5', // Match BG
            width: this.editor.toolManager.properties.size * 5, // Eraser usually bigger
            points: [{ x: pos.x, y: pos.y }]
        };
    }

    onMove(pos, e) {
        if (!this.isDrawing) return;
        this.currentStroke.points.push({ x: pos.x, y: pos.y });
    }

    onUp(pos, e) {
        if (this.isDrawing) {
            this.isDrawing = false;
            // For now, Eraser is just a "White Pen" stroke in the stack
            // Ideally, we'd use globalCompositeOperation = 'destination-out' when rendering this specific stroke
            // But standard list rendering makes that tricky without layers.
            // MVP: Push as whiteboard stroke.
            this.editor.strokes.push(this.currentStroke);
            this.currentStroke = null;
        }
    }

    render(ctx) {
        if (this.currentStroke && this.currentStroke.points.length > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; // Ghost preview
            ctx.lineWidth = this.currentStroke.width;
            ctx.lineCap = 'round';
            ctx.moveTo(this.currentStroke.points[0].x, this.currentStroke.points[0].y);
            for (let i = 1; i < this.currentStroke.points.length; i++) {
                ctx.lineTo(this.currentStroke.points[i].x, this.currentStroke.points[i].y);
            }
            ctx.stroke();

            // Cursor Ring
            const last = this.currentStroke.points[this.currentStroke.points.length - 1];
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(last.x, last.y, this.currentStroke.width / 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }
    }
}
