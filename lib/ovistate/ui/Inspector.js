/**
 * Enhanced Inspector Panel with Interactive Controls
 */
export default class Inspector {
    static render(engine, data = null) {
        if (!data) {
            engine.layoutManager.setInspectorContent(`
                <div style="padding: 15px; color: var(--text-primary);">
                    <div style="font-weight: bold; margin-bottom: 15px; font-size: 14px;">
                        📋 Inspector
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        Select an object to edit properties
                    </div>
                </div>
            `);
            return;
        }

        const html = this.buildInspectorHTML(data);
        engine.layoutManager.setInspectorContent(html);

        // Attach event listeners after DOM is ready
        setTimeout(() => this.attachEventListeners(engine), 0);
    }

    static update(engine, object) {
        try {
            if (!object) {
                engine.layoutManager.setInspectorContent(`
                <div style="padding: 15px; color: var(--text-primary);">
                    <div style="padding:15px; color:#888; text-align:center;">Select an object to inspect</div>
                </div>
            `);
                return;
            }

            // --- MULTI-SELECT VIEW ---
            if (object.isMultiSelect) {
                const html = `
                <div style="padding: 15px; text-align: center;">
                    <h3 style="margin-bottom: 10px; color: #eee;">Multiple Selection</h3>
                    <div style="color: #aaa; margin-bottom: 20px;">${object.count} objects selected</div>
                    
                    <button id="multi-delete-btn" style="
                        width: 100%;
                        padding: 10px;
                        background: #ff4d4d;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: bold;
                    ">Delete All Selected</button>
                    
                    <div style="margin-top:20px; font-size:12px; color:#666;">
                        (Bulk property editing not yet supported)
                    </div>
                </div>
            `;
                engine.layoutManager.setInspectorContent(html);

                // Bind Delete Button
                setTimeout(() => {
                    const btn = document.getElementById('multi-delete-btn');
                    if (btn && window.oviEditor) {
                        btn.addEventListener('click', () => {
                            window.oviEditor.deleteSelected();
                        });
                    }
                }, 0);
                return;
            }

            // --- SINGLE OBJECT VIEW ---
            console.log('🔍 Inspector rendering object:', {
                id: object.id,
                type: object.type,
                isUI: object.isUI,
                hasBehaviors: !!object.behaviors,
                behaviorsType: object.behaviors?.constructor?.name,
                behaviorsCount: object.behaviors instanceof Set ? object.behaviors.size : object.behaviors?.length,
                behaviorsArray: object.behaviors ? Array.from(object.behaviors) : []
            });

            const html = object.isUI ? this.buildUIInspector(object) : this.buildInspectorHTML(object);
            console.log('🔍 Generated HTML length:', html.length, 'Contains "Activation":', html.includes('Activation'));
            engine.layoutManager.setInspectorContent(html);

            // Attach event listeners after DOM is ready
            setTimeout(() => this.attachEventListeners(engine), 0);

        } catch (e) {
            console.error("Inspector Update Failed:", e);
            engine.layoutManager.setInspectorContent(`
            <div style="padding: 20px; color: #ff6b6b;">
                <h3>Inspector Error</h3>
                <pre style="font-size: 10px; white-space: pre-wrap;">${e.message}\n${e.stack}</pre>
            </div>
        `);
        }
    }

