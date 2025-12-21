import SceneRegistry from '../../../js/core/SceneRegistry.js';

export default class Inspector {
    static render(engine) {
        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Graph Properties</div>
                <div style="font-size: 12px;">Select a node to view properties.</div>
            </div>
        `);
    }

    static update(engine, node) {
        const type = node.dataset.type;
        const label = node.dataset.label;
        const x = node.style.left;
        const y = node.style.top;
        const targetEntityId = node.dataset.targetEntityId || '';

        // --- FETCH ENTITIES FROM HUB ---
        const entities = SceneRegistry.getAllEntities();
        let entityOptions = `<option value="">-- No Target (Global) --</option>`;
        entities.forEach(ent => {
            entityOptions += `<option value="${ent.id}" ${targetEntityId === ent.id ? 'selected' : ''}>${ent.name} (${ent.type})</option>`;
        });

        const entitySection = `
            <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">🎯 LOGIC TARGET</label>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px;">Entity to Control</label>
                    <select id="ins-target-entity" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; font-size: 11px;">
                        ${entityOptions}
                    </select>
                    <div style="font-size: 9px; color: var(--text-dim); margin-top: 4px;">Choose an object from OviState to apply this logic to.</div>
                </div>
            </div>
        `;

        let extraFields = '';

        if (type === 'action_rotate') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">ROTATION SETTINGS</label>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Speed</label>
                        <input type="number" id="ins-rotate-speed" value="${node.dataset.speed || 2}" step="0.1" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Direction</label>
                        <select id="ins-rotate-direction" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                            <option value="1" ${node.dataset.direction === '1' ? 'selected' : ''}>Clockwise</option>
                            <option value="-1" ${node.dataset.direction === '-1' ? 'selected' : ''}>Counter-Clockwise</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (type === 'action_move') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">MOVEMENT SETTINGS</label>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Speed (px/s)</label>
                        <input type="number" id="ins-move-speed" value="${node.dataset.speed || 100}" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Axis</label>
                        <select id="ins-move-axis" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                            <option value="x" ${node.dataset.axis === 'x' ? 'selected' : ''}>Horizontal (X)</option>
                            <option value="y" ${node.dataset.axis === 'y' ? 'selected' : ''}>Vertical (Y)</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (type === 'action_scale') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">SCALE SETTINGS</label>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Min Scale</label>
                        <input type="number" id="ins-scale-min" value="${node.dataset.scaleMin || 0.8}" step="0.1" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Max Scale</label>
                        <input type="number" id="ins-scale-max" value="${node.dataset.scaleMax || 1.2}" step="0.1" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Pulse Speed</label>
                        <input type="number" id="ins-scale-speed" value="${node.dataset.speed || 5}" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                </div>
            `;
        } else if (type === 'action_opacity') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">OPACITY SETTINGS</label>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Target Opacity (0-1)</label>
                        <input type="number" id="ins-opacity-target" value="${node.dataset.target || 0}" step="0.1" min="0" max="1" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Fade Speed</label>
                        <input type="number" id="ins-opacity-speed" value="${node.dataset.speed || 1}" step="0.1" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                </div>
            `;
        } else if (type === 'action_move_to') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">NAV SETTINGS</label>
                    <div style="margin-bottom: 5px;">
                        <input type="number" id="ins-moveto-x" placeholder="Target X" value="${node.dataset.targetX || 400}" style="width: 48%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                        <input type="number" id="ins-moveto-y" placeholder="Target Y" value="${node.dataset.targetY || 300}" style="width: 48%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                    <div>
                        <label style="font-size: 10px;">Travel Speed</label>
                        <input type="number" id="ins-moveto-speed" value="${node.dataset.speed || 200}" style="width: 100%; padding: 4px;">
                    </div>
                </div>
            `;
        } else if (type === 'action_shake') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">JUICE SETTINGS</label>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Intensity</label>
                        <input type="range" id="ins-shake-int" min="1" max="50" value="${node.dataset.intensity || 10}" style="width: 100%;">
                    </div>
                </div>
            `;
        } else if (type === 'flow_delay') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">TIMER SETTINGS</label>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Wait (seconds)</label>
                        <input type="number" id="ins-delay-time" value="${node.dataset.time || 1.0}" step="0.1" style="width: 100%; padding: 4px;">
                    </div>
                </div>
            `;
        } else if (type === 'action_visibility') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">VISIBILITY SETTINGS</label>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Mode</label>
                        <select id="ins-visibility-mode" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                            <option value="show" ${node.dataset.mode === 'show' ? 'selected' : ''}>Force Show</option>
                            <option value="hide" ${node.dataset.mode === 'hide' ? 'selected' : ''}>Force Hide</option>
                            <option value="blink" ${node.dataset.mode === 'blink' ? 'selected' : ''}>Blink (Loop)</option>
                        </select>
                    </div>
                </div>
            `;
        } else if (type === 'brim_fill_dna') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">DNA PARAMETERS</label>
                    
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">DNA Category</label>
                        <select id="ins-dna-type" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                            <option value="logic" ${node.dataset.dnaType === 'logic' ? 'selected' : ''}>Logic</option>
                            <option value="ethics" ${node.dataset.dnaType === 'ethics' ? 'selected' : ''}>Ethics</option>
                            <option value="strategy" ${node.dataset.dnaType === 'strategy' ? 'selected' : ''}>Strategy</option>
                            <option value="creativity" ${node.dataset.dnaType === 'creativity' ? 'selected' : ''}>Creativity</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Amount (+/-)</label>
                        <input type="number" id="ins-dna-amount" value="${node.dataset.amount || 10}" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                </div>
            `;
        } else if (type === 'brim_tale_pop') {
            extraFields = `
                <div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px; color: var(--text-accent);">NARRATIVE PARAMETERS</label>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Message</label>
                        <textarea id="ins-message" style="width: 100%; height: 60px; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; font-family: inherit; font-size: 11px;">${node.dataset.message || ''}</textarea>
                    </div>
                </div>
            `;
        }

        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 15px; font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Node Properties</div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px;">Internal Type</label>
                    <div style="font-size: 11px; color: var(--text-dim); padding: 4px; background: rgba(255,255,255,0.05); border-radius: 4px;">${type}</div>
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px;">Display Name</label>
                    <input type="text" id="ins-label" value="${label}" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                </div>

                <div style="display: flex; gap: 10px;">
                    <div>
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">X</label>
                        <div style="font-size: 11px; padding: 4px;">${Math.round(parseFloat(x))}</div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Y</label>
                        <div style="font-size: 11px; padding: 4px;">${Math.round(parseFloat(y))}</div>
                    </div>
                </div>

                ${entitySection}

                ${extraFields}
            </div>
        `);

        // Bind Events
        setTimeout(() => {
            const labelInput = document.getElementById('ins-label');
            const targetSelect = document.getElementById('ins-target-entity');
            const dnaTypeSelect = document.getElementById('ins-dna-type');
            const dnaAmountInput = document.getElementById('ins-dna-amount');
            const messageTextArea = document.getElementById('ins-message');

            // Animation Bindings
            const rotSpeed = document.getElementById('ins-rotate-speed');
            const rotDir = document.getElementById('ins-rotate-direction');
            const moveSpeed = document.getElementById('ins-move-speed');
            const moveAxis = document.getElementById('ins-move-axis');
            const scaleMin = document.getElementById('ins-scale-min');
            const scaleMax = document.getElementById('ins-scale-max');
            const scaleSpeed = document.getElementById('ins-scale-speed');
            const opTarget = document.getElementById('ins-opacity-target');
            const opSpeed = document.getElementById('ins-opacity-speed');

            const visMode = document.getElementById('ins-visibility-mode');

            if (labelInput) {
                labelInput.oninput = () => {
                    node.dataset.label = labelInput.value;
                    const header = node.querySelector('.node-header');
                    if (header) header.innerText = labelInput.value;
                };
            }

            if (targetSelect) {
                targetSelect.onchange = () => {
                    node.dataset.targetEntityId = targetSelect.value;
                    console.log(`🎯 Node ${node.id} targeted to: ${targetSelect.value}`);
                };
            }

            if (dnaTypeSelect) {
                dnaTypeSelect.onchange = () => {
                    node.dataset.dnaType = dnaTypeSelect.value;
                };
            }

            if (dnaAmountInput) {
                dnaAmountInput.oninput = () => {
                    node.dataset.amount = dnaAmountInput.value;
                };
            }

            if (messageTextArea) {
                messageTextArea.oninput = () => {
                    node.dataset.message = messageTextArea.value;
                };
            }

            if (rotSpeed) rotSpeed.oninput = () => node.dataset.speed = rotSpeed.value;
            if (rotDir) rotDir.onchange = () => node.dataset.direction = rotDir.value;
            if (moveSpeed) moveSpeed.oninput = () => node.dataset.speed = moveSpeed.value;
            if (moveAxis) moveAxis.onchange = () => node.dataset.axis = moveAxis.value;
            if (scaleMin) scaleMin.oninput = () => node.dataset.scaleMin = scaleMin.value;
            if (scaleMax) scaleMax.oninput = () => node.dataset.scaleMax = scaleMax.value;
            if (scaleSpeed) scaleSpeed.oninput = () => node.dataset.speed = scaleSpeed.value;
            if (opTarget) opTarget.oninput = () => node.dataset.target = opTarget.value;
            if (opSpeed) opSpeed.oninput = () => node.dataset.speed = opSpeed.value;
            if (visMode) visMode.onchange = () => node.dataset.mode = visMode.value;

            // New Utility Bindings
            const moveToX = document.getElementById('ins-moveto-x');
            const moveToY = document.getElementById('ins-moveto-y');
            const moveToSpeed = document.getElementById('ins-moveto-speed');
            const shakeInt = document.getElementById('ins-shake-int');
            const delayTime = document.getElementById('ins-delay-time');

            if (moveToX) moveToX.oninput = () => node.dataset.targetX = moveToX.value;
            if (moveToY) moveToY.oninput = () => node.dataset.targetY = moveToY.value;
            if (moveToSpeed) moveToSpeed.oninput = () => node.dataset.speed = moveToSpeed.value;
            if (shakeInt) shakeInt.oninput = () => node.dataset.intensity = shakeInt.value;
            if (delayTime) delayTime.oninput = () => node.dataset.time = delayTime.value;
        }, 0);
    }
}
