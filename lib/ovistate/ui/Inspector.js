import SceneRegistry from '../../../js/core/SceneRegistry.js';

/**
 * Enhanced Inspector Panel with Interactive Controls
 */
export default class Inspector {
    static SliderPresets = {
        'modern_minimal': {
            label: 'Modern Minimal',
            style: {
                accentColor: '#8e24aa',
                trackColor: '#e1bee7',
                showSurface: false,
                labelColor: '#4a148c',
                valueColor: '#8e24aa',
                borderRadius: 4,
                hoverScale: 1.1,
                showHoverGlow: true
            }
        },
        'pro_transparent': {
            label: 'Pro Borderless',
            style: {
                accentColor: '#059669',
                trackColor: 'rgba(5, 150, 105, 0.1)',
                showSurface: false,
                labelColor: '#064e3b',
                valueColor: '#059669',
                borderRadius: 4,
                hoverScale: 1.2,
                showHoverGlow: false
            }
        },
        'neon_night': {
            label: 'Neon Night',
            style: {
                accentColor: '#00e5ff',
                trackColor: '#006064',
                surfaceColor: '#121212',
                showSurface: true,
                opacity: 0.9,
                labelColor: '#ffffff',
                valueColor: '#00e5ff',
                borderRadius: 8,
                hoverScale: 1.1,
                showHoverGlow: true
            }
        },
        'glassmorphism': {
            label: 'Glassmorphism',
            style: {
                accentColor: '#ffffff',
                trackColor: '#ffffff33',
                surfaceColor: '#ffffff',
                showSurface: true,
                opacity: 0.2,
                labelColor: '#ffffff',
                valueColor: '#ffffff',
                borderRadius: 12,
                hoverScale: 1.1,
                showHoverGlow: true
            }
        },
        'soft_candy': {
            label: 'Soft Candy',
            style: {
                accentColor: '#ff80ab',
                trackColor: '#f8bbd0',
                surfaceColor: '#fff5f8',
                showSurface: true,
                opacity: 1,
                labelColor: '#ad1457',
                valueColor: '#ff80ab',
                borderRadius: 20,
                hoverScale: 1.15,
                showHoverGlow: true
            }
        }
    };

    static ButtonPresets = {
        'modern_primary': {
            label: 'Modern Primary',
            style: {
                background: '#007acc',
                color: '#ffffff',
                fontSize: 14,
                paddingX: 20,
                paddingY: 10,
                borderRadius: 6,
                borderWidth: 0,
                hoverBackground: '#005fa3',
                hoverScale: 1.05,
                showShadow: true
            }
        },
        'glass_frosted': {
            label: 'Glass Frosted',
            style: {
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#333333',
                fontSize: 14,
                paddingX: 18,
                paddingY: 9,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                hoverBackground: 'rgba(255, 255, 255, 0.4)',
                hoverScale: 1.02,
                showShadow: true
            }
        },
        'neon_cyber': {
            label: 'Neon Cyber',
            style: {
                background: '#0a0a0a',
                color: '#00e5ff',
                fontSize: 14,
                paddingX: 22,
                paddingY: 10,
                borderRadius: 2,
                borderWidth: 2,
                borderColor: '#00e5ff',
                hoverBackground: '#00e5ff22',
                hoverScale: 1.08,
                showShadow: false
            }
        },
        'soft_minimal': {
            label: 'Soft Minimal',
            style: {
                background: '#f5f5f5',
                color: '#444444',
                fontSize: 13,
                paddingX: 16,
                paddingY: 8,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                hoverBackground: '#eeeeee',
                hoverScale: 1.0,
                showShadow: false
            }
        },
        'pill_dark': {
            label: 'Pill Dark',
            style: {
                background: '#2d3436',
                color: '#dfe6e9',
                fontSize: 14,
                paddingX: 24,
                paddingY: 12,
                borderRadius: 30,
                borderWidth: 0,
                hoverBackground: '#636e72',
                hoverScale: 1.1,
                showShadow: true
            }
        },
        'arcade_retro': {
            label: 'Arcade Retro',
            style: {
                background: '#000000',
                color: '#ff2d55',
                fontSize: 14,
                paddingX: 24,
                paddingY: 12,
                borderRadius: 30,
                borderWidth: 0,
                hoverBackground: '#ff2d5599',
                hoverScale: 1.1,
                showShadow: true
            }
        }
    };

    static JoystickPresets = {
        'ovi_original': {
            label: 'Ovi Original',
            style: {
                background: '#000000',
                accentColor: '#333333',
                surfaceColor: '#ffffff',
                opacity: 0.8,
                showSurface: true
            }
        },
        'console_classic': {
            label: 'Console Classic',
            style: {
                background: '#2d3436',
                accentColor: '#0984e3',
                surfaceColor: '#636e72',
                opacity: 0.9,
                showSurface: true
            }
        },
        'modern_minimal': {
            label: 'Modern Minimal',
            style: {
                background: '#f5f6fa',
                accentColor: '#2f3640',
                surfaceColor: '#dcdde1',
                opacity: 0.7,
                showSurface: true
            }
        },
        'neon_cyber': {
            label: 'Neon Cyber',
            style: {
                background: '#0a0a0a',
                accentColor: '#00e5ff',
                surfaceColor: '#1e272e',
                opacity: 0.8,
                showSurface: true
            }
        },
        'glass_frosted': {
            label: 'Glass Frosted',
            style: {
                background: 'rgba(255, 255, 255, 0.1)',
                accentColor: '#ffffff',
                surfaceColor: 'rgba(255, 255, 255, 0.3)',
                opacity: 0.5,
                showSurface: true
            }
        },
        'arcade_retro': {
            label: 'Arcade Retro',
            style: {
                background: '#1a1a1a',
                accentColor: '#ff2d55',
                surfaceColor: '#000000',
                opacity: 1.0,
                showSurface: true
            }
        }
    };

    static applySliderPreset(engine, data, presetId) {
        const preset = this.SliderPresets[presetId];
        if (!preset) return;

        const editor = window.oviEditor;
        if (!editor) return;

        // Apply each style property via updateProperty to trigger live render
        if (preset.style) {
            Object.entries(preset.style).forEach(([key, value]) => {
                this.updateProperty(editor, `style.${key}`, value);
            });
        }

        // Refresh Inspector
        this.update(engine, data);
    }

    static applyButtonPreset(engine, data, presetId) {
        const preset = this.ButtonPresets[presetId];
        if (!preset) return;

        const editor = window.oviEditor;
        if (!editor) return;

        if (preset.style) {
            Object.entries(preset.style).forEach(([key, value]) => {
                this.updateProperty(editor, `style.${key}`, value);
            });
        }

        this.update(engine, data);
    }

    static applyJoystickPreset(engine, data, presetId) {
        const preset = this.JoystickPresets[presetId];
        if (!preset) return;

        const editor = window.oviEditor;
        if (!editor) return;

        if (preset.style) {
            Object.entries(preset.style).forEach(([key, value]) => {
                this.updateProperty(editor, `style.${key}`, value);
            });
        }

        this.update(engine, data);
    }

