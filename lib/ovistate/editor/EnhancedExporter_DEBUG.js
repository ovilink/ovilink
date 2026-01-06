
import { PARTICLES_LIB } from '../exporter/modules/RuntimeParticles.js';
import { SPRITES_LIB } from '../exporter/modules/RuntimeSprites.js';
import { CORE_LIB } from '../exporter/modules/RuntimeCore.js';
import { UI_LIB } from '../exporter/modules/RuntimeUI.js';
import { BEHAVIORS_LIB } from '../exporter/modules/RuntimeBehaviors.js';
import { OVI3D_LIB } from '../exporter/modules/RuntimeOvi3D.js';
import { OVI3D_BEHAVIORS_LIB } from '../exporter/modules/RuntimeOvi3DBehaviors.js';
import { generateHTMLTemplate } from '../exporter/templates/HTMLTemplate.js';

export default class EnhancedExporter {
    static export(simulationData) {
        console.log('[EXPORT] Exporting bundled HTML5...');
        console.log('[EXPORT] CORE_LIB Length:', CORE_LIB.length); // DEBUG: Check if lib is updated

        // Deep clone and sanitize data
        // Convert Sets to Arrays before stringification
        if (simulationData.objects) {
            simulationData.objects.forEach(o => {
                if (o.behaviors instanceof Set) o.behaviors = Array.from(o.behaviors);
            });
        }

        const data = JSON.parse(JSON.stringify(simulationData, (key, value) => {
            if (key === 'activeCollisions') return undefined;
            return value;
        }));

        data.objects.forEach(obj => {
            // Restore initial positions before export
            if (obj.initialX !== undefined) {
                obj.x = obj.initialX;
            }
            if (obj.initialY !== undefined) {
                obj.y = obj.initialY;
            }
        });

        // Collect Libraries
        const libs = {
            PARTICLES_LIB,
            SPRITES_LIB,
            CORE_LIB,
            UI_LIB,
            BEHAVIORS_LIB,
            OVI3D_LIB,
            OVI3D_BEHAVIORS_LIB
        };

        // Generate HTML
        const html = generateHTMLTemplate(data, libs);
        this.downloadFile(html, `${data.metadata.title || 'game'}.html`);
        console.log('[OK] Export complete!');
    }

    static downloadFile(content, filename) {
        // Strip 'export default' and 'export class' from bundle to make it valid inline script
        content = content.replace(/export default class/g, 'class');
        content = content.replace(/export class/g, 'class');

        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
