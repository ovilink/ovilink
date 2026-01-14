class HTMLImporter {
    constructor(editor) {
        this.editor = editor;
    }

    /**
     * Main entry point to parse an imported HTML string.
     * @param {string} htmlString - The raw HTML content.
     * @returns {Object} - A structured object containing OviObjects, Parameters, and Logic.
     */
    parse(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        console.log('HTMLImporter: Starting parse...');

        const result = {
            objects: [],
            parameters: [],
            scripts: [],
            styles: []
        };

        // 0. Smart Re-Import (Check for embedded Ovi Data)
        const embeddedDataScript = doc.getElementById('ovi-project-data');
        if (embeddedDataScript) {
            try {
                console.log('HTMLImporter: Found embedded Ovi Data. Returning lossless project.');
                const projectData = JSON.parse(embeddedDataScript.textContent);
                return projectData;
            } catch (e) {
                console.error('HTMLImporter: Failed to parse embedded data, falling back to heuristic import.', e);
            }
        }

        // 1. Extract Styles
        const styleTags = doc.querySelectorAll('style');
        styleTags.forEach(tag => result.styles.push(tag.innerHTML));

        // 2a. Extract Input Parameters (Sliders)
        const inputs = doc.querySelectorAll('input[type="range"]');
        inputs.forEach(input => {
            const param = {
                id: input.id || ('slider_' + Math.random().toString(36).substr(2, 5)),
                type: 'slider', // Mapped to 'slider' in RuntimeUI
                min: parseFloat(input.min) || 0,
                max: parseFloat(input.max) || 100,
                value: parseFloat(input.value) || 0,
                step: parseFloat(input.step) || 1,
                label: this.findLabelFor(doc, input.id),
                isUI: true
            };
            result.parameters.push(param);
        });

        // 2b. Extract Buttons
        const buttons = doc.querySelectorAll('button');
        buttons.forEach(btn => {
            const param = {
                id: btn.id || ('btn_' + Math.random().toString(36).substr(2, 5)),
                type: 'button',
                label: btn.innerText || 'Button',
                x: 80, // Default UI positions (will stack in sidebar usually but here we just list them)
                y: 100 + (result.parameters.length * 40),
                isUI: true
            };
            result.parameters.push(param);
        });

        // 2c. Extract Dropdowns (Select)
        const selects = doc.querySelectorAll('select');
        selects.forEach(sel => {
            const options = Array.from(sel.querySelectorAll('option')).map(opt => opt.value);
            const param = {
                id: sel.id || ('sel_' + Math.random().toString(36).substr(2, 5)),
                type: 'dropdown',
                label: this.findLabelFor(doc, sel.id) || 'Options',
                options: options, // Array of strings
                value: sel.value,
                x: 80,
                y: 100 + (result.parameters.length * 40),
                isUI: true
            };
            result.parameters.push(param);
        });

        // 3. Extract Objects (Canvas, Images, Divs that look like sprites)
        // For the specific user example, we care about the "car" and "road".

        // 3. Extract Objects (Canvas, Images, Divs that look like sprites)

        // Helper to parse CSS text
        const parseCss = (cssText) => {
            const styles = {};
            // Basic regex to find .class { ... }
            const rules = cssText.match(/[^{]+\{[^}]+\}/g) || [];
            rules.forEach(rule => {
                const [selector, body] = rule.split('{');
                const cleanSelector = selector.trim();
                const props = {};
                body.replace('}', '').split(';').forEach(prop => {
                    const [key, val] = prop.split(':');
                    if (key && val) props[key.trim()] = val.trim();
                });
                styles[cleanSelector] = props;
            });
            return styles;
        };

        const cssRules = parseCss(result.styles.join('\n'));
        console.log('Parsed CSS Rules:', cssRules);

        // Function to apply styles to object
        const applyStyles = (obj, className) => {
            const rules = cssRules['.' + className];
            if (rules) {
                if (rules.width) obj.width = parseFloat(rules.width) || 50;
                if (rules.height) obj.height = parseFloat(rules.height) || 50;
                if (rules['background-color']) obj.color = rules['background-color']; // Map bg to color
                if (rules.background) obj.color = rules.background;
                if (rules.left) obj.x = parseFloat(rules.left) || 400;
                if (rules.top) obj.y = parseFloat(rules.top) || 300;
            }
        };

        // Find Canvas elements (Graphs/Simulations)
        const canvases = doc.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            // CRITICAL: Treat canvas as a UI Control with explicit ID for scripts to find
            const param = {
                id: canvas.id || ('canvas_' + Math.random().toString(36).substr(2, 5)),
                type: 'canvas', // Handled by RuntimeUI
                width: canvas.width || 400,
                height: canvas.height || 300,
                x: 400, // Safe defaults or parse CSS
                y: 300,
                label: 'Simulation Canvas',
                color: '#ffffff',
                isUI: true // Force UI rendering
            };

            // Try to set position from CSS/Style if possible (Heuristic)
            applyStyles(param, canvas.className);
            if (canvas.id && cssRules['#' + canvas.id]) {
                const rules = cssRules['#' + canvas.id];
                if (rules.width) param.width = parseFloat(rules.width);
                if (rules.height) param.height = parseFloat(rules.height);
            }

            result.parameters.push(param); // Add to controls list
        });

        // Find specific animated elements (like the car class in the user example)
        const animatedElements = doc.querySelectorAll('.car, .road, .obj, div[id^="obj"]'); // Extended heuristic
        animatedElements.forEach(el => {
            const obj = {
                id: el.id || 'obj_' + Math.random().toString(36).substr(2, 9),
                type: 'sprite', // Default to generic sprite (rect)
                className: el.className,
                x: 400, // Safe default
                y: 300, // Safe default
                width: 50, // Safe default
                height: 50, // Safe default
                color: '#3498db' // Safe default blue
            };

            // Apply specific mappings based on user's known example structure
            if (el.className.includes('car')) {
                obj.color = '#e74c3c'; // Red car
                obj.width = 60;
                obj.height = 30;
                obj.shape = 'rect'; // Explicit shape
            } else if (el.className.includes('road')) {
                obj.color = '#34495e'; // Dark road
                obj.width = 800;
                obj.height = 100;
                obj.y = 500;
                obj.zIndex = -1; // Send to back
            }

            // Try to override with parsed CSS if available
            if (el.className) {
                el.className.split(' ').forEach(cls => applyStyles(obj, cls));
            }

            // Also check ID style
            if (el.id && cssRules['#' + el.id]) {
                const rules = cssRules['#' + el.id];
                if (rules.width) obj.width = parseFloat(rules.width);
                if (rules.height) obj.height = parseFloat(rules.height);
                if (rules['background-color']) obj.color = rules['background-color'];
            }

            result.objects.push(obj);
        });

        // 4. Extract Scripts (Logic)
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.src) return; // Skip external scripts for now
            result.scripts.push(this.processScript(script.innerHTML));
        });

        console.log('HTMLImporter: Parse complete', result);
        return result;
    }

    findLabelFor(doc, inputId) {
        const label = doc.querySelector(`label[for="${inputId}"]`);
        return label ? label.innerText : inputId;
    }

    /**
     * Process the raw JS to make it Ovi-compatible.
     * This is where a full AST parser would go. For now, we do simple regex extraction
     * to find variable declarations that match our parameters.
     */
    processScript(jsContent) {
        // CLEANUP: Remove DOMContentLoaded wrappers so script runs immediately in onStart()
        let cleanJS = jsContent;

        // Remove document.addEventListener('DOMContentLoaded', () => { ... });
        cleanJS = cleanJS.replace(/document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\)\s*=>\s*\{/g, '(() => {');
        cleanJS = cleanJS.replace(/document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*function\s*\(\)\s*\{/g, '(() => {');

        // Remove window.onload ...
        cleanJS = cleanJS.replace(/window\.onload\s*=\s*function\s*\(\)\s*\{/g, '(() => {');
        cleanJS = cleanJS.replace(/window\.addEventListener\s*\(\s*['"]load['"]\s*,\s*\(\)\s*=>\s*\{/g, '(() => {');

        // Note: The closing '});' usually remains valid for '(() => {' if we just stripped the head.
        // But simply replacing the head might leave unbalanced braces if not careful.
        // Actually, replacing `document.... {` with `(() => {` preserves structure:
        // FROM: document.addEventListener(..., () => { code... });
        // TO:   (() => { code... });   <-- Valid IIFE

        return {
            content: cleanJS,
            type: 'behavior_script'
        };
    }
}

export default HTMLImporter;
