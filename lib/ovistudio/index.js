import engine from '../../js/core/OviEngine.js';
import Sidebar from './Sidebar.js';
import StudioEditor from './StudioEditor.js';

const OviStudioPlugin = {
    id: 'ovistudio',
    name: 'OviStudio',
    icon: 'Sd',
    editors: new Map(), // tabId -> StudioEditor instance

    init(engine) {
        console.log("OviStudio: Initialized");
        this.engine = engine;
    },

    onActivate(engine) {
        console.log("OviStudio: Activated");
        Sidebar.render(engine, this);
    },

    createNewProject(name = "Untitled Production") {
        const editor = new StudioEditor(this.engine, this);
        const tabTitle = name;
        const tabId = this.engine.tabManager.openTab(tabTitle, this.id, editor.container, editor);

        editor.id = tabId;
        this.editors.set(tabId, editor);

        // Re-render sidebar to reflect the new active state
        Sidebar.render(this.engine, this);

        return editor;
    },

    refreshSidebar() {
        Sidebar.render(this.engine, this);
    },

    getActiveEditor() {
        const activeTabId = this.engine.tabManager.activeTabId;
        return this.editors.get(activeTabId);
    }
};

// Register plugin
engine.pluginManager.register(OviStudioPlugin);

export default OviStudioPlugin;
