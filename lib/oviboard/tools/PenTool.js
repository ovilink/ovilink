import ShapeRecognizer from '../utils/ShapeRecognizer.js';

class BaseTool {
    constructor(editor) {
        this.editor = editor;
    }
    onDown(pos, e) { }
    onMove(pos, e) { }
    onUp(pos, e) { }
    render(ctx) { }
}

export default class PenTool extends BaseTool {
    constructor(editor) {
        super(editor);
        this.isDrawing = false;
        this.currentStroke = null;
        this.recognizer = new ShapeRecognizer();
    }

    onDown(pos, e) {
        this.isDrawing = true;
        this.currentStroke = {
            type: 'pen',
            color: this.editor.toolManager.properties.color || 'black',
            width: this.editor.toolManager.properties.size || 2,
            points: [{ x: pos.x, y: pos.y, p: pos.pressure }]
        };
    }

    onMove(pos, e) {
        if (!this.isDrawing) return;
        const last = this.currentStroke.points[this.currentStroke.points.length - 1];
        if (last) {
            const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
            if (dist < 2) return;
        }
        this.currentStroke.points.push({ x: pos.x, y: pos.y, p: pos.pressure });
    }

    onUp(pos, e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        const subject = this.editor.smartInput ? this.editor.smartInput.subject : 'general';

        if (this.currentStroke && this.currentStroke.points.length > 5 && (subject === 'math' || subject === 'geometry')) {
            const shape = ShapeRecognizer.recognize(this.currentStroke.points, this.editor.objects);

            if (shape) {
                if (shape.type === 'shape') {
                    // PREPARE RELATIVE VERTICES for rendering
                    let relativeVertices = [];
                    if (shape.vertices) {
                        relativeVertices = shape.vertices.map(v => ({
                            x: v.x - shape.x,
                            y: v.y - shape.y
                        }));
                    }

                    // Add Shape
                    this.editor.addSmartObject({
                        type: 'shape',
                        x: shape.x,
                        y: shape.y,
                        width: shape.width,
                        height: shape.height,
                        content: {
                            shapeType: shape.shapeType,
                            vertices: relativeVertices, // Store this!
                            color: this.currentStroke.color,
                            fill: 'transparent'
                        }
                    });

                    // AUTO-LABELING (Smart Offset)
                    if (shape.vertices && shape.vertices.length > 0) {
                        const labels = ['A', 'B', 'C', 'D', 'E'];
                        const cx = shape.x + shape.width / 2;
                        const cy = shape.y + shape.height / 2;

                        shape.vertices.forEach((v, i) => {
                            if (i >= labels.length) return;

                            const dx = v.x - cx;
                            const dy = v.y - cy;
                            const len = Math.hypot(dx, dy);

                            const padding = 20;
                            const nx = dx / len;
                            const ny = dy / len;

                            const lx = v.x + nx * padding - 10; // Keep the -10px shift
                            const ly = v.y + ny * padding - 15;

                            this.editor.addSmartObject({
                                type: 'text',
                                x: lx,
                                y: ly,
                                width: 50,
                                height: 40,
                                content: {
                                    text: labels[i],
                                    fontSize: 24,
                                    fontStyle: 'italic',
                                    fontFamily: 'Times New Roman',
                                    color: '#e74c3c'
                                }
                            });
                        });
                    }
                }
                else if (shape.type === 'connector') {
                    this.editor.addSmartObject({
                        type: 'connector', from: shape.from, to: shape.to, content: { color: shape.color }
                    });
                }

                this.currentStroke = null;
                this.editor.render();
                return;
            }
        }

        if (this.currentStroke && this.currentStroke.points.length > 1) {
            this.editor.strokes.push(this.currentStroke);
        }
        this.currentStroke = null;
        this.editor.render();
    }

    render(ctx) {
        if (this.currentStroke && this.currentStroke.points.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.currentStroke.color;
            ctx.lineWidth = this.currentStroke.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const points = this.currentStroke.points;
            if (points.length < 3) {
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) { ctx.lineTo(points[i].x, points[i].y); }
            } else {
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length - 2; i++) {
                    const cx = (points[i].x + points[i + 1].x) / 2;
                    const cy = (points[i].y + points[i + 1].y) / 2;
                    ctx.quadraticCurveTo(points[i].x, points[i].y, cx, cy);
                }
                ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y);
            }
            ctx.stroke();
        }
    }
}