    static getAllObjects(editor) {
        if (!editor) return [];
        return [
            ...(editor.runtime?.objects || []),
            ...(editor.simulationData?.controls || [])
        ];
    }
    static render(engine, data = null) {
        if (!data) {
            engine.layoutManager.setInspectorContent(`
                <div style="padding: 15px; color: var(--text-primary);">
                    <div style="font-weight: bold; margin-bottom: 15px; font-size: 14px;">
                        Inspector
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        Select an object to edit properties
                    </div>
                </div>
            `);
            return;
        }

        const html = this.buildInspectorHTML(data);
        engine.layoutManager.setInspectorContent(`
            ${html}
            ${this.generateActionDatalist()}
        `);

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
                <div class="inspector-section">
                    <div class="section-title">Identity</div>
                    <div class="property-control">
                        <div class="property-label">Object Name</div>
                        <input type="text" id="prop-obj-name" value="${data.name || data.id}" data-property="name" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                    </div>
                </div>

                <div class="inspector-section">
                    <div class="section-title">Hierarchy</div>
                    <div class="property-control">
                        <div class="property-label">Parent Object</div>
                        <select id="prop-parent" data-property="parent" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            ${this.generateParentOptions(window.oviEditor, data)}
                        </select>
                        <div style="font-size: 9px; color: var(--text-secondary); margin-top: 4px;">Linking links this objects movement to the parent.</div>
                    </div>
                </div>

                ${data.type === 'variable' ? `
                <div class="inspector-section">
                    <div class="section-title">Variable Settings</div>
                    <div class="property-control">
                        <div class="property-label">Name</div>
                        <input type="text" id="prop-varName" value="${data.varName || 'myVar'}" class="inspector-input" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                    </div>
                    <div class="property-control">
                        <div class="property-label">Type</div>
                        <select id="prop-varType" class="inspector-input" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            <option value="Number" ${data.varType === 'Number' ? 'selected' : ''}>Number</option>
                            <option value="String" ${data.varType === 'String' ? 'selected' : ''}>String</option>
                            <option value="Boolean" ${data.varType === 'Boolean' ? 'selected' : ''}>Boolean</option>
                        </select>
                    </div>
                    <div class="property-control">
                        <div class="property-label">Initial Value</div>
                        <input type="${data.varType === 'Number' ? 'number' : 'text'}" id="prop-value" value="${data.value}" class="inspector-input" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                    </div>
                    ${data.varType === 'Number' ? `
                    <div class="property-control">
                        <div class="property-label">Range (Min / Max)</div>
                        <div style="display:flex; gap:5px;">
                            <input type="number" id="prop-min" value="${data.min !== undefined ? data.min : 0}" class="inspector-input" placeholder="Min" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                            <input type="number" id="prop-max" value="${data.max !== undefined ? data.max : 100}" class="inspector-input" placeholder="Max" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                ${data.type === 'timer' ? `
                <div class="inspector-section">
                    <div class="section-title">Timer Settings</div>
                    <div class="property-control">
                        <div class="property-label">Mode</div>
                        <select id="prop-mode" class="inspector-input" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            <option value="countdown" ${data.mode === 'countdown' ? 'selected' : ''}>Countdown</option>
                            <option value="stopwatch" ${data.mode === 'stopwatch' ? 'selected' : ''}>Stopwatch</option>
                        </select>
                    </div>
                    <div class="property-control">
                        <div class="property-label">Duration (sec)</div>
                        <input type="number" id="prop-duration" value="${data.duration}" class="inspector-input" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                    </div>
                    ${this.createToggleControl('Auto Start', 'autoStart', data.autoStart || false)}
                </div>
                ` : ''}

                ${data.isUI ? this.buildUIInspector(data) : `
                
                <div class="inspector-section">
                    <div class="section-title">Transform</div>
                    ${this.createNumberControl('X Position', 'x', data.x, 0, 3000)}
                    ${this.createNumberControl('Y Position', 'y', data.y, 0, 3000)}
                    ${data.type === 'circle' ?
                    this.createNumberControl('Radius', 'radius', data.radius || 30, 5, 200) :
                    (data.type === 'text' ? '' :
                        this.createNumberControl('Width', 'width', data.width || 60, 10, 2000) +
                        this.createNumberControl('Height', 'height', data.height || 60, 10, 2000))
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
                        <div class="property-label" style="display: flex; align-items: center;">
                            <span>Content</span>
                            ${this._createBindButton('text')}
                        </div>
                        <textarea id="prop-text" data-property="text" 
                            style="width: 100%; height: 80px; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px; resize: vertical;">${data.text || 'Text'}</textarea>
                    </div>
                </div>



                <div class="inspector-section">
                    <div class="section-title">Typography & Layout</div>
                    ${this.createSelectControl('Font Family', 'fontFamily', data.fontFamily || 'Arial', [
                    { label: 'Arial (Sans)', value: 'Arial' },
                    { label: 'Inter (Modern)', value: 'Inter, sans-serif' },
                    { label: 'Roboto (Pro)', value: 'Roboto, sans-serif' },
                    { label: 'Playfair (Serif)', value: 'Playfair Display, serif' },
                    { label: 'Fira Code (Mono)', value: 'Fira Code, monospace' }
                ])}
                    
                    <div style="display:flex; gap:5px;">
                        ${this.createSelectControl('Weight', 'fontWeight', data.fontWeight || 'normal', [
                    { label: 'Light', value: '300' },
                    { label: 'Regular', value: 'normal' },
                    { label: 'Bold', value: 'bold' },
                    { label: 'Black', value: '900' }
                ])}
                        ${this.createSelectControl('Transform', 'textTransform', data.textTransform || 'none', [
                    { label: 'None', value: 'none' },
                    { label: 'UPPERCASE', value: 'uppercase' },
                    { label: 'lowercase', value: 'lowercase' }
                ])}
                    </div>

                    <div style="display:flex; gap:5px;">
                        ${this.createNumberControl('Size', 'fontSize', data.fontSize || 20, 8, 100)}
                        ${this.createNumberControl('Spacing', 'letterSpacing', data.letterSpacing || 0, -2, 20, 0.5)}
                    </div>
                    
                    ${this.createNumberControl('Line Height', 'lineHeight', data.lineHeight || 1.2, 0.5, 3.0, 0.1)}
                    
                    <div class="property-control">
                        <div class="property-label">Alignment</div>
                        <div style="display: flex; gap: 4px;">
                            <select id="prop-align" data-property="align" style="flex: 1; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                                <option value="left" ${data.align === 'left' ? 'selected' : ''}>Left</option>
                                <option value="center" ${data.align === 'center' || !data.align ? 'selected' : ''}>Center</option>
                                <option value="right" ${data.align === 'right' ? 'selected' : ''}>Right</option>
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
                        this.createNumberControl('Wrap Width', 'width', data.width || 300, 50, 2000)
                        : ''}
                </div>

                <div class="inspector-section">
                    <div class="section-title">Text Effects (Shadow)</div>
                    ${this.createToggleControl('Enable Shadow', 'shadowEnabled', data.shadowEnabled || false)}
                    ${data.shadowEnabled ? `
                        ${this.createColorControl('Shadow Color', 'shadowColor', data.shadowColor || 'rgba(0,0,0,0.5)')}
                        <div style="display:flex; gap:5px;">
                            ${this.createNumberControl('Blur', 'shadowBlur', data.shadowBlur || 5, 0, 20)}
                            ${this.createNumberControl('X Off', 'shadowOffsetX', data.shadowOffsetX || 2, -20, 20)}
                            ${this.createNumberControl('Y Off', 'shadowOffsetY', data.shadowOffsetY || 2, -20, 20)}
                        </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Appearance Section -->
                <div class="inspector-section">
                    <div class="section-title">Appearance</div>
                    ${this.createOptionalColorControl('Fill Color', 'fill', data.fill || 'none')}
                    ${this.createOptionalColorControl('Stroke Color', 'stroke', data.stroke || 'none')}
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
                        ${this.createToggleControl('Static Body', 'physics.static', data.physics.static || false)}
                        ${this.createNumberControl('Gravity Scale', 'physics.gravityScale', data.physics.gravityScale !== undefined ? data.physics.gravityScale : 1, -5, 5, 0.1)}
                        ${this.createNumberControl('Friction', 'physics.friction', data.physics.friction !== undefined ? data.physics.friction : 0.1, 0, 1, 0.05)}
                        ${this.createNumberControl('Bounciness', 'physics.bounciness', data.physics.bounciness || 0.8, 0, 1, 0.1)}
                        ${this.createToggleControl('Lock Rotation', 'physics.lockRotation', data.physics.lockRotation || false)}
                        ${!data.physics.lockRotation ? `
                            ${this.createNumberControl('Angular Damping', 'physics.angularDamping', data.physics.angularDamping !== undefined ? data.physics.angularDamping : 0.1, 0, 1, 0.05)}
                            ${this.createNumberControl('Auto-Upright', 'physics.uprightStrength', data.physics.uprightStrength || 0, 0, 10, 0.1)}
                        ` : ''}
                    ` : ''}
                </div>

                <!-- Emitter Section -->
                ${data.type === 'emitter' ? `
                <div class="inspector-section">
                    <div class="section-title">Emitter Settings</div>
                    ${this.createToggleControl('Show Icon in Preview', 'showInExport', data.showInExport !== false)}
                    ${this.createNumberControl('Rate (pps)', 'rate', data.rate || 10, 1, 500)}
                    
                    <div class="section-title" style="font-size: 11px; color: #aaa; margin-top: 8px;">Spawn Area</div>
                    ${this.createSelectControl('Spawn Shape', 'spawnType', data.spawnType || 'point', [
                            { label: 'Point', value: 'point' },
                            { label: 'Box', value: 'box' },
                            { label: 'Circle', value: 'circle' }
                        ])}
                    ${data.spawnType === 'box' ? `
                        ${this.createNumberControl('Box Width', 'boxWidth', data.boxWidth || 100, 0, 1000)}
                        ${this.createNumberControl('Box Height', 'boxHeight', data.boxHeight || 100, 0, 1000)}
                    ` : ''}
                    ${data.spawnType === 'circle' ? `
                        ${this.createNumberControl('Radius', 'spawnRadius', data.spawnRadius || 50, 0, 1000)}
                    ` : ''}

                    <div class="section-title" style="font-size: 11px; color: #aaa; margin-top: 8px;">Dynamics</div>
                    ${this.createNumberControl('Base Speed', 'speed', data.speed || 100, 0, 1000)}
                    ${this.createNumberControl('Speed Variation', 'speedVariation', data.speedVariation !== undefined ? data.speedVariation : 0.4, 0, 1, 0.05)}
                    ${this.createNumberControl('Angle (deg)', 'angle', data.angle || -90, -360, 360)}
                    ${this.createNumberControl('Spread (deg)', 'spread', data.spread || 30, 0, 360)}
                    ${this.createNumberControl('Gravity Y', 'particleGravity', data.particleGravity || 0, -1000, 1000)}
                    ${this.createNumberControl('Life (sec)', 'lifetime', data.lifetime || 1, 0.1, 10, 0.1)}
                    
                    <div class="section-title" style="font-size: 11px; color: #aaa; margin-top: 8px;">Rotation</div>
                    ${this.createNumberControl('Initial Rotation', 'particleRotation', data.particleRotation || 0, 0, 360)}
                    ${this.createNumberControl('Spin Speed', 'particleRotationSpeed', data.particleRotationSpeed || 0, -720, 720)}

                    <div class="section-title" style="font-size: 11px; color: #aaa; margin-top: 8px;">Appearance</div>
                    ${this.createStringControl('Texture URL', 'textureUrl', data.textureUrl || '')}
                    ${this.createNumberControl('Start Size', 'particleSize', data.particleSize || 3, 1, 100)}
                    ${this.createNumberControl('End Size', 'endSize', data.endSize !== undefined ? data.endSize : (data.particleSize || 3), 0, 100)}
                    
                    ${this.createColorControl('Start Color', 'color', data.color || '#ffaa00')}
                    ${this.createColorControl('End Color', 'endColor', data.endColor || data.color || '#ffaa00')}
                </div>
                ` : ''}
                
                <!-- Sprite Section -->
                ${data.type === 'sprite' ? `
                <div class="inspector-section">
                    <div class="section-title">Sprite Animation</div>
                    ${this.createStringControl('Sprite Sheet URL', 'spriteSheet', data.spriteSheet || '')}
                    <div style="display:flex; gap:5px;">
                        ${this.createNumberControl('Cols', 'spriteCols', data.spriteCols || 1, 1, 50)}
                        ${this.createNumberControl('Rows', 'spriteRows', data.spriteRows || 1, 1, 50)}
                    </div>
                    <div style="display:flex; gap:5px;">
                        ${this.createNumberControl('Total Frames', 'frameCount', data.frameCount || 1, 1, 1000)}
                        ${this.createNumberControl('FPS', 'spriteFPS', data.spriteFPS || 12, 1, 120)}
                    </div>
                    ${this.createToggleControl('Loop Animation', 'loop', data.loop !== false)}
                </div>
                ` : ''}

                <!-- Spring Section -->
                ${data.type === 'spring' ? `
                <div class="inspector-section">
                    <div class="section-title">Spring Connection</div>
                    <div style="font-size:10px; color: var(--text-secondary); margin-bottom:5px;">Connect two objects:</div>
                    
                    ${(() => {
                        // Helper to generate object options
                        const editor = window.oviEditor;
                        const objects = editor && editor.runtime ? editor.runtime.objects : [];
                        const generateOptions = (currentId) => {
                            let opts = '<option value="">-- None --</option>';
                            objects.forEach(obj => {
                                if (obj.id !== data.id && obj.type !== 'spring') { // Prevent self-connect or spring-spring
                                    opts += `<option value="${obj.id}" ${obj.id === currentId ? 'selected' : ''}>${obj.name || obj.id}</option>`;
                                }
                            });
                            return opts;
                        };
                        return `
                        <div class="property-control">
                            <div class="property-label">Target A</div>
                            <select id="prop-targetA" data-property="targetA" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                                ${generateOptions(data.targetA)}
                            </select>
                        </div>
                    <div class="property-control">
                        <div class="property-label">Target B</div>
                        <select id="prop-targetB" data-property="targetB" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            ${generateOptions(data.targetB)}
                        </select>
                    </div>
                    `;
                    })()}

                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                     <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 5px;">Anchor Offsets (from center)</div>
                     <div style="display:flex; gap:5px; margin-bottom:4px;">
                         ${this.createNumberControl('A X', 'anchorA.x', data.anchorA?.x || 0, -500, 500)}
                         ${this.createNumberControl('A Y', 'anchorA.y', data.anchorA?.y || 0, -500, 500)}
                     </div>
                     <div style="display:flex; gap:5px;">
                         ${this.createNumberControl('B X', 'anchorB.x', data.anchorB?.x || 0, -500, 500)}
                         ${this.createNumberControl('B Y', 'anchorB.y', data.anchorB?.y || 0, -500, 500)}
                     </div>
                </div>
                    
                    <div class="section-title" style="margin-top:10px;">Physics</div>
                    ${this.createNumberControl('Stiffness', 'stiffness', data.stiffness || 0.1, 0.01, 1.0, 0.01)}
                    ${this.createNumberControl('Damping', 'damping', data.damping || 0.5, 0.01, 1.0, 0.01)}
                    ${this.createNumberControl('Rest Length', 'length', data.length || 100, 10, 500)}
                    
                    <div class="section-title" style="margin-top:10px;">Visuals</div>
                     ${this.createNumberControl('Line Width', 'width', data.width || 4, 1, 20)}
                     ${this.createColorControl('Color', 'color', data.color || '#555555')}
                     ${this.createSelectControl('Style', 'style', data.style || 'coil', [
                        { label: 'Coil (Spring)', value: 'coil' },
                        { label: 'Straight Line', value: 'line' },
                        { label: 'Chain/Zigzag', value: 'zigzag' }
                    ])}
                </div>
                ` : ''}

                <!-- Joint Section -->
                ${data.type === 'joint' ? `
                <div class="inspector-section">
                    <div class="section-title">Physics Joint</div>
                    ${this.createSelectControl('Type', 'subtype', data.subtype || 'hinge', [
                        { label: 'Hinge (Pivot)', value: 'hinge' },
                        { label: 'Rope (Distance)', value: 'rope' },
                        { label: 'Fixed (Rigid)', value: 'fixed' },
                        { label: 'Prismatic (Slider)', value: 'prismatic' },
                        { label: 'Motor (Rotating)', value: 'motor' }
                    ])}
                    
                    <div style="font-size:10px; color: var(--text-secondary); margin-bottom:5px;">Connect two objects:</div>
                    ${(() => {
                        const editor = window.oviEditor;
                        const objects = editor && editor.runtime ? editor.runtime.objects : [];
                        const generateOptions = (currentId) => {
                            let opts = '<option value="">-- None --</option>';
                            objects.forEach(obj => {
                                if (obj.id !== data.id && obj.type !== 'joint') {
                                    opts += `<option value="${obj.id}" ${obj.id === currentId ? 'selected' : ''}>${obj.name || obj.id || obj.type}</option>`;
                                }
                            });
                            return opts;
                        };
                        return `
                        <div class="property-control">
                            <div class="property-label">Object A</div>
                            <div style="display:flex; gap:5px;">
                                <select id="prop-targetA" data-property="targetA" style="flex:1; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                                    ${generateOptions(data.targetA)}
                                </select>
                                <button class="pick-target-btn" data-target="targetA" title="Pick from Canvas" style="padding: 0 8px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; cursor: pointer;">🎯</button>
                            </div>
                        </div>
                        <div class="property-control">
                            <div class="property-label">Object B</div>
                            <div style="display:flex; gap:5px;">
                                <select id="prop-targetB" data-property="targetB" style="flex:1; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                                    ${generateOptions(data.targetB)}
                                </select>
                                <button class="pick-target-btn" data-target="targetB" title="Pick from Canvas" style="padding: 0 8px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; cursor: pointer;">🎯</button>
                            </div>
                        </div>
                        `;
                    })()}

                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                              <div style="font-size: 10px; color: var(--text-secondary);">Pivot Offsets (Local)</div>
                              <button class="reset-anchors-btn" title="Reset to Center (0,0)" style="font-size: 8px; background: transparent; color: #888; border: 1px solid #444; border-radius: 2px; cursor: pointer; padding: 1px 4px;">RESET</button>
                         </div>
                         <div style="display:flex; gap:5px; margin-bottom:4px;">
                             ${this.createNumberControl('A X', 'anchorA.x', data.anchorA?.x || 0, -500, 500)}
                             ${this.createNumberControl('A Y', 'anchorA.y', data.anchorA?.y || 0, -500, 500)}
                         </div>
                         <div style="display:flex; gap:5px;">
                             ${this.createNumberControl('B X', 'anchorB.x', data.anchorB?.x || 0, -500, 500)}
                             ${this.createNumberControl('B Y', 'anchorB.y', data.anchorB?.y || 0, -500, 500)}
                         </div>
                    </div>

                    ${data.subtype === 'motor' ? `
                        <div class="section-title" style="margin-top:10px;">Motor Settings</div>
                        ${this.createNumberControl('Motor Speed', 'motorSpeed', data.motorSpeed || 0, -2000, 2000, 100)}
                        ${this.createNumberControl('Max Torque', 'motorTorque', data.motorTorque || 100, 1, 1000, 10)}
                    ` : ''}

                    ${data.subtype === 'prismatic' ? `
                        <div class="section-title" style="margin-top:10px;">Slider Settings</div>
                        ${this.createNumberControl('Axis Angle', 'axisAngle', data.axisAngle || 0, 0, 360, 15)}
                    ` : ''}

                    <div class="section-title" style="margin-top:10px;">Dynamics</div>
                    ${this.createNumberControl('Elasticity', 'strength', data.strength !== undefined ? data.strength : 0.5, 0.01, 1.0, 0.05)}
                    ${data.subtype === 'rope' ? this.createNumberControl('Max Length', 'length', data.length || 100, 10, 1000) : ''}
                    
                    <div class="section-title" style="margin-top:10px;">Breakable</div>
                    ${this.createToggleControl('Can Break', 'breakable', data.breakable || false)}
                    ${data.breakable ? this.createNumberControl('Break Threshold', 'breakForce', data.breakForce || 200, 10, 2000, 10) : ''}

                    <div class="section-title" style="margin-top:10px;">Appearance</div>
                    ${this.createNumberControl('Width', 'width', data.width || 2, 1, 10)}
                    ${this.createColorControl('Color', 'color', data.color || '#2980b9')}
                </div>
                ` : ''}

                <!-- Trigger Zone Section -->
                ${data.type === 'trigger_zone' ? `
                <div class="inspector-section">
                    <div class="section-title">Trigger Zone</div>
                    ${this.createSelectControl('Zone Shape', 'shape', data.shape || 'rectangle', [
                        { label: 'Rectangle', value: 'rectangle' },
                        { label: 'Circle', value: 'circle' }
                    ])}
                    
                    ${(data.shape === 'circle') ?
                        this.createNumberControl('Radius', 'radius', data.radius || 60, 10, 1000) :
                        `
                        <div style="display:flex; gap:5px;">
                            ${this.createNumberControl('Width', 'width', data.width || 120, 10, 2000)}
                            ${this.createNumberControl('Height', 'height', data.height || 120, 10, 2000)}
                        </div>
                        `
                    }
                    
                    <div class="section-title" style="margin-top:10px;">Visual Interaction</div>
                    <div style="display:flex; gap:5px;">
                        <div style="flex:1;">
                            ${this.createColorControl('Base Color', 'color', data.color || '#f1c40f')}
                        </div>
                        <div style="flex:1;">
                            ${this.createColorControl('Active Color', 'activeColor', data.activeColor || data.color || '#f1c40f')}
                        </div>
                    </div>
                    ${this.createNumberControl('Opacity', 'opacity', data.opacity || 0.3, 0, 1, 0.1)}
                    ${this.createToggleControl('Show in Export', 'showInExport', data.showInExport || false)}

                    <div class="section-title" style="margin-top:10px;">Advanced Logic</div>
                    ${this.createStringControl('Filter by Tag', 'filterTag', data.filterTag || '')}
                    ${this.createStringControl('Filter by Name', 'filterName', data.filterName || '')}
                    
                    ${this.createNumberControl('Required Stay (ms)', 'requiredStayTime', (data.requiredStayTime || 0) * 1000, 0, 5000, 100)}
                    ${this.createNumberControl('Cooldown (ms)', 'cooldown', data.cooldown || 0, 0, 10000, 100)}
                    ${this.createToggleControl('Trigger Once', 'triggerOnce', data.triggerOnce || false)}
                    
                    <div class="section-title" style="margin-top:10px;">Event Actions</div>
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 10px;">Define what happens when objects interact with this zone.</div>
                    
                    ${this.createEventActionControl(data, 'onEnter', 'On Enter')}
                    ${this.createEventActionControl(data, 'onStay', 'On Stay')}
                    ${this.createEventActionControl(data, 'onExit', 'On Exit')}
                    
                    <div class="inspector-info" style="margin-top:10px; padding:10px; background: rgba(0,0,0,0.2); border-left: 3px solid #f1c40f; font-size:11px;">
                        <strong>Note:</strong> Required Stay Time applies to <code>onEnter</code>. Cooldown applies to all events.
                    </div>
                </div>
                ` : ''}

                <!-- Force Field Section -->
                ${data.type === 'force_field' ? `
                <div class="inspector-section">
                    <div class="section-title">Force Field - ${data.subtype === 'wind' ? '💨 Wind' : '🧲 Magnet'}</div>
                    
                    ${data.subtype === 'wind' ? `
                    <!-- Wind Controls -->
                    ${this.createNumberControl('Strength', 'strength', data.strength || 500, 0, 2000, 10)}
                    ${this.createNumberControl('Direction (°)', 'direction', data.direction || 0, 0, 360, 1)}
                    ${this.createNumberControl('Turbulence', 'turbulence', data.turbulence || 0.1, 0, 1, 0.05)}
                    
                    <div class="section-title" style="margin-top:10px;">Visual Style</div>
                    ${this.createSelectControl('Style', 'visualStyle', data.visualStyle || 'arrow', [
                        { label: 'Arrow (Simple)', value: 'arrow' },
                        { label: 'Stream (Flow)', value: 'stream' },
                        { label: 'Fan (Device)', value: 'fan' }
                    ])}

                    ${data.visualStyle === 'fan' ? `
                        ${this.createToggleControl('Animate Fan', 'fanAnimate', data.fanAnimate !== undefined ? data.fanAnimate : true)}
                    ` : ''}
                    
                    <div class="section-title" style="margin-top:10px;">Area Shape</div>
                    ${this.createSelectControl('Shape', 'shape', data.shape || 'rectangle', [
                        { label: 'Rectangle', value: 'rectangle' },
                        { label: 'Circle', value: 'circle' }
                    ])}
                    
                    ${data.shape === 'rectangle' || !data.shape ? `
                        ${this.createNumberControl('Source W', 'width', data.width || 60, 10, 500)}
                        ${this.createNumberControl('Source H', 'height', data.height || 60, 10, 500)}
                    ` : `
                        ${this.createNumberControl('Source Radius', 'radius', data.radius || 30, 10, 200)}
                    `}
                    
                    <div class="section-title" style="margin-top:10px;">Force Zone (Physics)</div>
                    ${this.createNumberControl('Range (Length)', 'range', data.range || 400, 50, 2000, 10)}
                    ${this.createNumberControl('Zone Width', 'zoneWidth', data.zoneWidth || 200, 50, 1000, 10)}
                    
                    <div class="section-title" style="margin-top:10px;">Advanced</div>
                    ${this.createToggleControl('Affect Rotation', 'affectRotation', data.affectRotation || false)}
                    ${this.createNumberControl('Edge Falloff', 'falloffEdge', data.falloffEdge || 0, 0, 1, 0.1)}
                    
                    ` : data.subtype === 'magnet' ? `
                    <!-- Magnet Controls -->
                    ${this.createSelectControl('Mode', 'mode', data.mode || 'attract', [
                        { label: 'Attract (Pull)', value: 'attract' },
                        { label: 'Repel (Push)', value: 'repel' },
                        { label: 'Orbit (Revolve)', value: 'orbit' },
                        { label: 'Vortex (Spiral)', value: 'vortex' }
                    ])}
                    
                    ${(data.mode === 'orbit' || data.mode === 'vortex') ? `
                        ${this.createNumberControl('Orbit Strength', 'orbitStrength', data.orbitStrength || 500, 0, 2000, 10)}
                        ${this.createSelectControl('Orbit Direction', 'orbitDirection', data.orbitDirection || 'cw', [
                        { label: 'Clockwise', value: 'cw' },
                        { label: 'Counter-Clockwise', value: 'ccw' }
                    ])}
                    ` : ''}

                    ${this.createNumberControl('Strength', 'strength', data.strength || 500, 0, 2000, 10)}
                    ${this.createNumberControl('Radius', 'radius', data.radius || 150, 50, 500)}
                    
                    <div class="section-title" style="margin-top:10px;">Falloff Type</div>
                    ${this.createSelectControl('Falloff', 'falloff', data.falloff || 'quadratic', [
                        { label: 'Linear (Gradual)', value: 'linear' },
                        { label: 'Quadratic (Natural)', value: 'quadratic' },
                        { label: 'Constant (Uniform)', value: 'constant' }
                    ])}

                    <div class="section-title" style="margin-top:10px;">Target Filtering</div>
                    ${this.createSelectControl('Filter Mode', 'affectMode', data.affectMode || 'all', [
                        { label: 'All Objects', value: 'all' },
                        { label: 'Specific Tag', value: 'tag' }
                    ])}
                    ${data.affectMode === 'tag' ? `
                        ${this.createStringControl('Target Tag', 'targetTag', data.targetTag || '')}
                    ` : ''}
                    ${this.createToggleControl('Global Magnet', 'isGlobal', data.isGlobal || false)}
                    ${this.createToggleControl('Surface Attraction', 'surfaceAttraction', data.surfaceAttraction || false)}
                    
                    <div class="section-title" style="margin-top:10px;">Pulsation (LFO)</div>
                    ${this.createToggleControl('Enable Pulsation', 'pulsate', data.pulsate || false)}
                    ${data.pulsate ? `
                        ${this.createNumberControl('Pulse Speed', 'pulseSpeed', data.pulseSpeed || 5, 0.1, 20, 0.1)}
                        ${this.createNumberControl('Pulse Mag', 'pulseMagnitude', data.pulseMagnitude || 0.5, 0, 2, 0.05)}
                    ` : ''}

                    <div class="section-title" style="margin-top:10px;">Dipole Polarity</div>
                    ${this.createToggleControl('Is Dipole (N/S)', 'isDipole', data.isDipole || false)}
                    ${!data.isDipole ? this.createSelectControl('Polarity', 'polarity', data.polarity || 'n', [
                        { label: 'North (+)', value: 'n' },
                        { label: 'South (-)', value: 's' }
                    ]) : ''}
                    ${this.createNumberControl('Pole Distance', 'poleDistance', data.poleDistance || 40, 5, 200)}

                    <div class="section-title" style="margin-top:10px;">Advanced</div>
                    ${this.createNumberControl('Inner Radius', 'innerRadius', data.innerRadius || 0, 0, data.radius || 150)}
                    ${this.createNumberControl('Max Force Cap', 'maxForce', data.maxForce || 2000, 100, 10000, 100)}
                    ${this.createNumberControl('Field Damping', 'damping', data.damping || 0, 0, 10, 0.1)}
                    ${this.createToggleControl('Affect Rotation', 'affectRotation', data.affectRotation || false)}
                    ${this.createToggleControl('Show Field Lines', 'showFieldLines', data.showFieldLines !== false)}
                    ` : ''}
                    
                    <div class="section-title" style="margin-top:10px;">Appearance</div>
                    ${this.createColorControl('Color', 'color', data.color || (data.subtype === 'wind' ? '#00bcd4' : '#e91e63'))}
                    ${this.createNumberControl('Opacity', 'opacity', data.opacity || 0.3, 0, 1, 0.05)}
                    ${this.createToggleControl('Show in Export', 'showInExport', data.showInExport || false)}
                    
                    <div class="inspector-info" style="margin-top:10px; padding:10px; background: rgba(0,0,0,0.2); border-left: 3px solid ${data.subtype === 'wind' ? '#00bcd4' : '#e91e63'}; font-size:11px;">
                    <strong>${data.subtype === 'wind' ? 'Wind' : 'Magnet'} Force Field</strong><br>
                    ${data.subtype === 'wind'
                        ? 'Applies directional force to objects within the area.'
                        : 'Applies radial force (attract/repel) based on distance.'}
                    </div>
                </div>
                ` : ''}

                <!-- Path Section -->
                ${data.type === 'path' ? `
                <div class="inspector-section">
                    <div class="section-title">Path Settings</div>
                    ${this.createNumberControl('Stroke Width', 'width', data.width || 4, 1, 20)}
                    ${this.createColorControl('Stroke Color', 'color', data.color || '#3498db')}
                    ${this.createToggleControl('Dashed Line', 'dashed', data.dashed || false)}
                    
                    <div style="height:1px; background:var(--border-color); margin:8px 0;"></div>
                    
                    ${this.createToggleControl('Closed Path', 'closed', data.closed || false)}
                    ${this.createToggleControl('Fill Shape', 'filled', data.filled || false)}
                    ${data.filled ? this.createColorControl('Fill Color', 'fillColor', data.fillColor || data.color || '#3498db') : ''}
                    
                    ${this.createNumberControl('Curve Tension', 'tension', data.tension !== undefined ? data.tension : 0.5, 0, 1, 0.1)}
                    
                    <div class="inspector-info" style="margin-top:10px; padding:10px; background: rgba(0,0,0,0.2); border-left: 3px solid #3498db; font-size:11px;">
                        <strong>Editor Tips:</strong><br>
                        • Drag points to move.<br>
                        • <strong>Double-click</strong> line to Add Point.<br>
                        • <strong>Double-click</strong> point to Remove.
                    </div>
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
                                <option value="">Add Behavior...</option>
                                ${this.generateBehaviorOptions(window.oviEditor)}
                            </select>
                            <button id="add-behavior-btn" style="padding: 4px 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Add</button>
                        </div>
                    </div>
                </div>
                
                <!-- Behavior Parameters (for all object types) -->
                ${console.log('🔍 About to call renderBehaviorSettings, data.behaviors:', data.behaviors) || this.renderBehaviorSettings(data)}
                
                `}
                
                <!-- DATA BINDING SECTION (Logic Visuals) -->
                ${this.createUnifiedBindingSection(data)}
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
                    <span>${this.getObjectLabel(data.type)}</span>
                </div>

                <div class="inspector-section">
                    <div class="section-title">Identity</div>
                    <div class="property-control">
                        <div class="property-label">Component Name</div>
                        <input type="text" id="prop-ui-name" value="${data.name || data.id}" data-property="name" style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 3px; color: var(--text-primary); font-size: 11px;">
                    </div>
                </div>
        `;

        // Layout Properties
        controls += `
            <div class="inspector-section">
                <div class="section-title">Layout</div>
                ${this.createNumberControl('X Position', 'x', data.x, 0, 2000)}
                ${this.createNumberControl('Y Position', 'y', data.y, 0, 2000)}
            </div>
        `;

        // Specific Properties
        controls += '<div class="inspector-section"><div class="section-title">Component Settings</div>';

        if (data.type === 'button') {
            controls += this.createStringControl('Label', 'label', data.label || 'Button');

            // PRESETS Section
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Design Presets</div>
                    <div class="property-control">
                        <select id="button-preset-select" style="width: 100%; padding: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; font-size: 11px; cursor: pointer;">
                            <option value="">-- Select Preset --</option>
                            ${Object.entries(this.ButtonPresets).map(([id, p]) => `
                                <option value="${id}">${p.label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `;

            controls += `
                <div class="inspector-section">
                    <div class="section-title">Component Design</div>
                    ${this.createColorControl('Background', 'style.background', data.style?.background || '#007acc')}
                    ${this.createColorControl('Text Color', 'style.color', data.style?.color || '#ffffff')}
                    ${this.createNumberControl('Font Size', 'style.fontSize', data.style?.fontSize || 14, 8, 48)}
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">${this.createNumberControl('Pad X', 'style.paddingX', data.style?.paddingX || 16, 0, 100)}</div>
                        <div style="flex: 1;">${this.createNumberControl('Pad Y', 'style.paddingY', data.style?.paddingY || 8, 0, 100)}</div>
                    </div>
                    ${this.createNumberControl('Corner Radius', 'style.borderRadius', data.style?.borderRadius !== undefined ? data.style.borderRadius : 4, 0, 50)}
                    ${this.createNumberControl('Border Width', 'style.borderWidth', data.style?.borderWidth || 0, 0, 10)}
                    ${this.createColorControl('Border Color', 'style.borderColor', data.style?.borderColor || '#000000')}
                    
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-color);">
                        <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase;">Hover Effects</div>
                        ${this.createColorControl('Hover BG', 'style.hoverBackground', data.style?.hoverBackground || '#005fa3')}
                        ${this.createNumberControl('Hover Scale', 'style.hoverScale', data.style?.hoverScale || 1.05, 0.8, 1.5, 0.01)}
                        ${this.createToggleControl('Show Shadow', 'style.showShadow', data.style?.showShadow || false)}
                    </div>
                </div>
            `;
        } else if (data.type === 'slider') {
            controls += this.createStringControl('Label', 'label', data.label || 'Slider');
            controls += this.createToggleControl('Show Label', 'showLabel', data.showLabel !== false);

            // PRESETS Section (Dropdown)
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Design Presets</div>
                    <div class="property-control">
                        <select id="slider-preset-select" style="width: 100%; padding: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; font-size: 11px; cursor: pointer;">
                            <option value="">-- Select Preset --</option>
                            ${Object.entries(this.SliderPresets).map(([id, p]) => `
                                <option value="${id}">${p.label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `;

            controls += `
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed var(--border-color);">
                    <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 10px; text-transform: uppercase;">Slider Values</div>
                    ${this.createNumberControl('Min Value', 'min', data.min || 0, -1000, 5000)}
                    ${this.createNumberControl('Max Value', 'max', data.max || 100, -1000, 5000)}
                    ${this.createNumberControl('Step', 'step', data.step || 1, 0.01, 100, 0.01)}
                    ${this.createNumberControl('Current Value', 'value', data.value || 0, data.min || 0, data.max || 100, data.step || 1)}
                </div>
            `;

            // NEW: Component Design Section for Sliders
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Component Design</div>
                    ${this.createToggleControl('Show Surface', 'style.showSurface', data.style?.showSurface !== false)}
                    ${this.createSelectControl('Label Position', 'style.labelPosition', data.style?.labelPosition || 'Top', ['Top', 'Bottom', 'Left', 'Right'])}
                    ${this.createSelectControl('Orientation', 'style.orientation', data.style?.orientation || 'Horizontal', ['Horizontal', 'Vertical'])}
                    ${this.createSelectControl('Align Text', 'style.textAlign', data.style?.textAlign || 'Left', ['Left', 'Center', 'Right'])}
                    ${this.createColorControl('Accent Color', 'style.accentColor', data.style?.accentColor || '#007acc')}
                    ${this.createColorControl('Track Color', 'style.trackColor', data.style?.trackColor || '#444444')}
                    ${this.createColorControl('Surface Color', 'style.surfaceColor', data.style?.surfaceColor || '#1e1e1e')}
                    ${this.createNumberControl('Opacity', 'style.opacity', data.style?.opacity !== undefined ? data.style.opacity : 0.8, 0, 1, 0.05)}
                    ${this.createColorControl('Label Color', 'style.labelColor', data.style?.labelColor || '#ffffff')}
                    ${this.createColorControl('Value Color', 'style.valueColor', data.style?.valueColor || '#ffffff')}
                    ${this.createNumberControl('Hover Scale', 'style.hoverScale', data.style?.hoverScale || 1.1, 1, 1.5, 0.05)}
                    ${this.createToggleControl('Show Hover Glow', 'style.showHoverGlow', data.style?.showHoverGlow !== false)}
                    ${this.createNumberControl(data.style?.orientation === 'Vertical' ? 'Height' : 'Width', 'width', data.width || 120, 80, 500)}
                    ${this.createNumberControl('Corner Radius', 'style.borderRadius', data.style?.borderRadius !== undefined ? data.style.borderRadius : 4, 0, 20)}
                </div>
            `;
        } else if (data.type === 'checkbox') {
            controls += this.createStringControl('Label', 'label', data.label || 'Enable');
            controls += this.createToggleControl('Checked', 'checked', data.checked || false);
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Component Design</div>
                    ${this.createSelectControl('Label Position', 'style.labelPosition', data.style?.labelPosition || 'Right', ['Top', 'Bottom', 'Left', 'Right'])}
                    ${this.createSelectControl('Align Text', 'style.textAlign', data.style?.textAlign || 'Left', ['Left', 'Center', 'Right'])}
                    ${this.createColorControl('Check Color', 'style.accentColor', data.style?.accentColor || '#007acc')}
                    ${this.createColorControl('Box Color', 'style.surfaceColor', data.style?.surfaceColor || '#1e1e1e')}
                    ${this.createNumberControl('Size', 'style.size', data.style?.size || 1, 0.5, 3, 0.1)}
                    ${this.createNumberControl('Corner Radius', 'style.borderRadius', data.style?.borderRadius !== undefined ? data.style.borderRadius : 2, 0, 10)}
                    ${this.createToggleControl('Show Surface', 'style.showSurface', data.style?.showSurface !== false)}
                    ${this.createColorControl('Label Color', 'style.labelColor', data.style?.labelColor || '#ffffff')}
                    ${this.createNumberControl('Opacity', 'style.opacity', data.style?.opacity !== undefined ? data.style.opacity : 0.8, 0, 1, 0.05)}
                </div>
            `;
        } else if (data.type === 'color_picker') {
            controls += this.createColorControl('Label Color', 'style.labelColor', data.style?.labelColor || '#ffffff');
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Component Design</div>
                    ${this.createSelectControl('Label Position', 'style.labelPosition', data.style?.labelPosition || 'Right', ['Top', 'Bottom', 'Left', 'Right'])}
                    ${this.createSelectControl('Align Text', 'style.textAlign', data.style?.textAlign || 'Left', ['Left', 'Center', 'Right'])}
                    ${this.createColorControl('Container BG', 'style.background', data.style?.background || '#ffffff')}
                    ${this.createNumberControl('Corner Radius', 'style.borderRadius', data.style?.borderRadius !== undefined ? data.style.borderRadius : 4, 0, 10)}
                    ${this.createToggleControl('Show Surface', 'style.showSurface', data.style?.showSurface !== false)}
                    ${this.createColorControl('Surface Color', 'style.surfaceColor', data.style?.surfaceColor || '#1e1e1e')}
                    ${this.createNumberControl('Opacity', 'style.opacity', data.style?.opacity !== undefined ? data.style.opacity : 0.8, 0, 1, 0.05)}
                </div>
            `;
        } else if (data.type === 'text_input') {
            controls += this.createStringControl('Placeholder', 'placeholder', data.placeholder || 'Enter text...');
            controls += this.createStringControl('Default Value', 'value', data.value || '');
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Component Design</div>
                    ${this.createSelectControl('Label Position', 'style.labelPosition', data.style?.labelPosition || 'Top', ['Top', 'Bottom', 'Left', 'Right'])}
                    ${this.createSelectControl('Align Text', 'style.textAlign', data.style?.textAlign || 'Left', ['Left', 'Center', 'Right'])}
                    ${this.createColorControl('Background', 'style.background', data.style?.background || '#ffffff')}
                    ${this.createColorControl('Text Color', 'style.color', data.style?.color || '#333333')}
                    ${this.createNumberControl('Font Size', 'style.fontSize', data.style?.fontSize || 12, 8, 24)}
                    ${this.createNumberControl('Corner Radius', 'style.borderRadius', data.style?.borderRadius !== undefined ? data.style.borderRadius : 4, 0, 10)}
                    ${this.createToggleControl('Show Surface', 'style.showSurface', data.style?.showSurface !== false)}
                    ${this.createColorControl('Surface Color', 'style.surfaceColor', data.style?.surfaceColor || '#1e1e1e')}
                    ${this.createColorControl('Label Color', 'style.labelColor', data.style?.labelColor || '#ffffff')}
                    ${this.createNumberControl('Opacity', 'style.opacity', data.style?.opacity !== undefined ? data.style.opacity : 0.8, 0, 1, 0.05)}
                </div>
                `;
        } else if (data.type === 'progress_bar') {
            controls += this.createStringControl('Label', 'label', data.label || 'Progress');
            controls += this.createToggleControl('Show Value %', 'bar.showValue', data.bar?.showValue !== false);
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Bar Settings</div>
                    ${this.createNumberControl('Min Value', 'min', data.min || 0, -1000, 5000)}
                    ${this.createNumberControl('Max Value', 'max', data.max || 100, -1000, 5000)}
                    ${this.createNumberControl('Current Value', 'value', data.value || 0, -1000, 5000)}
                    ${this.createColorControl('Accent Color', 'style.accentColor', data.style?.accentColor || '#4caf50')}
                    ${this.createSelectControl('Fill Mode', 'bar.mode', data.bar?.mode || 'Horizontal', ['Horizontal', 'Vertical', 'Circular'])}
                    ${this.createToggleControl('Gradient Fill', 'bar.gradient', data.bar?.gradient !== false)}
                </div>
            `;
        } else if (data.type === 'toggle_switch') {
            controls += this.createStringControl('Label', 'label', data.label || 'Switch');
            controls += this.createToggleControl('State (On)', 'checked', data.checked || false);
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Switch Style</div>
                    ${this.createSelectControl('Theme', 'switch.style', data.switch?.style || 'iOS', ['iOS', 'Material', 'Neon'])}
                    ${this.createColorControl('On Color', 'style.accentColor', data.style?.accentColor || '#4cd964')}
                </div>
            `;
        } else if (data.type === 'trackpad') {
            controls += this.createStringControl('Label', 'label', data.label || 'Trackpad');
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Trackpad Sensitivity</div>
                    ${this.createNumberControl('Sensitivity', 'trackpad.sensitivity', data.trackpad?.sensitivity || 1.0, 0.1, 5.0, 0.1)}
                    ${this.createColorControl('Dot Color', 'style.accentColor', data.style?.accentColor || '#007acc')}
                </div>
            `;
        } else if (data.type === 'knob') {
            controls += this.createStringControl('Label', 'label', data.label || 'Knob');
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Knob Settings</div>
                    ${this.createNumberControl('Min Value', 'min', data.min || 0, -1000, 5000)}
                    ${this.createNumberControl('Max Value', 'max', data.max || 100, -1000, 5000)}
                    ${this.createNumberControl('Step (Snap)', 'knob.snap', data.knob?.snap || 0, 0, 100, 0.1)}
                    ${this.createNumberControl('Current Value', 'value', data.value || 0, -1000, 5000)}
                </div>
                <div class="inspector-section">
                    <div class="section-title">Rotation Limits</div>
                    ${this.createNumberControl('Start Angle', 'knob.startAngle', data.knob?.startAngle || -135, -360, 360)}
                    ${this.createNumberControl('End Angle', 'knob.endAngle', data.knob?.endAngle || 135, -360, 360)}
                    ${this.createColorControl('Indicator Color', 'style.accentColor', data.style?.accentColor || '#007acc')}
                </div>
            `;
        } else if (data.type === 'dropdown') {
            const optsVal = Array.isArray(data.options) ? data.options.join(', ') : (data.options || '');
            controls += this.createStringControl('Options (comma sep)', 'options', optsVal);
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Component Design</div>
                    ${this.createSelectControl('Label Position', 'style.labelPosition', data.style?.labelPosition || 'Top', ['Top', 'Bottom', 'Left', 'Right'])}
                    ${this.createSelectControl('Align Text', 'style.textAlign', data.style?.textAlign || 'Left', ['Left', 'Center', 'Right'])}
                    ${this.createColorControl('Background', 'style.background', data.style?.background || '#ffffff')}
                    ${this.createColorControl('Text Color', 'style.color', data.style?.color || '#333333')}
                    ${this.createNumberControl('Font Size', 'style.fontSize', data.style?.fontSize || 12, 8, 24)}
                    ${this.createNumberControl('Corner Radius', 'style.borderRadius', data.style?.borderRadius !== undefined ? data.style.borderRadius : 4, 0, 10)}
                    ${this.createToggleControl('Show Surface', 'style.showSurface', data.style?.showSurface !== false)}
                    ${this.createColorControl('Surface Color', 'style.surfaceColor', data.style?.surfaceColor || '#1e1e1e')}
                    ${this.createColorControl('Label Color', 'style.labelColor', data.style?.labelColor || '#ffffff')}
                    ${this.createNumberControl('Opacity', 'style.opacity', data.style?.opacity !== undefined ? data.style.opacity : 0.8, 0, 1, 0.05)}
                </div>
                </div>
                `;
        } else if (data.type === 'joystick') {
            // PRESETS Section
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Design Presets</div>
                    <div class="property-control">
                        <select id="joystick-preset-select" style="width: 100%; padding: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px; font-size: 11px; cursor: pointer;">
                            <option value="">-- Select Preset --</option>
                            ${Object.entries(this.JoystickPresets).map(([id, p]) => `
                                <option value="${id}">${p.label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `;

            controls += `
                <div class="inspector-section">
                    <div class="section-title">Joystick Style</div>
                    ${this.createColorControl('Base Color', 'style.background', data.style?.background || '#f0f0f0')}
                    ${this.createColorControl('Handle Color', 'style.accentColor', data.style?.accentColor || '#333333')}
                    ${this.createColorControl('Surface Color', 'style.surfaceColor', data.style?.surfaceColor || '#e0e0e0')}
                    ${this.createNumberControl('Opacity', 'style.opacity', data.style?.opacity !== undefined ? data.style.opacity : 0.8, 0, 1, 0.05)}
                    ${this.createToggleControl('Show Base', 'style.showSurface', data.style?.showSurface !== false)}
                </div>
                <div class="inspector-section">
                    <div class="section-title">Joystick Configuration</div>
                    ${this.createNumberControl('Base Radius', 'joystick.radius', data.joystick?.radius || 50, 20, 200)}
                    ${this.createNumberControl('Handle Radius', 'joystick.handleRadius', data.joystick?.handleRadius || 20, 10, 100)}
                    ${this.createToggleControl('Return to Center', 'joystick.returnToCenter', data.joystick?.returnToCenter !== false)}
                    ${this.createNumberControl('Sensitivity', 'joystick.sensitivity', data.joystick?.sensitivity || 1.0, 0.1, 10, 0.1)}
                </div>
            `;
        } else if (data.type === 'sprite') {
            controls += this.createStringControl('Label', 'label', data.label || 'Sprite');
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Sprite Settings</div>
                    ${this.createSelectControl('Animation', 'sprite.animation', data.sprite?.animation || 'default', ['default', 'walk', 'run', 'idle'])}
                    ${this.createToggleControl('Loop Animation', 'sprite.loop', data.sprite?.loop !== false)}
                    ${this.createNumberControl('Animation Speed', 'sprite.speed', data.sprite?.speed || 1.0, 0.1, 5.0, 0.1)}
                </div>
            `;
        } else if (data.type === 'graph') {
            controls += this.createStringControl('Label', 'label', data.label || 'Graph');
            controls += this.createSelectControl('Graph Type', 'subtype', data.subtype || 'line', [
                { val: 'line', label: 'Line Chart' },
                { val: 'gauge', label: 'Speedometer / Gauge' }
            ]);

            // --- Data & Scaling ---
            controls += `
                <div class="inspector-section">
                    <div class="section-title">Data & Scaling</div>
                    ${this.createToggleControl('Auto Scale', 'autoScale', data.autoScale !== false)}
                    ${!data.autoScale ? `
                        ${this.createNumberControl('Min Value', 'min', data.min || 0, -5000, 5000)}
                        ${this.createNumberControl('Max Value', 'max', data.max || 100, -5000, 5000)}
                    ` : ''}
                    ${data.subtype !== 'gauge' ? this.createNumberControl('Data Points', 'maxPoints', data.maxPoints || 100, 10, 500) : ''}
                </div>
            `;

            if (data.subtype === 'gauge') {
                // --- Gauge Configuration ---
                controls += `
                    <div class="inspector-section">
                        <div class="section-title">Gauge Style</div>
                        ${this.createColorControl('Needle Color', 'style.color', data.style?.color || '#007acc')}
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                            <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 5px;">Angles (In Radians - e.g. -3.14 to 0)</div>
                            ${this.createNumberControl('Start Angle', 'gauge.startAngle', data.gauge?.startAngle ?? -Math.PI, -2 * Math.PI, 2 * Math.PI, 0.1)}
                            ${this.createNumberControl('End Angle', 'gauge.endAngle', data.gauge?.endAngle ?? 0, -2 * Math.PI, 2 * Math.PI, 0.1)}
                        </div>
                    </div>
                `;
            } else {
                // --- Visual Appearance ---
                controls += `
                    <div class="inspector-section">
                        <div class="section-title">Line Style</div>
                        ${this.createColorControl('Line Color', 'style.color', data.style?.color || '#007acc')}
                        ${this.createNumberControl('Line Width', 'style.lineWidth', data.style?.lineWidth || 2, 0.5, 10, 0.5)}
                        ${this.createNumberControl('Smoothing', 'style.tension', data.style?.tension || 0.1, 0, 1, 0.1)}
                        
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                            ${this.createToggleControl('Fill Area', 'style.fillArea', data.style?.fillArea || false)}
                            ${data.style?.fillArea ?
                        this.createColorControl('Fill Color', 'style.fillColor', data.style?.fillColor || 'rgba(0,122,204,0.2)')
                        : ''}
                        </div>
                    </div>
                `;

                // --- Grid & Axes ---
                controls += `
                    <div class="inspector-section">
                        <div class="section-title">Grid & Axes</div>
                        ${this.createToggleControl('Show Grid', 'grid.show', data.grid?.show !== false)}
                        ${data.grid?.show !== false ? `
                            ${this.createColorControl('Grid Color', 'grid.color', data.grid?.color || 'rgba(0,0,0,0.1)')}
                            ${this.createNumberControl('Grid Steps', 'grid.steps', data.grid?.steps || 5, 2, 20)}
                        ` : ''}

                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">
                            ${this.createToggleControl('Show Axes', 'axes.show', data.axes?.show !== false)}
                            ${data.axes?.show !== false ? `
                                ${this.createColorControl('Axis Color', 'axes.color', data.axes?.color || '#666')}
                                ${this.createToggleControl('Show Labels', 'axes.labels', data.axes?.labels !== false)}
                                ${data.axes?.labels !== false ?
                            this.createNumberControl('Font Size', 'axes.fontSize', data.axes?.fontSize || 10, 6, 20)
                            : ''}
                            ` : ''}
                        </div>
                    </div>
                `;

                // --- Badge ---
                controls += `
                    <div class="inspector-section">
                        <div class="section-title">Value Badge</div>
                        ${this.createToggleControl('Show Badge', 'badge.show', data.badge?.show !== false)}
                        ${data.badge?.show !== false ?
                        this.createColorControl('Badge Color', 'badge.color', data.badge?.color || '#007acc')
                        : ''}
                    </div>
                `;
            }
        }

        controls += this.createUnifiedBindingSection(data);

        controls += '</div>';

        // Standardized Binding UI Helper
        const createBindingSection = (title, description, content) => `
            <div class="inspector-section">
                <div class="section-title">${title}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">${description}</div>
                ${content}
            </div>
            `;

        // Event Binding (Buttons)
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

            let objOptions = `<option value="">--Select Object--</option>`;
            const allObjects = Inspector.getAllObjects(editor);
            allObjects.forEach(obj => {
                if (!currentTargets.includes(obj.id)) {
                    objOptions += `<option value="${obj.id}">${obj.name || obj.label || obj.id} (${obj.type})</option>`;
                }
            });

            const currentAction = data.binding?.action || '';
            const actions = [
                { val: 'reset_pos', label: 'Reset Position' },
                { val: 'stop', label: 'Stop Movement' },
                { val: 'jump', label: 'Jump (Vel Y -10)' },
                { val: 'random_color', label: 'Random Color' },
                { val: 'toggle_physics', label: 'Toggle Physics' },
                { val: 'start_behavior', label: 'Start Behavior (ID)' },
                { val: 'stop_behavior', label: 'Stop Behavior (ID)' },
                { val: 'toggle_behavior', label: 'Toggle Behavior (ID)' },
                { val: 'set_property', label: 'Set Property' },
                { val: 'toggle_property', label: 'Toggle Property' },
                { val: 'add_value', label: 'Add Value (Delta)' },
                { val: 'set_variable', label: 'Set Global Variable' },
                { val: 'emit_action', label: 'Emit Action ID (Generic)' }
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

                <div class="property-control" data-action-id-container>
                    <div class="property-label">Action ID (Trigger)</div>
                    <input type="text" class="binding-action-id" data-control-id="${data.id}" value="${data.binding?.actionId || ''}" list="ovi-action-ids" placeholder="e.g. start_shake" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                </div>

                <div class="property-control" style="${['set_property', 'toggle_property', 'add_value'].includes(currentAction) ? '' : 'display: none;'}" data-binding-prop-container>
                    <div class="property-label">Property</div>
                    <select class="binding-property-select" data-control-id="${data.id}" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        <option value="">-- Select Property --</option>
                        ${this.generatePropertyOptions(currentTargets.length > 0 ? editor.runtime.getObject(currentTargets[0]) : { type: 'circle' })}
                    </select>
                </div>

                <div class="property-control" style="${['set_property', 'add_value', 'set_variable'].includes(currentAction) ? '' : 'display: none;'}" data-binding-value-container>
                    <div class="property-label">${currentAction === 'add_value' ? 'Delta (Add)' : 'Value'}</div>
                    <input type="text" class="binding-value-input" data-control-id="${data.id}" value="${data.binding?.value !== undefined ? data.binding.value : ''}" placeholder="e.g. 100 or #ff0000" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                </div>

                <div class="property-control" style="${currentAction === 'toggle_property' ? '' : 'display: none;'}" data-binding-toggle-container>
                    <div style="display: flex; gap: 5px;">
                        <div style="flex: 1;">
                            <div class="property-label">Value A</div>
                            <input type="text" class="binding-value-a" data-control-id="${data.id}" value="${data.binding?.valueA !== undefined ? data.binding.valueA : ''}" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        </div>
                        <div style="flex: 1;">
                            <div class="property-label">Value B</div>
                            <input type="text" class="binding-value-b" data-control-id="${data.id}" value="${data.binding?.valueB !== undefined ? data.binding.valueB : ''}" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        </div>
                    </div>
                </div>

                <div class="property-control" style="${currentAction === 'set_variable' ? '' : 'display: none;'}" data-binding-var-container>
                    <div class="property-label">Variable Name</div>
                    <input type="text" class="binding-variable-name" data-control-id="${data.id}" value="${data.binding?.variableName || ''}" placeholder="e.g. score" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                </div>
        `;
            controls += createBindingSection('Event Binding', 'Trigger action on click', content);
        }



        // Delete Button
        controls += `
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
                <button id="delete-ui-btn" style="padding: 8px 16px; background: var(--bg-secondary); border: 1px solid #c0392b; color: #c0392b; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; transition: all 0.2s;">
                    Delete Component
                </button>
                <style>
                    #delete-ui-btn:hover { background: #c0392b; color: white; }
                </style>
                </div>
            `;

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

        if (behaviorsList.length === 0 || !window.oviEditor) return '';

        const editor = window.oviEditor;
        let html = '';

        behaviorsList.forEach(behaviorId => {
            const behavior = editor.behaviorSystem.registry.get(behaviorId);
            if (!behavior || !behavior.parameters) return;

            html += `
            <div class="inspector-section">
                <div class="section-title">${behavior.name} Settings</div>
        `;

            // Activation Controls
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
                <div style="display: flex; gap: 5px; align-items: center;">
                    <input type="text"
                        class="behavior-param-text"
                        data-behavior="${behaviorId}"
                        data-param="activationId"
                        value="${actId}"
                        list="ovi-action-ids"
                        placeholder="e.g. start_type"
                        style="flex: 1; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                    <button class="ovi-link-btn" 
                        data-behavior="${behaviorId}" 
                        data-param="activationId"
                        data-target-id="${data.id}"
                        title="Visual Link: Click to connect to a trigger"
                        style="padding: 4px 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px; white-space: nowrap;">
                        🔗 Link
                    </button>
                </div>
            </div>

            <div class="property-control" style="${actMode === 'manual' ? '' : 'display: none;'}" data-param-container="generic_duration">
                <div class="property-label">Duration (sec)</div>
                <input type="number" 
                    step="0.1" 
                    class="behavior-param-text" 
                    data-behavior="${behaviorId}" 
                    data-param="duration" 
                    value="${editor.behaviorSystem.registry.getParameter(data, behaviorId, 'duration') || 1}"
                    style="width: 100%; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
            </div>

        `;

            // Render defined parameters
            Object.entries(behavior.parameters).forEach(([paramName, paramDef]) => {
                const currentValue = editor.behaviorSystem.registry.getParameter(data, behaviorId, paramName);
                let containerStyle = "";

                // Conditional Visibility Logic
                if (behaviorId === 'impulse') {
                    const dir = editor.behaviorSystem.registry.getParameter(data, behaviorId, 'direction') || 'custom';
                    if (paramName === 'strength' && dir === 'custom') containerStyle = "display: none;";
                    if ((paramName === 'forceX' || paramName === 'forceY') && dir !== 'custom') containerStyle = "display: none;";
                }
                if (paramName === 'loopDelay') {
                    const loopEnabled = editor.behaviorSystem.registry.getParameter(data, behaviorId, 'loop');
                    if (!loopEnabled) containerStyle = "display: none;";
                }

                if (paramDef.type === 'slider' || paramDef.type === 'number') {
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
                                max="${paramDef.max || 5000}"
                                step="${paramDef.step || 1}"
                                value="${currentValue}"
                                style="width: 100%;">
                        </div>
        `;
                } else if (paramDef.type === 'checkbox') {
                    html += `
            <div class="property-control" style="${containerStyle}">
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
            <div class="property-control" style="${containerStyle}">
                            <div class="property-label">${paramDef.label}</div>
                            <input type="text" 
                                class="behavior-param-text"
                                data-behavior="${behaviorId}"
                                data-param="${paramName}"
                                value="${currentValue || paramDef.default || ''}"
                                style="width: 100%; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        </div>
        `;
                } else if (paramDef.type === 'select') {
                    const options = paramDef.options.map(opt => {
                        const val = (typeof opt === 'object') ? (opt.val || opt.value) : opt;
                        const lbl = (typeof opt === 'object') ? opt.label : opt;
                        return `<option value="${val}" ${currentValue === val ? 'selected' : ''}>${lbl}</option>`;
                    }).join('');

                    html += `
            <div class="property-control" style="${containerStyle}">
                            <div class="property-label">${paramDef.label}</div>
                            <select class="behavior-param-select"
                                data-behavior="${behaviorId}"
                                data-param="${paramName}"
                                style="width: 100%; padding: 5px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                                ${options}
                            </select>
                        </div>
            `;
                } else if (paramDef.type === 'color') {
                    const colorValue = (typeof currentValue === 'string' && currentValue.startsWith('#')) ? currentValue : (paramDef.default || '#ff0000');
                    html += `
            <div class="property-control" style="${containerStyle}">
                            <div class="property-label">${paramDef.label}</div>
                            <div style="display: flex; gap: 5px;">
                                <input type="color" 
                                    class="behavior-param-color"
                                    data-behavior="${behaviorId}"
                                    data-param="${paramName}"
                                    value="${colorValue}"
                                    style="border: none; width: 30px; height: 30px; cursor: pointer; background: none;">
                                <input type="text"
                                    class="behavior-param-text"
                                    data-behavior="${behaviorId}"
                                    data-param="${paramName}"
                                    value="${currentValue || paramDef.default || '#ff0000'}"
                                    style="flex: 1; padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                            </div>
                        </div>
        `;
                }
            });

            html += `</div>`;
        });

        return html;
    }




    static _createBindButton(property) {
        const obj = window.oviEditor && window.oviEditor.selectedObject;
        const isBound = obj && obj.bindings && obj.bindings[property];
        const color = isBound ? '#3498db' : '#555';

        return `<button class="prop-bind-btn"
        data-property="${property}"
        style="background:none; border:none; cursor:pointer; color:${color}; font-size:12px; margin-left:auto; padding:0 4px;"
        title="${isBound ? 'Bound to ' + isBound : 'Bind to Variable'}">
                🔗
                </button>`;
    }

    static createStringControl(label, property, value) {
        const id = `prop-${property.replace(/\./g, '-')}`;
        return `
            <div class="property-control">
                <div class="property-label" style="display:flex; align-items:center;">
                    <span>${label}</span>
                    ${this._createBindButton(property)}
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
                <div class="property-label" style="display:flex; align-items:center;">
                    <span>${label}</span>
                    ${this._createBindButton(property)}
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
                           step="${step}"
                           value="${value}"
                           data-property="${property}">
                </div>
            </div>
        `;
    }

    static createColorControl(label, property, value) {
        const id = `prop-${property}`;

        // Helper: Convert RGB/RGBA to Hex (Native picker requirement)
        const rgbToHex = (str) => {
            if (!str || typeof str !== 'string') return '#000000';
            if (str.startsWith('#')) {
                let hex = str.substring(1);
                if (hex.length === 3) {
                    hex = hex.split('').map(char => char + char).join('');
                }
                return '#' + hex.substring(0, 6);
            }
            const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!match) return '#000000';
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        };

        const hexValue = rgbToHex(value);

        return `
            <div class="property-control">
                <div class="property-label">
                    <span>${label}</span>
                </div>
                <div class="color-picker-container">
                    <input type="color" 
                           id="${id}-picker" 
                           value="${hexValue}"
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

    static createOptionalColorControl(label, property, value) {
        // Helper: Convert RGB/RGBA to Hex
        const rgbToHex = (str) => {
            if (!str || typeof str !== 'string') return '#000000';
            if (str.startsWith('#')) {
                let hex = str.substring(1);
                if (hex.length === 3) {
                    hex = hex.split('').map(char => char + char).join('');
                }
                return '#' + hex.substring(0, 6);
            }
            const match = str.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (!match) return '#000000';
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        };

        // Check if value is specialized (Gradient or None) or standard Color
        let isNone = false;
        let isGradient = false;
        let displayColor = '#000000';
        let displayText = '#000000';

        if (value === 'none') {
            isNone = true;
            displayText = 'None';
        } else if (typeof value === 'object' || (typeof value === 'string' && value.includes('url('))) {
            isGradient = true;
            displayText = 'Gradient'; // Placeholder for complex object
        } else {
            // Standard Color (Hex or RGB)
            displayColor = rgbToHex(value);
            displayText = displayColor;
        }

        const id = `prop-${property.replace(/\./g, '-')}`;

        // If Gradient, we disable color picker interactions for now (until we have a Gradient Editor)
        // If None, we disable as well.
        const isDisabled = isNone || isGradient;
        const opacity = isDisabled ? 0.5 : 1;
        const events = isDisabled ? 'none' : 'auto';

        return `
            <div class="property-control">
                <div class="property-label">
                    <span>${label}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                       <input type="checkbox" 
                           class="optional-color-check"
                           id="${id}-check"
                           data-property="${property}"
                           ${!isNone ? 'checked' : ''}
                           style="margin: 0;">
                    </div>
                    
                    <div class="color-picker-container" style="flex: 1; opacity: ${opacity}; pointer-events: ${events};">
                        <input type="color" 
                               id="${id}-picker" 
                               value="${displayColor}"
                               data-property="${property}"
                               class="optional-color-input">
                        <input type="text" 
                               id="${id}-text" 
                               value="${displayText}"
                               data-property="${property}"
                               disabled
                               style="background: transparent; border: none; color: inherit; font-size: 11px; margin-left: 5px; width: 60px;">
                    </div>
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
                const val = (typeof opt === 'object') ? (opt.value !== undefined ? opt.value : (opt.val !== undefined ? opt.val : opt)) : opt;
                const txt = (typeof opt === 'object') ? (opt.label !== undefined ? opt.label : val) : opt;
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

    // Event Actions UI Helper (New)
    static createEventActionControl(data, eventName, label) {
        const config = (data.eventActions && data.eventActions[eventName]) || {};
        const editor = window.oviEditor;
        const allObjects = this.getAllObjects(editor);

        const actionOptions = [
            { val: '', label: '-- No Action --' },
            { val: 'reset_pos', label: 'Reset Position' },
            { val: 'stop', label: 'Stop Movement' },
            { val: 'jump', label: 'Jump' },
            { val: 'random_color', label: 'Random Color' },
            { val: 'toggle_physics', label: 'Toggle Physics' },
            { val: 'start_behavior', label: 'Start Behavior (ID)' },
            { val: 'stop_behavior', label: 'Stop Behavior (ID)' },
            { val: 'toggle_behavior', label: 'Toggle Behavior (ID)' },
            { val: 'emit_action', label: 'Emit Action ID' },
            { val: 'set_property', label: 'Set Property' },
            { val: 'add_value', label: 'Add Value' }
        ];

        return `
            <div class="event-action-block" style="margin-bottom: 12px; padding: 10px; background: rgba(0,0,0,0.15); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: var(--text-primary); display: flex; align-items: center; gap: 5px;">
                    <span style="color: #f1c40f;">⚡</span> ${label}
                </div>
                
                <div class="property-control">
                    <div class="property-label">Target Object</div>
                    <select class="event-target-select" data-event="${eventName}" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        <option value="">-- No Target --</option>
                        <option value="other" ${config.targetId === 'other' ? 'selected' : ''}>[The Object that Entered]</option>
                        ${allObjects.map(obj => `
                            <option value="${obj.id}" ${config.targetId === obj.id ? 'selected' : ''}>
                                ${obj.name || obj.id.substr(0, 8)} (${obj.type})
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="property-control" style="${config.targetId ? '' : 'display: none;'}">
                    <div class="property-label">Action</div>
                    <select class="event-action-select" data-event="${eventName}" style="width: 100%; padding: 5px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                        ${actionOptions.map(a => `<option value="${a.val}" ${config.action === a.val ? 'selected' : ''}>${a.label}</option>`).join('')}
                    </select>
                </div>

                ${['set_property', 'add_value'].includes(config.action) ? `
                    <div class="property-control">
                        <div class="property-label">Property</div>
                        <input type="text" class="event-prop-input" data-event="${eventName}" value="${config.property || ''}" placeholder="e.g. opacity or x" style="width: 100%; padding: 4px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                    </div>
                    <div class="property-control">
                        <div class="property-label">Value</div>
                        <input type="text" class="event-value-input" data-event="${eventName}" value="${config.value !== undefined ? config.value : ''}" placeholder="e.g. 0.5 or 100" style="width: 100%; padding: 4px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                    </div>
                ` : ''}

                ${['start_behavior', 'stop_behavior', 'toggle_behavior', 'emit_action'].includes(config.action) ? `
                    <div class="property-control">
                        <div class="property-label">Action/Behavior ID</div>
                        <input type="text" class="event-id-input" data-event="${eventName}" value="${config.actionId || ''}" placeholder="e.g. jump_anim" style="width: 100%; padding: 4px; background: var(--bg-input, #333); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 3px; font-size: 11px;">
                    </div>
                ` : ''}
            </div>
        `;
    }

    static getAllObjects(editor) {
        if (!editor || !editor.runtime) return [];
        return [
            ...editor.runtime.objects.filter(o => o.type !== 'trigger_zone'),
        ];
    }

    static generatePropertyOptions(targetObj, currentProp) {
        let props = [
            { val: 'x', label: 'X Position' },
            { val: 'y', label: 'Y Position' },
            { val: 'rotation', label: 'Rotation' },
            { val: 'opacity', label: 'Opacity' },
            { val: 'scale', label: 'Scale' }
        ];

        // Type-specific properties
        if (targetObj) {
            if (['rect', 'circle', 'sprite'].includes(targetObj.type)) {
                props.push({ val: 'width', label: 'Width' });
                props.push({ val: 'height', label: 'Height' });
                props.push({ val: 'radius', label: 'Radius' });
                props.push({ val: 'fill', label: 'Fill Color' });
                props.push({ val: 'stroke', label: 'Stroke Color' });
            }
            if (targetObj.type === 'text') {
                props.push({ val: 'text', label: 'Text Content' });
                props.push({ val: 'fontSize', label: 'Font Size' });
                props.push({ val: 'color', label: 'Text Color' });
            }
            if (targetObj.type === 'emitter') {
                props.push({ val: 'rate', label: 'Emission Rate' });
                props.push({ val: 'speed', label: 'Particle Speed' });
                props.push({ val: 'particleGravity', label: 'Particle Gravity' });
                props.push({ val: 'particleRotationSpeed', label: 'Particle Rotation' });
                props.push({ val: 'lifetime', label: 'Lifetime' });
                props.push({ val: 'angle', label: 'Angle' });
                props.push({ val: 'spread', label: 'Spread' });
                props.push({ val: 'boxWidth', label: 'Box Width' });
                props.push({ val: 'spawnRadius', label: 'Spawn Radius' });
            }
            if (targetObj.type === 'force_field') {
                props.push({ val: 'strength', label: 'Strength' });
                props.push({ val: 'direction', label: 'Direction' });
                props.push({ val: 'radius', label: 'Radius' });
            }
            if (targetObj.type === 'symbol') {
                props.push({ val: 'size', label: 'Size' });
            }

            // Physics Properties
            if (targetObj.physics && targetObj.physics.enabled) {
                props.push({ val: 'physics.mass', label: 'Mass' });
                props.push({ val: 'physics.bounciness', label: 'Bounciness' });
                props.push({ val: 'physics.friction', label: 'Friction' });
                props.push({ val: 'physics.gravityScale', label: 'Gravity Scale' });
                props.push({ val: 'physics.velocity.x', label: 'Velocity X' });
                props.push({ val: 'physics.velocity.y', label: 'Velocity Y' });
            }
        }

        // Dynamic Behavior Parameters
        const editor = window.oviEditor;
        if (targetObj && targetObj.behaviors && editor && editor.behaviorSystem) {
            const list = Array.from(targetObj.behaviors);
            list.forEach(bId => {
                const behavior = editor.behaviorSystem.registry.get(bId);
                if (behavior && behavior.parameters) {
                    Object.entries(behavior.parameters).forEach(([paramName, paramDef]) => {
                        // Only include numeric/slider/number parameters for value binding
                        if (['slider', 'number'].includes(paramDef.type)) {
                            props.push({
                                val: `_behaviorParams.${bId}.${paramName}`,
                                label: `${behavior.name}: ${paramDef.label}`
                            });
                        }
                    });
                }
            });
        }

        let propOptions = `<option value="">--Select Property--</option>`;
        props.forEach(p => {
            propOptions += `<option value="${p.val}" ${currentProp === p.val ? 'selected' : ''}>${p.label}</option>`;
        });
        return propOptions;
    }

    static attachEventListeners(engine) {
        const editor = window.oviEditor;
        if (!editor || !editor.selectedObject) return;

        // --- GLOBAL LINK RESOLUTION (New) ---
        // Capture clicks on UI controls to resolve "Link" mode
        if (!editor._oviLinkListenerAttached) {
            document.body.addEventListener('click', (e) => {
                if (!editor || !editor._oviLinkMode) return;

                // Check if we clicked a UI element that maps to a control
                // Look for data-id or closest wrapper
                let targetControl = null;
                const wrapper = e.target.closest('.ui-widget-wrapper');

                if (wrapper) {
                    // Try to find the control ID from input/button inside
                    const input = wrapper.querySelector('[data-id]');
                    if (input) {
                        const id = input.dataset.id;
                        targetControl = editor.runtime.objects.find(o => o.id === id);
                    } else {
                        // Fallback: try to find button inside
                        // Buttons usually don't have data-id on the button element itself in current render code,
                        // but they are bound to a control object.
                        // Let's iterate controls and find whose wrapper this is? Expensive.
                        // Better: Update RuntimeUI to add data-id to wrapper. 
                        // For now, let's assume inputs have it. 
                        // Buttons: see line 515 (input has data-id).
                        // Button rendering (line 525) doesn't set data-id on button.
                        // But wait! Wrapper structure is wrapper > input/button.

                        // Temporary: Iterate runtime controls and check if element is theirs?
                        // Actually, look at line 515: input has data-id.
                        // Buttons? Line 525: const btn = wrapper.querySelector('button');
                        // NO data-id on button. 
                        // This is tricky.

                        // Hack: Check if any control matches?
                    }
                }

                // If we can't find it via DOME, we can't link it easily.
                // Re-read RuntimeUI: line 515 applies to "input" (Text Input).
                // Buttons? Wrapper content (lines 512-517) is generic for label/input.
                // Button implementation (lines 525) uses that wrapper? No.

                // Let's assume the user clicks the "Action ID" input IN THE INSPECTOR?
                // No, user clicks "canvas e oi button e click korle".
                // The canvas contains the simulated UI.

                // Let's try to find ANY element with data-id.
                const elWithId = e.target.closest('[data-id]');
                if (elWithId) {
                    const id = elWithId.dataset.id;
                    targetControl = editor.runtime.objects.find(o => o.id === id);
                }

                if (targetControl) {
                    // RESOLVE LINK
                    const params = editor._oviLinkMode;
                    const value = targetControl.binding?.actionId || targetControl.id;
                    editor.behaviorSystem.registry.setParameter(editor.selectedObject, params.behaviorId, params.paramName, value);

                    // Clear mode
                    delete editor._oviLinkMode;
                    if (params.button) {
                        params.button.innerHTML = '🔗 Link';
                        params.button.style.background = '#27ae60';
                    }
                    if (engine.canvas) engine.canvas.style.cursor = 'default';

                    Inspector.update(engine, editor.selectedObject);

                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);
            editor._oviLinkListenerAttached = true;
        }

        // Number controls (Generic fallback, exclude inspector specialized ones)
        document.querySelectorAll('input[type="range"]:not(.inspector-slider), input[type="number"]:not(.inspector-number)').forEach(input => {
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

                console.log(`🔄 Toggle clicked: ${property} = ${newValue} `);

                // Update property
                this.updateProperty(editor, property, newValue);

                // Refresh inspector to show/hide dependent controls and update visual state
                Inspector.update(engine, editor.selectedObject);
            });
        });

        // --- Trigger Zone Event Actions Listeners ---
        const updateEventConfig = (eventName, key, value, reRender = true) => {
            const obj = editor.selectedObject;
            if (!obj.eventActions) obj.eventActions = {};
            if (!obj.eventActions[eventName]) obj.eventActions[eventName] = {};
            obj.eventActions[eventName][key] = value;

            // Re-render inspector if requested (for dropdowns that change UI structure)
            if (reRender) {
                Inspector.update(engine, obj);
            }
        };

        document.querySelectorAll('.event-target-select').forEach(el => {
            el.addEventListener('change', (e) => updateEventConfig(e.target.dataset.event, 'targetId', e.target.value));
        });
        document.querySelectorAll('.event-action-select').forEach(el => {
            el.addEventListener('change', (e) => updateEventConfig(e.target.dataset.event, 'action', e.target.value));
        });
        document.querySelectorAll('.event-prop-input').forEach(el => {
            el.addEventListener('input', (e) => updateEventConfig(e.target.dataset.event, 'property', e.target.value, false));
        });
        document.querySelectorAll('.event-value-input').forEach(el => {
            el.addEventListener('input', (e) => updateEventConfig(e.target.dataset.event, 'value', e.target.value, false));
        });
        document.querySelectorAll('.event-id-input').forEach(el => {
            el.addEventListener('input', (e) => updateEventConfig(e.target.dataset.event, 'actionId', e.target.value, false));
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
            if (prop.startsWith('behaviorParams.') || prop.startsWith('_behaviorParams.')) {
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


        // Behavior parameter sliders (Fixed: Was missing specific handler)
        document.querySelectorAll('.behavior-param-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const behaviorId = e.target.dataset.behavior;
                const paramName = e.target.dataset.param;
                const value = parseFloat(e.target.value);

                // 1. Update Registry
                editor.behaviorSystem.registry.setParameter(editor.selectedObject, behaviorId, paramName, value);

                // 2. Update Visual Display (Sibling span)
                const container = e.target.closest('.property-control');
                if (container) {
                    const valueDisplay = container.querySelector('.property-value');
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

                if (paramName === 'loop') {
                    const section = e.target.closest('.behavior-section') || e.target.closest('.inspector-section');
                    if (section) {
                        const loopDelayContainer = section.querySelector('[data-param-container="loopDelay"]');
                        if (loopDelayContainer) {
                            loopDelayContainer.style.display = value ? 'block' : 'none';
                        }
                    }
                }
            });
        });

        // --- Optional Color Checkboxes ---
        document.querySelectorAll('.optional-color-check').forEach(check => {
            check.addEventListener('change', (e) => {
                const prop = e.target.dataset.property;
                const isChecked = e.target.checked;
                const container = e.target.closest('.property-control');
                const pickerContainer = container.querySelector('.color-picker-container');
                const picker = container.querySelector('input[type="color"]');
                const text = container.querySelector('input[type="text"]');

                if (isChecked) {
                    // Enabled: Set to color picker value
                    const col = picker.value;
                    this.updateProperty(editor, prop, col);
                    pickerContainer.style.opacity = '1';
                    pickerContainer.style.pointerEvents = 'auto';
                    text.value = col;
                } else {
                    // Disabled: Set to 'none'
                    this.updateProperty(editor, prop, 'none');
                    pickerContainer.style.opacity = '0.5';
                    pickerContainer.style.pointerEvents = 'none';
                    text.value = 'None';
                }
            });
        });

        // --- Optional Color Inputs ---
        document.querySelectorAll('.optional-color-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const prop = e.target.dataset.property;
                const val = e.target.value;

                // Update text sibling
                const container = e.target.closest('.color-picker-container');
                const text = container.querySelector('input[type="text"]');
                if (text) text.value = val;

                this.updateProperty(editor, prop, val);
            });
        });

        // --- Property Binding Buttons ---
        const bindBtns = document.querySelectorAll('.prop-bind-btn');
        bindBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent accordion collapse etc
                const property = btn.dataset.property;
                const editor = window.oviEditor;
                if (!editor || !editor.selectedObject) return;

                // Find available logic sources (Variables, Timers, and Premium UI Controls)
                const logicObjects = [
                    ...(editor.runtime.objects.filter(o => o.type === 'variable' || o.type === 'timer')),
                    ...(editor.simulationData.controls || [])
                ];

                if (logicObjects.length === 0) {
                    alert("No Logic Sources found! Create a Variable, Timer, or UI Control first.");
                    return;
                }

                // --- NEW VISUAL BINDER MODAL ---
                // Remove existing binder if any
                const existing = document.getElementById('ovi-binder-modal');
                if (existing) existing.remove();

                const modal = document.createElement('div');
                modal.id = 'ovi-binder-modal';
                Object.assign(modal.style, {
                    position: 'fixed',
                    top: '0', left: '0', bottom: '0', right: '0',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: '9999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Arial, sans-serif'
                });

                const content = document.createElement('div');
                Object.assign(content.style, {
                    background: '#2d3436',
                    width: '320px',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    color: '#ecf0f1'
                });

                content.innerHTML = `
            <h3 style="margin:0 0 12px 0; font-size:16px;">Bind '${property}'</h3>
                    <p style="font-size:12px; color:#bdc3c7; margin-bottom:12px;">Select a Logic Node to control this property:</p>
                    <div id="binder-list" style="max-height:300px; overflow-y:auto; margin-bottom:12px;"></div>
                    <div style="display:flex; justify-content:space-between; padding-top:12px; border-top:1px solid #636e72;">
                        <button id="binder-unbind" style="padding:6px 12px; background:#e74c3c; border:none; border-radius:4px; color:white; cursor:pointer;">Unbind</button>
                        <button id="binder-cancel" style="padding:6px 12px; background:transparent; border:1px solid #7f8c8d; border-radius:4px; color:#bdc3c7; cursor:pointer;">Cancel</button>
                    </div>
        `;

                modal.appendChild(content);
                document.body.appendChild(modal);

                // Populate List
                const list = content.querySelector('#binder-list');
                const currentBind = editor.selectedObject.bindings ? editor.selectedObject.bindings[property] : null;

                logicObjects.forEach(v => {
                    const item = document.createElement('div');
                    const isActive = currentBind === v.id;
                    Object.assign(item.style, {
                        padding: '10px',
                        marginBottom: '6px',
                        background: isActive ? '#2980b9' : '#34495e',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: isActive ? '1px solid #3498db' : '1px solid transparent',
                        transition: 'background 0.2s'
                    });

                    let icon = '🧠';
                    if (v.type === 'timer') icon = '⏱️';
                    else if (v.type === 'knob') icon = '🔘';
                    else if (v.type === 'trackpad') icon = '🖱️';
                    else if (v.type === 'toggle_switch') icon = '↔️';
                    else if (v.type === 'progress_bar') icon = '📊';

                    const displayName = v.varName ? `<span style="color:#2ecc71;">[Global]</span> ${v.varName}` : (v.label || v.name || 'Unnamed Logic');

                    item.innerHTML = `
            <div style="flex: 1; overflow: hidden;">
                            <div style="font-weight:bold; font-size:13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${icon} ${displayName}</div>
                            <div style="font-size:10px; color:#bdc3c7;">ID: ${v.id.substr(0, 8)}...</div>
                            ${v.type === 'timer' ? `<div style="font-size:9px; color:#f39c12;">Timer (${v.mode})</div>` : ''}
                        </div>
            ${isActive ? '<span style="font-size:16px;">✅</span>' : ''}
        `;

                    item.onmouseover = () => { if (!isActive) item.style.background = '#405060'; };
                    item.onmouseout = () => { if (!isActive) item.style.background = '#34495e'; };

                    item.onclick = () => {
                        // Apply Binding
                        if (!editor.selectedObject.bindings) editor.selectedObject.bindings = {};
                        editor.selectedObject.bindings[property] = v.id;
                        Inspector.update(editor.engine, editor.selectedObject);
                        modal.remove();
                    };

                    list.appendChild(item);
                });

                // Footer Actions
                content.querySelector('#binder-unbind').onclick = () => {
                    if (editor.selectedObject.bindings) {
                        delete editor.selectedObject.bindings[property];
                        Inspector.update(editor.engine, editor.selectedObject);
                    }
                    modal.remove();
                };

                content.querySelector('#binder-cancel').onclick = () => {
                    modal.remove();
                };

                // Close on background click
                modal.onclick = (e) => {
                    if (e.target === modal) modal.remove();
                };
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

        // Behavior parameter select dropdowns
        document.querySelectorAll('.behavior-param-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const behaviorId = e.target.dataset.behavior;
                const paramName = e.target.dataset.param;
                const value = e.target.value;
                editor.behaviorSystem.registry.setParameter(editor.selectedObject, behaviorId, paramName, value);

                // Refresh Inspector to handle conditional parameter visibility
                setTimeout(() => Inspector.update(engine, editor.selectedObject), 10);
            });
        });

        // Combined Generic Select Listener (Consolidated)
        document.querySelectorAll('select[data-property]:not(.behavior-param-select)').forEach(select => {
            select.addEventListener('change', (e) => {
                const property = e.target.dataset.property;
                const value = e.target.value;

                // SPECIAL: Parenting Logic
                if (property === 'parent' && editor.selectedObject) {
                    const obj = editor.selectedObject;
                    const oldWorld = editor.runtime.getWorldTransform(obj);

                    // Update property
                    this.updateProperty(editor, property, value);

                    // Recalculate to maintain world position
                    const newWorldParent = value ? editor.runtime.getWorldTransform(editor.runtime.getObject(value)) : { x: 0, y: 0, rotation: 0, scale: 1 };

                    const rad = -newWorldParent.rotation * Math.PI / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);

                    const dx = (oldWorld.x - newWorldParent.x);
                    const dy = (oldWorld.y - newWorldParent.y);

                    // Apply inverse parent scale/rotation
                    obj.x = (dx * cos - dy * sin) / newWorldParent.scale;
                    obj.y = (dx * sin + dy * cos) / newWorldParent.scale;
                    obj.rotation = oldWorld.rotation - newWorldParent.rotation;
                    obj.scale = oldWorld.scale / newWorldParent.scale;

                    Inspector.update(engine, obj);
                } else {
                    // Standard Property Update
                    this.updateProperty(editor, property, value);
                    // Refresh just in case (e.g. style change might affect other UI)
                    setTimeout(() => Inspector.update(engine, editor.selectedObject), 10);
                }
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
                // Refresh Inspector to handle dynamic labels/visibility
                setTimeout(() => Inspector.update(engine, editor.selectedObject), 10);
            });
        });

        // Behavior parameter color inputs (New)
        document.querySelectorAll('.behavior-param-color').forEach(input => {
            input.addEventListener('input', (e) => {
                const behaviorId = e.target.dataset.behavior;
                const paramName = e.target.dataset.param;
                const value = e.target.value;
                editor.behaviorSystem.registry.setParameter(editor.selectedObject, behaviorId, paramName, value);

                // Sync with text sibling if exists
                const textInput = e.target.parentElement.querySelector('input[type="text"]');
                if (textInput) textInput.value = value;
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
                        const durationContainer = section.querySelector('[data-param-container="generic_duration"]');
                        if (durationContainer) {
                            durationContainer.style.display = value === 'manual' ? 'block' : 'none';
                        }
                    }
                }
            });
        });

        // --- Data Binding Listeners (New) ---
        // --- Unified Data Binding Listeners ---

        // 1. Push Workflow: Target Object Changed
        const pushTargetSelect = document.getElementById('bind-push-target');
        if (pushTargetSelect) {
            pushTargetSelect.addEventListener('change', (e) => {
                const targetId = e.target.value;
                const propSelect = document.getElementById('bind-push-prop');
                const btn = document.getElementById('bind-push-btn');

                if (targetId) {
                    const targetObj = editor.runtime.getObject(targetId);
                    const propOptions = '<option value="">-- Select Property --</option>' + this.generatePropertyOptions(targetObj);

                    propSelect.innerHTML = propOptions;
                    propSelect.disabled = false;

                    const propSelectY = document.getElementById('bind-push-prop-y');
                    if (propSelectY) {
                        propSelectY.innerHTML = propOptions;
                        propSelectY.disabled = false;
                    }
                } else {
                    propSelect.innerHTML = '<option value="">-- Select Property --</option>';
                    propSelect.disabled = true;

                    const propSelectY = document.getElementById('bind-push-prop-y');
                    if (propSelectY) {
                        propSelectY.innerHTML = '<option value="">-- Select Property --</option>';
                        propSelectY.disabled = true;
                    }

                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                }
            });
        }

        // 2. Push Workflow: Property Changed (Enable Button)
        const pushPropSelect = document.getElementById('bind-push-prop');
        if (pushPropSelect) {
            pushPropSelect.addEventListener('change', (e) => {
                const btn = document.getElementById('bind-push-btn');
                if (e.target.value) {
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                } else {
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                }
            });
        }

        // 3. Push Workflow: Bind Button Click
        const pushBtn = document.getElementById('bind-push-btn');
        if (pushBtn) {
            pushBtn.addEventListener('click', () => {
                const targetId = document.getElementById('bind-push-target').value;
                const prop = document.getElementById('bind-push-prop').value;
                const propY = document.getElementById('bind-push-prop-y')?.value;

                if (targetId && prop && editor.selectedObject) {
                    const control = editor.selectedObject;

                    // NEW: For Joystick/Trackpad, save binding on the CONTROL itself for multi-axis support
                    if (control.type === 'joystick' || control.type === 'trackpad') {
                        if (!control.binding) control.binding = {};
                        control.binding.targetId = targetId;
                        control.binding.property = prop;
                        if (propY) control.binding.propertyY = propY;
                    } else {
                        // Standard PULL binding on target
                        const targetObj = editor.runtime.getObject(targetId);
                        if (!targetObj.bindings) targetObj.bindings = {};
                        targetObj.bindings[prop] = control.id;
                    }

                    Inspector.update(engine, editor.selectedObject);
                }
            });
        }

        // 4. Remove Binding Button
        document.querySelectorAll('.remove-binding-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.dataset.targetId;
                const prop = e.target.dataset.prop; // Property name on the target

                if (prop === 'self') {
                    const control = editor.runtime.getObject(targetId);
                    if (control && control.binding) delete control.binding;
                    Inspector.update(engine, editor.selectedObject);
                    return;
                }

                const targetObj = editor.runtime.getObject(targetId);
                if (targetObj && targetObj.bindings) {
                    delete targetObj.bindings[prop];
                    Inspector.update(engine, editor.selectedObject);
                }
            });
        });

        // 5. Pull Workflow (Fallback Manual Add)
        const pullBtn = document.getElementById('bind-pull-btn');
        if (pullBtn) {
            pullBtn.addEventListener('click', () => {
                const sourceId = document.getElementById('bind-pull-source').value;
                const prop = document.getElementById('bind-pull-prop').value;

                if (sourceId && prop && editor.selectedObject) {
                    if (!editor.selectedObject.bindings) editor.selectedObject.bindings = {};
                    editor.selectedObject.bindings[prop] = sourceId;
                    Inspector.update(engine, editor.selectedObject);
                }
            });
        }




        // Slider Presets (Dropdown)
        const presetSelect = document.getElementById('slider-preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                const presetId = e.target.value;
                if (presetId) {
                    this.applySliderPreset(engine, editor.selectedObject, presetId);
                }
            });
        }

        // Button Presets (Dropdown)
        const buttonPresetSelect = document.getElementById('button-preset-select');
        if (buttonPresetSelect) {
            buttonPresetSelect.addEventListener('change', (e) => {
                const presetId = e.target.value;
                if (presetId) {
                    this.applyButtonPreset(engine, editor.selectedObject, presetId);
                }
            });
        }

        // Joystick Presets (Dropdown)
        const joystickPresetSelect = document.getElementById('joystick-preset-select');
        if (joystickPresetSelect) {
            joystickPresetSelect.addEventListener('change', (e) => {
                const presetId = e.target.value;
                if (presetId) {
                    this.applyJoystickPreset(engine, editor.selectedObject, presetId);
                }
            });
        }


        // Generic Select Listener REMOVED (Consolidated above)

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
        // --- Button Binding Extra Fields ---

        // Action Select: Show/Hide containers
        document.querySelectorAll('.binding-action-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const controlId = e.target.dataset.controlId;
                const value = e.target.value;

                // Find the control and update its binding property
                const control = editor.runtime.controls.find(c => c.id === controlId);
                if (control) {
                    Inspector.updateProperty(editor, 'binding.action', value);
                    // Trigger refresh to show/hide dynamic fields
                    Inspector.update(engine, editor.selectedObject);
                }
            });
        });

        // Property Select
        document.querySelectorAll('.binding-property-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const controlId = e.target.dataset.controlId;
                const value = e.target.value;
                const control = editor.runtime.controls.find(c => c.id === controlId);
                if (control) {
                    Inspector.updateProperty(editor, 'binding.property', value);
                }
            });
        });

        // Generic Value Input
        document.querySelectorAll('.binding-value-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const controlId = e.target.dataset.controlId;
                const value = e.target.value;
                const control = editor.runtime.controls.find(c => c.id === controlId);
                if (control) {
                    Inspector.updateProperty(editor, 'binding.value', value);
                }
            });
        });

        // Toggle Value A
        document.querySelectorAll('.binding-value-a').forEach(input => {
            input.addEventListener('input', (e) => {
                const controlId = e.target.dataset.controlId;
                const control = editor.runtime.controls.find(c => c.id === controlId);
                if (control) {
                    Inspector.updateProperty(editor, 'binding.valueA', e.target.value);
                }
            });
        });

        // Toggle Value B
        document.querySelectorAll('.binding-value-b').forEach(input => {
            input.addEventListener('input', (e) => {
                const controlId = e.target.dataset.controlId;
                const control = editor.runtime.controls.find(c => c.id === controlId);
                if (control) {
                    Inspector.updateProperty(editor, 'binding.valueB', e.target.value);
                }
            });
        });

        // Variable Name
        document.querySelectorAll('.binding-variable-name').forEach(input => {
            input.addEventListener('input', (e) => {
                const controlId = e.target.dataset.controlId;
                const control = editor.runtime.controls.find(c => c.id === controlId);
                if (control) {
                    Inspector.updateProperty(editor, 'binding.variableName', e.target.value);
                }
            });
        });

        // Action ID
        document.querySelectorAll('.binding-action-id').forEach(input => {
            input.addEventListener('input', (e) => {
                const controlId = e.target.dataset.controlId;
                const control = editor.runtime.controls.find(c => c.id === controlId);
                if (control) {
                    Inspector.updateProperty(editor, 'binding.actionId', e.target.value);
                }
            });
        });

        // Add Target
        document.querySelectorAll('.add-target-btn').forEach(btn => {
            btn.onclick = () => {
                const controlId = btn.dataset.controlId;
                const select = document.getElementById(`add-target-select-${controlId}`);
                const targetId = select ? select.value : null;

                if (targetId && editor.selectedObject) {
                    const targets = [...(editor.selectedObject.binding?.targets || (editor.selectedObject.binding?.targetId ? [editor.selectedObject.binding.targetId] : []))];
                    if (!targets.includes(targetId)) {
                        targets.push(targetId);
                        Inspector.updateProperty(editor, 'binding.targets', targets);
                        Inspector.update(engine, editor.selectedObject);
                    }
                }
            };
        });

        // Remove Target
        document.querySelectorAll('.remove-target-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                if (editor.selectedObject) {
                    const targets = [...(editor.selectedObject.binding?.targets || (editor.selectedObject.binding?.targetId ? [editor.selectedObject.binding.targetId] : []))];
                    targets.splice(index, 1);
                    Inspector.updateProperty(editor, 'binding.targets', targets);
                    Inspector.update(engine, editor.selectedObject);
                }
            };
        });

        // OviLink: Visual Connection Mode
        document.querySelectorAll('.ovi-link-btn').forEach(btn => {
            btn.onclick = () => {
                const targetId = btn.dataset.targetId;
                const behaviorId = btn.dataset.behavior;
                const paramName = btn.dataset.param;

                // Toggle: Cancel if already in link mode
                if (editor._oviLinkMode) {
                    delete editor._oviLinkMode;
                    btn.innerHTML = '🔗 Link';
                    btn.style.background = '#27ae60';
                    if (engine.canvas) engine.canvas.style.cursor = 'default';
                    console.log('🔗 OviLink Mode: Cancelled');
                } else {
                    editor._oviLinkMode = { targetId, behaviorId, paramName, button: btn };
                    btn.innerHTML = '⏸️ Cancel';
                    btn.style.background = '#e74c3c';
                    if (engine.canvas) engine.canvas.style.cursor = 'crosshair';
                    console.log('🔗 OviLink Mode: Click any UI control to link');
                }
            };
        });

        // Joint: Pick Target Mode
        document.querySelectorAll('.pick-target-btn').forEach(btn => {
            btn.onclick = () => {
                const targetProp = btn.dataset.target; // 'targetA' or 'targetB'
                if (editor._pickTargetMode && editor._pickTargetMode.prop === targetProp) {
                    delete editor._pickTargetMode;
                    btn.classList.remove('active');
                } else {
                    editor._pickTargetMode = { prop: targetProp, joint: editor.selectedObject, button: btn };
                    btn.classList.add('active');
                    if (window.showOviToast) window.showOviToast(`Click an object to set as ${targetProp}...`);
                }
            };
        });

        // Joint: Reset Anchors
        document.querySelectorAll('.reset-anchors-btn').forEach(btn => {
            btn.onclick = () => {
                if (editor.selectedObject && editor.selectedObject.type === 'joint') {
                    Inspector.updateProperty(editor, 'anchorA', { x: 0, y: 0 });
                    Inspector.updateProperty(editor, 'anchorB', { x: 0, y: 0 });
                    Inspector.update(engine, editor.selectedObject);
                }
            };
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

        // Sync with OviHub if name changed
        if (property === 'name') {
            SceneRegistry.register({
                id: obj.id,
                name: obj.name,
                type: obj.type,
                originPlugin: 'ovistate'
            });
        }

        // Refresh UI if needed
        if (obj.isUI && window.oviEditor && window.oviEditor.renderUIComponent) {
            const zone = window.oviEditor.overlayZone || document.querySelector('.overlay-zone');
            if (zone) window.oviEditor.renderUIComponent(obj, zone);
        }
    }

    static getObjectIcon(type) {
        const icons = {
            'circle': '',
            'rect': '',
            'text': '',
            'symbol': '',
            'path': '',
            'trigger_zone': '🎯'
        };
        return icons[type] || '';
    }

    static getObjectLabel(type) {
        const labels = {
            'circle': 'Circle',
            'rect': 'Rectangle',
            'text': 'Text',
            'symbol': 'Symbol',
            'path': 'Path',
            'slider': 'Slider',
            'button': 'Button',
            'checkbox': 'Checkbox',
            'text_input': 'Text Input',
            'dropdown': 'Dropdown',
            'graph': 'Graph',
            'emitter': 'Particle Emitter',
            'sprite': 'Animated Sprite',
            'joint': 'Physics Joint',
            'trigger_zone': 'Trigger Zone',
            'variable': 'Global Variable'
        };
        return labels[type] || 'Object';
    }

    static getBehaviorLabel(behaviorId) {
        const labels = {
            'orbit_around': 'Orbit',
            'bounce': 'Bounce',
            'fade': 'Fade',
            'pulse': 'Pulse',
            'shake': 'Shake'
        };
        return labels[behaviorId] || behaviorId;
    }

    static getAllProjectActionIDs() {
        const editor = window.oviEditor;
        if (!editor) return [];

        const actionIds = new Set();

        // From UI Controls (Simulation Data is where they live in Editor)
        const controls = (editor.simulationData && editor.simulationData.controls) || (editor.runtime && editor.runtime.controls) || [];
        controls.forEach(c => {
            if (c.binding && c.binding.actionId) {
                actionIds.add(c.binding.actionId);
            }
        });

        // From Behaviors
        const objects = editor.runtime.objects || [];
        objects.forEach(obj => {
            if (obj.behaviors) {
                Array.from(obj.behaviors).forEach(bId => {
                    // Specific check for 'activationId' param which is where many IDs live now
                    const actId = editor.behaviorSystem.registry.getParameter(obj, bId, 'activationId');
                    if (actId) actionIds.add(actId);

                    // Legacy behavior-specific checks if any
                    const bDef = editor.behaviorSystem.registry.get(bId);
                    if (bDef && bDef.parameters) {
                        Object.keys(bDef.parameters).forEach(pName => {
                            if (pName.toLowerCase().includes('actionid')) {
                                const val = editor.behaviorSystem.registry.getParameter(obj, bId, pName);
                                if (val) actionIds.add(val);
                            }
                        });
                    }
                });
            }
        });

        return Array.from(actionIds).sort();
    }

    static getInspectorStyles() {
        return `
            <style>
                /* Strict Reset for Inspector Elements */
                .inspector-section input,
                .inspector-section select,
                .inspector-section button,
                .inspector-section textarea {
                    font-family: var(--font-family, sans-serif);
                    font-size: 11px !important;
                    line-height: normal;
                }

                .inspector-section {
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-color);
                    max-width: 100%;
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
                    width: 100%;
                }
                .property-label {
                    font-size: 11px;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                    display: flex;
                    justify-content: space-between;
                }
                .slider-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .slider-container input[type="range"] {
                    flex: 1;
                    height: 4px;
                    border-radius: 2px;
                    background: var(--bg-input, #333);
                    outline: none;
                    -webkit-appearance: none;
                }
                .slider-container input[type="number"] {
                    width: 50px;
                    flex-shrink: 0;
                    padding: 4px 6px;
                    background: var(--bg-input, #333);
                    border: 1px solid var(--border-color);
                    border-radius: 3px;
                    color: var(--text-primary);
                    font-size: 11px;
                    text-align: center;
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

                .toggle-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .toggle-switch {
                    position: relative;
                    width: 40px;
                    height: 20px;
                    background: var(--bg-input, #444);
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
                .toggle-switch.active::after {
                    left: 22px;
                }

                /* High Contrast for Dropdowns */
                select {
                    background-color: var(--bg-input, #21262d) !important;
                    color: var(--text-primary) !important;
                    border: 1px solid var(--border-color) !important;
                    padding: 4px 8px !important;
                    border-radius: 4px !important;
                }
                select option {
                    background-color: var(--bg-input, #21262d) !important;
                    color: #ffffff !important;
                    padding: 8px !important;
                }
                select option:checked {
                    background-color: var(--bg-active, #1f6feb) !important;
                    color: #ffffff !important;
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

    static generateParentOptions(editor, currentObj) {
        if (!editor || !editor.runtime || !editor.runtime.objects) return '<option value="">(None)</option>';

        let options = '<option value="">(None)</option>';
        editor.runtime.objects.forEach(obj => {
            if (obj.id !== currentObj.id) {
                const icon = this.getObjectIcon(obj.type);
                const label = `${icon} ${obj.name || obj.id.substring(0, 8)}`;
                options += `<option value="${obj.id}" ${currentObj.parent === obj.id ? 'selected' : ''}>${label}</option>`;
            }
        });
        return options;
    }

    static generateBehaviorOptions(editor) {
        if (!editor || !editor.behaviorSystem) return '<option disabled>No Registry</option>';

        let options = '';
        const registry = editor.behaviorSystem.registry;
        const behaviors = (registry && registry.behaviors) || editor.behaviorSystem.behaviors;

        if (behaviors) {
            behaviors.forEach((b, id) => {
                options += `<option value="${id}">${b.name}</option>`;
            });
        }
        return options;
    }

    static createUnifiedBindingSection(data) {
        const editor = window.oviEditor;
        if (!editor || !editor.runtime) return '';
        const objects = editor.runtime.objects;
        const isControl = ['slider', 'knob', 'joystick', 'toggle_switch', 'checkbox', 'trackpad'].includes(data.type);

        let html = `
            <div class="inspector-section">
                <div class="section-title">Interactions & Data Binding</div>
        `;

        // 1. Push Workflow (For UI Controls)
        if (isControl) {
            html += `
                <div class="property-control" style="background:var(--bg-secondary); padding:8px; border-radius:4px; margin-bottom:10px;">
                    <div class="property-label" style="color:var(--text-accent); font-weight:bold;">controls object...</div>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        <select id="bind-push-target" style="width:100%; padding:4px; font-size:10px; background:var(--bg-input); border:1px solid var(--border-color);">
                            <option value="">-- Select Target Object --</option>
                            ${this.generateObjectOptions(data, objects)}
                        </select>
                        ${(data.type === 'joystick' || data.type === 'trackpad') ? `
                            <div style="font-size:9px; color:var(--text-secondary); margin-top:4px;">Axis X Property:</div>
                            <select id="bind-push-prop" disabled style="width:100%; padding:4px; font-size:10px; background:var(--bg-input); border:1px solid var(--border-color);">
                                <option value="">-- Select Axis X --</option>
                            </select>
                            <div style="font-size:9px; color:var(--text-secondary); margin-top:4px;">Axis Y Property:</div>
                            <select id="bind-push-prop-y" disabled style="width:100%; padding:4px; font-size:10px; background:var(--bg-input); border:1px solid var(--border-color);">
                                <option value="">-- Select Axis Y --</option>
                            </select>
                        ` : `
                            <select id="bind-push-prop" disabled style="width:100%; padding:4px; font-size:10px; background:var(--bg-input); border:1px solid var(--border-color);">
                                <option value="">-- Select Property --</option>
                            </select>
                        `}
                        <button id="bind-push-btn" style="width:100%; padding:4px; background:var(--bg-active); color:white; border:none; border-radius:2px; font-size:10px; cursor:pointer; opacity:0.5; pointer-events:none;">
                            Link Control
                        </button>
                    </div>
                </div>
            `;
        }

        // 2. Active Connections List
        let bindingList = '';

        // Outgoing Bindings
        if (data.binding && data.binding.targetId) {
            const obj = editor.runtime.getObject(data.binding.targetId);
            if (obj) {
                const propStr = (data.binding.property || '') + (data.binding.propertyY ? (', ' + data.binding.propertyY) : '');
                bindingList += `
                    <div class="binding-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:4px 6px; margin-bottom:2px; border-radius:3px; font-size:10px;">
                        <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                            <span style="color:#2ecc71;">➜</span>
                            <span style="font-weight:bold;">${obj.name || obj.id.substring(0, 8)}</span>
                            <span style="opacity:0.6;">(${propStr})</span>
                        </div>
                        <button class="remove-binding-btn" data-target-id="${data.id}" data-prop="self" style="background:none; border:none; color:#e74c3c; cursor:pointer;" title="Remove Link">×</button>
                    </div>
                `;
            }
        }

        objects.forEach(obj => {
            if (obj.bindings) {
                Object.entries(obj.bindings).forEach(([prop, controlId]) => {
                    if (controlId === data.id) {
                        bindingList += `
                            <div class="binding-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:4px 6px; margin-bottom:2px; border-radius:3px; font-size:10px;">
                                <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                                    <span style="color:#2ecc71;">➜</span>
                                    <span style="font-weight:bold;">${obj.name || obj.id.substring(0, 8)}</span>
                                    <span style="opacity:0.6;">(${prop})</span>
                                </div>
                                <button class="remove-binding-btn" data-target-id="${obj.id}" data-prop="${prop}" style="background:none; border:none; color:#e74c3c; cursor:pointer;" title="Remove Link">×</button>
                            </div>
                        `;
                    }
                });
            }
        });

        // Incoming Bindings
        const allIncoming = {};
        if (data.bindings) Object.assign(allIncoming, data.bindings);
        if (data.binding && data.binding.targetId) {
            allIncoming[data.binding.property || 'data'] = data.binding.targetId;
        }

        Object.entries(allIncoming).forEach(([prop, controlId]) => {
            const controlObj = editor.runtime.getObject(controlId);
            const controlName = controlObj ? (controlObj.name || controlObj.id.substring(0, 8)) : controlId;
            bindingList += `
                <div class="binding-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:4px 6px; margin-bottom:2px; border-radius:3px; font-size:10px;">
                    <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                        <span style="color:#3498db;">⬅</span>
                        <span style="font-weight:bold;">${controlName}</span>
                        <span style="opacity:0.6;"> ${data.type === 'graph' ? 'drives chart' : 'controls'} </span>
                        <span style="font-weight:bold;">${prop}</span>
                    </div>
                    <button class="remove-binding-btn" data-target-id="${data.id}" data-prop="${prop}" style="background:none; border:none; color:#e74c3c; cursor:pointer;" title="Remove Link">×</button>
                </div>
            `;
        });

        if (bindingList) {
            html += `
                <div class="section-title" style="margin-top:10px; font-size:10px; color:var(--text-secondary);">Active Links</div>
                <div style="background:var(--bg-input); padding:4px; border-radius:4px; max-height:100px; overflow-y:auto;">
                    ${bindingList}
                </div>
            `;
        } else {
            html += `<div style="font-size:10px; color:var(--text-secondary); font-style:italic; padding:4px;">No active links.</div>`;
        }

        // Manual "Controlled By" Adder
        if (!isControl) {
            html += `
                <div style="margin-top:10px; padding-top:8px; border-top:1px dashed var(--border-color);">
                     <div style="font-size:10px; margin-bottom:4px; color:var(--text-secondary);">Add Incoming Control:</div>
                     <div style="display:flex; gap:4px;">
                        <select id="bind-pull-prop" style="flex:1; font-size:10px; padding:2px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-primary);">
                             <option value="">Property</option>
                             ${this.generatePropertyOptions(data)}
                        </select>
                        <select id="bind-pull-source" style="flex:1.5; font-size:10px; padding:2px; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-primary);">
                             <option value="">Control</option>
                             ${this.generateObjectOptions(data, objects)}
                        </select>
                        <button id="bind-pull-btn" style="padding:2px 8px; background:#2980b9; color:white; border:none; border-radius:3px; font-size:10px; cursor:pointer;">+</button>
                    </div>
                 </div>
            `;
        }

        html += `</div>`;
        return html;
    }

    static generateObjectOptions(currentObj, objects) {
        if (!objects) return '';
        let opts = '';
        objects.forEach(obj => {
            if (obj.id !== currentObj.id) {
                opts += `<option value="${obj.id}">${obj.name || obj.id.substring(0, 6)} (${obj.type})</option>`;
            }
        });
        return opts;
    }

    static generateActionDatalist() {
        const ids = this.getAllProjectActionIDs();
        return `
            <datalist id="ovi-action-ids">
                ${ids.map(id => `<option value="${id}">`).join('')}
            </datalist>
        `;
    }
}
