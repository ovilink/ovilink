/**
 * OviGraph Plugin Entry Point
 */
import engine from '../../js/core/OviEngine.js';
import GraphEditor from './GraphEditor.js';
import Sidebar from './ui/Sidebar.js';
import Inspector from './ui/Inspector.js';

const OviGraphPlugin = {
    id: 'ovigraph',
    name: 'OviGraph',
    icon: 'Gr',

    init(engine) {
        console.log("OviGraph: Initialized (Modular)");
    },

    onActivate(engine) {
        console.log("OviGraph: Activated");

        // 1. Setup UI
        Sidebar.render(engine, this);
        Inspector.render(engine);
    },

    createNewWorkflow(engine) {
        this.activeEditor = new GraphEditor(engine);
        this.activeEditor.create();
    },

    onDeactivate() {
        console.log("OviGraph: Deactivated");
    }
};

// Register
engine.pluginManager.register(OviGraphPlugin);
export default OviGraphPlugin;
