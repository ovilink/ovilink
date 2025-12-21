/**
 * ExportManager - Manages shared export presets for OviPlatform
 */
export default class ExportManager {
    constructor(engine) {
        this.engine = engine;
        this.presets = new Map();

        // Register default presets
        this.initDefaultPresets();
    }

    initDefaultPresets() {
        this.registerPreset('brimtale', {
            name: 'Brimtale Story (.brim)',
            description: 'Export logic and animations for the Brimtale Runtime.',
            icon: '🌊',
            extension: 'brim',
            export: () => this.exportBrimtale()
        });

        this.registerPreset('json_raw', {
            name: 'Raw Data (JSON)',
            description: 'Export all project data as raw JSON.',
            icon: '📄',
            extension: 'json',
            export: () => this.exportRawJSON()
        });
    }

    registerPreset(id, config) {
        this.presets.set(id, config);
        console.log(`🚀 Export Preset Registered: ${config.name}`);
    }

    async exportBrimtale() {
        const project = {
            type: 'brimtale_package',
            version: '2.0',
            timestamp: new Date().toISOString(),
            content: {
                objects: [],
                logic: '',
                voice: []
            }
        };

        // 1. Get OviState Objects
        const oviState = this.engine.pluginManager.getPlugin('ovistate');
        if (oviState && oviState.activeEditor) {
            project.content.objects = oviState.activeEditor.getSimulationData().objects;
        }

        // 2. Get OviGraph Logic
        const oviGraph = this.engine.pluginManager.getPlugin('ovigraph');
        if (oviGraph && oviGraph.activeEditor) {
            // Re-compile to ensure we have the latest
            project.content.logic = oviGraph.activeEditor.compile();
        }

        return project;
    }

    async exportRawJSON() {
        return {
            type: 'ovi_raw_data',
            data: Object.fromEntries(this.engine.dataManager.data),
            plugins: Array.from(this.engine.pluginManager.plugins.keys())
        };
    }

    async triggerExport(presetId) {
        const preset = this.presets.get(presetId);
        if (!preset) return;

        try {
            const data = await preset.export();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `export_${presetId}_${Date.now()}.${preset.extension || 'json'}`;
            a.click();
            URL.revokeObjectURL(url);

            return true;
        } catch (e) {
            console.error("Export failed:", e);
            alert("Export Error: " + e.message);
            return false;
        }
    }
}