    static buildInspectorHTML(data) {
        return `
            <div style="padding: 15px; color: var(--text-primary);">
                <div style="font-weight: bold; margin-bottom: 15px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    ${this.getObjectIcon(data.type)}
                    <span>${this.getObjectLabel(data.type)}</span>
                </div>

                ${data.isUI ? this.buildUIInspector(data) : `
                
                <div class="inspector-section">
                    <div class="section-title">Transform</div>
                    ${this.createNumberControl('X Position', 'x', data.x, 0, 1000)}
                    ${this.createNumberControl('Y Position', 'y', data.y, 0, 1000)}
                    ${data.type === 'circle' ?
                    this.createNumberControl('Radius', 'radius', data.radius || 30, 5, 200) :
                    (data.type === 'text' ? '' :
                        this.createNumberControl('Width', 'width', data.width || 60, 10, 500) +
                        this.createNumberControl('Height', 'height', data.height || 60, 10, 500))
                }
                </div>

                ${data.type === 'symbol' ? `
                <div class="inspector-section">
                    <div class="section-title">Symbol Settings</div>
                    <div class="property-control">
                        <div class="property-label">Symbol</div>
                        <div style="display: flex; gap: 8px;">
                            <div style="flex: 1; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; font-size: 24px; text-align: center;">${data.symbol || '😀'}</div>
                            <button id="btn-replace-symbol" style="padding: 5px 12px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 3px; cursor: pointer; font-size: 11px;">Replace</button>
                        </div>
                    </div>
                    ${this.createNumberControl('Size', 'size', data.size || 48, 10, 500)}
                </div>
                ` : ''}

                ${data.type === 'text' ? `
                <div class="inspector-section">
                    <div class="section-title">Text Content</div>
                    <div class="property-control">
                        <textarea id="prop-text" data-property="text" 
                            style="width: 100%; height: 80px; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px; resize: vertical;">${data.text || 'Text'}</textarea>
                    </div>
                </div>



                <div class="inspector-section">
                    <div class="section-title">Typography & Layout</div>
                    ${this.createNumberControl('Font Size', 'fontSize', data.fontSize || 20, 8, 100)}
                    ${this.createNumberControl('Line Height', 'lineHeight', data.lineHeight || 1.2, 0.5, 3.0, 0.1)}
                    
                    <div class="property-control">
                        <div class="property-label">Alignment</div>
                        <div style="display: flex; gap: 4px;">
                            <select id="prop-align" data-property="align" style="flex: 1; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                                <option value="left" ${data.align === 'left' ? 'selected' : ''}>Left</option>
                                <option value="center" ${data.align === 'center' || !data.align ? 'selected' : ''}>Center</option>
                                <option value="right" ${data.align === 'right' ? 'selected' : ''}>Right</option>
                                <option value="justify" ${data.align === 'justify' ? 'selected' : ''}>Justify</option>
                            </select>
                            <select id="prop-verticalAlign" data-property="verticalAlign" style="flex: 1; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                                <option value="top" ${data.verticalAlign === 'top' ? 'selected' : ''}>Top</option>
                                <option value="middle" ${data.verticalAlign === 'middle' || !data.verticalAlign ? 'selected' : ''}>Middle</option>
                                <option value="bottom" ${data.verticalAlign === 'bottom' ? 'selected' : ''}>Bottom</option>
                            </select>
                        </div>
                    </div>

                    ${this.createToggleControl('Word Wrap', 'wordWrap', data.wordWrap || false)}
                    ${data.wordWrap ?
                        this.createNumberControl('Max Width', 'width', data.width || 300, 50, 800)
                        : ''}
                </div>
                ` : ''}

                <!-- Appearance Section -->
                <div class="inspector-section">
                    <div class="section-title">Appearance</div>
                    ${this.createColorControl('Fill Color', 'fill', data.fill || '#3498db')}
                    ${this.createColorControl('Stroke Color', 'stroke', data.stroke || '#2980b9')}
                    ${this.createNumberControl('Stroke Width', 'strokeWidth', data.strokeWidth || 2, 0, 10)}
                    ${this.createNumberControl('Opacity', 'opacity', data.opacity || 1, 0, 1, 0.01)}
                    
                    <div class="property-control">
                        <div class="property-label">Tags (Logic)</div>
                        <input type="text" id="prop-tags" value="${(data.tags || []).join(', ')}" data-property="tags_string" placeholder="e.g. player, enemy" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                    </div>
                </div>

                <!-- Physics Section -->
                <div class="inspector-section">
                    <div class="section-title">Physics</div>
                    ${this.createToggleControl('Enable Physics', 'physics.enabled', data.physics?.enabled || false)}
                    ${data.physics?.enabled ? `
                        ${this.createNumberControl('Mass', 'physics.mass', data.physics.mass || 1, 0.1, 10, 0.1)}
                        ${this.createNumberControl('Bounciness', 'physics.bounciness', data.physics.bounciness || 0.8, 0, 1, 0.1)}
                    ` : ''}
                </div>

                <!-- Emitter Section -->
                ${data.type === 'emitter' ? `
                <div class="inspector-section">
                    <div class="section-title">Emitter Settings</div>
                    ${this.createNumberControl('Rate (pps)', 'rate', data.rate || 10, 1, 500)}
                    ${this.createNumberControl('Speed', 'speed', data.speed || 100, 10, 1000)}
                    ${this.createNumberControl('Angle (deg)', 'angle', data.angle || -90, -360, 360)}
                    ${this.createNumberControl('Spread (deg)', 'spread', data.spread || 30, 0, 360)}
                    ${this.createNumberControl('Life (sec)', 'lifetime', data.lifetime || 1, 0.1, 10, 0.1)}
                    ${this.createNumberControl('Part. Size', 'particleSize', data.particleSize || 3, 1, 20)}
                    ${this.createColorControl('Color', 'color', data.color || '#ffaa00')}
                </div>
                ` : ''}

                <!-- Behaviors Section -->
                <div class="inspector-section">
                    <div class="section-title">Behaviors</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
                        ${(data.behaviors instanceof Set ? data.behaviors.size : data.behaviors?.length) || 0} active behavior(s)
                    </div>
                    ${Array.from(data.behaviors || []).map(b => `
                        <div style="background: var(--bg-secondary); padding: 6px 8px; border-radius: 3px; margin-bottom: 4px; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
                            <span>${this.getBehaviorLabel(b)}</span>
                            <button onclick="window.oviEditor.removeBehavior('${b}')" style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px 6px;">✕</button>
                        </div>
                    `).join('')}
                    
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                        <div style="display: flex; gap: 5px;">
                            <select id="new-behavior-select" style="flex: 1; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                                <option value="">+ Add Behavior...</option>
                                ${this.generateBehaviorOptions(window.oviEditor)}
                            </select>
                            <button id="add-behavior-btn" style="padding: 4px 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Add</button>
                        </div>
                    </div>
                </div>
                
                <!-- Behavior Parameters (for all object types) -->
                ${console.log('🔍 About to call renderBehaviorSettings, data.behaviors:', data.behaviors) || this.renderBehaviorSettings(data)}
                
                `}
                
                <!-- Delete Button -->
                <div class="inspector-section" style="border-top: 1px solid var(--border-color); margin-top: 10px; padding-top: 10px;">
                    <button id="single-delete-btn" style="width: 100%; padding: 8px; background: #c0392b; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete Object</button>
                </div>

                ${this.getInspectorStyles()}
            </div>
        `;
    }

