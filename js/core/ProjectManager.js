export default class ProjectManager {
    constructor(engine) {
        this.engine = engine;
    }

    init() {
        console.log("ProjectManager: Initialized");
        this.addSystemControls();
    }

    addSystemControls() {
        // Add Save/Load buttons to Activity Bar Bottom (fixed position)
        // These will stay at the bottom while plugins scroll

        const activityBarBottom = document.getElementById('activity-bar-bottom');
        if (!activityBarBottom) {
            console.warn('Activity bar bottom not found');
            return;
        }

        // Save Button
        const saveBtn = document.createElement('div');
        saveBtn.className = 'activity-item';
        saveBtn.setAttribute('data-id', 'sys-save');
        saveBtn.setAttribute('data-tooltip', 'Save Project');
        saveBtn.innerHTML = '💾';
        saveBtn.addEventListener('click', () => this.saveProject());
        activityBarBottom.appendChild(saveBtn);

        // Export Button (Unified Hub)
        const exportBtn = document.createElement('div');
        exportBtn.className = 'activity-item';
        exportBtn.setAttribute('data-id', 'sys-export');
        exportBtn.setAttribute('data-tooltip', 'Export Project');
        exportBtn.innerHTML = '📤';
        exportBtn.addEventListener('click', () => this.showExportModal());
        activityBarBottom.appendChild(exportBtn);

        // Load Button
        const loadBtn = document.createElement('div');
        loadBtn.className = 'activity-item';
        loadBtn.setAttribute('data-id', 'sys-load');
        loadBtn.setAttribute('data-tooltip', 'Load Project');
        loadBtn.innerHTML = '📂';
        loadBtn.addEventListener('click', () => this.triggerLoad());
        activityBarBottom.appendChild(loadBtn);
    }

    showExportModal() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'export-modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(5px);
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: var(--bg-secondary);
            width: 450px; border-radius: 8px;
            border: 1px solid var(--border-color);
            padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        `;

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: var(--text-primary); margin: 0;">Export Your Project</h2>
                <button id="close-export-modal" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:20px;">&times;</button>
            </div>
            <div id="export-presets-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const list = modal.querySelector('#export-presets-list');
        this.engine.exportManager.presets.forEach((preset, id) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex; align-items: center; gap: 15px; padding: 15px;
                background: var(--bg-primary); border-radius: 6px;
                border: 1px solid var(--border-color); cursor: pointer; transition: all 0.2s;
            `;
            item.onmouseenter = () => item.style.borderColor = 'var(--text-accent)';
            item.onmouseleave = () => item.style.borderColor = 'var(--border-color)';

            item.innerHTML = `
                <div style="font-size: 24px;">${preset.icon || '📦'}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: var(--text-primary);">${preset.name}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">${preset.description}</div>
                </div>
                <div style="font-size: 10px; color: var(--text-accent); font-weight: bold;">SELECT</div>
            `;

            item.onclick = async () => {
                const success = await this.engine.exportManager.triggerExport(id);
                if (success) document.body.removeChild(overlay);
            };

            list.appendChild(item);
        });

        modal.querySelector('#close-export-modal').onclick = () => document.body.removeChild(overlay);
        overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
    }

    async saveProject() {
        const project = {
            version: '1.0',
            timestamp: Date.now(),
            data: {}, // Global DataManager data
            plugins: {} // Per-plugin data
        };

        // 1. Serialize Global Data
        project.data = Object.fromEntries(this.engine.dataManager.data);

        // 2. Serialize Plugins
        this.engine.pluginManager.plugins.forEach((plugin, id) => {
            if (plugin.serialize) {
                try {
                    project.plugins[id] = plugin.serialize();
                } catch (e) {
                    console.error(`Failed to serialize plugin ${id}:`, e);
                }
            }
        });

        // 3. Create File
        const json = JSON.stringify(project, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `project_${new Date().toISOString().slice(0, 10)}.ovis`;
        a.click();
        URL.revokeObjectURL(url);
    }

    triggerLoad() {
        // Create invisible file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ovis, .json'; // Support both for backward comaptibility if needed, but mainly .ovis
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => this.loadProject(evt.target.result);
                reader.readAsText(file);
            }
        };
        input.click();
    }

    loadProject(jsonString) {
        try {
            const project = JSON.parse(jsonString);

            // 0. Clear Workspace
            const tabHeader = document.getElementById('tab-header');
            const tabContent = document.getElementById('tab-content');
            if (tabHeader) tabHeader.innerHTML = '';
            if (tabContent) tabContent.innerHTML = '';
            // Reset active plugin state is hard without reload, but we can try closing.

            // 1. Restore Global Data
            if (project.data) {
                Object.entries(project.data).forEach(([key, value]) => {
                    this.engine.dataManager.set(key, value);
                });
            }

            // 2. Restore Plugins
            if (project.plugins) {
                Object.entries(project.plugins).forEach(([id, data]) => {
                    const plugin = this.engine.pluginManager.plugins.get(id);
                    if (plugin && plugin.deserialize) {
                        try {
                            plugin.deserialize(data);
                        } catch (e) {
                            console.error(`Failed to deserialize plugin ${id}:`, e);
                        }
                    }
                });
            }

            alert("Project Loaded Successfully!");

        } catch (e) {
            console.error("Failed to load project:", e);
            alert("Error loading project: " + e.message);
        }
    }
}
