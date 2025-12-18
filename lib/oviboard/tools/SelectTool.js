/**
 * Select Tool
 * Allows standard interaction (selection, dragging, UI clicks)
 */
class BaseTool {
    constructor(editor) {
        this.editor = editor;
    }
    onDown(pos, e) { }
    onMove(pos, e) { }
    onUp(pos, e) { }
    render(ctx) { }
}

export default class SelectTool extends BaseTool {
    constructor(editor) {
        super(editor);
    }
    // No specific logic needed here yet, 
    // as Editor.js handles interaction when this tool is active.
}