    static buildUIInspector(data) {
        let controls = `
            <div style="padding: 15px; color: var(--text-primary);">
                <div style="font-weight: bold; margin-bottom: 15px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    ${this.getObjectIcon(data.type)}
                    <span>${this.getObjectLabel(data.type)}</span>
                </div>
        `;

        // Common Layout Properties
        controls += `
            <div class="inspector-section">
                <div class="section-title">Layout</div>
                ${this.createNumberControl('X Position', 'x', data.x, 0, 2000)}
                ${this.createNumberControl('Y Position', 'y', data.y, 0, 2000)}
            </div>
        `;

        // Specific Properties
        controls += '<div class="inspector-section"><div class="section-title">Component Properties</div>';

        if (data.type === 'button') {
            controls += this.createStringControl('Label', 'label', data.label || 'Button');
            controls += this.createColorControl('Background', 'style.background', data.style?.background || '#007acc');
            controls += this.createColorControl('Text Color', 'style.color', data.style?.color || '#ffffff');
        } else if (data.type === 'slider') {
            controls += this.createStringControl('Label', 'label', data.label || 'Slider');
            controls += this.createToggleControl('Show Label', 'showLabel', data.showLabel !== false);
            controls += this.createNumberControl('Min Value', 'min', data.min || 0, -100, 100);
            controls += this.createNumberControl('Max Value', 'max', data.max || 100, 0, 1000);
            controls += this.createNumberControl('Step', 'step', data.step || 1, 0.1, 10, 0.1);
            controls += this.createNumberControl('Current Value', 'value', data.value || 50, data.min || 0, data.max || 100);
        } else if (data.type === 'checkbox') {
            controls += this.createStringControl('Label', 'label', data.label || 'Enable');
            controls += this.createToggleControl('Checked', 'checked', data.checked || false);
        } else if (data.type === 'text_input') {
            controls += this.createStringControl('Placeholder', 'placeholder', data.placeholder || 'Enter text...');
        } else if (data.type === 'dropdown') {
            controls += this.createStringControl('Options (comma sep)', 'options', (data.options || []).join(', '));
        } else if (data.type === 'graph') {
            controls += this.createStringControl('Label', 'label', data.label || 'Graph');
            controls += this.createColorControl('Line Color', 'style.color', data.style?.color || '#00ff00');
            controls += this.createNumberControl('Min Value', 'min', data.min || 0, -1000, 1000);
            controls += this.createNumberControl('Max Value', 'max', data.max || 100, -1000, 1000);
            controls += this.createNumberControl('Data Points', 'history', data.history || 50, 10, 200);
        }

        controls += '</div>';

        // --- Standardized Binding UI Helper ---
        const createBindingSection = (title, description, content) => `
            <div class="inspector-section">
                <div class="section-title">${title}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">${description}</div>
                ${content}
            </div>
        `;

        // --- Event Binding (Buttons) ---
        if (data.type === 'button') {
            const editor = window.oviEditor;
            const objects = editor && editor.runtime ? editor.runtime.objects : [];
            const currentTargets = data.binding?.targets || (data.binding?.targetId ? [data.binding.targetId] : []);

            let targetListHTML = '';
            currentTargets.forEach((tId, index) => {
                targetListHTML += `
                    <div style="display: flex; gap: 5px; margin-bottom: 4px; align-items: center;">
                        <input type="text" value="${tId}" readonly style="flex: 1; padding: 4px; background: var(--bg-input, #333); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                        <button class="remove-target-btn" data-control-id="${data.id}" data-index="${index}" style="padding: 4px 8px; background: #c0392b; color: white; border: none; border-radius: 3px; cursor: pointer;">&times;</button>
                    </div>`;
            });

            // Object Options
            let objOptions = `<option value="">-- Select Object --</option>`;
            objects.forEach(obj => {
                if (!currentTargets.includes(obj.id)) {
                    objOptions += `<option value="${obj.id}">${obj.id} (${obj.type})</option>`;
                }
            });

            // Action Options
            const currentAction = data.binding?.action || '';
            const actions = [
                { val: 'reset_pos', label: 'Reset Position' },
                { val: 'stop', label: 'Stop Movement' },
                { val: 'jump', label: 'Jump (Vel Y -10)' },
                { val: 'random_color', label: 'Random Color' },
                { val: 'toggle_physics', label: 'Toggle Physics' },
                { val: 'start_behavior', label: 'Start Behavior (ID)' },
                { val: 'stop_behavior', label: 'Stop Behavior (ID)' },
                { val: 'toggle_behavior', label: 'Toggle Behavior (ID)' }
            ];
            const actionOptions = actions.map(a => `<option value="${a.val}" ${currentAction === a.val ? 'selected' : ''}>${a.label}</option>`).join('');

            const content = `
                <div class="property-control">
                    <div class="property-label">Target Objects</div>
                    <div style="background: var(--bg-input, #333); padding: 5px; border-radius: 3px; border: 1px solid var(--border-color); margin-bottom: 8px;">
                        ${targetListHTML || '<div style="font-size: 10px; color: var(--text-secondary); font-style: italic;">No targets selected</div>'}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <select id="add-target-select-${data.id}" style="flex: 1; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            ${objOptions}
                        </select>
                        <button class="add-target-btn" data-control-id="${data.id}" style="padding: 5px 10px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Add</button>
                    </div>
                </div>

                <div class="property-control">
                    <div class="property-label">Action</div>
                    <select class="binding-action-select" data-control-id="${data.id}" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        <option value="">-- Select Action --</option>
                        ${actionOptions}
                    </select>
                </div>

                <div class="property-control" style="${['start_behavior', 'stop_behavior', 'toggle_behavior'].includes(currentAction) ? '' : 'display: none;'}" data-action-id-container>
                    <div class="property-label">Action ID</div>
                    <input type="text" class="binding-action-id" data-control-id="${data.id}" value="${data.binding?.actionId || ''}" placeholder="e.g. start_typing" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                </div>
            `;
            controls += createBindingSection('Event Binding', 'Trigger action on click', content);
        }

        // --- Data Binding Section ---
        if (['slider', 'checkbox', 'color_picker', 'graph'].includes(data.type)) {
            const editor = window.oviEditor;
            const objects = editor && editor.runtime ? editor.runtime.objects : [];
            const currentTargets = data.binding?.targets || (data.binding?.targetId ? [data.binding.targetId] : []);

            // Pending ID for preview
            const pendingId = data._pendingTargetId || '';

            let targetListHTML = '';
            currentTargets.forEach((tId, index) => {
                targetListHTML += `
                    <div style="display: flex; gap: 5px; margin-bottom: 4px; align-items: center;">
                        <input type="text" value="${tId}" readonly style="flex: 1; padding: 4px; background: var(--bg-input, #333); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                        <button class="remove-target-btn" data-control-id="${data.id}" data-index="${index}" style="padding: 4px 8px; background: #c0392b; color: white; border: none; border-radius: 3px; cursor: pointer;">&times;</button>
                    </div>`;
            });

            let objOptions = `<option value="">-- Select Object --</option>`;
            objects.forEach(obj => {
                if (!currentTargets.includes(obj.id)) {
                    const isSelected = pendingId === obj.id ? 'selected' : '';
                    objOptions += `<option value="${obj.id}" ${isSelected}>${obj.id} (${obj.type})</option>`;
                }
            });

            // Property Options
            let firstTargetId = currentTargets.length > 0 ? currentTargets[0] : pendingId;
            let targetObj = firstTargetId ? objects.find(o => o.id === firstTargetId) : null;
            const propOptions = this.generatePropertyOptions(targetObj, data.binding?.property || '');

            const content = `
                <div class="property-control">
                    <div class="property-label">Target Objects</div>
                    <div style="background: var(--bg-input, #333); padding: 5px; border-radius: 3px; border: 1px solid var(--border-color); margin-bottom: 8px;">
                        ${targetListHTML || '<div style="font-size: 10px; color: var(--text-secondary); font-style: italic;">No targets selected</div>'}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <select id="add-target-select-${data.id}" style="flex: 1; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            ${objOptions}
                        </select>
                        <button class="add-target-btn" data-control-id="${data.id}" style="padding: 5px 10px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Add</button>
                    </div>
                </div>

                <div class="property-control">
                    <div class="property-label">Target Property</div>
                    <select class="binding-prop-select" data-control-id="${data.id}" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        ${propOptions}
                    </select>
                </div>
            `;
            controls += createBindingSection('Data Binding', "Control an object's property", content);
        }

        controls += `
            ${this.getInspectorStyles()}
            </div>
        `;

        return controls;
    }

