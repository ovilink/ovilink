/**
 * OviBoard Main Controller
 */
import Editor from './editor/Editor.js';
import Sidebar from './ui/Sidebar.js';
import Inspector from './ui/Inspector.js';

export default class OviBoard {
    constructor(engine) {
        this.engine = engine;
    }

    get activeEditor() {
        return this.engine.tabManager.activeEditorInstance;
    }

    activate() {
        // Render Initial UI
        Sidebar.render(this.engine, this);

        // If there is an active editor (tab switch), render inspector for it
        const activeEditor = this.engine.tabManager.activeEditorInstance;
        if (activeEditor && activeEditor instanceof Editor) {
            Inspector.render(this.engine, activeEditor);
        } else {
            Inspector.render(this.engine, null);
        }
    }

    deactivate() {
        // UI cleanup handled by Engine
    }

    /**
     * Creates a new Board Tab
     */
    createBoard(name = 'New Board') {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.position = 'relative';
        // Note: Editor.js attach() logic needs to support appending to this container

        const editor = new Editor(this.engine);

        // Open Tab
        // openTab(title, pluginId, content, editorInstance)
        this.engine.tabManager.openTab(name, 'oviboard', container, editor);

        // Attach Editor to the Container (Must be done after or during creation)
        if (editor.attachToElement) {
            editor.attachToElement(container);
        } else {
            // Fallback for current Editor.js which might assume attaching itself
            // We need to update Editor.js to allow passing a parent
            console.error("Editor.js needs attachToElement method!");
        }

        // Update UI
        Sidebar.render(this.engine, this);
        Inspector.render(this.engine, editor);
    }

    serialize() {
        // Serialize current active editor
        const activeEditor = this.engine.tabManager.activeEditorInstance;
        return (activeEditor && activeEditor instanceof Editor) ? activeEditor.save() : null;
    }

    deserialize(data) {
        // Create new board with loaded data
        this.createBoard('Imported Board');
        const activeEditor = this.engine.tabManager.activeEditorInstance;
        if (activeEditor) {
            activeEditor.load(data);
        }
    }
}
