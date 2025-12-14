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

    static update(engine, data) {
        this.render(engine, data);
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

                <!-- Behaviors Section -->
                <div class="inspector-section">
                    <div class="section-title">Behaviors</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
                        ${data.behaviors?.length || 0} active behavior(s)
                    </div>
                    ${(data.behaviors || []).map(b => `
                        <div style="background: var(--bg-secondary); padding: 6px 8px; border-radius: 3px; margin-bottom: 4px; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
                            <span>${this.getBehaviorLabel(b)}</span>
                            <button onclick="window.oviEditor.removeBehavior('${b}')" style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px 6px;">✕</button>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Behavior Parameters -->
                ${this.buildBehaviorParameters(data)}

                `}
                
                ${this.getInspectorStyles()}
            </div>
        `;
    }

    static buildUIInspector(data) {
        let controls = '';

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
        }

        controls += '</div>';

        // --- Event Binding (Buttons) ---
        if (data.type === 'button') {
            const editor = window.oviEditor;
            const objects = editor && editor.runtime ? editor.runtime.objects : [];

            controls += `
                <div class="inspector-section">
                    <div class="section-title">Event Binding</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
                        Trigger action on click
                    </div>
            `;

            // Target Objects (Multi-Target)
            // Normalize: Migration from single targetId to targets array
            if (data.binding?.targetId && (!data.binding.targets || data.binding.targets.length === 0)) {
                if (!data.binding.targets) data.binding.targets = [];
                data.binding.targets.push(data.binding.targetId);
            }
            const currentTargets = data.binding?.targets || [];

            // Render List of Current Targets
            let targetListHTML = '';
            currentTargets.forEach((tId, index) => {
                targetListHTML += `
                    <div style="display: flex; gap: 5px; margin-bottom: 4px; align-items: center;">
                        <input type="text" value="${tId}" readonly style="flex: 1; padding: 4px; background: #333; border: 1px solid #555; border-radius: 3px; color: #ccc; font-size: 10px;">
                        <button class="remove-target-btn" data-control-id="${data.id}" data-index="${index}" style="padding: 2px 6px; background: #c0392b; color: white; border: none; border-radius: 3px; cursor: pointer;">&times;</button>
                    </div>
                `;
            });

            // Add New Target Dropdown
            let objOptions = `<option value="">-- Select Object to Add --</option>`;
            objects.forEach(obj => {
                if (!currentTargets.includes(obj.id)) {
                    objOptions += `<option value="${obj.id}">${obj.id} (${obj.type})</option>`;
                }
            });

            controls += `
                <div class="property-control">
                    <div class="property-label">Target Objects</div>
                    <div style="background: var(--bg-secondary); padding: 5px; border-radius: 3px; border: 1px solid var(--border-color); margin-bottom: 5px;">
                        ${targetListHTML || '<div style="font-size: 10px; color: #666; font-style: italic;">No targets selected</div>'}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <select id="add-target-select-${data.id}" style="flex: 1; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            ${objOptions}
                        </select>
                        <button class="add-target-btn" data-control-id="${data.id}" style="padding: 4px 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">Add</button>
                    </div>
                </div>
            `;

            // Action Select
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

            let actionOptions = `<option value="">-- Select Action --</option>`;
            actions.forEach(a => {
                actionOptions += `<option value="${a.val}" ${currentAction === a.val ? 'selected' : ''}>${a.label}</option>`;
            });

            controls += `
                <div class="property-control">
                    <div class="property-label">Action</div>
                    <select class="binding-action-select" data-control-id="${data.id}" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        ${actionOptions}
                    </select>
                </div>
            `;

            // Action ID Input (for behavior actions)
            const needsActionId = ['start_behavior', 'stop_behavior', 'toggle_behavior'].includes(currentAction);
            const currentActionId = data.binding?.actionId || '';

            controls += `
                <div class="property-control" style="${needsActionId ? '' : 'display: none;'}" data-action-id-container>
                    <div class="property-label">Action ID</div>
                    <input type="text" 
                        class="binding-action-id"
                        data-control-id="${data.id}"
                        value="${currentActionId}"
                        placeholder="e.g. start_typing"
                        style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px;">Must match the Activation ID in the behavior settings</div>
                </div>
                </div>
            `;
        }

        // --- Data Binding Section ---
        if (data.type === 'slider' || data.type === 'checkbox' || data.type === 'color_picker' || data.type === 'graph') {
            const editor = window.oviEditor;
            const objects = editor && editor.runtime ? editor.runtime.objects : [];

            controls += `
                <div class="inspector-section">
                    <div class="section-title">Data Binding</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
                        Control an object's property
                    </div>
            `;

            // Target Object Dropdown
            // Normalize: Migration from single targetId to targets array
            if (data.binding?.targetId && (!data.binding.targets || data.binding.targets.length === 0)) {
                if (!data.binding.targets) data.binding.targets = [];
                data.binding.targets.push(data.binding.targetId);
            }
            const currentTargets = data.binding?.targets || [];

            // Render List of Current Targets
            let targetListHTML = '';
            currentTargets.forEach((tId, index) => {
                targetListHTML += `
                    <div style="display: flex; gap: 5px; margin-bottom: 4px; align-items: center;">
                        <input type="text" value="${tId}" readonly style="flex: 1; padding: 4px; background: #333; border: 1px solid #555; border-radius: 3px; color: #ccc; font-size: 10px;">
                        <button class="remove-target-btn" data-control-id="${data.id}" data-index="${index}" style="padding: 2px 6px; background: #c0392b; color: white; border: none; border-radius: 3px; cursor: pointer;">&times;</button>
                    </div>
                `;
            });

            // Add New Target Dropdown
            let objOptions = `<option value="">-- Select Object to Add --</option>`;
            objects.forEach(obj => {
                // Determine if already added
                if (!currentTargets.includes(obj.id)) {
                    objOptions += `<option value="${obj.id}">${obj.id} (${obj.type})</option>`;
                }
            });

            controls += `
                <div class="property-control">
                    <div class="property-label">Target Objects</div>
                    <div style="background: var(--bg-secondary); padding: 5px; border-radius: 3px; border: 1px solid var(--border-color); margin-bottom: 5px;">
                        ${targetListHTML || '<div style="font-size: 10px; color: #666; font-style: italic;">No targets selected</div>'}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <select id="add-target-select-${data.id}" style="flex: 1; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            ${objOptions}
                        </select>
                        <button class="add-target-btn" data-control-id="${data.id}" style="padding: 4px 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">Add</button>
                    </div>
                </div>
            `;

            // Target Property Dropdown
            const currentProp = data.binding?.property || '';
            const props = [
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

            // DYNAMIC: Add Behavior Parameters
            const targetObjId = data.binding?.targetId;
            if (targetObjId) {
                const targetObj = objects.find(o => o.id === targetObjId);
                if (targetObj && targetObj.behaviors && editor.behaviorSystem) {
                    targetObj.behaviors.forEach(bId => {
                        const bDef = editor.behaviorSystem.registry.get(bId);
                        if (bDef && bDef.parameters) {
                            Object.keys(bDef.parameters).forEach(pName => {
                                props.push({ val: `${bId}.${pName}`, label: `${bDef.name}: ${pName}` });
                            });
                        }
                    });
                }
            }

            let propOptions = `<option value="">-- Select Property --</option>`;
            props.forEach(p => {
                propOptions += `<option value="${p.val}" ${currentProp === p.val ? 'selected' : ''}>${p.label}</option>`;
            });

            controls += `
                <div class="property-control">
                    <div class="property-label">Target Property</div>
                    <select class="binding-prop-select" data-control-id="${data.id}" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        ${propOptions}
                    </select>
                </div>
            `;

            controls += '</div>';
        }

        return controls;
    }

    static buildBehaviorParameters(data) {
        if (!data.behaviors || data.behaviors.length === 0 || !window.oviEditor) return '';

        const editor = window.oviEditor;
        let html = '';

        data.behaviors.forEach(behaviorId => {
            const behavior = editor.behaviorSystem?.registry?.get(behaviorId);
            if (!behavior || !behavior.parameters) return;

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
                    <span class="property-value">${typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}</span>
                </div>
                <div class="slider-container">
                    <input type="range" 
                           id="${id}-slider" 
                           min="${min}" 
                           max="${max}" 
                           step="${step}"
                           value="${value}"
                           data-property="${property}">
                    <input type="number" 
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
                        if (!control.binding.targets) control.binding.targets = [];

                        // Avoid duplicates
                        if (!control.binding.targets.includes(targetId)) {
                            control.binding.targets.push(targetId);
                            Inspector.update(engine, editor.selectedObject);
                        }
                    }
                }
            });
        });

        // Binding Selects (Property & Action Binding)

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

        // Behavior parameter sliders
        document.querySelectorAll('.behavior-param-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const behaviorId = e.target.dataset.behavior;
                const paramName = e.target.dataset.param;
                const value = parseFloat(e.target.value);

                editor.behaviorSystem.registry.setParameter(editor.selectedObject, behaviorId, paramName, value);

                // Update value display with SAFETY
                if (e.target.parentElement) {
                    const valueDisplay = e.target.parentElement.querySelector('.property-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = value.toFixed(1);
                    }
                }
            });
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
        const updateBinding = () => {
            const targetSelect = document.querySelector('.binding-target-select');
            const propSelect = document.querySelector('.binding-prop-select');
            const actionSelect = document.querySelector('.binding-action-select');
            const actionIdInput = document.querySelector('.binding-action-id');

            if (editor.selectedObject) {
                if (!editor.selectedObject.binding) editor.selectedObject.binding = {};

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

        // TextArea Listener
        document.querySelectorAll('textarea[data-property]').forEach(area => {
            area.addEventListener('input', (e) => {
                this.updateProperty(editor, e.target.dataset.property, e.target.value);
            });
        });
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
            'follow_mouse': '🖱️ Follow Mouse',
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
                .inspector-section {
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-color);
                }
                .inspector-section:last-child {
                    border-bottom: none;
                }
                .section-title {
                    font-weight: 600;
                    font-size: 12px;
                    margin-bottom: 12px;
                    color: var(--text-primary);
                }
                .property-control {
                    margin-bottom: 12px;
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
                }
                .slider-container input[type="range"] {
                    flex: 1;
                    height: 4px;
                    border-radius: 2px;
                    background: var(--bg-secondary);
                    outline: none;
                    -webkit-appearance: none;
                }
                .slider-container input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: var(--accent-color);
                    cursor: pointer;
                }
                .slider-container input[type="range"]::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: var(--accent-color);
                    cursor: pointer;
                    border: none;
                }
                .slider-container input[type="number"] {
                    width: 50px;
                    padding: 4px 6px;
                    background: var(--bg-secondary);
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
                    background: var(--bg-secondary);
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
                    background: var(--bg-secondary);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .toggle-switch.active {
                    background: var(--accent-color);
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
                .toggle-switch.active::after {
                    left: 22px;
                }
            </style>
        `;
    }
}