    static renderBehaviorSettings(data) {
        // Robust behavior list extraction (handling Set vs Array)
        const behaviorsRaw = data.behaviors;
        const behaviorsList = behaviorsRaw instanceof Set ? Array.from(behaviorsRaw) : (Array.isArray(behaviorsRaw) ? behaviorsRaw : []);

        console.log(`🔍 DEBUG: buildBehaviorParameters for ${data.id} (${data.type})`, {
            raw: behaviorsRaw,
            list: behaviorsList,
            hasEditor: !!window.oviEditor
        });

        if (behaviorsList.length === 0) {
            console.log('⚠️ DEBUG: No behaviors to process.');
            return '';
        }
        if (!window.oviEditor) {
            console.error('❌ DEBUG: window.oviEditor is missing! Cannot render behavior parameters.');
            return '';
        }

        const editor = window.oviEditor;
        let html = '';

        behaviorsList.forEach(behaviorId => {
            console.log(`🔍 DEBUG: Processing behavior '${behaviorId}'`);

            // Check if behavior system exists
            if (!editor.behaviorSystem) {
                console.error('❌ DEBUG: editor.behaviorSystem is missing!');
                return;
            }
            if (!editor.behaviorSystem.registry) {
                console.error('❌ DEBUG: editor.behaviorSystem.registry is missing!');
                return;
            }

            const behavior = editor.behaviorSystem.registry.get(behaviorId);

            if (!behavior) {
                console.warn(`⚠️ DEBUG: Behavior '${behaviorId}' not found in registry.`);
                return;
            }

            if (!behavior.parameters) {
                console.log(`ℹ️ DEBUG: Behavior '${behaviorId}' has no parameters.`);
                return;
            }

            console.log(`✅ DEBUG: Rendering parameters for '${behaviorId}'`, Object.keys(behavior.parameters));

            const params = Object.entries(behavior.parameters);
            if (params.length === 0) return;

            html += `
                <div class="inspector-section">
                    <div class="section-title">${behavior.icon} ${behavior.name} Settings</div>
            `;

            // INJECT: Activation Controls
            const actMode = editor.behaviorSystem.registry.getParameter(data, behaviorId, 'activationMode') || 'on_enter';
            const actId = editor.behaviorSystem.registry.getParameter(data, behaviorId, 'activationId') || '';

            html += `
                <div class="property-control">
                    <div class="property-label">Activation</div>
                    <select class="behavior-param-select"
                        data-behavior="${behaviorId}"
                        data-param="activationMode"
                        style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        <option value="on_enter" ${actMode === 'on_enter' ? 'selected' : ''}>On Enter (Auto)</option>
                        <option value="on_hover" ${actMode === 'on_hover' ? 'selected' : ''}>On Hover</option>
                        <option value="on_click" ${actMode === 'on_click' ? 'selected' : ''}>On Click (One-way)</option>
                        <option value="on_click_toggle" ${actMode === 'on_click_toggle' ? 'selected' : ''}>On Click (Toggle)</option>
                        <option value="manual" ${actMode === 'manual' ? 'selected' : ''}>Manual (Event)</option>
                    </select>
                </div>

                <div class="property-control" style="${actMode === 'manual' ? '' : 'display: none;'}" data-param-container="activationId">
                    <div class="property-label">Activation Event ID</div>
                    <input type="text" 
                        class="behavior-param-text"
                        data-behavior="${behaviorId}"
                        data-param="activationId"
                        value="${actId}"
                        placeholder="e.g. start_type"
                        style="width: 100%; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                </div>
            `;

            params.forEach(([paramName, paramDef]) => {
                const currentValue = editor.behaviorSystem.registry.getParameter(data, behaviorId, paramName);

                if (paramDef.type === 'slider' || paramDef.type === 'number') {
                    // CONDITIONAL VISIBILITY: Loop Delay
                    let style = "width: 100%;";
                    let containerStyle = "";
                    if (paramName === 'loopDelay') {
                        const loopEnabled = editor.behaviorSystem.registry.getParameter(data, behaviorId, 'loop');
                        if (!loopEnabled) containerStyle = "display: none;";
                    }

                    html += `
                        <div class="property-control" style="${containerStyle}" data-param-container="${paramName}">
                            <div class="property-label">
                                <span>${paramDef.label}</span>
                                <span class="property-value">${Number(currentValue).toFixed(1)}</span>
                            </div>
                            <input type="range" 
                                class="behavior-param-slider"
                                data-behavior="${behaviorId}"
                                data-param="${paramName}"
                                min="${paramDef.min || 0}"
                                max="${paramDef.max || 100}"
                                step="${paramDef.step || (paramDef.max - paramDef.min) / 100}"
                                value="${currentValue}"
                                style="${style}">
                        </div>
                    `;
                } else if (paramDef.type === 'checkbox') {
                    html += `
                        <div class="property-control">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="checkbox" 
                                    class="behavior-param-checkbox"
                                    data-behavior="${behaviorId}"
                                    data-param="${paramName}"
                                    ${currentValue ? 'checked' : ''}>
                                <span style="font-size: 11px;">${paramDef.label}</span>
                            </label>
                        </div>
                    `;
                } else if (paramDef.type === 'text') {
                    html += `
                        <div class="property-control">
                            <div class="property-label">${paramDef.label}</div>
                            <input type="text" 
                                class="behavior-param-text"
                                data-behavior="${behaviorId}"
                                data-param="${paramName}"
                                value="${currentValue || paramDef.default || ''}"
                                style="width: 100%; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        </div>
                    `;
                }
            });

            html += `</div>`;
        });

        return html;
    }




    static createStringControl(label, property, value) {
        const id = `prop-${property.replace(/\./g, '-')}`;
        return `
            <div class="property-control">
                <div class="property-label">
                    <span>${label}</span>
                </div>
                <input type="text" 
                       id="${id}" 
                       value="${value}" 
                       data-property="${property}"
                       style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
            </div>
        `;
    }

    static createNumberControl(label, property, value, min, max, step = 1) {
        const id = `prop-${property.replace(/\./g, '-')}`;
        return `
            <div class="property-control">
                <div class="property-label">
                    <span>${label}</span>
                    <!-- Value removed from label to avoid redundancy -->
                </div>
                <div class="slider-container">
                    <input type="range" 
                           class="inspector-slider"
                           id="${id}-slider" 
                           min="${min}" 
                           max="${max}" 
                           step="${step}"
                           value="${value}"
                           data-property="${property}">
                    <input type="number" 
                           class="inspector-number"
                           id="${id}-input" 
                           min="${min}" 
                           max="${max}" 
                           step="${step}"
                           value="${value}"
                           data-property="${property}">
                </div>
            </div>
        `;
    }

