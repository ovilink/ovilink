/**
 * OviBlock Plugin Entry Point
 */
import engine from '../../js/core/OviEngine.js';
import BlockEditor from './BlockEditor.js';

const OviBlockPlugin = {
    id: 'oviblock',
    name: 'OviBlock',
    icon: 'Bl', // Block

    init(engine) {
        console.log("OviBlock: Initialized");
    },

    onActivate(engine) {
        console.log("OviBlock: Activated");

        engine.layoutManager.setSidebarContent(`
            <div class="sidebar-section">
                <button id="oviblock-new-btn" class="btn-full btn-primary">New Block Script</button>
            </div>
        `);

        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Block Properties</div>
                <div style="font-size: 12px;">Drag blocks to build logic.</div>
            </div>
        `);

        setTimeout(() => {
            const btn = document.getElementById('oviblock-new-btn');
            if (btn) {
                btn.onclick = () => {
                    const editor = new BlockEditor(engine);
                    editor.create();
                };
            }
        }, 0);
    },

    onDeactivate() {
        console.log("OviBlock: Deactivated");
    }
};

// Register
engine.pluginManager.register(OviBlockPlugin);
export default OviBlockPlugin;
