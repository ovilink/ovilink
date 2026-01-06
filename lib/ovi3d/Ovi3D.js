import engine from '../../js/core/OviEngine.js';
import Sidebar from './ui/Sidebar.js';

const Ovi3DPlugin = {
    id: 'ovi3d',
    name: 'Ovi3D',
    icon: '3D',

    init(engine) {
        console.log("Ovi3D: Initialized");
    },

    onActivate(engine) {
        console.log("Ovi3D: Activated");

        Sidebar.render(engine, this);

        engine.layoutManager.setInspectorContent(`
            <div style="padding: 15px; color: var(--text-secondary); text-align: center;">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Ovi3D Inspector</div>
                <div style="font-size: 12px;">Import a 3D model or OviVector path to see properties.</div>
            </div>
        `);

        // Handle Sidebar Events (Delegate to document for robustness)
        if (!this._listenersInitialized) {
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('.ovi3d-tool-btn, .ovi3d-primary-btn, .ovi3d-secondary-btn');
                if (!btn) return;

                if (btn.id === 'ovi3d-import-btn') {
                    this.triggerImport();
                } else if (btn.id === 'ovi3d-vector-btn') {
                    this.handleVectorImport(engine);
                } else if (btn.id === 'ovi3d-add-hotspot') {
                    this.toggleHotspotMode();
                } else if (btn.id === 'ovi3d-measure-tool') {
                    engine.layoutManager.showToast ? engine.layoutManager.showToast("Measurement tool coming soon!") : alert("In Development");
                } else if (btn.id === 'ovi3d-transfer-btn') {
                    if (this.viewer) this.viewer.transferToSimulation();
                } else if (btn.id === 'ovi3d-export-btn') {
                    if (this.viewer) this.viewer.exportStandalone();
                }
            });

            // Listen for mode updates from viewer (e.g. when hotspot is placed)
            document.addEventListener('ovi3d-mode-update', (e) => {
                const { mode, active } = e.detail;
                if (mode === 'hotspot') {
                    Sidebar.setToolActive('add-hotspot', active);
                }
            });

            this._listenersInitialized = true;
        }

        // If viewer already exists, ensure sidebar state is correct
        if (this.viewer) {
            const hControls = document.getElementById('ovi3d-hotspot-controls');
            if (hControls) hControls.style.display = 'block';
            const aControls = document.getElementById('ovi3d-action-controls');
            if (aControls) aControls.style.display = 'block';
            Sidebar.setToolActive('add-hotspot', this.viewer.hotspotMode);
        }
    },

    triggerImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.glb';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) this.handleGLBImport(engine, file);
        };
        input.click();
    },

    toggleHotspotMode() {
        if (!this.viewer) {
            alert("Please import a model first to add hotspots.");
            return;
        }

        this.viewer.hotspotMode = !this.viewer.hotspotMode;
        const canvas = this.viewer.renderer.canvas;

        if (this.viewer.hotspotMode) {
            canvas.style.cursor = 'crosshair';
            if (this.viewer.controls) this.viewer.controls.enabled = false;
            Sidebar.setToolActive('add-hotspot', true);
            engine.layoutManager.showToast ? engine.layoutManager.showToast("Click on the model to place a hotspot") : null;
        } else {
            canvas.style.cursor = 'default';
            if (this.viewer.controls) this.viewer.controls.enabled = true;
            Sidebar.setToolActive('add-hotspot', false);
        }
        this.viewer.updateInspector();
    },

    async handleGLBImport(engine, file) {
        console.log("Ovi3D: Importing GLB...", file.name);

        if (!this.viewer) {
            const { default: Ovi3DViewer } = await import('./Ovi3DViewer.js');
            this.viewer = new Ovi3DViewer(engine);
            await this.viewer.init();
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            await this.viewer.loadModel(arrayBuffer, file.name);

            const hControls = document.getElementById('ovi3d-hotspot-controls');
            if (hControls) hControls.style.display = 'block';
            const aControls = document.getElementById('ovi3d-action-controls');
            if (aControls) aControls.style.display = 'block';
        };
        reader.readAsArrayBuffer(file);
    },

    async handleVectorImport(engine) {
        // Find OviVector plugin
        const oviVector = engine.pluginManager.getPlugin('ovivector');
        if (!oviVector || !oviVector.activeEditor) {
            alert("No active OviVector path found! Create and select a path in OviVector first.");
            return;
        }

        const pathData = oviVector.activeEditor.getSelectedPathPoints();
        if (!pathData || pathData.length === 0) {
            alert("Please select a path in OviVector editor.");
            return;
        }

        if (!this.viewer) {
            const { default: Ovi3DViewer } = await import('./Ovi3DViewer.js');
            this.viewer = new Ovi3DViewer(engine);
            await this.viewer.init();
        }

        await this.viewer.loadFromVector(pathData);

        const hControls = document.getElementById('ovi3d-hotspot-controls');
        if (hControls) hControls.style.display = 'block';
        const aControls = document.getElementById('ovi3d-action-controls');
        if (aControls) aControls.style.display = 'block';
    },

    onDeactivate() {
        console.log("Ovi3D: Deactivated");
        if (this.viewer) this.viewer.isRunning = false;
    }
};

// Register with Engine
engine.pluginManager.register(Ovi3DPlugin);

export default Ovi3DPlugin;
