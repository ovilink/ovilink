/**
 * Tool Manager
 * Handles switching tools and routing input
 */
import PenTool from '../tools/PenTool.js';
import EraserTool from '../tools/EraserTool.js';
import SelectTool from '../tools/SelectTool.js';
import TextTool from '../tools/TextTool.js';

export default class ToolManager {
    constructor(editor) {
        this.editor = editor;

        // Tool Registry
        this.tools = {
            'select': new SelectTool(editor),
            'pen': new PenTool(editor),
            'text': new TextTool(editor),
            'eraser': new EraserTool(editor)
        };

        this.activeToolId = 'pen';
        this.activeTool = this.tools['pen'];

        // Global Tool Properties
        this.properties = {
            color: '#000000',
            size: 5
        };
    }

    setTool(id) {
        if (this.tools[id]) {
            this.activeToolId = id;
            this.activeTool = this.tools[id];
            console.log("Activte Tool:", id);
        }
    }

    setColor(color) {
        this.properties.color = color;
    }

    setSize(size) {
        this.properties.size = size;
    }

    // Input Delegation
    onDown(pos, e) {
        if (this.activeTool) this.activeTool.onDown(pos, e);
    }

    onMove(pos, e) {
        if (this.activeTool) this.activeTool.onMove(pos, e);
    }

    onUp(pos, e) {
        if (this.activeTool) this.activeTool.onUp(pos, e);
    }

    render(ctx) {
        if (this.activeTool) this.activeTool.render(ctx);
    }
}
