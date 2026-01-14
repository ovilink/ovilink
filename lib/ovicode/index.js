/**
 * OviCode Plugin Entry Point
 */
import engine from '../../js/core/OviEngine.js';
import CodeEditor from './CodeEditor.js';

const OviCodePlugin = {
    id: 'ovicode',
    name: 'OviCode',
    icon: 'Co', // Code

    init(engine) {
        console.log("OviCode: Initialized");
    },

    onActivate(engine) {
        console.log("OviCode: Activated");

        engine.layoutManager.setSidebarContent(`
            <div style="padding: 10px;">
                <button id="ovicode-new-btn" style="
                    width: 100%; 
                    padding: 8px; 
                    background: var(--bg-active); 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer;
                    margin-bottom: 15px;
                ">New Script</button>

                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Files</div>
                <div style="color: var(--text-secondary); font-size: 12px;">
                    <div>📄 script.js</div>
                    <div>📄 logic.js</div>
                </div>
            </div>
        `);

        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Code Properties</div>
                <div style="font-size: 12px;">Language: JavaScript</div>
            </div>
        `);

        setTimeout(() => {
            const btn = document.getElementById('ovicode-new-btn');
            if (btn) {
                btn.onclick = () => {
                    this.activeEditor = new CodeEditor(engine);
                    this.activeEditor.create();
                };
            }
        }, 0);
    },

    onDeactivate() {
        console.log("OviCode: Deactivated");
    }
};

// Register
engine.pluginManager.register(OviCodePlugin);
export default OviCodePlugin;
