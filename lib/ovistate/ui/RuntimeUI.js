export default class RuntimeUI {
    constructor(runtime, container) {
        this.runtime = runtime;
        this.container = container;

        if (this.container) {
            this.container.style.position = 'absolute';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.pointerEvents = 'auto'; // allow capturing clicks for Editor selection logic
            this.container.style.overflow = 'hidden';
            this.init();
        }

        this.setupInteractiveListeners();

        // Custom Styles for UI Widgets
        const styleId = 'ovi-widget-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
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
                    margin-top: 0px; /* Offset if needed */
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
                    border-style: solid;
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
            `;
            document.head.appendChild(style);
        }
    }

    init() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.runtime.controls.forEach(control => {
            if (control.isUI !== false) { // Ensure flagged as UI or default
                this.renderComponent(control);
            }
        });
    }

    renderComponent(control) {
        if (!this.container) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper'; // Required for Editor selection logic
        wrapper.dataset.id = control.id;
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
            const bWidth = control.style?.borderWidth || 0;
            const bColor = control.style?.borderColor || '#000000';
            const hoverBg = control.style?.hoverBackground || '#005fa3';
            const hoverScale = control.style?.hoverScale || 1.05;
            const shadow = control.style?.showShadow ? '0 4px 10px rgba(0,0,0,0.3)' : 'none';

            content = `<button class="ui-widget-button" data-id="${control.id}" 
                style="cursor:pointer; padding: ${py}px ${px}px; background: ${bg}; color: ${color}; 
                border-width: ${bWidth}px; border-color: ${bColor}; border-radius: ${radius}px; 
                font-size: ${fontSize}px; box-shadow: ${shadow};
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

            // Simple Hex to RGBA conversion
            let r = 30, g = 30, b = 30;
            if (surface && surface.startsWith('#')) {
                r = parseInt(surface.slice(1, 3), 16) || 30;
                g = parseInt(surface.slice(3, 5), 16) || 30;
                b = parseInt(surface.slice(5, 7), 16) || 30;
            }

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

            const surfaceStyle = showSurface ? `background: rgba(${r},${g},${b},${opacity}); padding: 8px; border-radius: ${radius}px; box-shadow:0 2px 5px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; box-shadow: none; border: none;`;

            const isVertical = orientation === 'Vertical';
            const hoverScale = control.style?.hoverScale || 1.1;
            const showHoverGlow = control.style?.showHoverGlow !== false;
            const glowOpacity = showHoverGlow ? '26' : '00'; // 15% or 0% opacity for glow
            const hoverGlow = showHoverGlow ? `0 0 0 4px ${accent}${glowOpacity}` : 'none';

            const pct = (((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100;
            const inputStyleBase = `--accent: ${accent}; --track-color: ${trackColor}; --fill-percent: ${pct}%; --hover-scale: ${hoverScale}; --hover-glow: ${hoverGlow};`;

            const inputStyle = isVertical
                ? `height: ${width}px; width: 4px; writing-mode: vertical-lr; direction: rtl; cursor: pointer; ${inputStyleBase}`
                : `width:${(labelPos === 'Left' || labelPos === 'Right') ? '60%' : '100%'}; cursor: pointer; ${inputStyleBase}`;

            content = `
                <div style="${surfaceStyle} width: ${isVertical ? 'auto' : width + 'px'}; height: ${isVertical ? 'auto' : 'auto'}; min-height: ${isVertical ? width + 'px' : 'auto'}; min-width: ${isVertical ? '40px' : 'none'}; font-family: 'Inter', sans-serif; display: flex; flex-direction: ${flexDirection}; align-items: ${alignItems};">
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

            // Hex to RGBA conversion
            let r = 30, g = 30, b = 30;
            if (surface && surface.startsWith('#')) {
                r = parseInt(surface.slice(1, 3), 16) || 30;
                g = parseInt(surface.slice(3, 5), 16) || 30;
                b = parseInt(surface.slice(5, 7), 16) || 30;
            }

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

            const surfaceStyle = showSurface ? `background: rgba(${r},${g},${b},${opacity}); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; border: none;`;

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

            // Hex to RGBA
            let r = 30, g = 30, b = 30;
            if (surface && surface.startsWith('#')) {
                r = parseInt(surface.slice(1, 3), 16) || 30;
                g = parseInt(surface.slice(3, 5), 16) || 30;
                b = parseInt(surface.slice(5, 7), 16) || 30;
            }

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

            const surfaceStyle = showSurface ? `background: rgba(${r},${g},${b},${opacity}); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; border: none;`;

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

            // Hex to RGBA
            let r = 30, g = 30, b = 30;
            if (surface && surface.startsWith('#')) {
                r = parseInt(surface.slice(1, 3), 16) || 30;
                g = parseInt(surface.slice(3, 5), 16) || 30;
                b = parseInt(surface.slice(5, 7), 16) || 30;
            }

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

            const surfaceStyle = showSurface ? `background: rgba(${r},${g},${b},${opacity}); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; border: none;`;

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

            // Hex to RGBA
            let r = 30, g = 30, b = 30;
            if (surface && surface.startsWith('#')) {
                r = parseInt(surface.slice(1, 3), 16) || 30;
                g = parseInt(surface.slice(3, 5), 16) || 30;
                b = parseInt(surface.slice(5, 7), 16) || 30;
            }

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

            const surfaceStyle = showSurface ? `background: rgba(${r},${g},${b},${opacity}); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);` : `background: none; padding: 0; border: none;`;

            content = `
                <div style="${surfaceStyle} display: flex; flex-direction: ${flexDirection}; align-items: ${alignItems}; justify-content: ${justifyText}; font-family: sans-serif;">
                    <label style="font-size:10px; font-weight:bold; color: ${labelColor}; margin: ${labelMargin}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${control.label || 'Text Input'}</label>
                    <input class="ui-widget-input" data-id="${control.id}" type="text" placeholder="${control.placeholder || ''}" value="${control.value || ''}" 
                        style="padding: 6px; border-radius: ${radius}px; border: 1px solid #ccc; background: ${bg}; color: ${color}; font-size: ${fontSize}px; min-width: 100px; outline: none; cursor: text;">
                </div>`;
        } else if (control.type === 'joystick') {
            const r = (control.joystick?.radius || 50);
            const hr = (control.joystick?.handleRadius || 20);
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
            wrapper.style.touchAction = 'none';

            content = `
                <div class="joystick-base" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${r * 2 * 0.8}px; height: ${r * 2 * 0.8}px; border-radius: 50%; border: 2px solid rgba(${this.hexToRgb(handleColor)}, ${opacity * 0.3}); background: rgba(${this.hexToRgb(baseColor)}, ${opacity * 0.1}); display: ${showBase ? 'block' : 'none'};"></div>
                <div class="joystick-handle" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${hr * 2}px; height: ${hr * 2}px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, ${this.lightenColor(handleColor, 20)} 0%, ${handleColor} 100%); border: 2px solid rgba(0,0,0,0.5); box-shadow: 0 4px 8px rgba(0,0,0,${opacity * 0.5}); cursor: grab;"></div>
            `;
        } else if (control.type === 'graph') {
            control.data = control.data || [];
            content = `
                <div style="background:rgba(255,255,255,0.9); border:1px solid #ccc; border-radius:4px; width:${control.width || 250}px; height:${control.height || 150}px;">
                    <div style="padding:5px; font-size:10px; color:#333; display:flex; justify-content:space-between;">
                        <span>${control.binding?.property || 'Graph'}</span>
                        <span class="graph-value">--</span>
                    </div>
                    <canvas width="${control.width || 250}" height="${(control.height || 150) - 25}" style="width:100%; height:80%; display:block;"></canvas>
                </div>
             `;
        } else if (control.type === 'canvas') {
            // Generic Canvas for imported scripts
            content = `<canvas id="${control.id}" width="${control.width || 400}" height="${control.height || 300}" style="background: ${control.color || '#ffffff'}; width:100%; height:100%; display:block; border: 1px solid #ddd;"></canvas>`;
            // Ensure wrapper is sized correctly
            wrapper.style.width = (control.width || 400) + 'px';
            wrapper.style.height = (control.height || 300) + 'px';
        } else if (control.type === 'progress_bar') {
            const pct = Math.min(100, Math.max(0, (((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100));
            const color = control.style?.accentColor || '#4caf50';
            const width = control.width || 120;
            const height = control.height || 20;

            content = `
                <div style="width: ${width}px; height: ${height}px; background: #333; border-radius: 10px; overflow: hidden; border: 1px solid #444; position: relative; font-family: sans-serif;">
                    <div class="progress-fill" style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, ${color}, #81c784); transition: width 0.3s ease;"></div>
                    ${control.bar?.showValue ? `<div style="position: absolute; width: 100%; text-align: center; top: 50%; transform: translateY(-50%); font-size: 10px; color: white; mix-blend-mode: difference;">${Math.round(pct)}%</div>` : ''}
                </div>
            `;
        } else if (control.type === 'toggle_switch') {
            const isOn = control.value > 0 || control.checked;
            const color = control.style?.accentColor || '#4cd964';
            const label = control.label || '';

            content = `
                <div class="premium-toggle ${isOn ? 'on' : ''}" data-id="${control.id}" style="
                    width: 50px; height: 26px; background: ${isOn ? color : '#e9e9eb'}; 
                    border-radius: 20px; position: relative; cursor: pointer; transition: background 0.3s; font-family: sans-serif;">
                    <div style="
                        width: 22px; height: 22px; background: white; border-radius: 50%;
                        position: absolute; top: 2px; left: ${isOn ? '26px' : '2px'};
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: left 0.3s ease;"></div>
                </div>
                ${label ? `<div style="font-size: 10px; color: #fff; text-align: center; margin-top: 4px; font-family: sans-serif;">${label}</div>` : ''}
            `;
        } else if (control.type === 'trackpad') {
            const width = control.width || 100;
            const height = control.height || 100;
            const tx = control.trackpad?.x || 0.5;
            const ty = control.trackpad?.y || 0.5;

            content = `
                <div class="ui-trackpad" data-id="${control.id}" style="width: ${width}px; height: ${height}px; background: #000; border: 1px solid #444; border-radius: 8px; position: relative; cursor: crosshair;">
                    <div class="trackpad-dot" style="width: 12px; height: 12px; background: ${control.style?.accentColor || '#007acc'}; border-radius: 50%; position: absolute; left: ${tx * 100}%; top: ${ty * 100}%; transform: translate(-50%, -50%); box-shadow: 0 0 10px rgba(0,122,204,0.5);"></div>
                </div>
            `;
        } else if (control.type === 'knob') {
            const width = control.width || 80;
            const height = control.height || 80;
            const pct = ((control.value || 0) - (control.min || 0)) / ((control.max || 100) - (control.min || 0));
            const angle = (control.knob?.startAngle || -135) + pct * ((control.knob?.endAngle || 135) - (control.knob?.startAngle || -135));

            content = `
                <div class="ui-knob" data-id="${control.id}" style="width: ${width}px; height: ${height}px; background: #1a1a1a; border-radius: 50%; border: 4px solid #333; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.5); cursor: ns-resize;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #2c2c2c 0%, #111 100%); border-radius: 50%;"></div>
                    <div class="knob-indicator" style="
                        width: 4px; height: 35%; background: ${control.style?.accentColor || '#007acc'};
                        position: absolute; top: 15%; left: 50%; transform-origin: 50% 100%;
                        transform: translateX(-50%) rotate(${angle}deg); border-radius: 2px;"></div>
                    <div style="position: absolute; bottom: -20px; width: 100%; text-align: center; color: white; font-size: 10px; font-family: sans-serif;">${control.label || 'Knob'}</div>
                </div>
            `;
        }

        // Joystick listeners (specific, not delegated for precision)
        if (control.type === 'joystick') {
            const handle = wrapper.querySelector('.joystick-handle');
            const r = (control.joystick?.radius || 50);
            const sensitivity = (control.joystick?.sensitivity || 1.0);
            const returnToCenter = (control.joystick?.returnToCenter !== false);

            let isDragging = false;

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

                if (!control.joystick) control.joystick = {};
                control.joystick.axisX = (dx / maxDist) * sensitivity;
                control.joystick.axisY = (dy / maxDist) * sensitivity;

                // Trigger target update
                if (control.binding && (control.binding.property || control.binding.targets)) {
                    const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);
                    targetIds.forEach(tid => {
                        const target = this.runtime.objects.find(o => o.id === tid);
                        if (target) this.applyBinding(control, target);
                    });
                }
            };

            const onStart = (e) => {
                isDragging = true;
                handle.style.cursor = 'grabbing';
                const pos = e.touches ? e.touches[0] : e;
                updateJoystick(pos.clientX, pos.clientY);
                e.preventDefault();
                e.stopPropagation();
            };

            const onMove = (e) => {
                if (!wrapper.isConnected) {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onEnd);
                    return;
                }
                if (!isDragging) return;
                const pos = e.touches ? e.touches[0] : e;
                updateJoystick(pos.clientX, pos.clientY);
            };

            const onEnd = () => {
                if (!wrapper.isConnected) {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onEnd);
                    return;
                }
                if (!isDragging) return;
                isDragging = false;
                handle.style.cursor = 'grab';

                if (returnToCenter) {
                    handle.style.left = '50%';
                    handle.style.top = '50%';
                    if (control.joystick) {
                        control.joystick.axisX = 0;
                        control.joystick.axisY = 0;
                    }

                    // Trigger target update (reset values)
                    if (control.binding) {
                        const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);
                        targetIds.forEach(tid => {
                            const target = this.runtime.objects.find(o => o.id === tid);
                            if (target) this.applyBinding(control, target);
                        });
                    }
                }
            };

            wrapper.addEventListener('mousedown', onStart);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
            wrapper.addEventListener('touchstart', onStart, { passive: false });
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);
        }

        // Trackpad Logic
        if (control.type === 'trackpad') {
            const trackpad = wrapper.querySelector('.ui-trackpad');
            const dot = wrapper.querySelector('.trackpad-dot');

            const updateTrackpad = (e) => {
                const rect = trackpad.getBoundingClientRect();
                const pos = e.touches ? e.touches[0] : e;
                const x = Math.min(1, Math.max(0, (pos.clientX - rect.left) / rect.width));
                const y = Math.min(1, Math.max(0, (pos.clientY - rect.top) / rect.height));

                if (!control.trackpad) control.trackpad = { x: 0.5, y: 0.5 };
                control.trackpad.x = x;
                control.trackpad.y = y;
                dot.style.left = (x * 100) + '%';
                dot.style.top = (y * 100) + '%';

                if (control.binding) {
                    const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);
                    targetIds.forEach(tid => {
                        const target = this.runtime.objects.find(o => o.id === tid);
                        if (target) this.applyBinding(control, target);
                    });
                }
            };

            const onStart = (e) => {
                updateTrackpad(e);
                const onMove = (me) => updateTrackpad(me);
                const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                    window.removeEventListener('touchmove', onMove);
                    window.removeEventListener('touchend', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
                window.addEventListener('touchmove', onMove, { passive: false });
                window.addEventListener('touchend', onUp);
                e.preventDefault();
            };
            trackpad.addEventListener('mousedown', onStart);
            trackpad.addEventListener('touchstart', onStart, { passive: false });
        }

        // Knob Logic
        if (control.type === 'knob') {
            const knob = wrapper.querySelector('.ui-knob');
            const indicator = wrapper.querySelector('.knob-indicator');

            const updateKnob = (dy) => {
                const range = (control.max || 100) - (control.min || 0);
                const sensitivity = range / 200;
                let newVal = (control.value || 0) + dy * sensitivity;
                newVal = Math.min(control.max || 100, Math.max(control.min || 0, newVal));

                if (control.knob && control.knob.snap > 0) newVal = Math.round(newVal / control.knob.snap) * control.knob.snap;

                control.value = newVal;

                // Update visuals
                const pct = (control.value - (control.min || 0)) / ((control.max || 100) - (control.min || 0));
                const angle = (control.knob?.startAngle || -135) + pct * ((control.knob?.endAngle || 135) - (control.knob?.startAngle || -135));
                indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;

                if (control.binding) {
                    const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);
                    targetIds.forEach(tid => {
                        const target = this.runtime.objects.find(o => o.id === tid);
                        if (target) this.applyBinding(control, target);
                    });
                }
            };

            let startY = 0;
            const onStart = (e) => {
                const pos = e.touches ? e.touches[0] : e;
                startY = pos.clientY;
                const onMove = (me) => {
                    const mpos = me.touches ? me.touches[0] : me;
                    const dy = startY - mpos.clientY;
                    startY = mpos.clientY; // Relative movement
                    updateKnob(dy);
                };
                const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                    window.removeEventListener('touchmove', onMove);
                    window.removeEventListener('touchend', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
                window.addEventListener('touchmove', onMove, { passive: false });
                window.addEventListener('touchend', onUp);
                e.preventDefault();
            };
            knob.addEventListener('mousedown', onStart);
            knob.addEventListener('touchstart', onStart, { passive: false });
        }
    }

    setupInteractiveListeners() {
        // Event Delegation for UI Controls
        // Use container if available, else document (fallback)
        const root = this.container || document;

        root.addEventListener('input', (e) => {
            if (e.target.matches('.ui-widget-input')) {
                const id = e.target.dataset.id;
                const control = this.runtime.controls.find(c => c.id === id);
                if (control) {
                    control.value = e.target.value;
                    // Update Fill Percentage
                    const pct = ((control.value - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100;
                    e.target.style.setProperty('--fill-percent', pct + '%');

                    // Also update label if present (for sliders)
                    const valDisplay = e.target.parentElement.querySelector('.val-display');
                    if (valDisplay) valDisplay.textContent = control.value;
                }
            }
        });

        root.addEventListener('change', (e) => {
            if (e.target.matches('.ui-widget-checkbox')) {
                const id = e.target.dataset.id;
                const control = this.runtime.controls.find(c => c.id === id);
                if (control) {
                    control.checked = e.target.checked;
                }
            }
        });

        root.addEventListener('click', (e) => {
            // Premium Toggle Logic
            if (e.target.closest('.premium-toggle')) {
                const toggle = e.target.closest('.premium-toggle');
                const id = toggle.dataset.id;
                const control = this.runtime.controls.find(c => c.id === id);
                if (control) {
                    control.checked = !control.checked;
                    control.value = control.checked ? 1 : 0;

                    // Update Local Visuals
                    toggle.classList.toggle('on', control.checked);
                    const handle = toggle.querySelector('div');
                    handle.style.left = control.checked ? '26px' : '2px';
                    toggle.style.background = control.checked ? (control.style?.accentColor || '#4cd964') : '#e9e9eb';

                    if (control.binding) {
                        const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);
                        targetIds.forEach(tid => {
                            const target = this.runtime.objects.find(o => o.id === tid);
                            if (target) this.applyBinding(control, target);
                        });
                    }
                }
            }

            // Button Actions
            if (e.target.matches('.ui-widget-button')) {
                const id = e.target.dataset.id;
                const control = this.runtime.controls.find(c => c.id === id);
                if (control && control.binding && control.binding.action) {
                    // Determine Targets: Support both .targets (Array) and .targetId (Legacy)
                    const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);

                    targetIds.forEach(tid => {
                        const target = this.runtime.objects.find(o => o.id === tid);
                        if (target) {
                            this.triggerAction(control.binding.action, target, control.binding.actionId);
                        }
                    });

                    // CRITICAL: Broadcast Action globally for 'state_switcher' behaviors (which listen to global events)
                    if (control.binding && control.binding.actionId) {
                        this.runtime.lastAction = control.binding.actionId;
                        console.log("📢 Global Action Broadcast:", this.runtime.lastAction);
                    }
                }
            }
        });
    }

    update(dt) {
        // Debug Log (Throttle to avoid spam, e.g. every 60 frames or once per play)
        // console.log(`RuntimeUI Update: ${this.runtime.controls.length} controls`);

        this.runtime.controls.forEach(control => {
            // 0. DATA BINDING (Object -> Control) e.g. ProgressBar
            if (control.type === 'progress_bar' && control.binding && control.binding.property) {
                const target = this.runtime.objects.find(o => o.id === control.binding.targetId);
                if (target) {
                    const val = this._getProperty(target, control.binding.property);
                    if (val !== undefined) {
                        control.value = val;
                        // Update DOM
                        const el = this.container?.querySelector(`[data-id="${control.id}"] .progress-fill`);
                        if (el) {
                            const pct = Math.min(100, Math.max(0, ((val - (control.min || 0)) / ((control.max || 100) - (control.min || 0))) * 100));
                            el.style.width = pct + '%';
                            const valText = el.parentElement.querySelector('div:not(.progress-fill)');
                            if (valText) valText.textContent = Math.round(pct) + '%';
                        }
                    }
                }
            }

            // 1. DATA BINDING (Control -> Object)
            if (control.binding && control.binding.property) {
                // Determine Targets: Support both .targets (Array) and .targetId (Legacy/Single)
                const targetIds = control.binding.targets || (control.binding.targetId ? [control.binding.targetId] : []);

                targetIds.forEach(tid => {
                    const target = this.runtime.objects.find(o => o.id === tid);
                    if (target) {
                        // Check if it's a Graph (Object -> Control) -> Only usually 1 source supported for simple graph
                        if (control.type === 'graph') {
                            // Graph usually monitors one target. If multiple, we just monitor the first/last?
                            // Let's allow multi-monitor if graph supports it. Current implementation pushes to data array.
                            // If multiple targets push to same data array, it might be chaotic.
                            // For now, let's assume Graph uses single targetId usually.
                            // But if user used multi-target UI, we try.
                            this.updateGraph(control, target);
                        }
                        // Otherwise it's Control -> Object (Slider, etc.)
                        else {
                            this.applyBinding(control, target);
                        }
                    }
                });
            }
        });
    }

    applyBinding(control, target) {
        if (!control.binding) return;

        const property = control.binding.property;

        // Joystick Special Case: Two axes
        if (control.type === 'joystick' && control.joystick) {
            this._applyProperty(target, property, control.joystick.axisX);
            if (control.binding.propertyY) {
                this._applyProperty(target, control.binding.propertyY, control.joystick.axisY);
            }
            return;
        }

        // Trackpad Special Case
        if (control.type === 'trackpad' && control.trackpad) {
            this._applyProperty(target, property, control.trackpad.x);
            if (control.binding.propertyY) {
                this._applyProperty(target, control.binding.propertyY, control.trackpad.y);
            }
            return;
        }

        const value = (control.type === 'checkbox' || control.type === 'toggle_switch') ? control.checked : Number(control.value);
        this._applyProperty(target, property, value);
    }

    _getProperty(target, property) {
        if (!property) return undefined;

        // Global Variable Support
        if (property.startsWith('variables.')) {
            const varName = property.split('.')[1];
            return this.runtime.variables[varName];
        }

        if (property.includes('.')) {
            const parts = property.split('.');
            if (parts[0] === 'physics') {
                const prop = parts[1];
                if (target.physics) {
                    if (prop === 'velocity' && parts[2]) {
                        return target.physics.velocity ? target.physics.velocity[parts[2]] : 0;
                    }
                    return target.physics[prop];
                }
            } else {
                // Behavior Parameter
                const behaviorId = parts[0];
                const paramName = parts[1];
                if (this.runtime.registry) {
                    return this.runtime.registry.getParameter(target, behaviorId, paramName);
                }
                return target._behaviorParams?.[behaviorId]?.[paramName];
            }
        }
        return target[property];
    }

    // Helper to apply property (handles nested physics/behaviors)
    _applyProperty(target, property, value) {
        if (!property) return;

        // Global Variable Support
        if (property.startsWith('variables.')) {
            const varName = property.split('.')[1];
            this.runtime.setVariable(varName, value);
            return;
        }

        if (property.includes('.')) {
            const parts = property.split('.');

            // Physics Binding (e.g. "physics.velocity.x")
            if (parts[0] === 'physics') {
                const prop = parts[1]; // e.g. "velocity"
                if (target.physics) {
                    if (prop === 'velocity' && parts[2]) {
                        if (!target.physics.velocity) target.physics.velocity = { x: 0, y: 0 };
                        if (parts[2] === 'x') target.physics.velocity.x = value;
                        else if (parts[2] === 'y') target.physics.velocity.y = value;
                    } else {
                        target.physics[prop] = value;
                    }
                }
            } else {
                // Assume Behavior Parameter (e.g. "typewriter.speed")
                const behaviorId = parts[0];
                const paramName = parts[1];

                if (this.runtime.registry) {
                    this.runtime.registry.setParameter(target, behaviorId, paramName, value);
                } else {
                    // Fallback storage
                    if (!target._behaviorParams) target._behaviorParams = {};
                    if (!target._behaviorParams[behaviorId]) target._behaviorParams[behaviorId] = {};
                    target._behaviorParams[behaviorId][paramName] = value;
                }
            }
        } else {
            target[property] = value;
        }
    }

    updateGraph(control, target) {
        let val = target[control.binding.property];
        if (target.physics && control.binding.property.startsWith('velocity.')) {
            val = target.physics.velocity[control.binding.property.split('.')[1]];
        }

        if (val !== undefined) {
            if (!control.data) control.data = [];
            control.data.push(val);
            if (control.data.length > (control.maxPoints || 200)) control.data.shift();

            // In Editor, we rely on Editor.js or this class to render? 
            // Editor.js calls renderGraph based on control.data.
            // But Editor.js render loop calls `core.render` which calls `ui.render`?
            // No, Editor.js puts graph in DOM. DOM needs canvas redraw.
            // We need to find the canvas in DOM and draw.
            // With new renderComponent logic, canvas is INSIDE the container.
            if (this.container) {
                const graphCanvas = this.container.querySelector(`[data-id="${control.id}"] canvas`);
                if (graphCanvas) {
                    this.drawGraph(graphCanvas, control.data, control);
                }
            }
        }
    }

    drawGraph(canvas, data, control) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const lastVal = data.length > 0 ? data[data.length - 1] : 0;

        // Update value text safely (check parent wrapper existence)
        const wrapper = canvas.parentElement?.parentElement; // Canvas is inside a div now in the template, so climb up
        if (wrapper) {
            const valDisplay = wrapper.querySelector('.graph-value');
            if (valDisplay) valDisplay.textContent = lastVal.toFixed(2);
        }

        // --- GAUGE RENDERER ---
        if (control.subtype === 'gauge') {
            const min = control.min || 0;
            const max = control.max || 100;
            const range = max - min;
            const pct = Math.max(0, Math.min(1, (lastVal - min) / range));

            const cx = w / 2, cy = h * 0.85;
            const r = Math.min(w, h) * 0.55;
            const startAngle = (control.gauge?.startAngle !== undefined) ? control.gauge.startAngle : -Math.PI;
            const endAngle = (control.gauge?.endAngle !== undefined) ? control.gauge.endAngle : 0;
            const totalAngle = endAngle - startAngle;

            // Background Arc
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.lineWidth = 12;
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Value Arc
            const currentAngle = startAngle + (totalAngle * pct);
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, currentAngle);
            ctx.lineWidth = 12;

            let color = control.style?.color || '#007acc';
            if (control.gauge?.segments) {
                control.gauge.segments.forEach(seg => {
                    if (pct >= seg.percent) color = seg.color;
                });
            }
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Text Value
            ctx.fillStyle = '#444';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(lastVal.toFixed(1), cx, cy - 10);
            return;
        }

        // --- LINE GRAPH RENDERER ---
        if (data.length > 1) {
            ctx.strokeStyle = control.style?.color || '#007acc';
            ctx.lineWidth = 2;
            ctx.beginPath();

            let min = control.autoScale ? Math.min(...data) : (control.min || -100);
            let max = control.autoScale ? Math.max(...data) : (control.max || 100);
            if (control.autoScale && max === min) { max++; min--; }
            const range = max - min;

            const step = w / (control.maxPoints || 200); // Fixed step based on buffer size, or dynamic based on data length?
            // Editor logic used fixed step usually, or :
            const xStep = w / (data.length - 1); // Dynamic is smoother

            data.forEach((val, i) => {
                const x = i * xStep;
                const norm = (val - min) / range;
                const y = h - (norm * h);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
    }

    // Manual Event Trigger (Called by Button click listeners)
    triggerAction(action, target, actionId) {
        if (!target) return;
        console.log(`⚡ RuntimeUI: Triggering ${action} on ${target.id}`);

        switch (action) {
            case 'reset_pos':
                target.x = 100; target.y = 100;
                if (target.physics) target.physics.velocity = { x: 0, y: 0 };
                break;
            case 'stop':
                if (target.physics) target.physics.velocity = { x: 0, y: 0 };
                break;
            case 'jump':
                if (target.physics) target.physics.velocity.y = -10;
                break;
            case 'toggle_physics':
                if (target.physics) target.physics.enabled = !target.physics.enabled;
                break;
            case 'random_color':
                target.fill = '#' + Math.floor(Math.random() * 16777215).toString(16);
                break;

            // NEW: Behavior Manual Triggers
            case 'start_behavior':
                if (actionId) {
                    // We need to set state for the behavior with this Activation ID
                    // The behaviors map ID to State. user provides ID.
                    // We need to find which behavior has this activationId.
                    // This is inefficient. Better: `actionId` IS the behavior name?
                    // User requested "Manual (via Event)". Inspector shows "Activation Event ID".
                    // Code checks: `actId === obj._behaviorState[behaviorId]`?
                    // No, `obj._behaviorState` stores Boolean (Active/Inactive).
                    // We need to find behaviors on this object that match the `actionId`.

                    if (this.runtime.registry) {
                        this.setBehaviorStateByEventId(target, actionId, true);
                    }
                }
                break;
            case 'stop_behavior':
                if (actionId) this.setBehaviorStateByEventId(target, actionId, false);
                break;
            case 'toggle_behavior':
                if (actionId) this.toggleBehaviorStateByEventId(target, actionId);
                break;

            case 'set_property':
                if (control.binding?.property && control.binding?.value !== undefined) {
                    let val = control.binding.value;
                    if (!isNaN(val) && val !== '') val = Number(val);
                    this._applyProperty(target, control.binding.property, val);
                }
                break;

            case 'toggle_property':
                if (control.binding?.property && control.binding?.valueA !== undefined && control.binding?.valueB !== undefined) {
                    const current = this._getProperty(target, control.binding.property);
                    let valA = control.binding.valueA;
                    let valB = control.binding.valueB;
                    if (!isNaN(valA) && valA !== '') valA = Number(valA);
                    if (!isNaN(valB) && valB !== '') valB = Number(valB);

                    const next = (current == valA) ? valB : valA;
                    this._applyProperty(target, control.binding.property, next);
                }
                break;

            case 'add_value':
                if (control.binding?.property && control.binding?.value !== undefined) {
                    const current = Number(this._getProperty(target, control.binding.property)) || 0;
                    const delta = Number(control.binding.value) || 0;
                    this._applyProperty(target, control.binding.property, current + delta);
                }
                break;

            case 'set_variable':
                if (control.binding?.variableName && control.binding?.value !== undefined) {
                    let val = control.binding.value;
                    if (!isNaN(val) && val !== '') val = Number(val);
                    this.runtime.setVariable(control.binding.variableName, val);
                }
                break;
        }
    }

    setBehaviorStateByEventId(obj, eventId, state) {
        // Find behaviors on this object with matching activationId
        if (!obj.behaviors) return;
        obj.behaviors.forEach(bId => {
            const actId = this.runtime.registry.getParameter(obj, bId, 'activationId');
            if (actId === eventId) {
                if (!obj._behaviorState) obj._behaviorState = {};
                obj._behaviorState[bId] = state;
            }
        });
    }

    toggleBehaviorStateByEventId(obj, eventId) {
        if (!obj.behaviors) return;
        obj.behaviors.forEach(bId => {
            const actId = this.runtime.registry.getParameter(obj, bId, 'activationId');
            if (actId === eventId) {
                if (!obj._behaviorState) obj._behaviorState = {};
                obj._behaviorState[bId] = !obj._behaviorState[bId];
            }
        });
    }

    hexToRgb(hex) {
        if (!hex || typeof hex !== 'string') return "255, 255, 255";
        if (hex.startsWith('rgba')) {
            const matches = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            return matches ? `${matches[1]}, ${matches[2]}, ${matches[3]}` : "255, 255, 255";
        }

        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        return `${r}, ${g}, ${b}`;
    }

    lightenColor(hex, percent) {
        if (!hex || !hex.startsWith('#')) return hex;
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);

        r = Math.min(255, Math.floor(r * (1 + percent / 100)));
        g = Math.min(255, Math.floor(g * (1 + percent / 100)));
        b = Math.min(255, Math.floor(b * (1 + percent / 100)));

        const rr = r.toString(16).padStart(2, '0');
        const gg = g.toString(16).padStart(2, '0');
        const bb = b.toString(16).padStart(2, '0');

        return `#${rr}${gg}${bb}`;
    }
}
