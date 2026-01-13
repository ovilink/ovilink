
// Enhanced RuntimeUI Logic for Exported OviState Projects
export class RuntimeUI {
    constructor(runtime, overlay) {
        this.runtime = runtime;
        this.overlay = overlay;
        this.injectStyles();
        console.log("[UI] RuntimeUI initialized");
    }

    injectStyles() {
        const styleId = 'ovi-runtime-widget-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .ui-widget-wrapper {
                transition: transform 0.1s ease;
            }
            .ui-widget-input[type="range"] {
                -webkit-appearance: none;
                background: var(--track-color, rgba(255,255,255,0.2));
                height: 4px;
                border-radius: 2px;
                outline: none;
                background-image: linear-gradient(var(--accent, #007acc), var(--accent, #007acc));
                background-size: var(--fill-percent, 0%) 100%;
                background-repeat: no-repeat;
            }
            .ui-widget-input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                background: #ffffff;
                border: 2px solid var(--accent, #007acc);
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                margin-top: 0px;
            }
            .ui-widget-input[type="range"]::-webkit-slider-thumb:hover {
                box-shadow: var(--hover-glow, 0 0 0 4px rgba(0, 122, 204, 0.15));
                transform: scale(var(--hover-scale, 1.1));
            }
            .ui-widget-input[type="range"]::-moz-range-thumb {
                width: 14px;
                height: 14px;
                background: #ffffff;
                border: 2px solid var(--accent, #007acc);
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .ui-widget-button {
                transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
                border: none;
                font-family: inherit;
            }
            .ui-widget-button:hover {
                background: var(--hover-bg) !important;
                transform: scale(var(--hover-scale));
            }
            .ui-widget-button:active {
                transform: scale(0.95);
            }
            .ui-custom-checkbox {
                width: 14px;
                height: 14px;
                border: 2px solid var(--box-color, #1e1e1e);
                border-radius: var(--radius, 2px);
                background: transparent;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }
            .ui-custom-checkbox.checked {
                background: var(--box-color, #1e1e1e);
            }
            .ui-custom-checkbox::after {
                content: "✓";
                color: var(--check-color, #007acc);
                font-size: 10px;
                font-weight: bold;
                display: none;
            }
            .ui-custom-checkbox.checked::after {
                display: block;
            }
            .premium-toggle {
                transition: background 0.3s;
            }
            .knob-indicator {
                transition: transform 0.1s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    update(dt) {
        if (!this.runtime.controls) return;
        this.runtime.controls.forEach(control => {
            const element = this.overlay.querySelector(`[data-id="${control.id}"]`);
            if (!element) return;

            // --- DATA PULLING (Object -> Control) ---
            const allLinks = [];
            if (control.binding && control.binding.targetId && control.binding.property) {
                allLinks.push({ targetId: control.binding.targetId, property: control.binding.property });
            }
            if (control.bindings) {
                Object.entries(control.bindings).forEach(([prop, targetId]) => {
                    allLinks.push({ targetId, property: prop });
                });
            }

            allLinks.forEach(link => {
                const source = this.runtime.getObject(link.targetId);
                if (source) {
                    const val = this.runtime._getProperty(source, link.property);
                    if (val !== undefined) {
                        // CRITICAL: Only pull data if the user is NOT currently interacting with the control
                        if (control._isInteracting) return;

                        if (control.type === 'label' && (link.property === 'text' || link.property === 'value' || !control.text)) {
                            control.text = String(val);
                        } else if (control.type === 'joystick') {
                            if (!control.joystick) control.joystick = {};
                            if (link.property.toLowerCase().includes('y') || control.binding?.propertyY === link.property) {
                                control.joystick.axisY = val;
                            } else {
                                control.joystick.axisX = val;
                            }
                        } else if (control.type === 'trackpad') {
                            if (!control.trackpad) control.trackpad = {};
                            if (link.property.toLowerCase().includes('y') || control.binding?.propertyY === link.property) {
                                control.trackpad.y = val;
                            } else {
                                control.trackpad.x = val;
                            }
                        } else {
                            control.value = val;
                            if (control.type === 'toggle_switch' || control.type === 'checkbox') {
                                control.checked = !!val;
                            }
                        }
                    }
                }
            });

            // --- RENDERING Updates ---
            if (control.type === 'graph') {
                const canvas = element.querySelector('canvas');
                if (canvas) {
                    const ctx = canvas.getContext('2d');

                    // Optimization: Throttled data collection
                    if (!control._lastGraphUpdate || Date.now() - control._lastGraphUpdate > 100) {
                        this.renderGraphInternal(ctx, control, canvas.width, canvas.height);
                        control._lastGraphUpdate = Date.now();

                        const valDisplay = element.querySelector('.graph-value');
                        if (valDisplay) {
                            const val = control.value !== undefined ? control.value : (control.data && control.data.length > 0 ? control.data[control.data.length - 1] : 0);
                            valDisplay.textContent = typeof val === 'number' ? val.toFixed(1) : val;
                        }
                    }
                }
            } else if (control.type === 'label') {
                if (element.textContent !== control.text) element.textContent = control.text || '';
            } else if (control.type === 'progress_bar') {
                const fill = element.querySelector('div > div:first-child');
                if (fill) {
                    const pct = Math.min(100, Math.max(0, (((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100));
                    fill.style.width = pct + '%';
                }
            } else if (control.type === 'slider' || control.type === 'text_input' || control.type === 'dropdown') {
                const input = element.querySelector('.ui-widget-input');
                if (input && !control._isInteracting) {
                    input.value = control.value;
                    if (control.type === 'slider') {
                        const pct = (((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100;
                        input.style.setProperty('--fill-percent', pct + '%');
                    }
                    const valDisplay = element.querySelector('.val-display');
                    if (valDisplay) valDisplay.textContent = control.value;
                }
            } else if (control.type === 'checkbox' || control.type === 'toggle_switch') {
                const box = element.querySelector('.ui-custom-checkbox, .premium-toggle');
                if (box && !control._isInteracting) {
                    if (control.checked) box.classList.add('checked');
                    else box.classList.remove('checked');
                }
            } else if (control.type === 'joystick' || control.type === 'trackpad' || control.type === 'knob') {
                // These are drawn on canvas, so we need to trigger a redraw if not interacting
                if (!control._isInteracting && control._redraw) {
                    control._redraw();
                }
            }
        });
    }

    renderAll() {
        if (!this.runtime.controls) return;
        this.runtime.controls.forEach(control => {
            this.renderUIComponent(control, this.overlay);
        });
    }

    renderUIComponent(control, parent) {
        // Redirection for Complex Widgets
        if (control.type === 'joystick') {
            this.renderJoystick(control, parent);
            return;
        }
        if (control.type === 'progress_bar') {
            this.renderProgressBar(control, parent);
            return;
        }
        if (control.type === 'toggle_switch') {
            this.renderToggleSwitch(control, parent);
            return;
        }
        if (control.type === 'trackpad') {
            this.renderTrackpad(control, parent);
            return;
        }
        if (control.type === 'graph') {
            this.renderGraph(control, parent);
            return;
        }
        if (control.type === 'knob') {
            this.renderKnob(control, parent);
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = (control.x || 0) + 'px';
        wrapper.style.top = (control.y || 0) + 'px';
        wrapper.style.pointerEvents = 'auto';

        let content = '';
        if (control.type === 'button') {
            const bg = control.style?.background || '#007acc';
            const color = control.style?.color || '#ffffff';
            const fontSize = control.style?.fontSize || 14;
            const px = control.style?.paddingX !== undefined ? control.style.paddingX : 16;
            const py = control.style?.paddingY !== undefined ? control.style.paddingY : 8;
            const radius = control.style?.borderRadius !== undefined ? control.style.borderRadius : 4;
            const hoverBg = control.style?.hoverBackground || '#005fa3';
            const hoverScale = control.style?.hoverScale || 1.05;
            const shadow = control.style?.showShadow ? '0 4px 10px rgba(0,0,0,0.3)' : 'none';

            content = `<button class="ui-widget-button" data-id="${control.id}" 
                style="cursor:pointer; padding: ${py}px ${px}px; background: ${bg}; color: ${color}; 
                border-radius: ${radius}px; font-size: ${fontSize}px; box-shadow: ${shadow};
                --hover-bg: ${hoverBg}; --hover-scale: ${hoverScale};">${control.label || 'Button'}</button>`;

        } else if (control.type === 'slider') {
            const accent = control.style?.accentColor || '#007acc';
            const trackColor = control.style?.trackColor || 'rgba(255, 255, 255, 0.2)';
            const surface = control.style?.surfaceColor || '#1e1e1e';
            const opacity = control.style?.opacity !== undefined ? control.style.opacity : 0.8;
            const labelColor = control.style?.labelColor || '#ffffff';
            const valueColor = control.style?.valueColor || '#ffffff';
            const width = control.width || 120;
            const radius = control.style?.borderRadius !== undefined ? control.style.borderRadius : 4;
            const showSurface = control.style?.showSurface !== false;
            const labelPos = control.style?.labelPosition || 'Top';
            const orientation = control.style?.orientation || 'Horizontal';
            const textAlign = control.style?.textAlign || 'Left';

            const rgb = this.hexToRgb(surface);

            const showLabel = control.showLabel !== false;

            // Layout Calculation
            let flexDirection = 'column';
            let alignItems = 'stretch';
            let labelMargin = '0 0 6px 0';

            if (labelPos === 'Bottom') {
                flexDirection = 'column-reverse';
                labelMargin = '6px 0 0 0';
            } else if (labelPos === 'Left') {
                flexDirection = 'row';
                alignItems = 'center';
                labelMargin = '0 8px 0 0';
            } else if (labelPos === 'Right') {
                flexDirection = 'row-reverse';
                alignItems = 'center';
                labelMargin = '0 0 0 8px';
            }

            if (orientation === 'Vertical') {
                flexDirection = (labelPos === 'Top' || labelPos === 'Bottom') ? (labelPos === 'Top' ? 'column' : 'column-reverse') : flexDirection;
                alignItems = 'center';
            }

            // Alignment Calculation
            let justifyText = 'space-between';
            if (textAlign === 'Center') justifyText = 'center';
            if (textAlign === 'Right') justifyText = 'flex-end';
            if (textAlign === 'Left') justifyText = 'flex-start';

            const surfaceStyle = showSurface ? `background: rgba(${rgb},${opacity}); padding: 8px; border-radius: ${radius}px; box-shadow:0 2px 5px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; box-shadow: none; border: none;`;

            const isVertical = orientation === 'Vertical';
            const hoverScale = control.style?.hoverScale || 1.1;
            const showHoverGlow = control.style?.showHoverGlow !== false;
            const glowOpacity = showHoverGlow ? '26' : '00';
            const hoverGlow = showHoverGlow ? `0 0 0 4px ${accent}${glowOpacity}` : 'none';

            const pct = (((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100;
            const inputStyleBase = `--accent: ${accent}; --track-color: ${trackColor}; --fill-percent: ${pct}%; --hover-scale: ${hoverScale}; --hover-glow: ${hoverGlow};`;

            const inputStyle = isVertical
                ? `height: ${width}px; width: 4px; writing-mode: vertical-lr; direction: rtl; cursor: pointer; ${inputStyleBase}`
                : `width:${(labelPos === 'Left' || labelPos === 'Right') ? '60%' : '100%'}; cursor: pointer; ${inputStyleBase}`;

            content = `
                <div style="${surfaceStyle} width: ${isVertical ? 'auto' : width + 'px'}; height: ${isVertical ? 'auto' : 'auto'}; min-height: ${isVertical ? width + 'px' : 'auto'}; min-width: ${isVertical ? '40px' : 'none'}; font-family: 'Inter', sans-serif, system-ui; display: flex; flex-direction: ${flexDirection}; align-items: ${alignItems};">
                    <div style="display:flex; flex-direction: ${isVertical ? 'column' : 'row'}; justify-content: ${justifyText}; margin: ${labelMargin}; align-items: center; gap: 8px; flex: ${labelPos === 'Left' || labelPos === 'Right' ? 'none' : '1'};">
                        ${showLabel ? `<label style="font-size:10px; font-weight:700; color: ${labelColor}; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: ${textAlign === 'Left' && !isVertical ? '1' : 'none'};">${control.label || 'Slider'}</label>` : ''}
                        <span class="val-display" style="font-size:11px; font-weight: 700; color: ${valueColor}; opacity: 1; font-family: monospace; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${control.value || 0}</span>
                    </div>
                    <input type="range" class="ui-widget-input" data-id="${control.id}" min="${control.min || 0}" max="${control.max || 100}" value="${control.value || 0}" step="${control.step || 1}" 
                        style="${inputStyle}">
                </div>
            `;
        } else if (control.type === 'checkbox') {
            const accent = control.style?.accentColor || '#007acc';
            const surface = control.style?.surfaceColor || '#1e1e1e';
            const opacity = control.style?.opacity !== undefined ? control.style.opacity : 0.8;
            const labelColor = control.style?.labelColor || '#ffffff';
            const radius = control.style?.borderRadius !== undefined ? control.style.borderRadius : 2;
            const size = control.style?.size || 1;
            const showSurface = control.style?.showSurface !== false;
            const labelPos = control.style?.labelPosition || 'Right';
            const textAlign = control.style?.textAlign || 'Left';

            const rgb = this.hexToRgb(surface);

            // Layout Calculation
            let flexDirection = 'row';
            let alignItems = 'center';
            let labelMargin = '0 0 0 8px';

            if (labelPos === 'Top') {
                flexDirection = 'column-reverse';
                labelMargin = '0 0 6px 0';
            } else if (labelPos === 'Bottom') {
                flexDirection = 'column';
                labelMargin = '6px 0 0 0';
            } else if (labelPos === 'Left') {
                flexDirection = 'row-reverse';
                labelMargin = '0 8px 0 0';
            }

            let justifyText = 'flex-start';
            if (textAlign === 'Center') justifyText = 'center';
            if (textAlign === 'Right') justifyText = 'flex-end';

            const surfaceStyle = showSurface ? `background: rgba(${rgb},${opacity}); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; border: none;`;

            content = `
                <div style="${surfaceStyle} display: flex; flex-direction: ${flexDirection}; align-items: ${alignItems}; justify-content: ${justifyText}; font-family: sans-serif;">
                    <label style="font-size:12px; font-weight:bold; color: ${labelColor}; margin: ${labelMargin}; cursor: pointer;">${control.label || 'Checkbox'}</label>
                    <div class="ui-custom-checkbox ${control.checked ? 'checked' : ''}" data-id="${control.id}"
                         style="transform: scale(${size}); --box-color: ${accent}; --check-color: #ffffff; --radius: ${radius}px;">
                    </div>
                </div>
            `;
        } else if (control.type === 'dropdown') {
            const bg = control.style?.background || '#ffffff';
            const color = control.style?.color || '#333333';
            const fontSize = control.style?.fontSize || 12;
            const radius = control.style?.borderRadius !== undefined ? control.style.borderRadius : 4;
            const surface = control.style?.surfaceColor || '#1e1e1e';
            const opacity = control.style?.opacity !== undefined ? control.style.opacity : 0.8;
            const labelColor = control.style?.labelColor || '#ffffff';
            const showSurface = control.style?.showSurface !== false;
            const labelPos = control.style?.labelPosition || 'Top';
            const textAlign = control.style?.textAlign || 'Left';

            const rgb = this.hexToRgb(surface);

            // Layout
            let flexDirection = 'column';
            let alignItems = 'stretch';
            let labelMargin = '0 0 6px 0';

            if (labelPos === 'Bottom') {
                flexDirection = 'column-reverse';
                labelMargin = '6px 0 0 0';
            } else if (labelPos === 'Left') {
                flexDirection = 'row';
                alignItems = 'center';
                labelMargin = '0 8px 0 0';
            } else if (labelPos === 'Right') {
                flexDirection = 'row-reverse';
                alignItems = 'center';
                labelMargin = '0 0 0 8px';
            }

            let justifyText = 'flex-start';
            if (textAlign === 'Center') justifyText = 'center';
            if (textAlign === 'Right') justifyText = 'flex-end';

            const surfaceStyle = showSurface ? `background: rgba(${rgb},${opacity}); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; border: none;`;

            const rawOpts = control.options || [];
            const safeOpts = Array.isArray(rawOpts) ? rawOpts : (typeof rawOpts === 'string' ? rawOpts.split(',') : []);
            const opts = safeOpts.map(o => `<option value="${o.trim()}" ${control.value === o.trim() ? 'selected' : ''}>${o.trim()}</option>`).join('');

            content = `
                <div style="${surfaceStyle} display: flex; flex-direction: ${flexDirection}; align-items: ${alignItems}; justify-content: ${justifyText}; font-family: sans-serif;">
                    <label style="font-size:10px; font-weight:bold; color: ${labelColor}; margin: ${labelMargin}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${control.label || 'Dropdown'}</label>
                    <select class="ui-widget-input" data-id="${control.id}" 
                        style="padding: 6px; border-radius: ${radius}px; border: 1px solid #ccc; background: ${bg}; color: ${color}; font-size: ${fontSize}px; min-width: 100px; cursor: pointer;">
                        ${opts}
                    </select>
                </div>`;
        } else if (control.type === 'color_picker') {
            const bg = control.style?.background || '#ffffff';
            const radius = control.style?.borderRadius !== undefined ? control.style.borderRadius : 4;
            const surface = control.style?.surfaceColor || '#1e1e1e';
            const opacity = control.style?.opacity !== undefined ? control.style.opacity : 0.8;
            const labelColor = control.style?.labelColor || '#ffffff';
            const showSurface = control.style?.showSurface !== false;
            const labelPos = control.style?.labelPosition || 'Right';
            const textAlign = control.style?.textAlign || 'Left';

            const rgb = this.hexToRgb(surface);

            // Layout
            let flexDirection = 'row';
            let alignItems = 'center';
            let labelMargin = '0 0 0 8px';

            if (labelPos === 'Top') {
                flexDirection = 'column-reverse';
                labelMargin = '0 0 6px 0';
                alignItems = 'stretch';
            } else if (labelPos === 'Bottom') {
                flexDirection = 'column';
                labelMargin = '6px 0 0 0';
                alignItems = 'stretch';
            } else if (labelPos === 'Left') {
                flexDirection = 'row-reverse';
                labelMargin = '0 8px 0 0';
            }

            let justifyText = 'flex-start';
            if (textAlign === 'Center') justifyText = 'center';
            if (textAlign === 'Right') justifyText = 'flex-end';

            const surfaceStyle = showSurface ? `background: rgba(${rgb},${opacity}); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; border: none;`;

            const colorValue = (typeof control.value === 'string' && control.value.startsWith('#')) ? control.value : '#ff0000';
            content = `
                <div style="${surfaceStyle} display: flex; flex-direction: ${flexDirection}; align-items: ${alignItems}; justify-content: ${justifyText}; font-family: sans-serif;">
                    <label style="font-size:10px; font-weight:bold; color: ${labelColor}; margin: ${labelMargin}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${control.label || 'Color'}</label>
                    <input class="ui-widget-input" data-id="${control.id}" type="color" value="${colorValue}" 
                        style="padding: 2px; border-radius: ${radius}px; border: 1px solid #ccc; background: ${bg}; width: 30px; height: 30px; cursor: pointer; outline: none;">
                </div>`;
        } else if (control.type === 'text_input') {
            const bg = control.style?.background || '#ffffff';
            const color = control.style?.color || '#333333';
            const fontSize = control.style?.fontSize || 12;
            const radius = control.style?.borderRadius !== undefined ? control.style.borderRadius : 4;
            const surface = control.style?.surfaceColor || '#1e1e1e';
            const opacity = control.style?.opacity !== undefined ? control.style.opacity : 0.8;
            const labelColor = control.style?.labelColor || '#ffffff';
            const showSurface = control.style?.showSurface !== false;
            const labelPos = control.style?.labelPosition || 'Top';
            const textAlign = control.style?.textAlign || 'Left';

            const rgb = this.hexToRgb(surface);

            // Layout
            let flexDirection = 'column';
            let alignItems = 'stretch';
            let labelMargin = '0 0 6px 0';

            if (labelPos === 'Bottom') {
                flexDirection = 'column-reverse';
                labelMargin = '6px 0 0 0';
            } else if (labelPos === 'Left') {
                flexDirection = 'row';
                alignItems = 'center';
                labelMargin = '0 8px 0 0';
            } else if (labelPos === 'Right') {
                flexDirection = 'row-reverse';
                alignItems = 'center';
                labelMargin = '0 0 0 8px';
            }

            let justifyText = 'flex-start';
            if (textAlign === 'Center') justifyText = 'center';
            if (textAlign === 'Right') justifyText = 'flex-end';

            const surfaceStyle = showSurface ? `background: rgba(${rgb},${opacity}); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; border: none;`;

            content = `
                <div style="${surfaceStyle} display: flex; flex-direction: ${flexDirection}; align-items: ${alignItems}; justify-content: ${justifyText}; font-family: sans-serif;">
                    <label style="font-size:10px; font-weight:bold; color: ${labelColor}; margin: ${labelMargin}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${control.label || 'Text Input'}</label>
                    <input class="ui-widget-input" data-id="${control.id}" type="text" placeholder="${control.placeholder || ''}" value="${control.value || ''}" 
                        style="padding: 6px; border-radius: ${radius}px; border: 1px solid #ccc; background: ${bg}; color: ${color}; font-size: ${fontSize}px; min-width: 100px; outline: none; cursor: text;">
                </div>`;
        }

        wrapper.innerHTML = content;
        parent.appendChild(wrapper);

        // --- Interactions ---
        if (control.type === 'button') {
            const btn = wrapper.querySelector('button');
            const trigger = (e) => {
                if (e) {
                    e.stopPropagation();
                    if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
                }

                // Determine Targets: Support both .targets (Array) and .targetId (Legacy)
                const targetIds = control.binding?.targets || (control.binding?.targetId ? [control.binding.targetId] : []);

                targetIds.forEach(tid => {
                    const target = this.runtime.getObject(tid);
                    if (target) {
                        this.triggerAction(control, target);
                    }
                });

                // Broadcast Action ID globally (for behaviors like action_animation)
                if (control.binding?.actionId) {
                    this.runtime.emitAction(control.binding.actionId);
                }
            };

            btn.onclick = trigger;
            btn.ontouchstart = trigger;
        } else if (control.type === 'slider') {
            const input = wrapper.querySelector('input');
            const display = wrapper.querySelector('.val-display');
            input.onmousedown = () => control._isInteracting = true;
            input.ontouchstart = () => control._isInteracting = true;
            input.oninput = (e) => {
                control.value = parseFloat(e.target.value);
                const pct = (((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100;
                input.style.setProperty('--fill-percent', pct + '%');
                if (display) display.textContent = control.value;
                this.updateBoundObject(control);
            };
            input.onmouseup = () => control._isInteracting = false;
            input.ontouchend = () => control._isInteracting = false;
        } else if (control.type === 'checkbox') {
            const box = wrapper.querySelector('.ui-custom-checkbox');
            const trigger = (e) => {
                if (e) {
                    e.stopPropagation();
                    if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
                }

                control.checked = !control.checked;
                control.value = control.checked ? 1 : 0;
                box.classList.toggle('checked', control.checked);
                this.updateBoundObject(control);
            };
            wrapper.onclick = trigger;
            wrapper.ontouchstart = trigger;
        } else if (control.type === 'color_picker' || control.type === 'text_input') {
            const input = wrapper.querySelector('input');
            input.onfocus = () => control._isInteracting = true;
            input.onblur = () => control._isInteracting = false;
            input.onchange = (e) => {
                control.value = e.target.value;
                this.updateBoundObject(control);
            };
        } else if (control.type === 'dropdown') {
            const select = wrapper.querySelector('select');
            select.onfocus = () => control._isInteracting = true;
            select.onblur = () => control._isInteracting = false;
            select.onchange = (e) => {
                control.value = e.target.value;
                this.updateBoundObject(control);
            };
        }
    }

    renderProgressBar(control, parent) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = (control.width || 120) + 'px';
        wrapper.style.height = (control.height || 20) + 'px';
        wrapper.style.pointerEvents = 'auto';

        this.updateProgressBar(control, wrapper);
        parent.appendChild(wrapper);
    }

    updateProgressBar(control, wrapper) {
        const pct = Math.min(100, Math.max(0, (((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100));
        const color = control.style?.accentColor || '#4caf50';

        wrapper.innerHTML = `
            <div style="width: 100%; height: 100%; background: #333; border-radius: 10px; overflow: hidden; border: 1px solid #444; position: relative;">
                <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, ${color}, ${this.lightenColor(color, 20)}); transition: width 0.1s ease;"></div>
                ${control.bar?.showValue ? `<div style="position: absolute; width: 100%; text-align: center; top: 50%; transform: translateY(-50%); font-size: 10px; color: white; mix-blend-mode: difference;">${Math.round(pct)}%</div>` : ''}
            </div>
        `;
    }

    renderToggleSwitch(control, parent) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = '50px';
        wrapper.style.height = '26px';
        wrapper.style.pointerEvents = 'auto';

        const render = () => {
            const isOn = control.value > 0 || control.checked;
            const color = control.style?.accentColor || '#4cd964';
            wrapper.innerHTML = `
                <div class="premium-toggle" style="width: 100%; height: 100%; background: ${isOn ? color : '#e9e9eb'}; border-radius: 20px; position: relative; cursor: pointer;">
                    <div style="width: 22px; height: 22px; background: white; border-radius: 50%; position: absolute; top: 2px; left: ${isOn ? '26px' : '2px'}; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: left 0.3s ease;"></div>
                </div>
                <div style="font-size: 10px; color: #fff; text-align: center; margin-top: 4px; font-family: sans-serif;">${control.label || ''}</div>
            `;
        };

        const trigger = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            if (e && e.type === 'touchstart' && e.cancelable) e.preventDefault();

            control.checked = !control.checked;
            control.value = control.checked ? 1 : 0;
            this.updateBoundObject(control);
            render();
        };

        wrapper.onclick = trigger;
        wrapper.ontouchstart = trigger;

        render();
        parent.appendChild(wrapper);
    }

    renderJoystick(control, parent) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        const r = (control.joystick?.radius || 50);
        const hr = (control.joystick?.handleRadius || 20);
        const sensitivity = control.joystick?.sensitivity || 1.0;
        const returnToCenter = control.joystick?.returnToCenter !== false;

        const baseColor = control.style?.background || '#000000';
        const handleColor = control.style?.accentColor || '#333333';
        const surfaceColor = control.style?.surfaceColor || '#ffffff';
        const opacity = control.style?.opacity !== undefined ? control.style.opacity : 0.8;
        const showBase = control.style?.showSurface !== false;

        wrapper.style.width = (control.width || 100) + 'px';
        wrapper.style.height = (control.height || 100) + 'px';
        wrapper.style.borderRadius = '50%';
        wrapper.style.background = showBase ? `rgba(${this.hexToRgb(surfaceColor)}, ${opacity * 0.2})` : 'none';
        wrapper.style.border = showBase ? `1px solid rgba(${this.hexToRgb(surfaceColor)}, ${opacity * 0.4})` : 'none';
        wrapper.style.boxShadow = showBase ? `inset 0 2px 10px rgba(0,0,0,${opacity * 0.25})` : 'none';
        wrapper.style.pointerEvents = 'auto';
        wrapper.style.touchAction = 'none';

        wrapper.innerHTML = `
            <div class="joystick-base" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${r * 2 * 0.8}px; height: ${r * 2 * 0.8}px; border-radius: 50%; border: 2px solid rgba(${this.hexToRgb(handleColor)}, ${opacity * 0.3}); background: rgba(${this.hexToRgb(baseColor)}, ${opacity * 0.1}); display: ${showBase ? 'block' : 'none'}; pointer-events: none;"></div>
            <div class="joystick-handle" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${hr * 2}px; height: ${hr * 2}px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, ${this.lightenColor(handleColor, 20)} 0%, ${handleColor} 100%); border: 2px solid rgba(0,0,0,0.5); box-shadow: 0 4px 8px rgba(0,0,0,${opacity * 0.5}); cursor: grab; pointer-events: none;"></div>
        `;

        parent.appendChild(wrapper);

        const handle = wrapper.querySelector('.joystick-handle');
        let isDragging = false;
        let activeTouchId = null;

        const updateJoystick = (clientX, clientY) => {
            const rect = wrapper.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            let dx = clientX - centerX;
            let dy = clientY - centerY;

            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = r * 0.8;

            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            handle.style.left = `calc(50% + ${dx}px)`;
            handle.style.top = `calc(50% + ${dy}px)`;

            // Normalized values (-1 to 1)
            if (!control.joystick) control.joystick = {};
            control.joystick.axisX = (dx / maxDist) * sensitivity;
            control.joystick.axisY = (dy / maxDist) * sensitivity;

            this.updateBoundObject(control);
        };

        const draw = () => {
            if (isDragging) return;
            const maxDist = r * 0.8;
            const dx = (control.joystick?.axisX || 0) * maxDist / sensitivity;
            const dy = (control.joystick?.axisY || 0) * maxDist / sensitivity;
            handle.style.left = `calc(50% + ${dx}px)`;
            handle.style.top = `calc(50% + ${dy}px)`;
        };

        control._redraw = draw;

        const onStart = (e) => {
            if (activeTouchId !== null) return;
            const pos = e.touches ? e.changedTouches[0] : e;
            if (e.touches) activeTouchId = pos.identifier;

            isDragging = true;
            control._isInteracting = true;
            handle.style.cursor = 'grabbing';
            updateJoystick(pos.clientX, pos.clientY);
            if (e.cancelable) e.preventDefault();
        };

        const onMove = (e) => {
            if (!isDragging) return;
            let pos = e;
            if (e.touches) {
                pos = null;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeTouchId) {
                        pos = e.changedTouches[i];
                        break;
                    }
                }
            }
            if (pos) {
                updateJoystick(pos.clientX, pos.clientY);
                if (e.cancelable) e.preventDefault();
            }
        };

        const onEnd = (e) => {
            if (!isDragging) return;
            if (e.touches) {
                let found = false;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeTouchId) {
                        found = true;
                        break;
                    }
                }
                if (!found) return;
            }

            isDragging = false;
            control._isInteracting = false;
            activeTouchId = null;
            handle.style.cursor = 'grab';

            if (returnToCenter) {
                handle.style.left = '50%';
                handle.style.top = '50%';
                if (!control.joystick) control.joystick = {};
                control.joystick.axisX = 0;
                control.joystick.axisY = 0;
                this.updateBoundObject(control);
            }
        };

        wrapper.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);

        wrapper.addEventListener('touchstart', onStart, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);
        draw();
        parent.appendChild(wrapper);
    }

    renderKnob(control, parent) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = (control.width || 80) + 'px';
        wrapper.style.height = (control.height || 80) + 'px';
        wrapper.style.pointerEvents = 'auto';
        wrapper.style.touchAction = 'none';

        const accent = control.style?.accentColor || '#007acc';

        const render = () => {
            const pct = ((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0));
            const startAngle = (control.knob?.startAngle || -135);
            const endAngle = (control.knob?.endAngle || 135);
            const angle = startAngle + pct * (endAngle - startAngle);

            wrapper.innerHTML = `
                <div style="width: 100%; height: 100%; background: #1a1a1a; border-radius: 50%; border: 4px solid #333; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.5); pointer-events: none;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #2c2c2c 0%, #111 100%); border-radius: 50%;"></div>
                    <div class="knob-indicator" style="width: 4px; height: 35%; background: ${accent}; position: absolute; top: 15%; left: 50%; transform-origin: 50% 100%; transform: translateX(-50%) rotate(${angle}deg); border-radius: 2px;"></div>
                    <div style="position: absolute; bottom: -24px; width: 100%; text-align: center; color: white; font-size: 10px; font-family: sans-serif; pointer-events: none;">${control.label || ''}</div>
                </div>
            `;
        };
        control._redraw = render;

        let isDragging = false;
        let startY = 0;
        let startVal = 0;
        let activeTouchId = null;

        const updateKnob = (clientY) => {
            const dy = startY - clientY;
            const range = (control.max || 100) - (control.min || 0);
            let newVal = startVal + dy * (range / 200);
            newVal = Math.min(control.max || 100, Math.max(control.min || 0, newVal));
            control.value = newVal;
            this.updateBoundObject(control);
            render();
        };

        const onStart = (e) => {
            if (activeTouchId !== null) return;
            const pos = e.touches ? e.changedTouches[0] : e;
            if (e.touches) activeTouchId = pos.identifier;

            isDragging = true;
            startY = pos.clientY;
            startVal = control.value || 0;
            control._isInteracting = true;
            if (e.cancelable) e.preventDefault();
        };

        const onMove = (e) => {
            if (!isDragging) return;
            let pos = e;
            if (e.touches) {
                pos = null;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeTouchId) {
                        pos = e.changedTouches[i];
                        break;
                    }
                }
            }
            if (pos) {
                updateKnob(pos.clientY);
                if (e.cancelable) e.preventDefault();
            }
        };

        const onEnd = (e) => {
            if (!isDragging) return;
            if (e.touches) {
                let found = false;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeTouchId) {
                        found = true;
                        break;
                    }
                }
                if (!found) return;
            }
            isDragging = false;
            control._isInteracting = false;
            activeTouchId = null;
        };

        wrapper.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        wrapper.addEventListener('touchstart', onStart, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);

        render();
        parent.appendChild(wrapper);
    }

    renderTrackpad(control, parent) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = (control.width || 100) + 'px';
        wrapper.style.height = (control.height || 100) + 'px';
        wrapper.style.background = '#000';
        wrapper.style.border = '1px solid #444';
        wrapper.style.borderRadius = (control.style?.borderRadius || 8) + 'px';
        wrapper.style.pointerEvents = 'auto';
        wrapper.style.touchAction = 'none';
        wrapper.style.cursor = 'crosshair';

        const dot = document.createElement('div');
        const accent = control.style?.accentColor || '#007acc';
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.background = accent;
        dot.style.borderRadius = '50%';
        dot.style.position = 'absolute';
        dot.style.transform = 'translate(-50%, -50%)';
        dot.style.pointerEvents = 'none';
        dot.style.boxShadow = `0 0 10px ${accent}80`;
        wrapper.appendChild(dot);

        let activeTouchId = null;
        let isDragging = false;

        const draw = () => {
            const x = control.trackpad?.x !== undefined ? control.trackpad.x : 0.5;
            const y = control.trackpad?.y !== undefined ? control.trackpad.y : 0.5;
            dot.style.left = (x * 100) + '%';
            dot.style.top = (y * 100) + '%';
        };

        control._redraw = draw;

        const updateInteraction = (me) => {
            const rect = wrapper.getBoundingClientRect();
            const x = Math.min(1, Math.max(0, (me.clientX - rect.left) / rect.width));
            const y = Math.min(1, Math.max(0, (me.clientY - rect.top) / rect.height));
            if (!control.trackpad) control.trackpad = {};
            control.trackpad.x = x;
            control.trackpad.y = y;
            draw();
            this.updateBoundObject(control);
        };

        const onStart = (e) => {
            if (activeTouchId !== null) return;
            const pos = e.touches ? e.changedTouches[0] : e;
            if (e.touches) activeTouchId = pos.identifier;

            isDragging = true;
            control._isInteracting = true;
            updateInteraction(pos);
            if (e.cancelable) e.preventDefault();
        };

        const onMove = (e) => {
            if (!isDragging) return;
            let pos = e;
            if (e.touches) {
                pos = null;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeTouchId) {
                        pos = e.changedTouches[i];
                        break;
                    }
                }
            }
            if (pos) {
                updateInteraction(pos);
                if (e.cancelable) e.preventDefault();
            }
        };

        const onEnd = (e) => {
            if (!isDragging) return;
            if (e.touches) {
                let found = false;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === activeTouchId) {
                        found = true;
                        break;
                    }
                }
                if (!found) return;
            }
            isDragging = false;
            control._isInteracting = false;
            activeTouchId = null;
        };

        wrapper.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        wrapper.addEventListener('touchstart', onStart, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        window.addEventListener('touchcancel', onEnd);

        draw();
        parent.appendChild(wrapper);
    }

    renderGraph(control, parent) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = (control.width || 250) + 'px';
        wrapper.style.height = (control.height || 150) + 'px';
        wrapper.style.pointerEvents = 'auto';
        wrapper.style.backgroundColor = control.style?.background || 'rgba(255, 255, 255, 0.9)';
        wrapper.style.border = '1px solid #ccc';
        wrapper.style.borderRadius = '6px';
        wrapper.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
        wrapper.style.overflow = 'hidden';

        const h = (control.height || 150) - 25;
        const w = (control.width || 250);

        wrapper.innerHTML = `
            <div style="padding: 5px 8px; font-size: 10px; font-weight: bold; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; background: #f8f9fa; color: #444; font-family: sans-serif;">
                <span>${control.label || (control.binding?.property ? control.binding.property : 'Graph')}</span>
                <span class="graph-value" style="color: ${control.style?.color || '#007acc'}; font-family: monospace;">--</span>
            </div>
            <div style="position: relative; width: 100%; height: ${h}px; background: #fff;">
                <canvas width="${w}" height="${h}" style="width:100%; height:100%; display:block;"></canvas>
            </div>
        `;

        parent.appendChild(wrapper);

        // Track data if it's a line chart
        if (control.subtype !== 'gauge' && !control.data) {
            control.data = [];
        }
    }

    renderGraphInternal(ctx, control, w, h) {
        ctx.clearRect(0, 0, w, h);
        const val = control.value || 0;
        const min = control.min || 0;
        const max = control.max || 100;

        if (control.subtype === 'gauge') {
            const cx = w / 2, cy = h * 0.85;
            const r = Math.min(w, h) * 0.55;
            const startAngle = (control.gauge?.startAngle || -1) * Math.PI;
            const endAngle = (control.gauge?.endAngle || 0) * Math.PI;
            const totalAngle = endAngle - startAngle;

            // Background
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.lineWidth = 10;
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Value
            const pct = Math.min(1, Math.max(0, (val - min) / (max - min)));
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + totalAngle * pct);
            ctx.lineWidth = 10;
            ctx.strokeStyle = control.style?.color || '#007acc';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Needle
            const needleAngle = startAngle + totalAngle * pct;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(needleAngle) * r * 0.8, cy + Math.sin(needleAngle) * r * 0.8);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#333';
            ctx.stroke();
        } else {
            // Line Chart
            if (!control.data) control.data = [];
            control.data.push(val);
            if (control.data.length > (control.maxPoints || 100)) control.data.shift();

            ctx.strokeStyle = control.style?.color || '#007acc';
            ctx.lineWidth = control.style?.lineWidth || 2;
            ctx.beginPath();

            const step = w / (control.maxPoints || 100);
            control.data.forEach((v, i) => {
                const px = i * step;
                const py = h - ((v - min) / (max - min)) * h;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
        }
    }


    triggerAction(control, target) {
        if (!target || !control?.binding) return;
        this.runtime.executeAction(control.binding.action, target, control.binding);
    }

    updateBoundObject(control) {
        if (!control.binding || !control.binding.property) return;

        // Determine targets: Array or Single
        const targetIds = (control.binding.targets && control.binding.targets.length > 0)
            ? control.binding.targets
            : (control.binding.targetId ? [control.binding.targetId] : []);

        targetIds.forEach(id => {
            const target = this.runtime.getObject(id);
            if (target) {
                let val = control.type === 'checkbox' ? control.checked : control.value;

                // Trackpad/Joystick special cases: handle propertyY
                if ((control.type === 'trackpad' || control.type === 'joystick') && control.binding.propertyY) {
                    const valX = (control.type === 'trackpad') ? control.trackpad?.x : control.joystick?.axisX;
                    const valY = (control.type === 'trackpad') ? control.trackpad?.y : control.joystick?.axisY;

                    this.runtime._applyProperty(target, control.binding.property, valX);
                    this.runtime._applyProperty(target, control.binding.propertyY, valY);
                } else {
                    this.runtime._applyProperty(target, control.binding.property, val);
                }
            }
        });
    }

    // Deprecated helpers, use this.runtime versions
    _getProperty(obj, prop) { return this.runtime._getProperty(obj, prop); }
    _applyProperty(obj, prop, val) { this.runtime._applyProperty(obj, prop, val); }

    hexToRgb(hex) {
        if (!hex || typeof hex !== 'string') return "255,255,255";
        let h = hex.startsWith('#') ? hex.slice(1) : hex;
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const r = parseInt(h.slice(0, 2), 16) || 0;
        const g = parseInt(h.slice(2, 4), 16) || 0;
        const b = parseInt(h.slice(4, 6), 16) || 0;
        return `${r},${g},${b}`;
    }

    lightenColor(hex, percent) {
        if (!hex || !hex.startsWith('#')) return hex;
        let h = hex.slice(1);
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        let r = parseInt(h.slice(0, 2), 16);
        let g = parseInt(h.slice(2, 4), 16);
        let b = parseInt(h.slice(4, 6), 16);
        r = Math.min(255, Math.floor(r * (1 + percent / 100)));
        g = Math.min(255, Math.floor(g * (1 + percent / 100)));
        b = Math.min(255, Math.floor(b * (1 + percent / 100)));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}