
import { generateHTMLTemplate } from '../exporter/templates/HTMLTemplate.js';

export default class EnhancedExporter {
    static async export(simulationData) {
        console.log('[EXPORT] Starting Modular Export...');

        // 1. Fetch Module Sources Dynamically
        // This ensures the exported HTML contains the Source Code, not the running instances
        // 1. Fetch Module Sources Dynamically
        // This ensures the exported HTML contains the Source Code, not the running instances
        const modulePaths = {
            'RuntimeCore': '/lib/ovistate/exporter/modules/RuntimeCore.js',
            'RuntimeParticles': '/lib/ovistate/exporter/modules/RuntimeParticles.js',
            'RuntimeSprites': '/lib/ovistate/exporter/modules/RuntimeSprites.js',
            'RuntimeUI': '/lib/ovistate/exporter/modules/RuntimeUI.js',
            'RuntimeBehaviors': '/lib/ovistate/exporter/modules/RuntimeBehaviors.js',
            'RuntimeOvi3D': '/lib/Ovi3D/exporter/RuntimeOvi3D.js',
            'RuntimeOvi3DBehaviors': '/lib/Ovi3D/exporter/RuntimeOvi3DBehaviors.js',
            'OviMath': '/lib/Ovi3D/core/OviMath.js'
        };

        const libs = {};

        try {
            await Promise.all(Object.entries(modulePaths).map(async ([mod, path]) => {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`Failed to load ${mod} from ${path}`);
                let source = await response.text();

                // 1. Remove 'export' and 'import' keywords to make it valid inline script
                source = source.replace(/export class/g, 'class');
                source = source.replace(/export const/g, 'const');
                source = source.replace(/export default/g, '');
                source = source.replace(/import .* from .*/g, '// import removed for bundle');

                libs[mod] = source;
            }));
        } catch (e) {
            console.error("[EXPORT] Failed to load modules:", e);
            alert("Export Failed: Could not load runtime modules.");
            return;
        }

        // 2. Prepare Data (Normalize Behaviors to Array)
        if (simulationData.objects) {
            simulationData.objects.forEach(o => {
                if (o.behaviors) {
                    if (o.behaviors instanceof Set) {
                        o.behaviors = Array.from(o.behaviors);
                    } else if (!Array.isArray(o.behaviors) && typeof o.behaviors === 'object') {
                        // Handle object format: { behaviorId: true, ... }
                        o.behaviors = Object.keys(o.behaviors).filter(k => o.behaviors[k]);
                    }
                } else {
                    o.behaviors = [];
                }
            });
        }

        const data = JSON.parse(JSON.stringify(simulationData, (key, value) => {
            if (key === 'activeCollisions') return undefined;
            return value;
        }));

        // 3. Generate HTML
        // Map correct keys for HTMLTemplate
        const templateLibs = {
            CORE_LIB: libs.RuntimeCore,
            PARTICLES_LIB: libs.RuntimeParticles,
            SPRITES_LIB: libs.RuntimeSprites,
            UI_LIB: libs.RuntimeUI,
            BEHAVIORS_LIB: libs.RuntimeBehaviors,
            // Prepend Math Library to Runtime so it's available globally BEFORE behaviors load
            OVI3D_LIB: libs.OviMath + '\n\n' + libs.RuntimeOvi3D,
            OVI3D_BEHAVIORS_LIB: libs.RuntimeOvi3DBehaviors
        };

        const html = generateHTMLTemplate(data, templateLibs);
        this.downloadFile(html, `${data.metadata.title || 'game'}.html`);
        console.log('[OK] Modular Export complete!');
    }

    static downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
