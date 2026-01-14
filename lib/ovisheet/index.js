/**
 * OviSheet Plugin Entry Point
 */
import engine from '../../js/core/OviEngine.js';
import SheetEditor from './SheetEditor.js';

const OviSheetPlugin = {
    id: 'ovisheet',
    name: 'OviSheet',
    icon: 'Sh', // Sheet

    init(engine) {
        console.log("OviSheet: Initialized");
    },

    onActivate(engine) {
        console.log("OviSheet: Activated");

        engine.layoutManager.setSidebarContent(`
            <div class="sidebar-section">
                <button id="ovisheet-new-btn" class="btn-full btn-primary">New Spreadsheet</button>

                <div class="sidebar-title">Recent Files</div>
                <div style="color: var(--text-secondary); font-size: 12px;">
                    <div>📄 data_analysis.csv</div>
                    <div>📄 physics_params.csv</div>
                </div>
            </div>
        `);

        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Sheet Properties</div>
                <div style="font-size: 12px;">Rows: 20, Cols: 10</div>
            </div>
        `);

        setTimeout(() => {
            const btn = document.getElementById('ovisheet-new-btn');
            if (btn) {
                btn.onclick = () => {
                    this.activeEditor = new SheetEditor(engine);
                    this.activeEditor.create();
                };
            }
        }, 0);
    },

    onDeactivate() {
        console.log("OviSheet: Deactivated");
    },

    serialize() {
        if (this.activeEditor && this.activeEditor.data) {
            return {
                sheetData: this.activeEditor.data
            };
        }
        return null; // Return null if no data to save
    },

    deserialize(data) {
        if (data && data.sheetData) {
            this.activeEditor = new SheetEditor(engine);
            this.activeEditor.create();

            // Restore Data
            this.activeEditor.data = data.sheetData;

            // Re-render cells (Need to traverse grid)
            // Ideally SheetEditor should have a render() or loadData() method.
            // For now, we manually update DOM (Fragile, but consistent with current design level).
            for (const [key, value] of Object.entries(data.sheetData)) {
                // key is "r0c1" etc.
                const input = this.activeEditor.grid.querySelector(`input[data-coord="${key}"]`);
                if (input) {
                    input.value = value;
                }
            }
        }
    }
};

// Register
engine.pluginManager.register(OviSheetPlugin);
export default OviSheetPlugin;
