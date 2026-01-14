/**
 * OviChart Plugin Entry Point
 */
import engine from '../../js/core/OviEngine.js';
import ChartEditor from './ChartEditor.js';

const OviChartPlugin = {
    id: 'ovichart',
    name: 'OviChart',
    icon: 'Ch', // Chart

    init(engine) {
        console.log("OviChart: Initialized");
    },

    onActivate(engine) {
        console.log("OviChart: Activated");

        engine.layoutManager.setSidebarContent(`
            <div class="sidebar-section">
                <button id="ovichart-new-btn" class="btn-full btn-primary">New Chart</button>
            </div>
        `);

        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Chart Properties</div>
                <div style="font-size: 12px;">Type: Bar/Line</div>
            </div>
        `);

        setTimeout(() => {
            const btn = document.getElementById('ovichart-new-btn');
            if (btn) {
                btn.onclick = () => {
                    const editor = new ChartEditor(engine);
                    editor.create();
                };
            }
        }, 0);
    },

    onDeactivate() {
        console.log("OviChart: Deactivated");
    }
};

// Register
engine.pluginManager.register(OviChartPlugin);
export default OviChartPlugin;
