/**
 * OviVector Plugin Entry Point
 */
import engine from '../../js/core/OviEngine.js';
import VectorEditor from './VectorEditor.js';

const OviVectorPlugin = {
    id: 'ovivector',
    name: 'OviVector',
    icon: 'Ve', // Vector

    init(engine) {
        console.log("OviVector: Initialized");
    },

    onActivate(engine) {
        console.log("OviVector: Activated");

        engine.layoutManager.setSidebarContent(`
            <div style="padding: 10px;">
                <button id="ovivector-new-btn" style="
                    width: 100%; 
                    padding: 8px; 
                    background: var(--bg-active); 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer;
                    margin-bottom: 15px;
                ">New Design</button>
            </div>
        `);

        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Vector Properties</div>
                <div style="font-size: 12px;">Tools: Pen, Shape, Path</div>
            </div>
        `);

        setTimeout(() => {
            const btn = document.getElementById('ovivector-new-btn');
            if (btn) {
                btn.onclick = () => {
                    const editor = new VectorEditor(engine);
                    editor.create();
                };
            }
        }, 0);
    },

    onDeactivate() {
        console.log("OviVector: Deactivated");
    },

    serialize() {
        // Find if there is an active vector editor tab/instance
        // FIXME: Current architecture doesn't store active editor instances centrally except "activeEditor" property usage which isn't standardized yet.
        // For now, let's assume we store the last created editor instance or loop tabs.
        // A better approach: PluginManager/TabManager should track instances. 
        // As a quick fix for this "Prototype", we will hook into 'this.activeEditor' which we will ensure is set in VectorEditor.

        if (this.activeEditor && this.activeEditor.svg) {
            return {
                svgContent: this.activeEditor.svg.innerHTML
            };
        }
        return null;
    },

    deserialize(data) {
        if (data && data.svgContent) {
            // Re-open tab
            const editor = new VectorEditor(engine);
            editor.create();
            // Inject content
            editor.svg.innerHTML = data.svgContent;
            // Re-bind selection logic? Events are on SVG, creating new innerHTML might break local references to elements if listeners were on elements.
            // But our VectorEditor listeners are delegated to 'this.svg' (mousedown target check), so it should work!
            this.activeEditor = editor;
        }
    }
};

// Register
engine.pluginManager.register(OviVectorPlugin);
export default OviVectorPlugin;
