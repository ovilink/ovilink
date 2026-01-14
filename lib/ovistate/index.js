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

        // Listen for Vector Imports (Prevent duplicates)
        if (!window._oviStateListenerAttached) {
            window._oviStateListenerAttached = true;
            window.addEventListener('ovi:import-vector', (e) => {
                // Auto-create editor if missing
                if (!this.activeEditor) {
                    console.log("OviState: Auto-initializing editor for import...");
                    this.activeEditor = new OviStateEditor(engine);
                    this.activeEditor.create();
                    Sidebar.render(engine, this);
                }

                // Force Activate Plugin View
                if (engine.pluginManager.activePluginId !== 'ovistate') {
                    engine.pluginManager.activate('ovistate');
                }

                // Small delay to ensure UI/Runtime is fully ready
                setTimeout(() => {
                    if (this.activeEditor && this.activeEditor.runtime) {
                        if (e.detail && e.detail.objects) {
                            console.log("OviState: Receiving Vector Import", e.detail.objects);

                            // Clear existing scene to prevent duplication/stacking
                            if (this.activeEditor.runtime.clear) {
                                this.activeEditor.runtime.clear();
                            } else {
                                // Fallback if clear() doesn't exist (manual reset)
                                this.activeEditor.runtime.objects = [];
                            }

                            e.detail.objects.forEach(obj => {
                                this.activeEditor.runtime.addObject(obj);
                            });
                            console.log("OviState: Import Complete.");
                            alert("Imported " + e.detail.objects.length + " objects from OviVector.");
                        } else {
                            console.warn("OviState: Event detail missing objects", e.detail);
                        }
                    } else {
                        console.error("OviState: Editor or Runtime missing after initialization attempt.", this.activeEditor);
                    }
                }, 100);
            });
        }
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
            data.simulationData.objects.forEach(obj => {
                this.activeEditor.runtime.addObject(obj);
            });

            // Restore & Render Controls
            if (data.simulationData.controls) {
                // Determine parent container for UI (Editor.js uses overlayZone)
                // We need access to overlayZone. Editor exposes it? 
                // Editor.js: this.overlayZone = ...
                const parent = this.activeEditor.overlayZone;

                data.simulationData.controls.forEach(control => {
                    this.activeEditor.runtime.addControl(control);
                    if (parent) {
                        this.activeEditor.renderUIComponent(control, parent);
                    }
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
