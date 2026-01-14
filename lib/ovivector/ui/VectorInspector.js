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

        const warpDataStr = selectedElement.getAttribute('data-warp');
        let warpData = null;
        try { warpData = warpDataStr ? JSON.parse(warpDataStr) : null; } catch (e) { }

        const warpType = warpData ? warpData.type : 'none';
        const bend = warpData ? (warpData.bend !== undefined ? warpData.bend : 50) : 50;
        const distH = warpData ? (warpData.distH !== undefined ? warpData.distH : 0) : 0;
        const distV = warpData ? (warpData.distV !== undefined ? warpData.distV : 0) : 0;

        let extraHtml = '';
        if (selectedElement.tagName === 'text') {
            const text = selectedElement.textContent;
            extraHtml = `
                <div class="inspector-group">
                    <label>Text Content</label>
                    <input type="text" id="vp-text" value="${text}" class="inspector-input">
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'star') {
            const pts = selectedElement.getAttribute('data-points') || 5;
            const inner = selectedElement.getAttribute('data-inner-radius') || 0.4;
            extraHtml = `
                <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Star Settings</h4>
                    <div class="inspector-row" style="margin-bottom: 8px;">
                        <label style="flex:1;">Points</label>
                        <input type="number" id="vp-star-points" value="${pts}" min="3" max="50" class="inspector-input" style="width: 60px;">
                    </div>
                    <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Inner Radius</label>
                             <span id="vp-star-inner-val" style="font-size:10px; opacity:0.7;">${Math.round(inner * 100)}%</span>
                        </div>
                        <input type="range" id="vp-star-inner" value="${inner}" min="0.1" max="1.0" step="0.01" style="width:100%;">
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'polygon') {
            const pts = selectedElement.getAttribute('data-points') || 6;
            extraHtml = `
                <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Polygon Settings</h4>
                    <div class="inspector-row" style="margin-bottom: 8px;">
                        <label style="flex:1;">Side Count</label>
                        <input type="number" id="vp-poly-points" value="${pts}" min="3" max="50" class="inspector-input" style="width: 60px;">
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'gear') {
            const teeth = selectedElement.getAttribute('data-teeth') || 8;
            const depth = selectedElement.getAttribute('data-depth') || 0.2;
            const hole = selectedElement.getAttribute('data-hole') || 0.3;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Gear Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Teeth</label>
                             <input type="number" id="vp-gear-teeth" value="${teeth}" style="width:50px;">
                        </div>
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Depth</label>
                             <div style="display:flex; align-items:center; gap:8px; flex:1;">
                                <input type="range" id="vp-gear-depth" value="${depth}" min="0.1" max="0.9" step="0.05" style="flex:1;">
                                <span id="vp-gear-depth-val" style="font-size:10px; opacity:0.7;">${Math.round(depth * 100)}%</span>
                             </div>
                        </div>
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Hole Size</label>
                             <input type="range" id="vp-gear-hole" value="${hole}" min="0" max="0.8" step="0.05" style="width:100%;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'arrow') {
            const shaft = selectedElement.getAttribute('data-shaft') || 0.5;
            const head = selectedElement.getAttribute('data-head') || 0.4;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Arrow Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Shaft Width</label>
                             <span id="vp-arrow-shaft-val" style="font-size:10px; opacity:0.7;">${Math.round(shaft * 100)}%</span>
                        </div>
                        <input type="range" id="vp-arrow-shaft" value="${shaft}" min="0.1" max="0.9" step="0.05" style="width:100%;">
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Head Length</label>
                             <span id="vp-arrow-head-val" style="font-size:10px; opacity:0.7;">${Math.round(head * 100)}%</span>
                        </div>
                        <input type="range" id="vp-arrow-head" value="${head}" min="0.1" max="0.9" step="0.05" style="width:100%;">
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'flower') {
            const petals = selectedElement.getAttribute('data-petals') || 5;
            const round = selectedElement.getAttribute('data-round') || 0.6;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Flower Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Petals</label>
                             <input type="number" id="vp-flower-petals" value="${petals}" min="3" max="20" style="width:50px;">
                        </div>
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Puffiness</label>
                             <input type="range" id="vp-flower-round" value="${round}" min="0.1" max="1.5" step="0.1" style="width:100%;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'cloud') {
            const bumps = selectedElement.getAttribute('data-bumps') || 6;
            const puff = selectedElement.getAttribute('data-puff') || 0.5;
            const irreg = selectedElement.getAttribute('data-irreg') || 0;
            const flat = selectedElement.getAttribute('data-flat') || 0;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Cloud Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Bumps</label>
                             <input type="number" id="vp-cloud-bumps" value="${bumps}" min="3" max="20" style="width:50px;">
                        </div>
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Puffiness</label>
                             <input type="range" id="vp-cloud-puff" value="${puff}" min="0.1" max="1.5" step="0.1" style="width:100%;">
                        </div>
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Irregularity</label>
                             <input type="range" id="vp-cloud-irreg" value="${irreg}" min="0" max="1" step="0.05" style="width:100%;">
                        </div>
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Flat Bottom</label>
                             <input type="range" id="vp-cloud-flat" value="${flat}" min="0" max="1" step="0.05" style="width:100%;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'pie') {
            const start = selectedElement.getAttribute('data-start') || 0;
            const end = selectedElement.getAttribute('data-end') || 270;
            const inner = selectedElement.getAttribute('data-inner') || 0;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Pie Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Start Angle</label>
                             <span id="vp-pie-start-val" style="font-size:10px; opacity:0.7;">${start}°</span>
                        </div>
                        <input type="range" id="vp-pie-start" value="${start}" min="0" max="360" step="1" style="width:100%;">
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>End Angle</label>
                             <span id="vp-pie-end-val" style="font-size:10px; opacity:0.7;">${end}°</span>
                        </div>
                        <input type="range" id="vp-pie-end" value="${end}" min="0" max="360" step="1" style="width:100%;">
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Hole Radius</label>
                             <span id="vp-pie-inner-val" style="font-size:10px; opacity:0.7;">${Math.round(inner * 100)}%</span>
                        </div>
                        <input type="range" id="vp-pie-inner" value="${inner}" min="0" max="0.9" step="0.05" style="width:100%;">
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'spiral') {
            const turns = selectedElement.getAttribute('data-turns') || 3;
            const inner = selectedElement.getAttribute('data-inner') || 0.1;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Spiral Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Turns</label>
                             <span id="vp-spiral-turns-val" style="font-size:10px; opacity:0.7;">${turns}</span>
                        </div>
                        <input type="range" id="vp-spiral-turns" value="${turns}" min="1" max="20" step="0.1" style="width:100%;">
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Start Radius</label>
                             <span id="vp-spiral-inner-val" style="font-size:10px; opacity:0.7;">${Math.round(inner * 100)}%</span>
                        </div>
                        <input type="range" id="vp-spiral-inner" value="${inner}" min="0" max="0.9" step="0.05" style="width:100%;">
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'wave') {
            const freq = selectedElement.getAttribute('data-freq') || 3;
            const amp = selectedElement.getAttribute('data-amp') || 0.8;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Wave Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Frequency</label>
                             <span id="vp-wave-freq-val" style="font-size:10px; opacity:0.7;">${freq}</span>
                        </div>
                        <input type="range" id="vp-wave-freq" value="${freq}" min="1" max="20" step="0.5" style="width:100%;">
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Amplitude</label>
                             <span id="vp-wave-amp-val" style="font-size:10px; opacity:0.7;">${Math.round(amp * 100)}%</span>
                        </div>
                        <input type="range" id="vp-wave-amp" value="${amp}" min="0" max="1" step="0.05" style="width:100%;">
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'grid') {
            const rows = selectedElement.getAttribute('data-rows') || 5;
            const cols = selectedElement.getAttribute('data-cols') || 5;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Grid Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Rows</label>
                             <input type="number" id="vp-grid-rows" value="${rows}" min="1" max="50" style="width:50px;">
                        </div>
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Columns</label>
                             <input type="number" id="vp-grid-cols" value="${cols}" min="1" max="50" style="width:50px;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.tagName === 'rect') {
            const rx = selectedElement.getAttribute('rx') || 0;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Rect Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Corner Radius</label>
                             <input type="number" id="vp-rect-rx" value="${rx}" min="0" style="width:50px;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'cross') {
            const arms = selectedElement.getAttribute('data-arms') || 4;
            const thick = selectedElement.getAttribute('data-thick') || 0.4;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Radial Cross Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Arms</label>
                             <input type="number" id="vp-cross-arms" value="${arms}" min="3" max="20" style="width:50px;">
                        </div>
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Thickness</label>
                             <span id="vp-cross-thick-val" style="font-size:10px; opacity:0.7;">${Math.round(thick * 100)}%</span>
                        </div>
                        <input type="range" id="vp-cross-thick" value="${thick}" min="0.1" max="0.9" step="0.05" style="width:100%;">
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'crescent') {
            const thickness = selectedElement.getAttribute('data-thickness') || 0;
            const style = selectedElement.getAttribute('data-style') || 'phases';
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Crescent Settings</h4>
                    <div class="inspector-row" style="margin-bottom: 8px;">
                        <label style="flex:1;">Style</label>
                        <select id="vp-crescent-style" class="inspector-input" style="width: 100px;">
                            <option value="phases" ${style === 'phases' ? 'selected' : ''}>Phases</option>
                            <option value="solar" ${style === 'solar' ? 'selected' : ''}>Solar</option>
                        </select>
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Thickness</label>
                             <input type="range" id="vp-crescent-thick" value="${thickness}" min="-1" max="1" step="0.05" style="width:100%;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'heart') {
            const depth = selectedElement.getAttribute('data-depth') || 0.3;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Heart Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Cleft Depth</label>
                             <input type="range" id="vp-heart-depth" value="${depth}" min="0.1" max="0.6" step="0.05" style="width:100%;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'blob') {
            const complex = selectedElement.getAttribute('data-complex') || 7;
            const contrast = selectedElement.getAttribute('data-contrast') || 0.3;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Blob Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Complexity</label>
                             <input type="number" id="vp-blob-complex" value="${complex}" min="3" max="25" style="width:50px;">
                        </div>
                    </div>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Roughness</label>
                             <input type="range" id="vp-blob-contrast" value="${contrast}" min="0" max="1" step="0.05" style="width:100%;">
                        </div>
                    </div>
                    <button id="vp-blob-rand" class="btn-full" style="width:100%; margin-top:5px; padding:4px;">🎲 Randomize</button>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'bubble') {
            const tail = selectedElement.getAttribute('data-tail') || 0.7;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Message Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Tail Position</label>
                             <input type="range" id="vp-bubble-tail" value="${tail}" min="0.1" max="0.9" step="0.05" style="width:100%;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'shield') {
            const shoulder = selectedElement.getAttribute('data-shoulder') || 0.5;
            const crest = selectedElement.getAttribute('data-crest') || 0.15;
            const curve = selectedElement.getAttribute('data-curve') || 1.0;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Shield Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Shoulder</label>
                             <input type="range" id="vp-shield-shoulder" value="${shoulder}" min="0.1" max="0.9" step="0.05" style="width:100%;">
                        </div>
                        <div class="inspector-row" style="justify-content: space-between; margin-top:8px;">
                             <label>Crest</label>
                             <input type="range" id="vp-shield-crest" value="${crest}" min="-0.4" max="0.4" step="0.05" style="width:100%;">
                        </div>
                        <div class="inspector-row" style="justify-content: space-between; margin-top:8px;">
                             <label>Curvature</label>
                             <input type="range" id="vp-shield-curve" value="${curve}" min="0" max="1" step="0.05" style="width:100%;">
                        </div>
                    </div>
                </div>
            `;
        } else if (selectedElement.getAttribute('data-shape') === 'drop') {
            const taper = selectedElement.getAttribute('data-taper') || 0.25;
            extraHtml = `
                 <div class="inspector-group">
                    <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">Drop Settings</h4>
                     <div class="inspector-group">
                        <div class="inspector-row" style="justify-content: space-between;">
                             <label>Taper</label>
                             <input type="range" id="vp-drop-taper" value="${taper}" min="0.1" max="0.9" step="0.05" style="width:100%;">
                        </div>
                    </div>
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

                        <!-- Stroke Logic -->
                        <div class="inspector-row" style="margin-top: 8px;">
                            <input type="checkbox" id="vp-stroke-check" ${strokeAttr !== 'none' ? 'checked' : ''} style="margin:0;">
                                <div class="color-preview" id="vp-stroke-preview" style="background: ${strokeAttr === 'none' ? '#000000' : strokeAttr}; opacity: ${strokeAttr !== 'none' ? 1 : 0.5}; pointer-events: ${strokeAttr !== 'none' ? 'auto' : 'none'};">
                                    <input type="color" id="vp-stroke" value="${stroke}" ${strokeAttr === 'none' ? 'disabled' : ''}>
                                </div>
                                <span style="font-size: 11px; color: var(--text-secondary);">Stroke</span>
                        </div>
                    </div>

                    <div class="inspector-group" style="border-top: 1px solid var(--border-color); padding-top: 10px;">
                        <h4 style="font-size: 11px; color: var(--accent-primary); margin-bottom: 10px; text-transform:uppercase;">Warp Effects</h4>
                        <div class="inspector-group">
                            <label>Warp Style</label>
                            <select id="vp-warp-type" class="inspector-input">
                                <option value="none" ${warpType === 'none' ? 'selected' : ''}>None</option>
                                <option value="arc" ${warpType === 'arc' ? 'selected' : ''}>Arc</option>
                                <option value="arc_lower" ${warpType === 'arc_lower' ? 'selected' : ''}>Arc Lower</option>
                                <option value="arc_upper" ${warpType === 'arc_upper' ? 'selected' : ''}>Arc Upper</option>
                                <option value="arch" ${warpType === 'arch' ? 'selected' : ''}>Arch</option>
                                <option value="bulge" ${warpType === 'bulge' ? 'selected' : ''}>Bulge</option>
                                <option value="shell_lower" ${warpType === 'shell_lower' ? 'selected' : ''}>Shell Lower</option>
                                <option value="shell_upper" ${warpType === 'shell_upper' ? 'selected' : ''}>Shell Upper</option>
                                <option value="flag" ${warpType === 'flag' ? 'selected' : ''}>Flag</option>
                                <option value="wave" ${warpType === 'wave' ? 'selected' : ''}>Wave</option>
                                <option value="fish" ${warpType === 'fish' ? 'selected' : ''}>Fish</option>
                                <option value="rise" ${warpType === 'rise' ? 'selected' : ''}>Rise</option>
                                <option value="fisheye" ${warpType === 'fisheye' ? 'selected' : ''}>Fisheye</option>
                                <option value="inflate" ${warpType === 'inflate' ? 'selected' : ''}>Inflate</option>
                                <option value="squeeze" ${warpType === 'squeeze' ? 'selected' : ''}>Squeeze</option>
                                <option value="twist" ${warpType === 'twist' ? 'selected' : ''}>Twist</option>
                            </select>
                        </div>
                        <div class="inspector-group" style="margin-top: 10px;">
                            <div class="inspector-row" style="justify-content: space-between;">
                                <label>Bend</label>
                                <span style="font-size: 10px; opacity: 0.7;" id="vp-bend-val">${bend}%</span>
                            </div>
                            <input type="range" id="vp-warp-bend" min="-100" max="100" value="${bend}" style="width:100%;">
                        </div>
                        <div class="inspector-group">
                            <div class="inspector-row" style="justify-content: space-between;">
                                <label>H-Distortion</label>
                                <span style="font-size: 10px; opacity: 0.7;" id="vp-dist-h-val">${distH}%</span>
                            </div>
                            <input type="range" id="vp-warp-dist-h" min="-100" max="100" value="${distH}" style="width:100%;">
                        </div>
                        <div class="inspector-group">
                            <div class="inspector-row" style="justify-content: space-between;">
                                <label>V-Distortion</label>
                                <span style="font-size: 10px; opacity: 0.7;" id="vp-dist-v-val">${distV}%</span>
                            </div>
                            <input type="range" id="vp-warp-dist-v" min="-100" max="100" value="${distV}" style="width:100%;">
                        </div>
                    </div>
                </div>

                    <div class="inspector-group" style="border-top: 1px solid var(--border-color); padding-top: 10px; display: ${editorInstance.selectedElements.length > 1 ? 'block' : 'none'};">
                        <h4 style="font-size: 11px; color: var(--accent-primary); margin-bottom: 10px; text-transform:uppercase;">Modify (Pathfinder)</h4>
                        <div class="inspector-row" style="flex-wrap: wrap;">
                            <button id="vp-union" class="btn-small" style="flex:1; min-width:60px; padding:6px; cursor:pointer;" title="Combine Shapes">Union</button>
                            <button id="vp-subtract" class="btn-small" style="flex:1; min-width:60px; padding:6px; cursor:pointer;" title="Subtract Front from Back">Subtract</button>
                        </div>
                        <div class="inspector-row" style="flex-wrap: wrap; margin-top:5px;">
                            <button id="vp-intersect" class="btn-small" style="flex:1; min-width:60px; padding:6px; cursor:pointer;" title="Keep Overlap">Intersect</button>
                            <button id="vp-exclude" class="btn-small" style="flex:1; min-width:60px; padding:6px; cursor:pointer;" title="Exclude Overlap">Exclude</button>
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
            if (idInput) idInput.onchange = (e) => {
                selectedElement.setAttribute('data-id', e.target.value);
                editorInstance.saveState(); // SAVE: ID
            };

            const physicsInput = document.getElementById('vp-physics');
            if (physicsInput) physicsInput.onchange = (e) => {
                selectedElement.setAttribute('data-physics', e.target.value);
                editorInstance.saveState(); // SAVE: Physics Mode
            };

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
                    editorInstance.saveState(); // SAVE: Fill Toggle
                };
            }
            if (fillInput) {
                fillInput.oninput = (e) => {
                    selectedElement.setAttribute('fill', e.target.value);
                    fillPreview.style.background = e.target.value;
                };
                fillInput.onchange = () => editorInstance.saveState(); // SAVE: Fill Color
            }


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
                    editorInstance.saveState(); // SAVE: Stroke Toggle
                };
            }
            if (strokeInput) {
                strokeInput.oninput = (e) => {
                    selectedElement.setAttribute('stroke', e.target.value);
                    strokePreview.style.background = e.target.value;
                };
                strokeInput.onchange = () => editorInstance.saveState(); // SAVE: Stroke Color
            }

            const textInput = document.getElementById('vp-text');
            if (textInput) {
                textInput.oninput = (e) => selectedElement.textContent = e.target.value;
                textInput.onchange = () => editorInstance.saveState(); // SAVE: Text Change
            }

            // --- Star Logic ---
            const starPoints = document.getElementById('vp-star-points');
            const starInner = document.getElementById('vp-star-inner');
            const starInnerVal = document.getElementById('vp-star-inner-val');

            const updateStar = () => {
                const pts = parseInt(starPoints.value) || 5;
                const innerR = parseFloat(starInner.value) || 0.4;
                if (starInnerVal) starInnerVal.textContent = Math.round(innerR * 100) + '%';

                // Save attributes
                selectedElement.setAttribute('data-points', pts);
                selectedElement.setAttribute('data-inner-radius', innerR);

                // Recalculate Points based on stable frame
                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2;
                    cy = bbox.y + bbox.height / 2;
                    r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx);
                    selectedElement.setAttribute('data-cy', cy);
                    selectedElement.setAttribute('data-r', r);
                }

                let s = "";
                const step = Math.PI / pts;
                let angle = -Math.PI / 2;

                // Regenerate
                for (let i = 0; i < pts * 2; i++) {
                    const radius = (i % 2 === 0) ? r : (r * innerR);
                    const px = Math.cos(angle) * radius;
                    const py = Math.sin(angle) * radius;
                    s += `${px},${py} `;
                    angle += step;
                }
                selectedElement.setAttribute("points", s.trim());
            };

            if (starPoints) {
                starPoints.oninput = updateStar;
                starPoints.onchange = () => editorInstance.saveState(); // SAVE: Star Points
            }
            if (starInner) {
                starInner.oninput = updateStar;
                starInner.onchange = () => editorInstance.saveState(); // SAVE: Star Inner
            }

            // --- Polygon Logic ---
            const polyPoints = document.getElementById('vp-poly-points');
            const updatePoly = () => {
                const pts = parseInt(polyPoints.value) || 6;
                // Save attribute
                selectedElement.setAttribute('data-points', pts);

                // Recalculate Points based on stable frame
                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2;
                    cy = bbox.y + bbox.height / 2;
                    r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx);
                    selectedElement.setAttribute('data-cy', cy);
                    selectedElement.setAttribute('data-r', r);
                }

                let s = "";
                const step = 2 * Math.PI / pts;
                let angle = -Math.PI / 2;

                for (let i = 0; i < pts; i++) {
                    const px = Math.cos(angle) * r;
                    const py = Math.sin(angle) * r;
                    s += `${px},${py} `;
                    angle += step;
                }
                selectedElement.setAttribute("points", s.trim());
            };
            if (polyPoints) {
                polyPoints.oninput = updatePoly;
                polyPoints.onchange = () => editorInstance.saveState(); // SAVE: Poly Points
            }


            // --- Arrow Logic ---
            const arrowShaft = document.getElementById('vp-arrow-shaft');
            const arrowHead = document.getElementById('vp-arrow-head');
            const arrowShaftVal = document.getElementById('vp-arrow-shaft-val');
            const arrowHeadVal = document.getElementById('vp-arrow-head-val');

            const updateArrow = () => {
                const shaftW = parseFloat(arrowShaft.value) || 0.5;
                const headL = parseFloat(arrowHead.value) || 0.4;
                if (arrowShaftVal) arrowShaftVal.textContent = Math.round(shaftW * 100) + '%';
                if (arrowHeadVal) arrowHeadVal.textContent = Math.round(headL * 100) + '%';

                selectedElement.setAttribute('data-shaft', shaftW);
                selectedElement.setAttribute('data-head', headL);

                const bbox = selectedElement.getBBox();
                const x = bbox.x;
                const y = bbox.y;
                const w = bbox.width;
                const h = bbox.height;

                const cy = y + h / 2;
                // Note: Recalculating from BBox changes W/H if the shape changes aspect ratio too much.
                // Ideally we use a stored "frame" but for now BBox is ok.
                // Issue: If I reduce shaft, BBox height stays same because Head is 100% height.
                // If Head width changes, that might shrink internal box?
                // Actually Arrow always fills W/H bounds (tip to tail, top to bottom), so BBox is safe.

                const sw = h * shaftW;
                const hl = w * headL;
                const xHead = w - hl;

                const s = `
                    ${0},${- sw / 2}
                    ${xHead},${- sw / 2}
                    ${xHead},${- h / 2}
                    ${w},${0}
                    ${xHead},${h / 2}
                    ${xHead},${sw / 2}
                    ${0},${sw / 2}
                `.trim().replace(/\s+/g, ' ');

                selectedElement.setAttribute("points", s);
            };

            if (arrowShaft) {
                arrowShaft.oninput = updateArrow;
                arrowShaft.onchange = () => editorInstance.saveState(); // SAVE: Arrow Shaft
            }
            if (arrowHead) {
                arrowHead.oninput = updateArrow;
                arrowHead.onchange = () => editorInstance.saveState(); // SAVE: Arrow Head
            }

            // --- Pie Logic ---
            const pieStart = document.getElementById('vp-pie-start');
            const pieEnd = document.getElementById('vp-pie-end');
            const pieInner = document.getElementById('vp-pie-inner');
            const pieStartVal = document.getElementById('vp-pie-start-val');
            const pieEndVal = document.getElementById('vp-pie-end-val');
            const pieInnerVal = document.getElementById('vp-pie-inner-val');

            const updatePie = () => {
                let sAngle = parseFloat(pieStart.value) || 0;
                let eAngle = parseFloat(pieEnd.value) || 270;
                const innerRatio = parseFloat(pieInner.value) || 0;

                if (pieStartVal) pieStartVal.textContent = sAngle + '°';
                if (pieEndVal) pieEndVal.textContent = eAngle + '°';
                if (pieInnerVal) pieInnerVal.textContent = Math.round(innerRatio * 100) + '%';

                // Save
                selectedElement.setAttribute('data-start', sAngle);
                selectedElement.setAttribute('data-end', eAngle);
                selectedElement.setAttribute('data-inner', innerRatio);

                const getPt = (cx, cy, r, deg) => {
                    const rad = (deg - 90) * Math.PI / 180.0;
                    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
                };

                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2;
                    cy = bbox.y + bbox.height / 2;
                    r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx);
                    selectedElement.setAttribute('data-cy', cy);
                    selectedElement.setAttribute('data-r', r);
                }
                const innerR = r * innerRatio;

                // Enforce range for arc flag
                if (eAngle < sAngle) eAngle += 360;
                const delta = eAngle - sAngle;
                const largeArcFlag = delta > 180 ? "1" : "0";

                // Reset for point calc
                const pStart = getPt(0, 0, r, eAngle);
                const pEnd = getPt(0, 0, r, sAngle);
                const pStartInner = getPt(0, 0, innerR, eAngle);
                const pEndInner = getPt(0, 0, innerR, sAngle);

                let d = [
                    "M", pStart.x, pStart.y,
                    "A", r, r, 0, largeArcFlag, 0, pEnd.x, pEnd.y
                ];

                if (innerRatio > 0.01) {
                    d.push("L", pEndInner.x, pEndInner.y);
                    d.push("A", innerR, innerR, 0, largeArcFlag, 1, pStartInner.x, pStartInner.y);
                } else {
                    d.push("L", 0, 0);
                }
                d.push("Z");

                selectedElement.setAttribute("d", d.join(" "));
                selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
            };

            if (pieStart) {
                pieStart.oninput = updatePie;
                pieStart.onchange = () => editorInstance.saveState(); // SAVE: Pie Start
            }
            if (pieEnd) {
                pieEnd.oninput = updatePie;
                pieEnd.onchange = () => editorInstance.saveState(); // SAVE: Pie End
            }
            if (pieInner) {
                pieInner.oninput = updatePie;
                pieInner.onchange = () => editorInstance.saveState(); // SAVE: Pie Inner
            }

            // --- Spiral Logic ---
            const spTurns = document.getElementById('vp-spiral-turns');
            const spInner = document.getElementById('vp-spiral-inner');
            const spTurnsVal = document.getElementById('vp-spiral-turns-val');
            const spInnerVal = document.getElementById('vp-spiral-inner-val');

            const updateSpiral = () => {
                const turns = parseFloat(spTurns.value) || 3;
                const innerRatio = parseFloat(spInner.value) || 0;

                if (spTurnsVal) spTurnsVal.textContent = turns;
                if (spInnerVal) spInnerVal.textContent = Math.round(innerRatio * 100) + '%';

                selectedElement.setAttribute('data-turns', turns);
                selectedElement.setAttribute('data-inner', innerRatio);

                // Stable Geometry
                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2;
                    cy = bbox.y + bbox.height / 2;
                    r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx);
                    selectedElement.setAttribute('data-cy', cy);
                    selectedElement.setAttribute('data-r', r);
                }

                const points = Math.ceil(turns * 60);
                const step = (Math.PI * 2 * turns) / points;
                let angle = 0; // Rotate? Maybe add Angle param later. 
                const innerR = r * innerRatio;
                let d = [];

                for (let i = 0; i <= points; i++) {
                    const progress = i / points;
                    const currentR = innerR + (r - innerR) * progress;
                    const px = Math.cos(angle) * currentR;
                    const py = Math.sin(angle) * currentR;
                    d.push(`${i === 0 ? 'M' : 'L'}`);
                    d.push(px, py);
                    angle += step;
                }

                selectedElement.setAttribute("d", d.join(" "));
                selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
            };

            if (spTurns) {
                spTurns.oninput = updateSpiral;
                spTurns.onchange = () => editorInstance.saveState(); // SAVE: Spiral Turns
            }
            if (spInner) {
                spInner.oninput = updateSpiral;
                spInner.onchange = () => editorInstance.saveState(); // SAVE: Spiral Inner
            }

            // --- Wave Logic ---
            const wvFreq = document.getElementById('vp-wave-freq');
            const wvAmp = document.getElementById('vp-wave-amp');
            const wvFreqVal = document.getElementById('vp-wave-freq-val');
            const wvAmpVal = document.getElementById('vp-wave-amp-val');

            const updateWave = () => {
                const freq = parseFloat(wvFreq.value) || 3;
                const amp = parseFloat(wvAmp.value) || 0.8;

                if (wvFreqVal) wvFreqVal.textContent = freq;
                if (wvAmpVal) wvAmpVal.textContent = Math.round(amp * 100) + '%';

                selectedElement.setAttribute('data-freq', freq);
                selectedElement.setAttribute('data-amp', amp);

                // Stable Geometry (Box)
                let x, y, w, h;
                if (selectedElement.hasAttribute('data-x')) {
                    x = parseFloat(selectedElement.getAttribute('data-x'));
                    y = parseFloat(selectedElement.getAttribute('data-y'));
                    w = parseFloat(selectedElement.getAttribute('data-w'));
                    h = parseFloat(selectedElement.getAttribute('data-h'));
                } else {
                    const bbox = selectedElement.getBBox();
                    x = bbox.x; y = bbox.y; w = bbox.width; h = bbox.height;
                    selectedElement.setAttribute('data-x', x);
                    selectedElement.setAttribute('data-y', y);
                    selectedElement.setAttribute('data-w', w);
                    selectedElement.setAttribute('data-h', h);
                }

                const points = Math.ceil(freq * 40);
                const stepX = w / points;
                const midY = y + h / 2;
                const maxAmp = h / 2 * amp;

                let d = "";
                for (let i = 0; i <= points; i++) {
                    const px = i * stepX;
                    const angle = (i / points) * (freq * Math.PI * 2);
                    const py = Math.sin(angle) * maxAmp;
                    d += `${i === 0 ? 'M' : 'L'} ${px} ${py} `;
                }

                selectedElement.setAttribute("d", d.trim());
                selectedElement.setAttribute("transform", `translate(${x},${midY})`);
                selectedElement.setAttribute("data-x", x);
                selectedElement.setAttribute("data-y", y);
                selectedElement.setAttribute("data-w", w);
                selectedElement.setAttribute("data-h", h);
            };

            if (wvFreq) {
                wvFreq.oninput = updateWave;
                wvFreq.onchange = () => editorInstance.saveState(); // SAVE: Wave Freq
            }
            if (wvAmp) {
                wvAmp.oninput = updateWave;
                wvAmp.onchange = () => editorInstance.saveState(); // SAVE: Wave Amp
            }

            // --- Grid Logic ---
            const grRows = document.getElementById('vp-grid-rows');
            const grCols = document.getElementById('vp-grid-cols');

            const updateGrid = () => {
                const rows = parseInt(grRows.value) || 5;
                const cols = parseInt(grCols.value) || 5;

                selectedElement.setAttribute('data-rows', rows);
                selectedElement.setAttribute('data-cols', cols);

                // Stable Geometry (Box)
                let x, y, w, h;
                if (selectedElement.hasAttribute('data-x')) {
                    x = parseFloat(selectedElement.getAttribute('data-x'));
                    y = parseFloat(selectedElement.getAttribute('data-y'));
                    w = parseFloat(selectedElement.getAttribute('data-w'));
                    h = parseFloat(selectedElement.getAttribute('data-h'));
                } else {
                    const bbox = selectedElement.getBBox();
                    x = bbox.x; y = bbox.y; w = bbox.width; h = bbox.height;
                    selectedElement.setAttribute('data-x', x);
                    selectedElement.setAttribute('data-y', y);
                    selectedElement.setAttribute('data-w', w);
                    selectedElement.setAttribute('data-h', h);
                }

                let d = "";
                const stepY = h / rows;
                for (let i = 0; i <= rows; i++) {
                    const py = i * stepY;
                    d += `M ${0} ${py} L ${w} ${py} `;
                }
                const stepX = w / cols;
                for (let i = 0; i <= cols; i++) {
                    const px = i * stepX;
                    d += `M ${px} ${0} L ${px} ${h} `;
                }

                selectedElement.setAttribute("d", d.trim());
                selectedElement.setAttribute("transform", `translate(${x},${y})`);
            };

            if (grRows) {
                grRows.oninput = updateGrid;
                grRows.onchange = () => editorInstance.saveState(); // SAVE: Grid Rows
            }
            if (grCols) {
                grCols.oninput = updateGrid;
                grCols.onchange = () => editorInstance.saveState(); // SAVE: Grid Cols
            }

            // --- Rect Logic ---
            const rRx = document.getElementById('vp-rect-rx');
            if (rRx) {
                rRx.oninput = () => {
                    const val = rRx.value;
                    selectedElement.setAttribute('rx', val);
                    selectedElement.setAttribute('ry', val);
                }
                rRx.onchange = () => editorInstance.saveState(); // SAVE: Rect Corner
            }

            // --- Cross Logic ---
            const crArms = document.getElementById('vp-cross-arms');
            const crThick = document.getElementById('vp-cross-thick');
            const crThickVal = document.getElementById('vp-cross-thick-val');

            const updateCross = () => {
                const arms = parseInt(crArms.value) || 4;
                const thick = parseFloat(crThick.value) || 0.4;
                if (crThickVal) crThickVal.textContent = Math.round(thick * 100) + '%';

                selectedElement.setAttribute('data-arms', arms);
                selectedElement.setAttribute('data-thick', thick);

                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2; cy = bbox.y + bbox.height / 2; r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx); selectedElement.setAttribute('data-cy', cy); selectedElement.setAttribute('data-r', r);
                }

                const innerR = r * 0.4;
                let pts = "";
                const step = (Math.PI * 2) / arms;
                const wAngle = (Math.PI / arms) * thick;

                for (let i = 0; i < arms; i++) {
                    const angle = i * step - (Math.PI / 2);
                    const p1x = Math.cos(angle - wAngle) * r;
                    const p1y = Math.sin(angle - wAngle) * r;
                    const p2x = Math.cos(angle + wAngle) * r;
                    const p2y = Math.sin(angle + wAngle) * r;

                    const nextAngle = (i + 1) * step - (Math.PI / 2);
                    const valleyAngle = (angle + nextAngle) / 2;
                    const pInnerX = Math.cos(valleyAngle) * innerR;
                    const pInnerY = Math.sin(valleyAngle) * innerR;

                    pts += `${p1x},${p1y} ${p2x},${p2y} ${pInnerX},${pInnerY} `;
                }
                selectedElement.setAttribute("points", pts.trim());
                selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
            }


            if (crArms) {
                crArms.oninput = updateCross;
                crArms.onchange = () => editorInstance.saveState(); // SAVE: Cross Arms
            }
            if (crThick) {
                crThick.oninput = updateCross;
                crThick.onchange = () => editorInstance.saveState(); // SAVE: Cross Thick
            }

            // --- Crescent Logic ---
            const cresThick = document.getElementById('vp-crescent-thick');
            const cresStyle = document.getElementById('vp-crescent-style');

            const updateCres = () => {
                const thickness = parseFloat(cresThick.value) || 0;
                const style = cresStyle ? cresStyle.value : 'phases';
                selectedElement.setAttribute('data-thickness', thickness);
                selectedElement.setAttribute('data-style', style);

                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2;
                    cy = bbox.y + bbox.height / 2;
                    r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx); selectedElement.setAttribute('data-cy', cy); selectedElement.setAttribute('data-r', r);
                }

                if (style === 'phases') {
                    const rx = r * Math.abs(thickness);
                    const sweep = thickness < 0 ? 0 : 1;
                    const d = `M ${0} ${-r} 
                            A ${r} ${r} 0 0 1 ${0} ${r} 
                            A ${rx} ${r} 0 0 ${sweep} ${0} ${-r} Z`.trim();
                    selectedElement.setAttribute("d", d);
                } else {
                    // Solar/Eclipse Style
                    const coverage = (thickness + 1) / 2; // Map -1..1 -> 0..1
                    const dist = 2 * r * (1 - coverage);
                    if (dist >= 1.99 * r) {
                        const d = `M ${-r} ${0} A ${r} ${r} 0 1 1 ${r} ${0} A ${r} ${r} 0 1 1 ${-r} ${0} Z`;
                        selectedElement.setAttribute("d", d);
                    } else if (dist <= 0.01 * r) {
                        selectedElement.setAttribute("d", "");
                    } else {
                        const intersectX = dist / 2;
                        const intersectY = Math.sqrt(r * r - intersectX * intersectX);
                        const d = `M ${intersectX} ${-intersectY} 
                                 A ${r} ${r} 0 1 1 ${intersectX} ${intersectY} 
                                 A ${r} ${r} 0 0 0 ${intersectX} ${-intersectY} Z`.trim();
                        selectedElement.setAttribute("d", d);
                    }
                }
                selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
            }

            if (cresThick) {
                cresThick.oninput = updateCres;
                cresThick.onchange = () => editorInstance.saveState(); // SAVE: Crescent Thick
            }
            if (cresStyle) {
                cresStyle.onchange = () => {
                    updateCres();
                    editorInstance.saveState(); // SAVE: Crescent Style
                };
            }

            // --- Heart Logic ---
            const hDepth = document.getElementById('vp-heart-depth');
            if (hDepth) {
                hDepth.oninput = () => {
                    const depth = parseFloat(hDepth.value) || 0.3;
                    selectedElement.setAttribute('data-depth', depth);

                    let x, y, w, h;
                    if (selectedElement.hasAttribute('data-cx')) {
                        const cx = parseFloat(selectedElement.getAttribute('data-cx'));
                        const cy = parseFloat(selectedElement.getAttribute('data-cy'));
                        const r = parseFloat(selectedElement.getAttribute('data-r'));
                        x = cx - r; y = cy - r; w = r * 2; h = r * 2;
                    } else {
                        const bbox = selectedElement.getBBox();
                        x = bbox.x; y = bbox.y; w = bbox.width; h = bbox.height;
                    }
                    const d = `
                        M ${0} ${-h / 2 + h * depth}
                        C ${0} ${-h / 2} ${-w / 2} ${-h / 2} ${-w / 2} ${-h / 2 + h * depth}
                        C ${-w / 2} ${-h / 2 + h * (depth + 0.3)} ${0} ${-h / 2 + h * 0.9} ${0} ${h / 2}
                        C ${0} ${-h / 2 + h * 0.9} ${w / 2} ${-h / 2 + h * (depth + 0.3)} ${w / 2} ${-h / 2 + h * depth}
                        C ${w / 2} ${-h / 2} ${0} ${-h / 2} ${0} ${-h / 2 + h * depth}
                     `.trim();
                    selectedElement.setAttribute("d", d);
                    const midX = x + w / 2;
                    const midY = y + h / 2;
                    selectedElement.setAttribute("transform", `translate(${midX},${midY})`);
                }
                hDepth.onchange = () => editorInstance.saveState(); // SAVE: Heart Depth
            }

            // --- Blob Logic ---
            const blComplex = document.getElementById('vp-blob-complex');
            const blContrast = document.getElementById('vp-blob-contrast');
            const blRand = document.getElementById('vp-blob-rand');

            const updateBlob = (newSeed = false) => {
                const complex = parseInt(blComplex.value) || 7;
                const contrast = parseFloat(blContrast.value) || 0.3;
                let seed = parseInt(selectedElement.getAttribute('data-seed'));
                if (newSeed === true || isNaN(seed)) seed = Math.floor(Math.random() * 9999);

                selectedElement.setAttribute('data-complex', complex);
                selectedElement.setAttribute('data-contrast', contrast);
                selectedElement.setAttribute('data-seed', seed);

                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2; cy = bbox.y + bbox.height / 2; r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx); selectedElement.setAttribute('data-cy', cy); selectedElement.setAttribute('data-r', r);
                }

                const random = (s) => (Math.sin(s) * 10000) - Math.floor(Math.sin(s) * 10000);
                let points = [];
                const step = (Math.PI * 2) / complex;
                for (let i = 0; i < complex; i++) {
                    const angle = i * step;
                    const rnd = random(seed + i);
                    const varR = r * (1 - (contrast * 0.5) + (rnd * contrast));
                    points.push({ x: Math.cos(angle) * varR, y: Math.sin(angle) * varR });
                }
                const len = points.length;
                let d = `M ${points[0].x} ${points[0].y} `;
                for (let i = 0; i < len; i++) {
                    const p0 = points[(i - 1 + len) % len];
                    const p1 = points[i];
                    const p2 = points[(i + 1) % len];
                    const p3 = points[(i + 2) % len];
                    const cp1x = p1.x + (p2.x - p0.x) * 0.15;
                    const cp1y = p1.y + (p2.y - p0.y) * 0.15;
                    const cp2x = p2.x - (p3.x - p1.x) * 0.15;
                    const cp2y = p2.y - (p3.y - p1.y) * 0.15;
                    d += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y} `;
                }
                selectedElement.setAttribute("d", d);
                selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
            }
            if (blComplex) {
                blComplex.oninput = () => updateBlob(false);
                blComplex.onchange = () => editorInstance.saveState(); // SAVE: Blob Complex
            }
            if (blContrast) {
                blContrast.oninput = () => updateBlob(false);
                blContrast.onchange = () => editorInstance.saveState(); // SAVE: Blob Contrast
            }
            if (blRand) {
                blRand.onclick = () => {
                    updateBlob(true);
                    editorInstance.saveState(); // SAVE: Blob Randomize
                };
            }

            // --- Bubble Logic ---
            const buTail = document.getElementById('vp-bubble-tail');
            if (buTail) {
                buTail.oninput = () => {
                    const tailX = parseFloat(buTail.value) || 0.7;
                    selectedElement.setAttribute('data-tail', tailX);

                    let x, y, w, h;
                    if (selectedElement.hasAttribute('data-x')) {
                        x = parseFloat(selectedElement.getAttribute('data-x'));
                        y = parseFloat(selectedElement.getAttribute('data-y'));
                        w = parseFloat(selectedElement.getAttribute('data-w'));
                        h = parseFloat(selectedElement.getAttribute('data-h'));
                    } else {
                        const bbox = selectedElement.getBBox();
                        x = bbox.x; y = bbox.y; w = bbox.width; h = bbox.height;
                        selectedElement.setAttribute('data-x', x); selectedElement.setAttribute('data-y', y); selectedElement.setAttribute('data-w', w); selectedElement.setAttribute('data-h', h);
                    }

                    const r = 10;
                    const boxH = h * 0.8;
                    const tailTooltipX = w * tailX + (w > 20 ? 10 : 0);
                    const tailBaseX = w * tailX;

                    const d = `
                        M ${r} ${0} 
                        H ${w - r} 
                        Q ${w} ${0} ${w} ${r} 
                        V ${boxH - r} 
                        Q ${w} ${boxH} ${w - r} ${boxH}
                        H ${tailBaseX + 20} 
                        L ${tailTooltipX} ${h}
                        L ${tailBaseX} ${boxH}
                        H ${r}
                        Q ${0} ${boxH} ${0} ${boxH - r}
                        V ${r}
                        Q ${0} ${0} ${r} ${0}
                        Z
                     `.trim();
                    selectedElement.setAttribute("d", d);
                    selectedElement.setAttribute("transform", `translate(${x},${y})`);
                }
                buTail.onchange = () => editorInstance.saveState(); // SAVE: Bubble Tail
            }



            // --- Shield Logic ---
            const shShoulder = document.getElementById('vp-shield-shoulder');
            const shCrest = document.getElementById('vp-shield-crest');
            const shCurve = document.getElementById('vp-shield-curve');

            if (shShoulder || shCrest || shCurve) {
                const updateShield = () => {
                    const shoulder = parseFloat(shShoulder.value) || 0.5;
                    const crest = parseFloat(shCrest.value) || 0;
                    const curve = parseFloat(shCurve.value) || 1.0;

                    selectedElement.setAttribute('data-shoulder', shoulder);
                    selectedElement.setAttribute('data-crest', crest);
                    selectedElement.setAttribute('data-curve', curve);

                    let x, y, w, h;
                    if (selectedElement.hasAttribute('data-x')) {
                        x = parseFloat(selectedElement.getAttribute('data-x'));
                        y = parseFloat(selectedElement.getAttribute('data-y'));
                        w = parseFloat(selectedElement.getAttribute('data-w'));
                        h = parseFloat(selectedElement.getAttribute('data-h'));
                    } else {
                        const bbox = selectedElement.getBBox();
                        x = bbox.x; y = bbox.y; w = bbox.width; h = bbox.height;
                        selectedElement.setAttribute('data-x', x); selectedElement.setAttribute('data-y', y); selectedElement.setAttribute('data-w', w); selectedElement.setAttribute('data-h', h);
                    }
                    const cx = x + w / 2;
                    const cy = y + h / 2;
                    const crestY = -h / 2 + h * crest;
                    const sideY = -h / 2 + h * shoulder;
                    // Curve controls bottom corner sharpness: 0=sharp corners, 1=smooth rounded
                    let d;
                    if (curve < 0.01) {
                        // Sharp corners - direct lines
                        d = `M 0 ${crestY} L ${-w / 2} ${-h / 2} V ${sideY} L 0 ${h / 2} L ${w / 2} ${sideY} V ${-h / 2} Z`.trim();
                    } else {
                        // Smooth corners - quadratic curves
                        const cpDist = curve * (h / 2 - sideY) * 0.8; // Control point distance from corner
                        d = `M 0 ${crestY} L ${-w / 2} ${-h / 2} V ${sideY} Q ${-w / 2} ${sideY + cpDist} 0 ${h / 2} Q ${w / 2} ${sideY + cpDist} ${w / 2} ${sideY} V ${-h / 2} Z`.trim();
                    }

                    selectedElement.setAttribute("d", d);
                    selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
                }
                if (shShoulder) {
                    shShoulder.oninput = updateShield;
                    shShoulder.onchange = () => editorInstance.saveState(); // SAVE: Shield Shoulder
                }
                if (shCrest) {
                    shCrest.oninput = updateShield;
                    shCrest.onchange = () => editorInstance.saveState(); // SAVE: Shield Crest
                }
                if (shCurve) {
                    shCurve.oninput = updateShield;
                    shCurve.onchange = () => editorInstance.saveState(); // SAVE: Shield Curve
                }
            }

            // --- Gear Logic ---
            const geTeeth = document.getElementById('vp-gear-teeth');
            const geDepth = document.getElementById('vp-gear-depth');
            const geDepthVal = document.getElementById('vp-gear-depth-val');
            const geHole = document.getElementById('vp-gear-hole');

            const updateGear = () => {
                const teeth = parseInt(geTeeth.value) || 8;
                const depth = parseFloat(geDepth.value) || 0.2;
                const hole = parseFloat(geHole.value) || 0;
                if (geDepthVal) geDepthVal.textContent = Math.round(depth * 100) + '%';

                selectedElement.setAttribute('data-teeth', teeth);
                selectedElement.setAttribute('data-depth', depth);
                selectedElement.setAttribute('data-hole', hole);

                let cx, cy, r;
                let valid = false;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                    if (!isNaN(cx)) valid = true;
                }
                if (!valid) {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2;
                    cy = bbox.y + bbox.height / 2;
                    r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx); selectedElement.setAttribute('data-cy', cy); selectedElement.setAttribute('data-r', r);
                }

                const innerR = r * (1 - depth);
                const holeR = r * hole;
                let gearDStr = "";
                const gearStep = (Math.PI * 2) / teeth;
                const qStep = gearStep / 4;

                for (let i = 0; i < teeth; i++) {
                    const a = i * gearStep - Math.PI / 2;
                    const a1 = a;
                    const a2 = a + qStep;
                    const a3 = a + qStep * 2;
                    const a4 = a + qStep * 3;

                    const p1x = Math.cos(a1) * innerR; const p1y = Math.sin(a1) * innerR;
                    const p2x = Math.cos(a2) * r; const p2y = Math.sin(a2) * r;
                    const p3x = Math.cos(a3) * r; const p3y = Math.sin(a3) * r;
                    const p4x = Math.cos(a4) * innerR; const p4y = Math.sin(a4) * innerR;

                    if (i === 0) gearDStr += `M ${p1x} ${p1y} `;
                    else gearDStr += `L ${p1x} ${p1y} `;
                    gearDStr += `L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} `;
                }
                gearDStr += "Z";
                if (hole > 0) {
                    gearDStr += ` M ${holeR} ${0} A ${holeR} ${holeR} 0 1 0 ${-holeR} ${0} A ${holeR} ${holeR} 0 1 0 ${holeR} ${0} Z`;
                }

                selectedElement.setAttribute("d", gearDStr.trim());
                selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
            };

            if (geTeeth) {
                geTeeth.oninput = updateGear;
                geTeeth.onchange = () => editorInstance.saveState(); // SAVE: Gear Teeth
            }
            if (geDepth) {
                geDepth.oninput = updateGear;
                geDepth.onchange = () => editorInstance.saveState(); // SAVE: Gear Depth
            }
            if (geHole) {
                geHole.oninput = updateGear;
                geHole.onchange = () => editorInstance.saveState(); // SAVE: Gear Hole
            }

            // --- Flower Logic ---
            const flPetals = document.getElementById('vp-flower-petals');
            const flRound = document.getElementById('vp-flower-round');
            const updateFlower = () => {
                const petals = parseInt(flPetals.value) || 5;
                const roundness = parseFloat(flRound.value) || 0.6;
                selectedElement.setAttribute('data-petals', petals);
                selectedElement.setAttribute('data-round', roundness);

                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2; cy = bbox.y + bbox.height / 2; r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx); selectedElement.setAttribute('data-cy', cy); selectedElement.setAttribute('data-r', r);
                }

                let dStr = "";
                const step = (Math.PI * 2) / petals;
                for (let i = 0; i < petals; i++) {
                    const a = i * step;
                    const nextA = (i + 1) * step;
                    const pX = Math.cos(a) * r;
                    const pY = Math.sin(a) * r;
                    const nextX = Math.cos(nextA) * r;
                    const nextY = Math.sin(nextA) * r;
                    const cp1x = Math.cos(a + step * 0.3) * (r * (1 + roundness));
                    const cp1y = Math.sin(a + step * 0.3) * (r * (1 + roundness));
                    const cp2x = Math.cos(a + step * 0.7) * (r * (1 + roundness));
                    const cp2y = Math.sin(a + step * 0.7) * (r * (1 + roundness));
                    if (i === 0) dStr += `M ${pX} ${pY} `;
                    dStr += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${nextX} ${nextY} `;
                }
                dStr += "Z";
                selectedElement.setAttribute("d", dStr);
                selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
            }
            if (flPetals) {
                flPetals.oninput = updateFlower;
                flPetals.onchange = () => editorInstance.saveState(); // SAVE: Flower Petals
            }
            if (flRound) {
                flRound.oninput = updateFlower;
                flRound.onchange = () => editorInstance.saveState(); // SAVE: Flower Roundness
            }

            // --- Cloud Logic ---
            const clBumps = document.getElementById('vp-cloud-bumps');
            const clPuff = document.getElementById('vp-cloud-puff');
            const clIrreg = document.getElementById('vp-cloud-irreg');
            const clFlat = document.getElementById('vp-cloud-flat');
            const updateCloud = () => {
                const bumps = parseInt(clBumps.value) || 6;
                const puff = parseFloat(clPuff.value) || 0.5;
                const irregularity = parseFloat(clIrreg.value) || 0;
                const flatness = parseFloat(clFlat.value) || 0;
                selectedElement.setAttribute('data-bumps', bumps);
                selectedElement.setAttribute('data-puff', puff);
                selectedElement.setAttribute('data-irreg', irregularity);
                selectedElement.setAttribute('data-flat', flatness);

                let cx, cy, r;
                if (selectedElement.hasAttribute('data-cx')) {
                    cx = parseFloat(selectedElement.getAttribute('data-cx'));
                    cy = parseFloat(selectedElement.getAttribute('data-cy'));
                    r = parseFloat(selectedElement.getAttribute('data-r'));
                } else {
                    const bbox = selectedElement.getBBox();
                    cx = bbox.x + bbox.width / 2; cy = bbox.y + bbox.height / 2; r = Math.max(bbox.width, bbox.height) / 2;
                    selectedElement.setAttribute('data-cx', cx); selectedElement.setAttribute('data-cy', cy); selectedElement.setAttribute('data-r', r);
                }

                let d = "";
                const step = (Math.PI * 2) / bumps;
                const seed = 123;
                const random = (s) => {
                    const x = Math.sin(s) * 10000;
                    return x - Math.floor(x);
                }

                for (let i = 0; i < bumps; i++) {
                    const a = i * step;
                    const nextA = (i + 1) * step;
                    const r1 = r * (1 + (random(i + seed) - 0.5) * irregularity);
                    const r2 = r * (1 + (random(i + 1 + seed) - 0.5) * irregularity);
                    let p1X = Math.cos(a) * r1;
                    let p1Y = Math.sin(a) * r1;
                    let nextX = Math.cos(nextA) * r2;
                    let nextY = Math.sin(nextA) * r2;

                    if (flatness > 0) {
                        if (p1Y > 0) p1Y = p1Y * (1 - flatness);
                        if (nextY > 0) nextY = nextY * (1 - flatness);
                    }

                    let cp1x = Math.cos(a + step * 0.3) * (r1 * (1 + puff));
                    let cp1y = Math.sin(a + step * 0.3) * (r1 * (1 + puff));
                    let cp2x = Math.cos(a + step * 0.7) * (r2 * (1 + puff));
                    let cp2y = Math.sin(a + step * 0.7) * (r2 * (1 + puff));

                    if (flatness > 0) {
                        if (cp1y > 0) cp1y = cp1y * (1 - flatness);
                        if (cp2y > 0) cp2y = cp2y * (1 - flatness);
                    }

                    if (i === 0) d += `M ${p1X} ${p1Y} `;
                    d += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${nextX} ${nextY} `;
                }
                d += "Z";
                selectedElement.setAttribute("d", d);
                selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
            }
            if (clBumps) {
                clBumps.oninput = updateCloud;
                clBumps.onchange = () => editorInstance.saveState(); // SAVE: Cloud Bumps
            }
            if (clPuff) {
                clPuff.oninput = updateCloud;
                clPuff.onchange = () => editorInstance.saveState(); // SAVE: Cloud Puff
            }
            if (clIrreg) {
                clIrreg.oninput = updateCloud;
                clIrreg.onchange = () => editorInstance.saveState(); // SAVE: Cloud Irregularity
            }
            if (clFlat) {
                clFlat.oninput = updateCloud;
                clFlat.onchange = () => editorInstance.saveState(); // SAVE: Cloud Flatness
            }

            // --- Drop Logic ---
            const drTaper = document.getElementById('vp-drop-taper');
            if (drTaper) {
                drTaper.oninput = () => {
                    const taper = parseFloat(drTaper.value) || 0.25;
                    selectedElement.setAttribute('data-taper', taper);

                    let x, y, w, h;
                    if (selectedElement.hasAttribute('data-x')) {
                        x = parseFloat(selectedElement.getAttribute('data-x'));
                        y = parseFloat(selectedElement.getAttribute('data-y'));
                        w = parseFloat(selectedElement.getAttribute('data-w'));
                        h = parseFloat(selectedElement.getAttribute('data-h'));
                    } else {
                        const bbox = selectedElement.getBBox();
                        x = bbox.x; y = bbox.y; w = bbox.width; h = bbox.height;
                        selectedElement.setAttribute('data-x', x); selectedElement.setAttribute('data-y', y); selectedElement.setAttribute('data-w', w); selectedElement.setAttribute('data-h', h);
                    }
                    const cx = x + w / 2;
                    const cy = y + h / 2;
                    const r = Math.min(w, h) / 2;
                    const circleCy = h / 2 - r;
                    const d = `
                        M ${- w / 2} ${circleCy}
                        A ${r} ${r} 0 0 0 ${w / 2} ${circleCy}
                        Q ${w / 2} ${-h / 2 + h * taper} ${0} ${-h / 2}
                        Q ${- w / 2} ${-h / 2 + h * taper} ${- w / 2} ${circleCy}
                        Z
                     `.trim();
                    selectedElement.setAttribute("d", d);
                    selectedElement.setAttribute("transform", `translate(${cx},${cy})`);
                }
                drTaper.onchange = () => editorInstance.saveState(); // SAVE: Drop Taper
            }

            // --- Warp Effect Binding ---
            const warpTypeSelect = document.getElementById('vp-warp-type');
            const warpBend = document.getElementById('vp-warp-bend');
            const warpDistH = document.getElementById('vp-warp-dist-h');
            const warpDistV = document.getElementById('vp-warp-dist-v');

            const updateWarp = () => {
                const type = warpTypeSelect ? warpTypeSelect.value : 'none';
                const bend = warpBend ? parseInt(warpBend.value) : 50;
                const distH = warpDistH ? parseInt(warpDistH.value) : 0;
                const distV = warpDistV ? parseInt(warpDistV.value) : 0;

                const bendVal = document.getElementById('vp-bend-val');
                if (bendVal) bendVal.textContent = bend + '%';
                const distHVal = document.getElementById('vp-dist-h-val');
                if (distHVal) distHVal.textContent = distH + '%';
                const distVVal = document.getElementById('vp-dist-v-val');
                if (distVVal) distVVal.textContent = distV + '%';

                selectedElement.setAttribute('data-warp', JSON.stringify({
                    type, bend, distH, distV
                }));

                if (editorInstance.applyWarp) {
                    const newEl = editorInstance.applyWarp(selectedElement);
                    if (newEl && newEl !== selectedElement) {
                        selectedElement = newEl;
                    }
                }
            };

            if (warpTypeSelect) {
                warpTypeSelect.onchange = () => {
                    updateWarp();
                    editorInstance.saveState(); // SAVE: Warp Type
                };
            }
            if (warpBend) {
                warpBend.oninput = updateWarp;
                warpBend.onchange = () => editorInstance.saveState(); // SAVE: Warp Bend
            }
            if (warpDistH) {
                warpDistH.oninput = updateWarp;
                warpDistH.onchange = () => editorInstance.saveState(); // SAVE: Warp Dist H
            }
            if (warpDistV) {
                warpDistV.oninput = updateWarp;
                warpDistV.onchange = () => editorInstance.saveState(); // SAVE: Warp Dist V
            }

            const groupBtn = document.getElementById('vp-group');
            if (groupBtn) groupBtn.onclick = () => editorInstance.groupSelection();

            const unionBtn = document.getElementById('vp-union');
            if (unionBtn) unionBtn.onclick = () => editorInstance.booleanOperation('union');

            const subBtn = document.getElementById('vp-subtract');
            if (subBtn) subBtn.onclick = () => editorInstance.booleanOperation('subtract');

            const intBtn = document.getElementById('vp-intersect');
            if (intBtn) intBtn.onclick = () => editorInstance.booleanOperation('intersect');

            const excBtn = document.getElementById('vp-exclude');
            if (excBtn) excBtn.onclick = () => editorInstance.booleanOperation('exclude');

            const ungroupBtn = document.getElementById('vp-ungroup');
            if (ungroupBtn) ungroupBtn.onclick = () => editorInstance.ungroupSelection();

            const frontBtn = document.getElementById('vp-front');
            if (frontBtn) frontBtn.onclick = () => editorInstance.bringToFront();

            const backBtn = document.getElementById('vp-back');
            if (backBtn) backBtn.onclick = () => editorInstance.sendToBack();

            const deleteBtn = document.getElementById('vp-delete');
            if (deleteBtn) deleteBtn.onclick = () => {
                if (confirm(`Delete ${editorInstance.selectedElements.length} items ? `)) {
                    editorInstance.selectedElements.forEach(el => el.parentNode?.removeChild(el));
                    editorInstance.deselect();
                    editorInstance.saveState(); // SAVE: Inspector Delete
                }
            };

        }, 0);
    }
}
