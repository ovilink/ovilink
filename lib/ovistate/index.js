/**
 * OviState Plugin Entry Point
 */
import engine from '../../js/core/OviEngine.js';
import OviStateEditor from './editor/Editor.js';
import Sidebar from './ui/Sidebar.js';
import Inspector from './ui/Inspector.js';

const OviStatePlugin = {
    id: 'ovistate',
    name: 'OviState',
    icon: 'St', // State

    init(engine) {
        console.log("OviState: Initialized");
    },

    onActivate(engine) {
        console.log("OviState: Activated");

        // 1. Setup UI using modular components
        Sidebar.render(engine, this);
        Inspector.render(engine);

        // Bind New Simulation button
        setTimeout(() => {
            const btn = document.getElementById('ovistate-new-btn');
            if (btn) {
                btn.onclick = () => {
                    this.activeEditor = new OviStateEditor(engine);
                    this.activeEditor.create();

                    // Update sidebar after editor is created
                    Sidebar.render(engine, this);
                };
            }
        }, 0);
    },

    onDeactivate() {
        console.log("OviState: Deactivated");
    },

    serialize() {
        if (this.activeEditor && this.activeEditor.runtime) {
            return {
                simulationData: this.activeEditor.getSimulationData()
            };
        }
        return null;
    },

    deserialize(data) {
        if (data && data.simulationData) {
            this.activeEditor = new OviStateEditor(engine);
            this.activeEditor.create();

            // Restore simulation data
            this.activeEditor.simulationData = data.simulationData;

            // Restore objects
            if (data.simulationData.objects) {
                data.simulationData.objects.forEach(obj => {
                    this.activeEditor.runtime.addObject(obj);
                });
            }
        }
    }
};

// Register
engine.pluginManager.register(OviStatePlugin);

import OviStateRuntime from './runtime/Core.js';
import RuntimeUI from './runtime/RuntimeUI.js';
export { OviStateRuntime, RuntimeUI };
export default OviStatePlugin;
