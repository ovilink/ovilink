class ProjectExporter {
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * Exports the current OviState project back to a standalone HTML file.
     * @param {Object} project - The project state (objects, params, scripts).
     * @returns {string} - The complete HTML string.
     */
    exportToHTML(project) {
        // 1. Basic Boilerplate
        let html = `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name || 'Ovi Exported Project'}</title>
    <style>
        body { margin: 0; overflow: hidden; background: #fff; }
        /* Injected Styles */
        ${project.styles ? project.styles.join('\n') : ''}
    </style>
</head>
<body>
    <div id="ovi-container">`;

        // 2. Reconstruct UI Controls (Sliders) from Parameters
        if (project.parameters && project.parameters.length > 0) {
            html += `\n    <!-- Exported Controls -->
    <div class="controls" style="position: absolute; top: 10px; left: 10px; z-index: 1000; background: rgba(255,255,255,0.9); padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">`;

            project.parameters.forEach(param => {
                html += `
        <div class="control-group" style="margin-bottom: 5px;">
            <label for="${param.id}" style="font-size: 12px; font-family: sans-serif; display: block;">${param.label || param.id}</label>
            <input type="range" id="${param.id}" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" style="width: 200px;">
            <span id="${param.id}-val" style="font-size: 12px; font-family: monospace;">${param.value}</span>
        </div>`;
            });

            html += `    </div>\n`;
        }

        // 3. Reconstruct Objects (DOM Elements)
        project.objects.forEach(obj => {
            // Calculate Styles
            const style = [
                'position: absolute',
                `left: ${obj.x}px`,
                `top: ${obj.y}px`,
                `width: ${obj.width || obj.size || 50}px`,
                `height: ${obj.height || obj.size || 50}px`,
                `background-color: ${obj.color || '#3498db'}`,
                `transform: translate(-50%, -50%) rotate(${obj.rotation || 0}deg)`, // Center origin
                `opacity: ${obj.opacity !== undefined ? obj.opacity : 1}`,
                `z-index: ${obj.zIndex || 0}`
            ].join('; ');

            if (obj.type === 'canvas') {
                html += `    <canvas id="${obj.id}" width="${obj.width}" height="${obj.height}" style="${style}"></canvas>\n`;
            } else if (obj.type === 'vector_path' && obj.pathData) {
                // Handle Vector Paths as SVGs
                html += `
    <svg id="${obj.id}" style="${style}; overflow: visible;" viewBox="0 0 ${obj.width} ${obj.height}">
        <path d="${obj.pathData}" fill="${obj.fill || obj.color || '#000'}" stroke="${obj.stroke || 'none'}" stroke-width="${obj.strokeWidth || 1}"></path>
    </svg>\n`;
            } else {
                // Default to div for sprites, rects, circles (with borderRadius)
                let extraStyle = '';
                if (obj.type === 'circle') extraStyle = 'border-radius: 50%;';

                html += `    <div id="${obj.id}" class="${obj.className || ''}" style="${style}; ${extraStyle}"></div>\n`;
            }
        });

        html += `    </div>\n`;

        // 5. Smart Data Embedding (For Lossless Re-Import)
        // We serialize the entire project state into a hidden script tag.
        // We use a replacer to avoid circular references (like activeCollisions) and runtime-only props.
        const circularReplacer = (key, value) => {
            if (key === 'activeCollisions') return undefined; // Circular!
            if (key.startsWith('_')) return undefined; // Private/Runtime props
            if (key === 'isHovered' || key === 'isSelected') return undefined;
            return value;
        };

        html += `
    <script id="ovi-project-data" type="application/json">
        ${JSON.stringify(project, circularReplacer, 2)}
    </script>`;

        html += `
    <script>
        // Ovi Exported Logic
        
        // 1. Initialize Parameters mapping
        const params = {};
        ${project.parameters ? project.parameters.map(p => `let ${p.id} = ${p.value};`).join('\n        ') : ''}

        // 2. Setup Event Listeners for Controls
        document.addEventListener('DOMContentLoaded', () => {
            ${project.parameters ? project.parameters.map(p => `
            const el_${p.id} = document.getElementById('${p.id}');
            const val_${p.id} = document.getElementById('${p.id}-val');
            if(el_${p.id}) {
                el_${p.id}.addEventListener('input', (e) => {
                    ${p.id} = parseFloat(e.target.value);
                    if(val_${p.id}) val_${p.id}.innerText = ${p.id};
                    // Trigger update if defined
                    if(typeof update === 'function') update();
                    if(typeof calculateValues === 'function') calculateValues();
                    if(typeof updateDisplays === 'function') updateDisplays(); // Heuristic for user's code
                });
            }`).join('') : ''}
        });

        // 3. User Logic
        ${project.scripts ? project.scripts.map(s => s.content).join('\n') : ''}
    </script>
</body>
</html>`;

        return html;
    }
}

export default ProjectExporter;
