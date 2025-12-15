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

        // Load Button
        const loadBtn = document.createElement('div');
        loadBtn.className = 'activity-item';
        loadBtn.setAttribute('data-id', 'sys-load');
        loadBtn.setAttribute('data-tooltip', 'Load Project');
        loadBtn.innerHTML = '📂';
        loadBtn.addEventListener('click', () => this.triggerLoad());
        activityBarBottom.appendChild(loadBtn);
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