    static createColorControl(label, property, value) {
        const id = `prop-${property}`;
        return `
            <div class="property-control">
                <div class="property-label">
                    <span>${label}</span>
                </div>
                <div class="color-picker-container">
                    <input type="color" 
                           id="${id}-picker" 
                           value="${value}"
                           data-property="${property}">
                    <input type="text" 
                           id="${id}-text" 
                           value="${value}"
                           data-property="${property}"
                           placeholder="#000000">
                </div>
            </div>
        `;
    }

    static createToggleControl(label, property, value) {
        const id = `prop-${property.replace(/\./g, '-')}`;
        return `
            <div class="property-control">
                <div class="toggle-container">
                    <div class="toggle-switch ${value ? 'active' : ''}" 
                         id="${id}-toggle"
                         data-property="${property}">
                    </div>
                    <span style="font-size: 11px;">${label}</span>
                </div>
            </div>
        `;
    }

    static createSelectControl(label, property, value, options) {
        // options: Array of {val, label} OR Array of strings
        let optionsHtml = '';
        if (Array.isArray(options)) {
            optionsHtml = options.map(opt => {
                const val = (typeof opt === 'object' && opt.val !== undefined) ? opt.val : opt;
                const txt = (typeof opt === 'object' && opt.label !== undefined) ? opt.label : opt;
                const selected = val === value ? 'selected' : '';
                return `<option value="${val}" ${selected}>${txt}</option>`;
            }).join('');
        }

        return `
            <div class="property-control">
                <div class="property-label">${label}</div>
                <select data-property="${property}" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    static generatePropertyOptions(targetObj, currentProp) {
        let props = [
            { val: 'x', label: 'X Position' },
            { val: 'y', label: 'Y Position' },
            { val: 'radius', label: 'Radius (Circle)' },
            { val: 'width', label: 'Width (Rect)' },
            { val: 'height', label: 'Height (Rect)' },
            { val: 'size', label: 'Size (Symbol)' },
            { val: 'rotation', label: 'Rotation' },
            { val: 'opacity', label: 'Opacity' },
            { val: 'fill', label: 'Fill Color' },
            { val: 'fontSize', label: 'Font Size' },
            { val: 'physics.mass', label: 'Physics Mass' },
            { val: 'physics.bounciness', label: 'Bounciness' },
            { val: 'physics.velocity.x', label: 'Velocity X' },
            { val: 'physics.velocity.y', label: 'Velocity Y' }
        ];

        if (targetObj && targetObj.behaviors && targetObj.behaviors.length > 0) {
            targetObj.behaviors.forEach(bId => {
                // Hardcoding common params for now to match known behaviors
                const knownParams = {
                    'wiggle': ['intensity', 'speed'],
                    'shake': ['amplitude', 'frequency'],
                    'float': ['height', 'speed'],
                    'spiral': ['speed', 'expansion', 'centerX', 'centerY'],
                    'zigzag': ['amplitude', 'frequency'],
                    'wave_motion': ['amplitude', 'wavelength', 'speed'],
                    'pulse': ['scale', 'speed'],
                    'rainbow': ['speed'],
                    'typewriter': ['speed']
                };

                if (knownParams[bId]) {
                    knownParams[bId].forEach(param => {
                        props.push({ val: `${bId}.${param}`, label: `${bId} - ${param}` });
                    });
                }
            });
        }

        let propOptions = `<option value="">-- Select Property --</option>`;
        props.forEach(p => {
            propOptions += `<option value="${p.val}" ${currentProp === p.val ? 'selected' : ''}>${p.label}</option>`;
        });
        return propOptions;
    }

    static attachEventListeners(engine) {
        const editor = window.oviEditor;
        if (!editor || !editor.selectedObject) return;

        // Number controls (sliders and inputs)
        document.querySelectorAll('input[type="range"], input[type="number"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const property = e.target.dataset.property;
                const value = parseFloat(e.target.value);
                this.updateProperty(editor, property, value);

                // Sync slider and number input
                const otherId = e.target.id.replace('-slider', '-input').replace('-input', '-slider');
                const otherInput = document.getElementById(otherId);
                if (otherInput) otherInput.value = value;

                // Update value display with SAFETY CHECK
                const wrapper = e.target.closest('.property-control');
                if (wrapper) {
                    const label = wrapper.querySelector('.property-value');
                    if (label) {
                        const step = parseFloat(e.target.step);
                        label.textContent = value.toFixed(step < 1 ? 2 : 0);
                    }
                }
            });
        });

        // String inputs (New!)
        document.querySelectorAll('input[type="text"][data-property]').forEach(input => {
            // Skip color text inputs which are handled separately
            if (input.closest('.color-picker-container')) return;

            input.addEventListener('input', (e) => {
                const property = e.target.dataset.property;
                const value = e.target.value;

                // Specific logic for Options (comma sep)
                if (property === 'options') {
                    this.updateProperty(editor, property, value.split(','));
                } else {
                    this.updateProperty(editor, property, value);
                }
            });
        });

        // Binding Interactions: Multi-Target Logic
        // Remove Target
        document.querySelectorAll('.remove-target-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const controlId = e.target.dataset.controlId;
                const index = parseInt(e.target.dataset.index);

                let control = null;
                if (editor.selectedObject.id === controlId) {
                    control = editor.selectedObject;
                } else if (editor.selectedObject.controls) {
                    control = editor.selectedObject.controls.find(c => c.id === controlId);
                } else if (editor.runtime && editor.runtime.controls) {
                    control = editor.runtime.controls.find(c => c.id === controlId);
                }

                if (control && control.binding && control.binding.targets) {
                    control.binding.targets.splice(index, 1);
                    Inspector.update(engine, editor.selectedObject);
                }
            });
        });

        // DYNAMIC: Listen for changes in "Add Target" dropdown to preview properties
        const addTargetSelects = document.querySelectorAll('select[id^="add-target-select-"]');
        addTargetSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const controlId = select.id.replace('add-target-select-', '');
                const targetId = e.target.value;

                // Persist this selection to the control object so it survives re-renders
                // (e.g. when user selects a property immediately after)
                const control = editor.runtime.objects.find(o => o.id === controlId);
                if (control) {
                    control._pendingTargetId = targetId;
                }

                const propSelect = document.querySelector(`.binding-prop-select[data-control-id="${controlId}"]`);

                if (propSelect) {
                    let targetObj = null;
                    if (targetId) {
                        // Find in runtime objects
                        targetObj = editor.runtime.objects.find(o => o.id === targetId);
                    }
                    // Generate new options including behavior params for this candidate
                    const newOptions = Inspector.generatePropertyOptions(targetObj, '');
                    propSelect.innerHTML = newOptions;
                }
            });
        });

        // Add Target
        document.querySelectorAll('.add-target-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const controlId = e.target.dataset.controlId;
                const select = document.getElementById(`add-target-select-${controlId}`);
                const targetId = select.value;

                if (targetId) {
                    // Logic fix: selectedObject IS the control (mostly)
                    let control = null;
                    if (editor.selectedObject.id === controlId) {
                        control = editor.selectedObject;
                    } else if (editor.selectedObject.controls) {
                        control = editor.selectedObject.controls.find(c => c.id === controlId);
                    } else if (editor.runtime && editor.runtime.controls) {
                        // Global lookup backup
                        control = editor.runtime.controls.find(c => c.id === controlId);
                    }

                    if (control) {
                        if (!control.binding) control.binding = {};
                        if (!control.binding.targets) {
                            // Migrate legacy targetId if present
                            control.binding.targets = control.binding.targetId ? [control.binding.targetId] : [];
                        }

                        if (!control.binding.targets.includes(targetId)) {
                            control.binding.targets.push(targetId);

                            // Clear the pending state as we have now committed
                            if (control._pendingTargetId) {
                                delete control._pendingTargetId;
                            }

                            Inspector.update(engine, editor.selectedObject);
                        }
                    }
                }
            });
        });

        // Event Binding: Remove Target
        document.querySelectorAll('.remove-target-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const controlId = btn.dataset.controlId;
                const index = parseInt(btn.dataset.index);

                let control = editor.selectedObject;
                // Fallback search if somehow detached
                if (!control || control.id !== controlId) {
                    control = editor.runtime.controls.find(c => c.id === controlId);
                }

                if (control && control.binding && control.binding.targets) {
                    control.binding.targets.splice(index, 1);
                    Inspector.update(engine, editor.selectedObject);
                }
            });
        });

        // Color pickers
        document.querySelectorAll('input[type="color"]').forEach(input => {
            input.addEventListener('input', (e) => {
                const property = e.target.dataset.property;
                const value = e.target.value;
                this.updateProperty(editor, property, value);

                // Sync text input
                const textInput = document.getElementById(e.target.id.replace('-picker', '-text'));
                if (textInput) textInput.value = value;
            });
        });

        // Color text inputs
        document.querySelectorAll('.color-picker-container input[type="text"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const property = e.target.dataset.property;
                let value = e.target.value;
                if (!value.startsWith('#')) value = '#' + value;
                this.updateProperty(editor, property, value);

                // Sync color picker
                const picker = document.getElementById(e.target.id.replace('-text', '-picker'));
                if (picker) picker.value = value;
            });
        });

        // Delete Button Binding (Single)
        const delBtn = document.getElementById('single-delete-btn');
        if (delBtn && editor) {
            delBtn.addEventListener('click', () => {
                editor.deleteSelected();
            });
        }

        // Toggle switches
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const property = e.target.dataset.property;
                const isActive = e.target.classList.contains('active');
                const newValue = !isActive;

                console.log(`🔄 Toggle clicked: ${property} = ${newValue}`);

                // Update property
                this.updateProperty(editor, property, newValue);

                // Refresh inspector to show/hide dependent controls and update visual state
                Inspector.update(engine, editor.selectedObject);
            });
        });

        // Replace Symbol Button
        const replaceBtn = document.getElementById('btn-replace-symbol');
        if (replaceBtn) {
            replaceBtn.onclick = async () => {
                const { default: SymbolPicker } = await import('./components/SymbolPicker.js');

                // Try to find existing picker or create new one
                // Assuming 'ovistate' is the plugin ID
                let picker = null;
                if (engine && engine.getPlugin) {
                    const plugin = engine.getPlugin('ovistate');
                    if (plugin) {
                        if (!plugin.symbolPicker) plugin.symbolPicker = new SymbolPicker(engine);
                        picker = plugin.symbolPicker;
                    }
                }

                if (!picker) picker = new SymbolPicker(engine);

                picker.open((symbol) => {
                    this.updateProperty(editor, 'symbol', symbol);
                    Inspector.update(engine, editor.selectedObject);
                });
            };
        }

        // --- Synchronized Sliders & Inputs (Unified) ---
        const handleNumericInput = (e) => {
            const val = parseFloat(e.target.value);

            // Sync Sibling (Visual)
            const container = e.target.closest('.slider-container');
            if (container) {
                // If I am range, find number. If I am number, find range.
                // We use specific classes if present, else generic types
                const sibling = container.querySelector(e.target.type === 'range' ? 'input[type="number"]' : 'input[type="range"]');
                if (sibling && sibling !== e.target) {
                    sibling.value = val;
                }
            }

            const prop = e.target.dataset.property;
            if (!prop) return;

            // Update Data
            if (prop.startsWith('behaviorParams.')) {
                const parts = prop.split('.'); // behaviorParams.ID.Param
                if (parts.length >= 3 && editor.behaviorSystem && editor.behaviorSystem.registry) {
                    editor.behaviorSystem.registry.setParameter(editor.selectedObject, parts[1], parts[2], val);
                }
            } else {
                this.updateProperty(editor, prop, val);
            }
        };

        // Attach to our new classes
        document.querySelectorAll('.inspector-slider, .inspector-number').forEach(el => {
            el.removeEventListener('input', handleNumericInput); // Clean up just in case
            el.addEventListener('input', handleNumericInput);
        });

        // Fallback for any legacy sliders not using the new class (but have behavior params)
        document.querySelectorAll('input[type="range"]:not(.inspector-slider)').forEach(el => {
            if (el.dataset.property && el.dataset.property.startsWith('behaviorParams.')) {
                el.addEventListener('input', handleNumericInput);
            }
        });

        // Behavior parameter checkboxes
        document.querySelectorAll('.behavior-param-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const behaviorId = e.target.dataset.behavior;
                const paramName = e.target.dataset.param;
                const value = e.target.checked;

                editor.behaviorSystem.registry.setParameter(editor.selectedObject, behaviorId, paramName, value);

                // CONDITIONAL VISIBILITY: Toggle Loop Delay
                if (paramName === 'loop') {
                    // Find sibling container for loopDelay
                    // We are in a .property-control inside .inspector-section
                    // We need to find the input with data-param="loopDelay" in the same section
                    const section = e.target.closest('.inspector-section');
                    if (section) {
                        const loopDelayContainer = section.querySelector('[data-param-container="loopDelay"]');
                        if (loopDelayContainer) {
                            loopDelayContainer.style.display = value ? 'block' : 'none';
                        }
                    }
                }
            });
        });

        // Behavior parameter text inputs
        document.querySelectorAll('.behavior-param-text').forEach(input => {
            input.addEventListener('input', (e) => {
                const behaviorId = e.target.dataset.behavior;
                const paramName = e.target.dataset.param;
                const value = e.target.value;
                editor.behaviorSystem.registry.setParameter(editor.selectedObject, behaviorId, paramName, value);
            });
        });

        // Toggle Switches (Fixed: Was missing)
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const prop = e.target.dataset.property;
                // Toggle state
                e.target.classList.toggle('active');
                const newValue = e.target.classList.contains('active');

                this.updateProperty(editor, prop, newValue);
            });
        });

        // Behavior parameter select inputs (New)
        document.querySelectorAll('.behavior-param-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const behaviorId = e.target.dataset.behavior;
                const paramName = e.target.dataset.param;
                const value = e.target.value;
                editor.behaviorSystem.registry.setParameter(editor.selectedObject, behaviorId, paramName, value);

                // Conditional UI for Activation
                if (paramName === 'activationMode') {
                    const section = e.target.closest('.inspector-section');
                    if (section) {
                        const idContainer = section.querySelector('[data-param-container="activationId"]');
                        if (idContainer) {
                            idContainer.style.display = value === 'manual' ? 'block' : 'none';
                        }
                    }
                }
            });
        });

        // --- Data Binding Listeners (New) ---
        const updateBinding = (e) => {
            const targetSelect = document.querySelector('.binding-target-select');
            const propSelect = document.querySelector('.binding-prop-select');
            const actionSelect = document.querySelector('.binding-action-select');
            const actionIdInput = document.querySelector('.binding-action-id');

            if (editor.selectedObject) {
                if (!editor.selectedObject.binding) editor.selectedObject.binding = {};

                // Auto-Commit Removed: User must explicitly add targets via the Add button.

                if (targetSelect) editor.selectedObject.binding.targetId = targetSelect.value;
                if (propSelect) editor.selectedObject.binding.property = propSelect.value;
                if (actionSelect) editor.selectedObject.binding.action = actionSelect.value;
                if (actionIdInput) editor.selectedObject.binding.actionId = actionIdInput.value;

                console.log('🔗 Binding Updated:', editor.selectedObject.binding);

                // Refresh UI to show dynamic properties or inputs
                // We use setTimeout to allow value commit
                setTimeout(() => Inspector.update(engine, editor.selectedObject), 10);
            }
        };

        document.querySelectorAll('.binding-target-select').forEach(sel => {
            sel.addEventListener('change', updateBinding);
        });

        document.querySelectorAll('.binding-prop-select').forEach(sel => {
            sel.addEventListener('change', updateBinding);
        });

        document.querySelectorAll('.binding-action-select').forEach(sel => {
            sel.addEventListener('change', updateBinding);
        });

        document.querySelectorAll('.binding-action-id').forEach(input => {
            input.addEventListener('input', updateBinding);
        });

        // Generic Select Listener (for Alignment etc)
        document.querySelectorAll('select[data-property]').forEach(sel => {
            sel.addEventListener('change', (e) => {
                this.updateProperty(editor, e.target.dataset.property, e.target.value);
            });
        });

        // Text/Tags Listener
        document.querySelectorAll('input[type="text"][data-property], textarea[data-property]').forEach(input => {
            input.addEventListener('input', (e) => {
                const prop = e.target.dataset.property;
                let val = e.target.value;

                // SPECIAL: Tags conversion (String -> Array)
                if (prop === 'tags_string') {
                    // Split by comma, trim, filter empty
                    const tags = val.split(',').map(t => t.trim()).filter(t => t.length > 0);
                    this.updateProperty(editor, 'tags', tags);
                } else {
                    this.updateProperty(editor, prop, val);
                }
            });
        });

        // Add Behavior Button
        const addBehaviorBtn = document.getElementById('add-behavior-btn');
        if (addBehaviorBtn && editor) {
            addBehaviorBtn.onclick = () => {
                const select = document.getElementById('new-behavior-select');
                const behaviorId = select ? select.value : null;
                if (behaviorId && editor.selectedObject) {
                    editor.behaviorSystem.addBehaviorTo(editor.selectedObject, behaviorId);
                    Inspector.update(engine, editor.selectedObject);
                }
            };
        }
    }

    static updateProperty(editor, property, value) {
        const obj = editor.selectedObject;
        if (!obj || !property) {
            // console.debug('Skipping update: no object or invalid property');
            return;
        }

        // Handle nested properties (e.g., "physics.mass")
        const parts = property.split('.');
        let target = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {};
            target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;

        // Refresh UI if needed
        if (obj.isUI && window.oviEditor && window.oviEditor.renderUIComponent) {
            const zone = window.oviEditor.overlayZone || document.querySelector('.overlay-zone');
            if (zone) window.oviEditor.renderUIComponent(obj, zone);
        }
    }

    static getObjectIcon(type) {
        const icons = {
            'circle': '⚪',
            'rect': '⬜',
            'text': '✍️',
            'symbol': '😀',
            'path': '✏️'
        };
        return icons[type] || '📦';
    }

    static getObjectLabel(type) {
        const labels = {
            'circle': 'Circle',
            'rect': 'Rectangle',
            'text': 'Text',
            'symbol': 'Symbol',
            'path': 'Path'
        };
        return labels[type] || 'Object';
    }

    static getBehaviorLabel(behaviorId) {
        const labels = {

            'orbit_around': '🔄 Orbit',
            'bounce': '💥 Bounce',
            'fade': '👻 Fade',
            'pulse': '💓 Pulse'
        };
        return labels[behaviorId] || behaviorId;
    }

    static getInspectorStyles() {
        return `
            <style>
                /* Strict Reset for Inspector Elements to ensure consistency across devices/browsers */
                .inspector-section input,
                .inspector-section select,
                .inspector-section button,
                .inspector-section textarea {
                    font-family: var(--font-family, sans-serif);
                    font-size: 11px !important; /* Force compact size */
                    line-height: normal;
                }

                .inspector-section {
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-color);
                    /* Ensure content doesn't overflow horizontally on small screens */
                    max-width: 100%; 
                    overflow-x: hidden;
                }
                .inspector-section:last-child {
                    border-bottom: none;
                }
                .section-title {
                    font-weight: 600;
                    font-size: 12px;
                    margin-bottom: 12px;
                    color: var(--text-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .property-control {
                    margin-bottom: 12px;
                    /* Responsive Layout: Allow wrapping if very narrow */
                    width: 100%;
                }
                .property-label {
                    font-size: 11px;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .property-value {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .slider-container {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    width: 100%;
                }
                .slider-container input[type="range"] {
                    flex: 1; /* Take available space */
                    min-width: 50px; /* Prevent collapse */
                    height: 4px;
                    border-radius: 2px;
                    background: var(--bg-input, #333); /* Fixed contrast */
                    outline: none;
                    -webkit-appearance: none;
                }
                /* Input Number scaling */
                .slider-container input[type="number"] {
                     width: 50px;
                     flex-shrink: 0;
                }
                .slider-container input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: var(--text-accent, #58a6ff);
                    cursor: pointer;
                }
                .slider-container input[type="range"]::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: var(--text-accent, #58a6ff);
                    cursor: pointer;
                    border: none;
                }
                .slider-container input[type="number"] {
                    width: 50px;
                    padding: 4px 6px;
                    background: var(--bg-input, #333);
                    border: 1px solid var(--border-color);
                    border-radius: 3px;
                    color: var(--text-primary);
                    font-size: 11px;
                    text-align: center;
                }
                .color-picker-container {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .color-picker-container input[type="color"] {
                    width: 40px;
                    height: 28px;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    background: transparent;
                }
                .color-picker-container input[type="text"] {
                    flex: 1;
                    padding: 4px 8px;
                    background: var(--bg-input, #333);
                    border: 1px solid var(--border-color);
                    border-radius: 3px;
                    color: var(--text-primary);
                    font-size: 11px;
                    font-family: monospace;
                }
                .toggle-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .toggle-switch {
                    position: relative;
                    width: 40px;
                    height: 20px;
                    background: var(--bg-input, #444); /* Ensure contrast against panel */
                    border-radius: 10px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .toggle-switch.active {
                    background: var(--text-accent, #58a6ff);
                }
                .toggle-switch::after {
                    content: '';
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: white;
                    top: 2px;
                    left: 2px;
                    transition: left 0.2s;
                }
                    height: 16px;
                    border-radius: 50%;
                    background: white;
                    top: 2px;
                    left: 2px;
                    transition: left 0.2s;
                }
                .toggle-switch.active::after {
                    left: 22px;
                }
                
                /* High Contrast for Dropdowns */
                select {
                    background-color: var(--bg-secondary) !important;
                    color: var(--text-primary) !important;
                    border: 1px solid var(--border-color) !important;
                }
                select option {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                }
                optgroup {
                    background-color: #f0f0f0 !important;
                    color: #555555 !important;
                    font-style: italic;
                    font-weight: bold;
                }
            </style>
        `;
    }


    static buildBehaviorParameters(data) {
        if (!data.behaviors || (data.behaviors instanceof Set && data.behaviors.size === 0) || (Array.isArray(data.behaviors) && data.behaviors.length === 0)) {
            return '';
        }

        let html = '';
        const behaviors = Array.from(data.behaviors);

        // Ensure registry access
        if (!window.oviEditor || !window.oviEditor.behaviorSystem) return '';

        behaviors.forEach(bId => {
            // Access registry directly
            let bDef = null;
            if (window.oviEditor.behaviorSystem.registry) {
                bDef = window.oviEditor.behaviorSystem.registry.get(bId);
            }
            if (!bDef && window.oviEditor.behaviorSystem.behaviors) {
                bDef = window.oviEditor.behaviorSystem.behaviors.get(bId);
            }

            const paramsMap = bDef ? (bDef.parameters || bDef.params) : null;
            if (!bDef || !paramsMap) return;

            html += `<div class="inspector-section" style="border-left: 2px solid var(--accent-color); padding-left: 10px;">`;
            html += `<div class="section-title" style="color: var(--text-primary);">${bDef.name} Settings</div>`;

            // Convert to array if it is object (Registry uses Objects usually)
            const entries = Array.isArray(paramsMap) ? paramsMap.map(p => [p.name, p]) : Object.entries(paramsMap);

            entries.forEach(([key, p]) => {
                // If array, key is index (ignore), p is object. Name is inside p.
                // If object, key is paramName, p is definition.
                const paramName = Array.isArray(paramsMap) ? p.name : key;
                const paramDef = p;

                const currentVal = (data.behaviorParams && data.behaviorParams[bId] && data.behaviorParams[bId][paramName]) !== undefined
                    ? data.behaviorParams[bId][paramName]
                    : paramDef.default;

                // Create control based on type
                if (paramDef.type === 'number' || paramDef.type === 'slider') {
                    // Support slider with createNumberControl logic (it handles dual input)
                    html += this.createNumberControl(paramDef.label || paramName, `behaviorParams.${bId}.${paramName}`, currentVal, paramDef.min, paramDef.max, paramDef.step);
                } else if (paramDef.type === 'color') {
                    html += this.createColorControl(paramDef.label || paramName, `behaviorParams.${bId}.${paramName}`, currentVal);
                } else if (paramDef.type === 'boolean' || paramDef.type === 'checkbox') {
                    html += this.createToggleControl(paramDef.label || paramName, `behaviorParams.${bId}.${paramName}`, currentVal);
                } else if (paramDef.type === 'select') {
                    let options = (paramDef.options || []).map(o => `<option value="${o}" ${currentVal === o ? 'selected' : ''}>${o}</option>`).join('');
                    html += `
                    <div class="property-control">
                        <div class="property-label">${paramDef.label || paramName}</div>
                        <select data-property="behaviorParams.${bId}.${paramName}" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            ${options}
                        </select>
                    </div>`;
                } else if (paramDef.type === 'text') {
                    html += `
                    <div class="property-control">
                        <div class="property-label">${paramDef.label || paramName}</div>
                         <input type="text" value="${currentVal}" data-property="behaviorParams.${bId}.${paramName}" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                    </div>`;
                }
            });
            html += `</div>`;
        });

        return html;
    }

    static generateBehaviorOptions(editor) {
        if (!editor || !editor.behaviorSystem) return '<option disabled>No Registry</option>';

        // Use registry directly if available, else hardcoded fallback
        let options = '';
        if (editor.behaviorSystem.registry && editor.behaviorSystem.registry.behaviors) {
            editor.behaviorSystem.registry.behaviors.forEach((b, id) => {
                options += `<option value="${id}">${b.icon || '🔹'} ${b.name}</option>`;
            });
        } else if (editor.behaviorSystem.behaviors) {
            // Fallback for Map
            editor.behaviorSystem.behaviors.forEach((b, id) => {
                options += `<option value="${id}">${b.icon || '🔹'} ${b.name}</option>`;
            });
        }
        return options;
    }


}
