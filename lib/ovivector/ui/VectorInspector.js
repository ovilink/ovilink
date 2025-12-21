const colorToHex = (color) => {
    if (!color || color === 'none') return '#000000';
    if (color.startsWith('#')) return color;
    const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
    if (!match) return '#000000';
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
};

export default class VectorInspector {
    static render(engine, editorInstance, selectedElement) {
        if (!engine.layoutManager.setInspectorContent) {
            console.error("LayoutManager missing setInspectorContent");
            return;
        }

        if (!selectedElement) {
            engine.layoutManager.setInspectorContent(`
                <div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 13px;">
                    Select an object to view properties.
                </div>
            `);
            return;
        }

        const id = selectedElement.getAttribute('data-id') || '';
        const fillAttr = selectedElement.getAttribute('fill') || '#000000';
        const strokeAttr = selectedElement.getAttribute('stroke') || '#000000';

        const fill = colorToHex(fillAttr);
        const stroke = colorToHex(strokeAttr);
        const physics = selectedElement.getAttribute('data-physics') || 'static';

        let extraHtml = '';
        if (selectedElement.tagName === 'text') {
            const text = selectedElement.textContent;
            extraHtml = `
                <div class="inspector-group">
                    <label>Text Content</label>
                    <input type="text" id="vp-text" value="${text}" class="inspector-input">
                </div>
            `;
        }

        engine.layoutManager.setInspectorContent(`
            <style>
                .inspector-group { margin-bottom: 15px; }
                .inspector-group label { display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 5px; }
                .inspector-input { width: 100%; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); padding: 5px; border-radius: 4px; box-sizing: border-box;}
                .inspector-row { display: flex; gap: 8px; align-items: center; }
                .color-preview { width: 30px; height: 30px; border: 1px solid var(--border-color); cursor: pointer; border-radius: 4px; overflow: hidden; }
                .color-preview input { opacity: 0; width: 100%; height: 100%; cursor: pointer; }
            </style>

            <div style="padding: 10px;">
                <h3 style="font-size: 12px; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px; margin-bottom: 15px;">
                    Vector Properties
                </h3>

                <div class="inspector-group">
                    <label>Identity</label>
                    <input type="text" id="vp-id" value="${id}" class="inspector-input">
                </div>

                <div class="inspector-group">
                    <label>Physics Mode</label>
                    <select id="vp-physics" class="inspector-input">
                        <option value="static" ${physics === 'static' ? 'selected' : ''}>Static</option>
                        <option value="dynamic" ${physics === 'dynamic' ? 'selected' : ''}>Dynamic</option>
                        <option value="kinematic" ${physics === 'kinematic' ? 'selected' : ''}>Kinematic</option>
                    </select>
                </div>

                ${extraHtml}

                <div class="inspector-group">
                    <label>Appearance</label>
                    
                    <!-- Fill Control -->
                    <div class="inspector-row">
                        <input type="checkbox" id="vp-fill-check" ${fillAttr !== 'none' ? 'checked' : ''} style="margin:0;">
                        <div class="color-preview" id="vp-fill-preview" style="background: ${fillAttr === 'none' ? '#000000' : fillAttr}; opacity: ${fillAttr !== 'none' ? 1 : 0.5}; pointer-events: ${fillAttr !== 'none' ? 'auto' : 'none'};">
                            <input type="color" id="vp-fill" value="${fill}" ${fillAttr === 'none' ? 'disabled' : ''}>
                        </div>
                        <span style="font-size: 11px; color: var(--text-secondary);">Fill</span>
                    </div>

                    <!-- Stroke Control -->
                    <div class="inspector-row" style="margin-top: 8px;">
                        <input type="checkbox" id="vp-stroke-check" ${strokeAttr !== 'none' ? 'checked' : ''} style="margin:0;">
                        <div class="color-preview" id="vp-stroke-preview" style="background: ${strokeAttr === 'none' ? '#000000' : strokeAttr}; opacity: ${strokeAttr !== 'none' ? 1 : 0.5}; pointer-events: ${strokeAttr !== 'none' ? 'auto' : 'none'};">
                            <input type="color" id="vp-stroke" value="${stroke}" ${strokeAttr === 'none' ? 'disabled' : ''}>
                        </div>
                         <span style="font-size: 11px; color: var(--text-secondary);">Stroke</span>
                    </div>
                </div>

                <div class="inspector-group">
                    <label>Hierarchy</label>
                    <div class="inspector-row">
                         <button id="vp-group" class="btn-small" style="flex:1; padding:4px; font-size:11px; cursor:pointer;" title="Group Selected Items">Group</button>
                         <button id="vp-ungroup" class="btn-small" style="flex:1; padding:4px; font-size:11px; cursor:pointer;" title="Ungroup Selected Group">Ungroup</button>
                    </div>
                </div>

                <div class="inspector-group">
                    <label>Order</label>
                    <div class="inspector-row">
                         <button id="vp-front" class="btn-small" style="flex:1; padding:4px; font-size:11px; cursor:pointer;">To Front</button>
                         <button id="vp-back" class="btn-small" style="flex:1; padding:4px; font-size:11px; cursor:pointer;">To Back</button>
                    </div>
                </div>

                <div class="inspector-group" style="border-top: 1px solid var(--border-color); padding-top: 15px;">
                    <button id="vp-delete" style="width:100%; padding:8px; background:#ff4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">DELETE SELECTION</button>
                </div>

                <!-- Layers Panel -->
                <div class="inspector-group" style="margin-top: 20px;">
                    <h4 style="font-size: 11px; color: var(--text-secondary); margin-bottom: 10px; text-transform:uppercase;">Layers</h4>
                    <div id="layers-list" style="max-height: 200px; overflow-y: auto; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px;">
                        ${Array.from(editorInstance.svg.children).reverse().map(el => {
            if (el.tagName === 'rect' && el.style.pointerEvents === 'none') return ''; // Skip Marquee/Gizmo
            if (el.tagName === 'g' && el === editorInstance.gizmoGroup) return '';

            const name = el.getAttribute('data-id') || el.tagName;
            const isSelected = editorInstance.selectedElements.includes(el);
            return `
                                <div class="layer-item" data-ref="${name}" style="padding: 6px 10px; font-size: 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; align-items: center; gap: 8px; background: ${isSelected ? 'rgba(0, 170, 255, 0.2)' : 'transparent'};">
                                    <span style="opacity: 0.6;">${el.tagName === 'g' ? '📁' : '🟦'}</span>
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
            </div>
        `);

        // Bind Events
        setTimeout(() => {
            // Bind Layer Selection
            const layers = document.querySelectorAll('.layer-item');
            layers.forEach((item, index) => {
                item.onclick = (e) => {
                    const children = Array.from(editorInstance.svg.children).reverse().filter(el => {
                        if (el.tagName === 'rect' && el.style.pointerEvents === 'none') return false;
                        if (el.tagName === 'g' && el === editorInstance.gizmoGroup) return false;
                        return true;
                    });
                    const target = children[index];
                    if (target) {
                        if (e.shiftKey) editorInstance.selectRange(target);
                        else editorInstance.select(target);
                    }
                };
            });
            const idInput = document.getElementById('vp-id');
            if (idInput) idInput.onchange = (e) => selectedElement.setAttribute('data-id', e.target.value);

            const physicsInput = document.getElementById('vp-physics');
            if (physicsInput) physicsInput.onchange = (e) => selectedElement.setAttribute('data-physics', e.target.value);

            // --- Fill Logic ---
            const fillCheck = document.getElementById('vp-fill-check');
            const fillInput = document.getElementById('vp-fill');
            const fillPreview = document.getElementById('vp-fill-preview');

            if (fillCheck) {
                fillCheck.onchange = (e) => {
                    const checked = e.target.checked;
                    if (checked) {
                        // Enable: Set to color picker value
                        const col = fillInput.value;
                        selectedElement.setAttribute('fill', col);
                        fillInput.disabled = false;
                        fillPreview.style.opacity = '1';
                        fillPreview.style.pointerEvents = 'auto';
                        fillPreview.style.background = col;
                    } else {
                        // Disable: Set "none"
                        selectedElement.setAttribute('fill', 'none');
                        fillInput.disabled = true;
                        fillPreview.style.opacity = '0.5';
                        fillPreview.style.pointerEvents = 'none';
                    }
                };
            }
            if (fillInput) fillInput.oninput = (e) => {
                selectedElement.setAttribute('fill', e.target.value);
                fillPreview.style.background = e.target.value;
            };


            // --- Stroke Logic ---
            const strokeCheck = document.getElementById('vp-stroke-check');
            const strokeInput = document.getElementById('vp-stroke');
            const strokePreview = document.getElementById('vp-stroke-preview');

            if (strokeCheck) {
                strokeCheck.onchange = (e) => {
                    const checked = e.target.checked;
                    if (checked) {
                        const col = strokeInput.value;
                        selectedElement.setAttribute('stroke', col);
                        strokeInput.disabled = false;
                        strokePreview.style.opacity = '1';
                        strokePreview.style.pointerEvents = 'auto';
                        strokePreview.style.background = col;
                    } else {
                        selectedElement.setAttribute('stroke', 'none');
                        strokeInput.disabled = true;
                        strokePreview.style.opacity = '0.5';
                        strokePreview.style.pointerEvents = 'none';
                    }
                };
            }
            if (strokeInput) strokeInput.oninput = (e) => {
                selectedElement.setAttribute('stroke', e.target.value);
                strokePreview.style.background = e.target.value;
            };

            const textInput = document.getElementById('vp-text');
            if (textInput) textInput.oninput = (e) => selectedElement.textContent = e.target.value;

            const groupBtn = document.getElementById('vp-group');
            if (groupBtn) groupBtn.onclick = () => editorInstance.groupSelection();

            const ungroupBtn = document.getElementById('vp-ungroup');
            if (ungroupBtn) ungroupBtn.onclick = () => editorInstance.ungroupSelection();

            const frontBtn = document.getElementById('vp-front');
            if (frontBtn) frontBtn.onclick = () => editorInstance.bringToFront();

            const backBtn = document.getElementById('vp-back');
            if (backBtn) backBtn.onclick = () => editorInstance.sendToBack();

            const deleteBtn = document.getElementById('vp-delete');
            if (deleteBtn) deleteBtn.onclick = () => {
                if (confirm(`Delete ${editorInstance.selectedElements.length} items?`)) {
                    editorInstance.selectedElements.forEach(el => el.parentNode?.removeChild(el));
                    editorInstance.deselect();
                }
            };

        }, 0);
    }
}
