/**
 * OviBoard Inspector (Properties)
 */
export default class Inspector {
    static render(engine, editor) {
        const container = document.querySelector('#inspector .sidebar-content');
        if (!container) return;

        container.innerHTML = '';
        container.style.padding = '10px';

        if (!editor || !editor.toolManager) {
            container.innerHTML = '<div style="color:#999;font-size:12px;">No active board.</div>';
            return;
        }

        const props = editor.toolManager.properties;

        // --- 1. Tool Settings ---
        this.addSectionTitle(container, 'TOOL SETTINGS');

        // Color Picker
        this.addLabel(container, 'Color');
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = props.color;
        colorInput.style.width = '100%';
        colorInput.style.marginBottom = '10px';
        colorInput.oninput = (e) => editor.toolManager.setColor(e.target.value);
        container.appendChild(colorInput);

        // Size Slider
        this.addLabel(container, 'Size: ' + props.size + 'px');
        const sizeInput = document.createElement('input');
        sizeInput.type = 'range';
        sizeInput.min = '1';
        sizeInput.max = '50';
        sizeInput.value = props.size;
        sizeInput.style.width = '100%';
        sizeInput.style.marginBottom = '10px';
        sizeInput.oninput = (e) => {
            const s = parseInt(e.target.value);
            editor.toolManager.setSize(s);
            // Update label text? (Simplification: just re-render or explicit label update)
            this.updateLabel(container, 'Size:', 'Size: ' + s + 'px');
        };
        container.appendChild(sizeInput);

        // --- 2. Canvas Settings ---
        this.addSectionTitle(container, 'CANVAS');
        this.addLabel(container, 'Zoom: ' + (editor.camera.zoom * 100).toFixed(0) + '%');
        // (Read-only for now, updated by wheel)
    }

    static addSectionTitle(parent, text) {
        const div = document.createElement('div');
        div.innerText = text;
        div.style.fontSize = '12px';
        div.style.fontWeight = 'bold';
        div.style.marginTop = '10px';
        div.style.marginBottom = '5px';
        div.style.color = '#666';
        div.style.borderBottom = '1px solid #eee';
        div.style.paddingBottom = '2px';
        parent.appendChild(div);
    }

    static addLabel(parent, text) {
        const div = document.createElement('div');
        div.innerText = text;
        div.style.fontSize = '12px';
        div.style.marginBottom = '2px';
        parent.appendChild(div);
    }

    static updateLabel(parent, prefix, newText) {
        // Quick hack to find label by prefix
        Array.from(parent.children).forEach(child => {
            if (child.innerText.startsWith(prefix)) {
                child.innerText = newText;
            }
        });
    }
}
