import LayoutManager from '../ui/LayoutManager.js';
import PluginManager from './PluginManager.js';
import TabManager from '../ui/TabManager.js';
import DataManager from './DataManager.js';
import ProjectManager from './ProjectManager.js';
import PanelManager from '../ui/PanelManager.js';
import ExportManager from './ExportManager.js';
import SceneRegistry from './SceneRegistry.js';

class OviEngine {
    constructor() {
        if (OviEngine.instance) {
            return OviEngine.instance;
        }
        OviEngine.instance = this;

        this.layoutManager = new LayoutManager();
        this.tabManager = new TabManager();
        this.pluginManager = new PluginManager(this);
        this.dataManager = new DataManager(this);
        this.exportManager = new ExportManager(this);
        this.projectManager = new ProjectManager(this);
        this.panelManager = new PanelManager(this);

        // --- OviHub System ---
        this.sceneRegistry = SceneRegistry;
        this.sceneRegistry.attachToEngine(this);

        this.init();
    }

    init() {
        console.log("OviEngine: Initializing...");
        this.layoutManager.init();
        this.tabManager.init();
        this.dataManager.init();
        this.pluginManager.init();
        this.projectManager.init(); // Init last to add buttons
        this.panelManager.init(); // Init after everything else
        console.log("OviEngine: Ready.");
    }
}

// Export a singleton instance
const engine = new OviEngine();
export default engine;
