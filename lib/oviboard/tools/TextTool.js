/**
 * Text Tool
 * Creates text labels on the board.
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

export default class TextTool extends BaseTool {
    constructor(editor) {
        super(editor);
    }

    onDown(pos, e) {
        // Debugging
        console.log("Text Tool Clicked", pos);

        // Prevent default to avoid focus stealing issues if not careful, 
        // but we WANT input focus.

        // Convert World Pos to Screen Pos for the input element
        // The event 'e' gives us clientX/Y which is exactly what we need for fixed positioning
        // relative to the viewport (or absolute relative to container).

        // We need to append to the editor's parent element to ensure it's on top.
        const container = this.editor.parentElement;
        const rect = container.getBoundingClientRect();

        // Wait, camera transform logic?
        // pointer pos = (clientX - rect.left) / zoom - camera.x
        // so clientX = (pointer.x + camera.x) * zoom + rect.left??
        // actually simplest is just use e.clientX/Y from the event directly!

        // Use client coords directly
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // Defer input creation to ensure no event conflict
        setTimeout(() => {
            try {
                const input = document.createElement('textarea');
                input.style.position = 'absolute';
                input.style.left = `${screenX}px`;
                input.style.top = `${screenY}px`;
                input.style.font = '24px Arial';
                input.style.color = 'black';

                // HIGH VISIBILITY DEBUG STYLE
                input.style.background = 'white';
                input.style.border = '2px solid #00a8ff';
                input.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

                input.style.outline = 'none';
                input.style.padding = '5px';
                input.style.zIndex = '10000'; // Super high
                input.style.minWidth = '100px';
                input.style.minHeight = '40px';
                input.style.resize = 'both'; // Allow resize for UX

                container.appendChild(input);

                // Focus logic
                input.focus();

                // Commit Logic
                const commit = () => {
                    const text = input.value.trim();
                    if (text) {
                        this.createLabel(text, pos.x, pos.y);
                    }
                    if (input.parentNode) input.parentNode.removeChild(input);
                    // Switch back to Select tool? Or stay in Text tool?
                    // Usually stay in Text tool for multiple labels.
                };

                // Blur commits
                input.addEventListener('blur', () => {
                    // Small delay to allow 'Enter' to process if that caused blur
                    setTimeout(commit, 100);
                });

                // Keys
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                        ev.preventDefault();
                        input.blur(); // Trigger commit via blur
                    }
                    if (ev.key === 'Escape') {
                        if (input.parentNode) input.parentNode.removeChild(input);
                    }
                });

            } catch (err) {
                console.error("Text Tool Error:", err);
                // Fallback
                const text = prompt("Enter Text (Fallback):");
                if (text) this.createLabel(text, pos.x, pos.y);
            }
        }, 10);
    }

    createLabel(text, x, y) {
        // Import SmartObject class (it's global or available via editor import? 
        // Actually Editor.js imports it. The tool doesn't necessarily have it.
        // But we can construct the object data and let editor handle instantiation?
        // Or better: The Editor should expose a method 'addTextObject'
        // OR we just use the editor's objects array directly if we have access to the class.
        // Assuming SmartObject is available globally or we can import it.
        // Let's rely on Editor method for cleanliness, OR import it if we are a module.
        // Since we are in modules, we validly import SmartObject.
        // BUT to avoid circular deps with Editor, maybe we just push a plain object or require Editor to do it.
        // Let's try to stick to Editor methods.

        // Editor.js has addSmartObject, but it's designed for JSON.
        // Let's add a helper to Editor for adding simple objects, or just do it here if we can import.

        // Let's assume we can import SmartObject.
        // Wait, files are: lib/oviboard/objects/SmartObject.js

        // Dynamic Import or dependency injection is best.
        // Actually, Editor passes itself to Tool constructor.
        // does Editor expose SmartObject class? No.

        // Strategy: Use editor.addSmartObject logic but adapted.

        // Let's just update Editor.js to handle 'addText'.
        this.editor.addTextObject(text, x, y);
    }
}
