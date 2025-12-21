/**
 * OviBlock Plugin Entry Point
 */
import engine from '../../js/core/OviEngine.js';
import Sidebar from './ui/Sidebar.js';

const OviBlockPlugin = {
    id: 'oviblock',
    name: 'OviBlock',
    icon: 'Bl', // Block

    init(engine) {
        console.log("OviBlock: Initialized");
    },

    onActivate(engine) {
        console.log("OviBlock: Activated");

        // 0. Inject Global Styles
        if (!document.getElementById('oviblock-global-styles')) {
            const style = document.createElement('style');
            style.id = 'oviblock-global-styles';
            style.innerHTML = `
                /* ACTION BLOCKS (Stackable) */
                .block-shape-action {
                    clip-path: polygon(
                        0 8px, 15px 8px, 20px 16px, 45px 16px, 50px 8px, 100% 8px, 
                        100% calc(100% - 8px), 50px calc(100% - 8px), 45px 100%, 20px 100%, 15px calc(100% - 8px), 0 calc(100% - 8px)
                    );
                    min-height: 40px;
                }
                .block-shape-action .block-content { padding: 16px 15px 12px 15px; width: 100%; }

                /* REPORTER BLOCKS (Pill - Values) */
                .block-shape-reporter {
                    border-radius: 20px;
                }
                .block-shape-reporter .block-content {
                    padding: 4px 12px !important;
                    min-width: 50px !important;
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                }

                /* BOOLEAN BLOCKS (Hex - Conditions) */
                .block-shape-boolean {
                    clip-path: polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%);
                }
                .block-shape-boolean .block-content {
                    padding: 4px 18px !important;
                    min-width: 70px !important;
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);
        }

        // 1. Setup UI (Sidebar and Inspector)
        // Sidebar.render now handles the 'New Block Script' button and Palette
        Sidebar.render(engine, this);

        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 20px; font-weight: bold; color: var(--text-primary);">Block Properties</div>
                <div style="font-size: 11px; line-height: 1.4;">
                    Drag blocks to build logic. Root-level blocks act as independent entry points. 
                    <br><br>
                    Use the <b>New Block Script</b> button in the left sidebar to start a new editor.
                </div>
            </div>
        `);
    },

    onDeactivate() {
        console.log("OviBlock: Deactivated");
    }
};

// Register
engine.pluginManager.register(OviBlockPlugin);
export default OviBlockPlugin;
