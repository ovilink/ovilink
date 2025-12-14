/**
 * OviDiagram Plugin
 * For flowcharts and mind maps.
 */
import engine from '../js/core/OviEngine.js';

const OviDiagramPlugin = {
    id: 'ovidiagram',
    name: 'OviDiagram',
    icon: 'Di',

    init(engine) {
        console.log("OviDiagram: Initialized");
    },

    onActivate(engine) {
        console.log("OviDiagram: Activated");

        // 1. Set Sidebar Content
        engine.layoutManager.setSidebarContent(`
            <div style="padding: 10px;">
                <button id="ovidiagram-new-btn" style="
                    width: 100%; 
                    padding: 8px; 
                    background: var(--bg-active); 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer;
                    margin-bottom: 15px;
                ">New Diagram</button>

                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Shapes</div>
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                    <div style="width: 40px; height: 40px; border: 2px solid var(--text-secondary); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px;">Rect</div>
                    <div style="width: 40px; height: 40px; border: 2px solid var(--text-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">Circle</div>
                    <div style="width: 40px; height: 40px; border: 2px solid var(--text-secondary); transform: rotate(45deg); margin: 5px; display: flex; align-items: center; justify-content: center; font-size: 10px;"><span style="transform: rotate(-45deg)">Dia</span></div>
                </div>
            </div>
        `);

        // 2. Set Inspector Content
        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Diagram Properties</div>
                <div style="font-size: 12px;">Canvas Size: 800x600</div>
                <div style="font-size: 12px;">Grid: On</div>
            </div>
        `);

        // Bind click event
        setTimeout(() => {
            const btn = document.getElementById('ovidiagram-new-btn');
            if (btn) {
                btn.onclick = () => {
                    this.createNewDiagram(engine);
                };
            }
        }, 0);
    },

    createNewDiagram(engine) {
        const content = document.createElement('div');
        content.style.width = '100%';
        content.style.height = '100%';
        content.style.position = 'relative';
        content.innerHTML = `
            <div style="position: absolute; top: 20px; left: 20px; color: var(--text-secondary);">
                <h2>New Diagram</h2>
                <p>Canvas ready for drawing...</p>
            </div>
        `;

        engine.tabManager.openTab('Diagram 1', 'ovidiagram', content);
    },

    onDeactivate() {
        console.log("OviDiagram: Deactivated");
    }
};

// Register the plugin
engine.pluginManager.register(OviDiagramPlugin);
