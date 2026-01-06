export default class Inspector {
    static render(engine, viewer) {
        console.log("Inspector: render called");
        if (!viewer || viewer.models.length === 0) {
            engine.layoutManager.setInspectorContent(`
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    <div style="font-size: 32px; opacity: 0.3; margin-bottom: 10px;">🔍</div>
                    <div style="font-weight: 600; color: var(--text-primary);">No Model Loaded</div>
                    <p style="font-size: 11px;">Import a GLB model to begin inspecting and configuring your 3D scene.</p>
                </div>
            `);
            return;
        }

        let behaviorHtml = '';
        try {
            const model = viewer.models[viewer.activeModelIndex];
            let activeType = 'none';
            let params = {};

            if (model && model.behaviors) {
                for (const [key, val] of Object.entries(model.behaviors)) {
                    if (val.enabled) {
                        activeType = key;
                        params = val;
                        break;
                    }
                }
            }

            if (activeType !== 'none') {
                const getVal = (val, def) => (val !== undefined && val !== null) ? val : def;

                if (activeType === 'pulse') {
                    behaviorHtml = `
                        <div class="insp-row">
                            <label class="insp-label">Speed <span class="val">${getVal(params.speed, 2)}x</span></label>
                            <input type="range" class="beh-param insp-range" data-param="speed" min="0.5" max="10" step="0.5" value="${getVal(params.speed, 2)}">
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Scale Range</label>
                            <div style="display: flex; gap: 5px;">
                                <input type="number" class="beh-param-val insp-input" data-param="scaleMin" value="${getVal(params.scaleMin, 0.9)}" step="0.1" placeholder="Min">
                                <input type="number" class="beh-param-val insp-input" data-param="scaleMax" value="${getVal(params.scaleMax, 1.1)}" step="0.1" placeholder="Max">
                            </div>
                        </div>
                    `;
                } else if (activeType === 'rotate') {
                    behaviorHtml = `
                        <div class="insp-row">
                            <label class="insp-label">Rotation Speed (X, Y, Z)</label>
                            <div style="display: flex; gap: 5px;">
                                <input type="number" class="beh-param-val insp-input" data-param="speedX" value="${getVal(params.speedX, 0)}" step="0.1">
                                <input type="number" class="beh-param-val insp-input" data-param="speedY" value="${getVal(params.speedY, 1)}" step="0.1">
                                <input type="number" class="beh-param-val insp-input" data-param="speedZ" value="${getVal(params.speedZ, 0)}" step="0.1">
                            </div>
                        </div>
                    `;
                } else if (activeType === 'orbit') {
                    behaviorHtml = `
                        <div class="insp-row">
                            <label class="insp-label">Speed <span class="val">${getVal(params.speed, 1)}x</span></label>
                            <input type="range" class="beh-param insp-range" data-param="speed" min="0.1" max="5" step="0.1" value="${getVal(params.speed, 1)}">
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Radius <span class="val">${getVal(params.radius, 5)}</span></label>
                            <input type="range" class="beh-param insp-range" data-param="radius" min="1" max="20" step="0.5" value="${getVal(params.radius, 5)}">
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Axis</label>
                            <select class="beh-param-select insp-select" data-param="axis">
                                <option value="Y" ${(params.axis || 'Y') === 'Y' ? 'selected' : ''}>Y-Axis (Horizontal)</option>
                                <option value="X" ${(params.axis || 'Y') === 'X' ? 'selected' : ''}>X-Axis (Vertical)</option>
                            </select>
                        </div>
                    `;
                } else if (activeType === 'organic_pulse') {
                    behaviorHtml = `
                        <div class="insp-row">
                            <div class="insp-label">Amplitude (Power) <span class="val">${getVal(params.amplitude, 0.1)}</span></div>
                            <input type="range" class="insp-range beh-param" data-param="amplitude" min="0" max="2" step="0.05" value="${getVal(params.amplitude, 0.1)}">
                        </div>
                        <div class="insp-row">
                            <div class="insp-label">Frequency (Speed) <span class="val">${getVal(params.frequency, 1)}</span></div>
                            <input type="range" class="insp-range beh-param" data-param="frequency" min="0.1" max="10" step="0.1" value="${getVal(params.frequency, 1)}">
                        </div>
                        <div class="insp-row">
                            <div class="insp-label">Focus Height (Y) <span class="val">${getVal(params.focusY, -0.5)}</span></div>
                            <input type="range" class="insp-range beh-param" data-param="focusY" min="-5" max="5" step="0.1" value="${getVal(params.focusY, -0.5)}">
                        </div>
                        <div class="insp-row">
                            <div class="insp-label">Falloff (Softness) <span class="val">${getVal(params.falloff, 0.5)}</span></div>
                            <input type="range" class="insp-range beh-param" data-param="falloff" min="0.1" max="5" step="0.1" value="${getVal(params.falloff, 0.5)}">
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error("Inspector: Error rendering behavior params", e);
            behaviorHtml = `<div style="color:red; font-size:10px;">Error rendering params: ${e.message}</div>`;
        }

        const html = `
            <style>
                .ovi3d-inspector {
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }
                .insp-section {
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }
                .insp-header {
                    padding: 10px 12px;
                    background: rgba(0,0,0,0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                }
                .insp-header h4 {
                    margin: 0;
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .insp-content {
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .insp-row {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .insp-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    display: flex;
                    justify-content: space-between;
                }
                .insp-label span.val {
                    color: var(--accent-primary);
                    font-family: monospace;
                }
                .insp-input-group {
                    display: flex;
                    gap: 6px;
                }
                .insp-input {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    color: var(--text-primary);
                    padding: 6px;
                    font-size: 11px;
                    width: 100%;
                }
                .insp-select {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    color: var(--text-primary);
                    padding: 5px;
                    font-size: 11px;
                    width: 100%;
                    cursor: pointer;
                }
                .insp-range {
                    width: 100%;
                    height: 4px;
                    background: var(--border-color);
                    border-radius: 2px;
                    outline: none;
                    cursor: pointer;
                }
                .insp-layer-item {
                    background: rgba(0,0,0,0.15);
                    padding: 8px;
                    border-radius: 6px;
                    border-left: 3px solid transparent;
                    transition: all 0.2s;
                }
                .insp-layer-item.active {
                    border-left-color: var(--accent-primary);
                    background: rgba(26, 115, 232, 0.05);
                }
                .insp-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 11px;
                    color: var(--text-primary);
                }
                .insp-toggle input { cursor: pointer; }
                
                /* Advanced Options Styling */
                .interactive-opt-card {
                    background: rgba(0,0,0,0.1);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 8px;
                }
                .interactive-opt-title {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
            </style>

            <div class="ovi3d-inspector">
                <!-- Identity & Summary -->
                <div class="insp-section">
                    <div class="insp-header">
                        <h4>Model Settings (Active)</h4>
                    </div>
                    <div class="insp-content">
                        <div class="insp-row">
                            <label class="insp-label">Project Name</label>
                            <input type="text" id="ovi3d-proj-name" class="insp-input" value="${viewer.modelName || 'Untitled Project'}">
                        </div>
                        
                        <!-- Behaviors UI -->
                        <div class="insp-row" style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                            <label class="insp-label">Active Behavior</label>
                            <select id="insp-behavior-type" class="insp-select">
                                ${(() => {
                const model = viewer.models[viewer.activeModelIndex];
                let activeType = 'none';
                if (model && model.behaviors) {
                    for (const [key, val] of Object.entries(model.behaviors)) {
                        if (val.enabled) { activeType = key; break; }
                    }
                }
                return `
                                        <option value="none" ${activeType === 'none' ? 'selected' : ''}>None</option>
                                        <option value="pulse" ${activeType === 'pulse' ? 'selected' : ''}>Pulse (Heartbeat)</option>
                                        <option value="orbit" ${activeType === 'orbit' ? 'selected' : ''}>Orbit (Revolution)</option>
                                        <option value="rotate" ${activeType === 'rotate' ? 'selected' : ''}>Rotate (Spin)</option>
                                        <option value="organic_pulse" ${activeType === 'organic_pulse' ? 'selected' : ''}>Organic Pulse (Vertex)</option>
                                    `;
            })()}
                            </select>
                        </div>
                        
                        <!-- Dynamic Params -->
                        <div id="insp-behavior-params" style="display: block; margin-top: 8px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
                            ${behaviorHtml}
                        </div>
                    </div>
                </div>

                <!-- Layers Section -->
                <div class="insp-section">
                    <div class="insp-header">
                        <h4>Layers (${viewer.models.length})</h4>
                    </div>
                    <div class="insp-content">
                        <div style="background: rgba(26, 115, 232, 0.1); padding: 8px; border-radius: 6px; margin-bottom: 5px;">
                            <div class="insp-label">Global X-Ray <span class="val">${viewer.xrayDepth}%</span></div>
                            <input type="range" id="insp-xray-slider" class="insp-range" min="0" max="100" value="${viewer.xrayDepth}">
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
                            ${viewer.models.map((model, idx) => `
                                <div class="insp-layer-item ${idx === viewer.activeModelIndex ? 'active' : ''}">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                        <input type="checkbox" class="layer-vis" data-index="${idx}" ${model.visible ? 'checked' : ''}>
                                        <input type="text" class="layer-name-inp" data-index="${idx}" value="${model.name}" style="background: transparent; border: none; font-size: 11px; font-weight: 600; color: var(--text-primary); flex: 1;">
                                    </div>
                                    <div class="insp-label" style="margin-top:4px;">Opacity <span class="val">${Math.round(model.opacity * 100)}%</span></div>
                                    <input type="range" class="layer-op-slider" data-index="${idx}" min="0" max="100" value="${model.opacity * 100}" class="insp-range">
                                    
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
                                        <div>
                                            <div class="insp-label">Glossiness <span class="val">${model.shininess || 32}</span></div>
                                            <input type="range" class="layer-shine-slider" data-index="${idx}" min="1" max="128" step="1" value="${model.shininess || 32}" class="insp-range">
                                        </div>
                                        <div>
                                            <div class="insp-label">Specular <span class="val">${(model.specularStrength !== undefined ? model.specularStrength : 0.5).toFixed(1)}</span></div>
                                            <input type="range" class="layer-spec-slider" data-index="${idx}" min="0" max="2" step="0.1" value="${model.specularStrength !== undefined ? model.specularStrength : 0.5}" class="insp-range">
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button id="insp-add-layer" class="ovi3d-secondary-btn" style="padding: 6px; font-size: 10px;">+ Add Layer (GLB)</button>
                    </div>
                </div>

                <!-- Lighting & Environment -->
                <div class="insp-section">
                    <div class="insp-header">
                        <h4>Lighting & Environment</h4>
                    </div>
                    <div class="insp-content">
                        <!-- merged environment controls -->
                        <div class="insp-row">
                            <label class="insp-label">Lighting Preset</label>
                            <select id="opt-env-type" class="insp-select">
                                <option value="neutral" ${viewer.exportOptions.envType === 'neutral' ? 'selected' : ''}>Neutral (Studio)</option>
                                <option value="warm" ${viewer.exportOptions.envType === 'warm' ? 'selected' : ''}>Warm Sun</option>
                                <option value="cool" ${viewer.exportOptions.envType === 'cool' ? 'selected' : ''}>Cool Evening</option>
                                <option value="indoor" ${viewer.exportOptions.envType === 'indoor' ? 'selected' : ''}>Indoor Loft</option>
                            </select>
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Exposure (Brightness) <span class="val">${viewer.exportOptions.exposure}</span></label>
                            <input type="range" id="opt-env-exposure" class="insp-range" min="0" max="3" step="0.1" value="${viewer.exportOptions.exposure}">
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Env Intensity <span class="val">${viewer.exportOptions.envIntensity}</span></label>
                            <input type="range" id="opt-env-intensity" class="insp-range" min="0" max="3" step="0.1" value="${viewer.exportOptions.envIntensity}">
                        </div>

                        <!-- existing lighting controls -->
                        <div class="insp-row" style="margin-top: 5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 5px;">
                            <label class="insp-label">Ambient Light <span class="val">${viewer.ambientIntensity.toFixed(2)}</span></label>
                            <input type="range" id="insp-ambient" class="insp-range" min="0" max="1" step="0.05" value="${viewer.ambientIntensity}">
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Light Azimuth <span class="val">${viewer.exportOptions.lightAzimuth}°</span></label>
                            <input type="range" id="insp-light-azimuth" class="insp-range" min="0" max="360" step="1" value="${viewer.exportOptions.lightAzimuth}">
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Light Elevation <span class="val">${viewer.exportOptions.lightElevation}°</span></label>
                            <input type="range" id="insp-light-elevation" class="insp-range" min="-90" max="90" step="1" value="${viewer.exportOptions.lightElevation}">
                        </div>
                        <label class="insp-toggle" style="margin-top: 5px; margin-bottom: 10px;">
                            <input type="checkbox" id="insp-light-follow" ${viewer.exportOptions.lightFollowCamera ? 'checked' : ''}>
                            Follow Camera Light
                        </label>
                        <div class="insp-row">
                            <label class="insp-label">Material Tint</label>
                            <input type="color" id="insp-tint" class="insp-input" style="height: 30px; padding: 2px;" value="#ffffff">
                        </div>
                    </div>
                </div>

                <!-- Interactive Options (SCALABLE SECTION) -->
                <div class="insp-section">
                    <div class="insp-header">
                        <h4>Interactive Options</h4>
                    </div>
                    <div class="insp-content">
                        <!-- Hotspot Customization (Example of Scalable Sub-section) -->
                        <div class="interactive-opt-card">
                            <div class="interactive-opt-title">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> 
                                Hotspot Display
                            </div>
                            <div class="insp-row">
                                <label class="insp-label">Markers Style</label>
                                <select id="opt-hs-style" class="insp-select">
                                    <option value="number" ${viewer.exportOptions.hotspotStyle === 'number' ? 'selected' : ''}>Number Only</option>
                                    <option value="title" ${viewer.exportOptions.hotspotStyle === 'title' ? 'selected' : ''}>Title Only</option>
                                    <option value="title_desc" ${viewer.exportOptions.hotspotStyle === 'title_desc' ? 'selected' : ''}>Title + Description</option>
                                </select>
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">Hover Reaction</label>
                                <select id="opt-hs-hover" class="insp-select">
                                    <option value="scale" ${viewer.exportOptions.hotspotHover === 'scale' ? 'selected' : ''}>Scale Up</option>
                                    <option value="glow" ${viewer.exportOptions.hotspotHover === 'glow' ? 'selected' : ''}>Glow Effect</option>
                                    <option value="none" ${viewer.exportOptions.hotspotHover === 'none' ? 'selected' : ''}>None</option>
                                </select>
                            </div>
                            <label class="insp-toggle" style="margin-top: 10px;">
                                <input type="checkbox" id="ovi3d-opt-visible" ${viewer.exportOptions.defaultVisible ? 'checked' : ''}>
                                Always Visible on Start
                            </label>
                        </div>

                        <!-- System Options -->
                        <div class="interactive-opt-card">
                            <div class="interactive-opt-title">⚙️ Global Behavior</div>
                            <div class="insp-row">
                                <label class="insp-toggle">
                                    <input type="checkbox" id="ovi3d-opt-drift" ${viewer.exportOptions.smartDrift ? 'checked' : ''}>
                                    Smart Drift (Auto-Rotate)
                                </label>
                                
                                <div id="ovi3d-drift-settings" style="display: ${viewer.exportOptions.smartDrift ? 'block' : 'none'}; margin-top: 8px; padding-left: 20px; border-left: 2px solid var(--accent-primary);">
                                    <div class="insp-row">
                                        <label class="insp-label">Rotation Speed <span class="val">${viewer.exportOptions.driftSpeed}x</span></label>
                                        <input type="range" id="opt-drift-speed" class="insp-range" min="0.1" max="5" step="0.1" value="${viewer.exportOptions.driftSpeed}">
                                    </div>
                                    <div class="insp-row" style="margin-top: 8px;">
                                        <label class="insp-label">Drift Mode</label>
                                        <select id="opt-drift-type" class="insp-select">
                                            <option value="always" ${viewer.exportOptions.driftType === 'always' ? 'selected' : ''}>Always Rotate</option>
                                            <option value="idle" ${viewer.exportOptions.driftType === 'idle' ? 'selected' : ''}>Rotate on Idle</option>
                                        </select>
                                    </div>
                                    <div class="insp-row" style="margin-top: 8px; display: ${viewer.exportOptions.driftType === 'idle' ? 'flex' : 'none'};">
                                        <label class="insp-label">Idle Delay (sec)</label>
                                        <input type="number" id="opt-drift-delay" class="insp-input" value="${viewer.exportOptions.driftIdleDelay}" min="1" max="60">
                                    </div>
                                </div>

                                <label class="insp-toggle" style="margin-top: 10px;">
                                    <input type="checkbox" id="ovi3d-opt-autohide" ${viewer.exportOptions.autoHideUI ? 'checked' : ''}>
                                    Auto-Hide Toolbars
                                </label>
                                <label class="insp-toggle">
                                    <input type="checkbox" id="ovi3d-opt-glass" ${viewer.exportOptions.smartTooltips !== false ? 'checked' : ''}>
                                    Glassmorphism Tooltips
                                </label>
                            </div>
                        </div>



                        <!-- Guide Interface Customization -->
                        <div class="interactive-opt-card" style="margin-top: 10px;">
                            <div class="interactive-opt-title">🎨 Guide Interface</div>
                            <div class="insp-row" style="margin-bottom: 8px;">
                                <label class="insp-toggle">
                                    <input type="checkbox" id="opt-show-hud" ${viewer.exportOptions.showHud !== false ? 'checked' : ''}>
                                    Show Guide HUD
                                </label>
                            </div>
                            <div class="insp-row">
                                <label class="insp-label">Accent Color</label>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <input type="color" id="opt-hud-color" class="insp-color" value="${viewer.exportOptions.hudColor}" style="width: 40px; height: 24px; border: none; padding: 0; background: transparent; cursor: pointer;">
                                    <span class="val" style="font-family: monospace; font-size: 11px;">${viewer.exportOptions.hudColor}</span>
                                </div>
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">HUD Position</label>
                                <select id="opt-hud-pos" class="insp-select">
                                    <option value="bottom" ${viewer.exportOptions.hudPosition === 'bottom' ? 'selected' : ''}>Bottom Center</option>
                                    <option value="top" ${viewer.exportOptions.hudPosition === 'top' ? 'selected' : ''}>Top Center</option>
                                    <option value="right" ${viewer.exportOptions.hudPosition === 'right' ? 'selected' : ''}>Bottom Right</option>
                                </select>
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">HUD Design Style</label>
                                <select id="opt-hud-style" class="insp-select">
                                    <option value="modern" ${viewer.exportOptions.hudStyle === 'modern' ? 'selected' : ''}>Modern Glass</option>
                                    <option value="minimal" ${viewer.exportOptions.hudStyle === 'minimal' ? 'selected' : ''}>Minimal</option>
                                    <option value="floating" ${viewer.exportOptions.hudStyle === 'floating' ? 'selected' : ''}>Floating Card</option>
                                    <option value="glass" ${viewer.exportOptions.hudStyle === 'glass' ? 'selected' : ''}>Pure Glass (Clean)</option>
                                </select>
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">HUD Scale <span class="val">${viewer.exportOptions.hudScale || 1.0}x</span></label>
                                <input type="range" id="opt-hud-scale" class="insp-range" min="0.8" max="1.2" step="0.05" value="${viewer.exportOptions.hudScale || 1.0}">
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">Glass Blur <span class="val">${viewer.exportOptions.hudGlassBlur || 20}px</span></label>
                                <input type="range" id="opt-hud-blur" class="insp-range" min="0" max="40" step="1" value="${viewer.exportOptions.hudGlassBlur || 20}">
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">Glass Opacity <span class="val">${viewer.exportOptions.hudGlassOpacity || 0.7}</span></label>
                                <input type="range" id="opt-hud-opacity" class="insp-range" min="0.1" max="1.0" step="0.05" value="${viewer.exportOptions.hudGlassOpacity || 0.7}">
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">Marker Opacity <span class="val">${viewer.exportOptions.hotspotMarkerOpacity || 1.0}</span></label>
                                <input type="range" id="opt-marker-opacity" class="insp-range" min="0.1" max="1.0" step="0.05" value="${viewer.exportOptions.hotspotMarkerOpacity || 1.0}">
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">Card Opacity <span class="val">${viewer.exportOptions.hotspotCardOpacity || 0.95}</span></label>
                                <input type="range" id="opt-card-opacity" class="insp-range" min="0.1" max="1.0" step="0.05" value="${viewer.exportOptions.hotspotCardOpacity || 0.95}">
                            </div>
                            <div class="insp-row" style="margin-top: 8px;">
                                <label class="insp-label">Autopilot Pace <span class="val">${viewer.exportOptions.hudPace}s</span></label>
                                <input type="range" id="opt-hud-pace" class="insp-range" min="1" max="20" step="1" value="${viewer.exportOptions.hudPace}">
                            </div>
                            <div class="insp-row" style="margin-top: 10px; display: flex; gap: 15px; flex-wrap: wrap;">
                                <label class="insp-toggle">
                                    <input type="checkbox" id="opt-hud-loop" ${viewer.exportOptions.hudLoop ? 'checked' : ''}>
                                    Loop Tour
                                </label>
                                <label class="insp-toggle">
                                    <input type="checkbox" id="opt-hud-autoopen" ${viewer.exportOptions.hudAutoOpen !== false ? 'checked' : ''}>
                                    Auto-Open Tooltip
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Export Canvas Settings -->
                <div class="insp-section">
                    <div class="insp-header">
                        <h4>Export Canvas Settings</h4>
                    </div>
                    <div class="insp-content">
                        <div class="insp-row">
                            <label class="insp-label">Canvas Preset</label>
                            <select id="opt-canvas-preset" class="insp-select">
                                <option value="custom">Custom (Manual)</option>
                                <option value="1920x1080" ${viewer.exportOptions.canvasWidth === 1920 && viewer.exportOptions.canvasHeight === 1080 ? 'selected' : ''}>FHD Display (1920 x 1080)</option>
                                <option value="1280x720" ${viewer.exportOptions.canvasWidth === 1280 && viewer.exportOptions.canvasHeight === 720 ? 'selected' : ''}>HD Display (1280 x 720)</option>
                                <option value="1080x1080" ${viewer.exportOptions.canvasWidth === 1080 && viewer.exportOptions.canvasHeight === 1080 ? 'selected' : ''}>Square Post (1080 x 1080)</option>
                                <option value="1080x1920" ${viewer.exportOptions.canvasWidth === 1080 && viewer.exportOptions.canvasHeight === 1920 ? 'selected' : ''}>Social Portrait (1080 x 1920)</option>
                                <option value="800x600" ${viewer.exportOptions.canvasWidth === 800 && viewer.exportOptions.canvasHeight === 600 ? 'selected' : ''}>Classic Web (800 x 600)</option>
                            </select>
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Dimensions (W x H)</label>
                            <div class="insp-input-group">
                                <input type="number" id="opt-canvas-width" class="insp-input" value="${viewer.exportOptions.canvasWidth || 800}" placeholder="Width">
                                <input type="number" id="opt-canvas-height" class="insp-input" value="${viewer.exportOptions.canvasHeight || 600}" placeholder="Height">
                            </div>
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Background Color</label>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <input type="color" id="opt-bg-color" class="insp-input" style="width: 40px; height: 24px; padding: 2px;" value="${viewer.exportOptions.backgroundColor || '#ffffff'}">
                                <span class="val" style="font-family: monospace; font-size: 11px;">${viewer.exportOptions.backgroundColor || '#ffffff'}</span>
                            </div>
                        </div>
                        <label class="insp-toggle" style="margin-top: 5px;">
                            <input type="checkbox" id="opt-bg-transparent" ${viewer.exportOptions.transparentBackground ? 'checked' : ''}>
                            Transparent Background
                        </label>
                        <label class="insp-toggle" style="margin-top: 5px;">
                            <input type="checkbox" id="opt-export-physics" ${viewer.exportOptions.exportPhysics ? 'checked' : ''}>
                            Enable Physics in Export
                        </label>
                    </div>
                </div>

                <!-- Hotspots List -->
                <div class="insp-section">
                    <div class="insp-header">
                        <h4>Hotspots Management</h4>
                    </div>
                    <div class="insp-content">
                         <div id="inspector-hs-container" style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                            <!-- Hotspot Items render here via script -->
                            ${this.renderHotspots(viewer)}
                         </div>
                         ${viewer.hotspots.length === 0 ? '<div style="font-size: 11px; opacity: 0.5; text-align: center; padding: 10px;">No hotspots added yet.</div>' : ''}
                    </div>
                </div>

            </div>
        `;

        engine.layoutManager.setInspectorContent(html);
        this.bindEvents(engine, viewer);
    }

    static renderBehaviorParams(viewer) {
        console.log("Inspector: renderBehaviorParams called", viewer.activeModelIndex);
        if (!viewer.models || viewer.models.length === 0 || viewer.activeModelIndex === -1) return '';
        const model = viewer.models[viewer.activeModelIndex];

        let activeType = 'none';
        let params = {};

        if (model.behaviors) {
            console.log("Inspector: Checking behaviors", Object.keys(model.behaviors));
            for (const [key, val] of Object.entries(model.behaviors)) {
                console.log(`Inspector: Check ${key}`, val);
                if (val.enabled) {
                    activeType = key;
                    params = val;
                    console.log(`Inspector: Found active type ${activeType}`);
                    break;
                }
            }
        } else {
            console.log("Inspector: No behaviors object on model");
        }

        // Fallback: Check global viewer.activeBehavior if model behavior is not explicit
        if (activeType === 'none' && viewer.activeBehavior && viewer.activeBehavior !== 'none') {
            activeType = viewer.activeBehavior;
            params = viewer.behaviorParams || {};
        }

        if (activeType === 'none') return '';
        let html = '';

        // Helper to safely get value or default (handling 0 correctly)
        const getVal = (val, def) => (val !== undefined && val !== null) ? val : def;

        console.log(`[Inspector] Rendering params for type: ${activeType}`, params);

        if (activeType === 'pulse') {
            html += `
                <div class="insp-row">
                    <label class="insp-label">Speed <span class="val">${getVal(params.speed, 2)}x</span></label>
                    <input type="range" class="beh-param" data-param="speed" min="0.5" max="10" step="0.5" value="${getVal(params.speed, 2)}" class="insp-range">
                </div>
                <div class="insp-row">
                    <label class="insp-label">Scale Range</label>
                    <div style="display: flex; gap: 5px;">
                        <input type="number" class="beh-param-val" data-param="scaleMin" value="${getVal(params.scaleMin, 0.9)}" step="0.1" class="insp-input" placeholder="Min">
                        <input type="number" class="beh-param-val" data-param="scaleMax" value="${getVal(params.scaleMax, 1.1)}" step="0.1" class="insp-input" placeholder="Max">
                    </div>
                </div>
            `;
        } else if (activeType === 'rotate') {
            html += `
                <div class="insp-row">
                    <label class="insp-label">Rotation Speed (X, Y, Z)</label>
                    <div style="display: flex; gap: 5px;">
                        <input type="number" class="beh-param-val" data-param="speedX" value="${getVal(params.speedX, 0)}" step="0.1" class="insp-input">
                        <input type="number" class="beh-param-val" data-param="speedY" value="${getVal(params.speedY, 1)}" step="0.1" class="insp-input">
                        <input type="number" class="beh-param-val" data-param="speedZ" value="${getVal(params.speedZ, 0)}" step="0.1" class="insp-input">
                    </div>
                </div>
            `;
        } else if (activeType === 'orbit') {
            html += `
                <div class="insp-row">
                    <label class="insp-label">Speed <span class="val">${getVal(params.speed, 1)}x</span></label>
                    <input type="range" class="beh-param" data-param="speed" min="0.1" max="5" step="0.1" value="${getVal(params.speed, 1)}" class="insp-range">
                </div>
                <div class="insp-row">
                    <label class="insp-label">Radius <span class="val">${getVal(params.radius, 5)}</span></label>
                    <input type="range" class="beh-param" data-param="radius" min="1" max="20" step="0.5" value="${getVal(params.radius, 5)}" class="insp-range">
                </div>
                <div class="insp-row">
                    <label class="insp-label">Axis</label>
                    <select class="beh-param-select" data-param="axis" class="insp-select">
                        <option value="Y" ${(params.axis || 'Y') === 'Y' ? 'selected' : ''}>Y-Axis (Horizontal)</option>
                        <option value="X" ${(params.axis || 'Y') === 'X' ? 'selected' : ''}>X-Axis (Vertical)</option>
                    </select>
                </div>
            `;
        } else if (activeType === 'organic_pulse') {
            html += `
                <div class="insp-row">
                    <div class="insp-label">Amplitude (Power) <span class="val">${getVal(params.amplitude, 0.1)}</span></div>
                    <input type="range" class="insp-range beh-param" data-param="amplitude" min="0" max="2" step="0.05" value="${getVal(params.amplitude, 0.1)}">
                </div>
                <div class="insp-row">
                    <div class="insp-label">Frequency (Speed) <span class="val">${getVal(params.frequency, 1)}</span></div>
                    <input type="range" class="insp-range beh-param" data-param="frequency" min="0.1" max="10" step="0.1" value="${getVal(params.frequency, 1)}">
                </div>
                <div class="insp-row">
                    <div class="insp-label">Focus Height (Y) <span class="val">${getVal(params.focusY, -0.5)}</span></div>
                    <input type="range" class="insp-range beh-param" data-param="focusY" min="-5" max="5" step="0.1" value="${getVal(params.focusY, -0.5)}">
                </div>
                <div class="insp-row">
                    <div class="insp-label">Falloff (Softness) <span class="val">${getVal(params.falloff, 0.5)}</span></div>
                    <input type="range" class="insp-range beh-param" data-param="falloff" min="0.1" max="5" step="0.1" value="${getVal(params.falloff, 0.5)}">
                </div>
            `;
        }
        return html;
    }

    static renderHotspots(viewer) {
        return viewer.hotspots.map((hs, i) => {
            const hasQuiz = hs.quizData && hs.quizData.question !== undefined;
            const quiz = hs.quizData || { question: '', options: ['', '', '', ''], correctIndex: 0, feedback: '' };

            return `
                <div class="insp-layer-item" style="border-left-color: var(--accent-primary); margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <input type="text" class="hs-label-inp" data-index="${i}" value="${hs.label}" placeholder="Hotspot Label" style="background: transparent; border: none; font-size: 11px; font-weight: 700; color: var(--text-primary); flex: 1; outline: none;">
                        <div style="display: flex; gap: 4px;">
                            <button class="hs-cap-btn" data-index="${i}" title="Capture Camera View" style="border: none; background: none; cursor: pointer; font-size: 12px; opacity: 0.7;">📷</button>
                            <button class="hs-del-btn" data-index="${i}" style="border: none; background: none; cursor: pointer; color: #ff4d4d; font-size: 14px;">&times;</button>
                        </div>
                    </div>
                    
                    <textarea class="hs-det-inp" data-index="${i}" placeholder="Information detail (displayed in tooltip)..." style="width: 100%; height: 35px; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-secondary); font-size: 10px; padding: 6px; resize: none; overflow: hidden; font-family: inherit; line-height: 1.3;">${hs.detail || ''}</textarea>
                    
                    <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
                        <label class="insp-label" style="font-size: 9px; opacity: 0.7;">AUDIO NARRATION URL</label>
                        <input type="text" class="hs-audio-inp" data-index="${i}" value="${hs.audioUrl || ''}" placeholder="https://..." class="insp-input" style="font-size: 9px; padding: 4px;">
                    </div>

                    <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                        <label class="insp-toggle" style="font-weight: 600; color: var(--accent-primary);">
                            <input type="checkbox" class="hs-quiz-toggle" data-index="${i}" ${hasQuiz ? 'checked' : ''}>
                            Enable Interactive Quiz
                        </label>
                    </div>

                    <div class="hs-quiz-editor" data-index="${i}" style="display: ${hasQuiz ? 'flex' : 'none'}; flex-direction: column; gap: 8px; margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(138, 180, 248, 0.2);">
                        <div class="insp-row">
                            <label class="insp-label">Question</label>
                            <input type="text" class="hs-quiz-q" data-index="${i}" value="${quiz.question}" placeholder="Ask something..." class="insp-input">
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Options & Correct Answer</label>
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                ${[0, 1, 2, 3].map(optIdx => `
                                    <div style="display: flex; gap: 6px; align-items: center;">
                                        <input type="radio" name="hs-correct-${i}" class="hs-quiz-correct" data-index="${i}" value="${optIdx}" ${quiz.correctIndex === optIdx ? 'checked' : ''}>
                                        <input type="text" class="hs-quiz-opt" data-hs="${i}" data-opt="${optIdx}" value="${quiz.options[optIdx] || ''}" placeholder="Option ${optIdx + 1}" class="insp-input" style="flex: 1; font-size: 10px; padding: 4px;">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="insp-row">
                            <label class="insp-label">Correct Feedback</label>
                            <input type="text" class="hs-quiz-f" data-index="${i}" value="${quiz.feedback || ''}" placeholder="Great job!" class="insp-input">
                        </div>
                    </div>
                </div >
                `;
        }).join('');
    }

    static bindEvents(engine, viewer) {
        setTimeout(() => {
            const container = document.querySelector('.ovi3d-inspector');
            if (!container) return;

            // Global X-Ray
            const xray = container.querySelector('#insp-xray-slider');
            if (xray) {
                xray.oninput = (e) => {
                    viewer.xrayDepth = parseInt(e.target.value);
                    e.target.previousElementSibling.querySelector('.val').innerText = viewer.xrayDepth + '%';
                    viewer.updateXRayLayers();
                };
            }

            // Behavior Logic
            // Behavior Logic
            const behSelect = container.querySelector('#insp-behavior-type');
            if (behSelect) {
                behSelect.onchange = (e) => {
                    const type = e.target.value;
                    const model = viewer.models[viewer.activeModelIndex];
                    if (!model) return;

                    if (!model.behaviors) model.behaviors = {};

                    // Disable all others
                    for (const k of Object.keys(model.behaviors)) {
                        model.behaviors[k].enabled = false;
                    }

                    if (type !== 'none') {
                        // Defaults definition
                        let defs = {};
                        if (type === 'pulse') defs = { speed: 2, scaleMin: 0.9, scaleMax: 1.1 };
                        else if (type === 'orbit') defs = { speed: 1, radius: 5, axis: 'Y' };
                        else if (type === 'rotate') defs = { speedX: 0, speedY: 1, speedZ: 0 };
                        else if (type === 'organic_pulse') defs = { amplitude: 0.1, frequency: 1, focusY: -0.5, falloff: 0.5 };

                        // Robustly init or merge defaults
                        if (!model.behaviors[type]) {
                            model.behaviors[type] = { enabled: true, ...defs };
                        } else {
                            // Merge defaults into existing to ensure properties exist if they were missing
                            model.behaviors[type] = { ...defs, ...model.behaviors[type], enabled: true };
                        }
                        console.log(`[Inspector] Enabled behavior: ${type}`, model.behaviors[type]);
                    }

                    viewer.updateInspector();
                };
            }

            // Universal Parameter Handler
            const updateParam = (key, val) => {
                const model = viewer.models[viewer.activeModelIndex];
                if (!model || !model.behaviors) return;

                // Find active behavior
                let activeType = null;
                for (const [k, v] of Object.entries(model.behaviors)) {
                    if (v.enabled) { activeType = k; break; }
                }

                if (activeType) {
                    model.behaviors[activeType][key] = parseFloat(val);
                    // Reset cache if needed (omitted for simplicity as registry handles state)
                }
            };

            container.querySelectorAll('.beh-param').forEach(inp => {
                inp.oninput = (e) => {
                    updateParam(e.target.dataset.param, e.target.value);
                    e.target.previousElementSibling.querySelector('.val').innerText = e.target.value + (e.target.dataset.param === 'speed' ? 'x' : '');
                };
            });
            container.querySelectorAll('.beh-param-val').forEach(inp => {
                inp.oninput = (e) => updateParam(e.target.dataset.param, e.target.value);
            });
            container.querySelectorAll('.beh-param-select').forEach(inp => {
                inp.onchange = (e) => {
                    const model = viewer.models[viewer.activeModelIndex];
                    if (!model || !model.behaviors) return;

                    // Find active behavior
                    let activeType = null;
                    for (const [k, v] of Object.entries(model.behaviors)) {
                        if (v.enabled) { activeType = k; break; }
                    }

                    if (activeType) {
                        model.behaviors[activeType][e.target.dataset.param] = e.target.value;
                    }
                };
            });

            // Layer specific
            container.querySelectorAll('.layer-vis').forEach(cb => {
                cb.onchange = (e) => {
                    const idx = e.target.dataset.index;
                    viewer.models[idx].visible = e.target.checked;
                };
            });

            container.querySelectorAll('.layer-op-slider').forEach(slide => {
                slide.oninput = (e) => {
                    const idx = e.target.dataset.index;
                    viewer.models[idx].opacity = parseInt(e.target.value) / 100;
                    slide.previousElementSibling.querySelector('.val').innerText = e.target.value + '%';
                };
            });

            container.querySelectorAll('.layer-shine-slider').forEach(slide => {
                slide.oninput = (e) => {
                    const idx = e.target.dataset.index;
                    viewer.models[idx].shininess = parseInt(e.target.value);
                    slide.previousElementSibling.querySelector('.val').innerText = e.target.value;
                };
            });

            container.querySelectorAll('.layer-spec-slider').forEach(slide => {
                slide.oninput = (e) => {
                    const idx = e.target.dataset.index;
                    viewer.models[idx].specularStrength = parseFloat(e.target.value);
                    slide.previousElementSibling.querySelector('.val').innerText = viewer.models[idx].specularStrength.toFixed(1);
                };
            });

            // Lighting
            const updateLight = () => {
                const azi = parseFloat(container.querySelector('#insp-light-azimuth').value) * (Math.PI / 180);
                const ele = parseFloat(container.querySelector('#insp-light-elevation').value) * (Math.PI / 180);

                // Convert Spherical to Cartesian
                const r = 15; // fixed distance for UI light
                const x = r * Math.cos(ele) * Math.sin(azi);
                const y = r * Math.sin(ele);
                const z = r * Math.cos(ele) * Math.cos(azi);

                viewer.lightPos = { x, y, z };
                viewer.exportOptions.lightAzimuth = parseFloat(container.querySelector('#insp-light-azimuth').value);
                viewer.exportOptions.lightElevation = parseFloat(container.querySelector('#insp-light-elevation').value);

                if (viewer.renderer) viewer.renderer.setLightPosition(x, y, z);
            };

            const aziEl = container.querySelector('#insp-light-azimuth');
            if (aziEl) aziEl.oninput = (e) => {
                updateLight();
                e.target.previousElementSibling.querySelector('.val').innerText = e.target.value + '°';
            };

            const eleEl = container.querySelector('#insp-light-elevation');
            if (eleEl) eleEl.oninput = (e) => {
                updateLight();
                e.target.previousElementSibling.querySelector('.val').innerText = e.target.value + '°';
            };

            const followEl = container.querySelector('#insp-light-follow');
            if (followEl) followEl.onchange = (e) => {
                viewer.exportOptions.lightFollowCamera = e.target.checked;
            };

            container.querySelector('#insp-ambient').oninput = (e) => {
                viewer.ambientIntensity = parseFloat(e.target.value);
                viewer.exportOptions.ambientIntensity = viewer.ambientIntensity;
                if (viewer.renderer.setAmbientIntensity) viewer.renderer.setAmbientIntensity(viewer.ambientIntensity);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.ambientIntensity.toFixed(2);
            };

            // Hotspot Actions
            container.querySelectorAll('.hs-label-inp').forEach(inp => {
                inp.onchange = (e) => viewer.hotspots[e.target.dataset.index].label = e.target.value;
            });
            container.querySelectorAll('.hs-det-inp').forEach(inp => {
                inp.oninput = (e) => viewer.hotspots[e.target.dataset.index].detail = e.target.value;
            });
            container.querySelectorAll('.hs-audio-inp').forEach(inp => {
                inp.oninput = (e) => viewer.hotspots[e.target.dataset.index].audioUrl = e.target.value;
            });

            container.querySelectorAll('.hs-quiz-toggle').forEach(chk => {
                chk.onchange = (e) => {
                    const idx = e.target.dataset.index;
                    if (e.target.checked) {
                        viewer.hotspots[idx].quizData = { question: '', options: ['', '', '', ''], correctIndex: 0, feedback: '' };
                    } else {
                        delete viewer.hotspots[idx].quizData;
                    }
                    viewer.updateInspector();
                };
            });

            container.querySelectorAll('.hs-quiz-q').forEach(inp => {
                inp.oninput = (e) => viewer.hotspots[e.target.dataset.index].quizData.question = e.target.value;
            });
            container.querySelectorAll('.hs-quiz-correct').forEach(rad => {
                rad.onchange = (e) => viewer.hotspots[e.target.dataset.index].quizData.correctIndex = parseInt(e.target.value);
            });
            container.querySelectorAll('.hs-quiz-opt').forEach(inp => {
                inp.oninput = (e) => {
                    const hsIdx = e.target.dataset.hs;
                    const optIdx = e.target.dataset.opt;
                    viewer.hotspots[hsIdx].quizData.options[optIdx] = e.target.value;
                };
            });
            container.querySelectorAll('.hs-quiz-f').forEach(inp => {
                inp.oninput = (e) => viewer.hotspots[e.target.dataset.index].quizData.feedback = e.target.value;
            });

            container.querySelectorAll('.hs-del-btn').forEach(btn => {
                btn.onclick = (e) => {
                    viewer.hotspots.splice(e.currentTarget.dataset.index, 1);
                    viewer.updateInspector();
                };
            });
            container.querySelectorAll('.hs-cap-btn').forEach(btn => {
                btn.onclick = (e) => {
                    const idx = e.currentTarget.dataset.index;
                    viewer.hotspots[idx].camera = {
                        position: { x: viewer.camera.position.x, y: viewer.camera.position.y, z: viewer.camera.position.z },
                        target: { x: viewer.camera.target.x, y: viewer.camera.target.y, z: viewer.camera.target.z }
                    };
                    engine.layoutManager.showToast ? engine.layoutManager.showToast("View Captured!") : alert("Captured!");
                };
            });

            // Export Options (Interactive Options)
            container.querySelector('#opt-hs-style').onchange = (e) => viewer.exportOptions.hotspotStyle = e.target.value;
            container.querySelector('#opt-hs-hover').onchange = (e) => viewer.exportOptions.hotspotHover = e.target.value;
            container.querySelector('#ovi3d-opt-visible').onchange = (e) => viewer.exportOptions.defaultVisible = e.target.checked;
            container.querySelector('#ovi3d-opt-drift').onchange = (e) => {
                viewer.exportOptions.smartDrift = e.target.checked;
                viewer.updateInspector();
            };

            const driftSpeed = container.querySelector('#opt-drift-speed');
            if (driftSpeed) driftSpeed.oninput = (e) => {
                viewer.exportOptions.driftSpeed = parseFloat(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.driftSpeed + 'x';
            };

            const driftType = container.querySelector('#opt-drift-type');
            if (driftType) driftType.onchange = (e) => {
                viewer.exportOptions.driftType = e.target.value;
                viewer.updateInspector();
            };

            const driftDelay = container.querySelector('#opt-drift-delay');
            if (driftDelay) driftDelay.onchange = (e) => viewer.exportOptions.driftIdleDelay = parseInt(e.target.value);

            container.querySelector('#ovi3d-opt-autohide').onchange = (e) => viewer.exportOptions.autoHideUI = e.target.checked;
            container.querySelector('#ovi3d-opt-glass').onchange = (e) => viewer.exportOptions.smartTooltips = e.target.checked;

            // Environment Lighting Options
            const envType = container.querySelector('#opt-env-type');
            if (envType) envType.onchange = (e) => {
                viewer.exportOptions.envType = e.target.value;
                if (viewer.renderer) viewer.renderer.setEnvironmentType(e.target.value);
            };

            const envInt = container.querySelector('#opt-env-intensity');
            if (envInt) envInt.oninput = (e) => {
                viewer.exportOptions.envIntensity = parseFloat(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.envIntensity;
                // Update renderer if it supports envIntensity
                if (viewer.renderer.setEnvIntensity) viewer.renderer.setEnvIntensity(viewer.exportOptions.envIntensity);
            };



            const envExp = container.querySelector('#opt-env-exposure');
            if (envExp) envExp.oninput = (e) => {
                viewer.exportOptions.exposure = parseFloat(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.exposure;
                if (viewer.renderer && viewer.renderer.setExposure) viewer.renderer.setExposure(viewer.exportOptions.exposure);
            };

            // HUD Interface Options
            const hudColor = container.querySelector('#opt-hud-color');
            if (hudColor) hudColor.oninput = (e) => {
                viewer.exportOptions.hudColor = e.target.value;
                e.target.nextElementSibling.innerText = e.target.value;
            };

            const hudPos = container.querySelector('#opt-hud-pos');
            if (hudPos) hudPos.onchange = (e) => viewer.exportOptions.hudPosition = e.target.value;

            const hudStyle = container.querySelector('#opt-hud-style');
            if (hudStyle) hudStyle.onchange = (e) => viewer.exportOptions.hudStyle = e.target.value;

            const hudShow = container.querySelector('#opt-show-hud');
            if (hudShow) hudShow.onchange = (e) => viewer.exportOptions.showHud = e.target.checked;

            const hudPace = container.querySelector('#opt-hud-pace');
            if (hudPace) hudPace.oninput = (e) => {
                viewer.exportOptions.hudPace = parseInt(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.hudPace + 's';
            };

            const hudScale = container.querySelector('#opt-hud-scale');
            if (hudScale) hudScale.oninput = (e) => {
                viewer.exportOptions.hudScale = parseFloat(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.hudScale + 'x';
            };

            const hudBlur = container.querySelector('#opt-hud-blur');
            if (hudBlur) hudBlur.oninput = (e) => {
                viewer.exportOptions.hudGlassBlur = parseInt(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.hudGlassBlur + 'px';
            };

            const hudOpacity = container.querySelector('#opt-hud-opacity');
            if (hudOpacity) hudOpacity.oninput = (e) => {
                viewer.exportOptions.hudGlassOpacity = parseFloat(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.hudGlassOpacity;
            };

            const markerOpacity = container.querySelector('#opt-marker-opacity');
            if (markerOpacity) markerOpacity.oninput = (e) => {
                viewer.exportOptions.hotspotMarkerOpacity = parseFloat(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.hotspotMarkerOpacity;
            };

            const cardOpacity = container.querySelector('#opt-card-opacity');
            if (cardOpacity) cardOpacity.oninput = (e) => {
                viewer.exportOptions.hotspotCardOpacity = parseFloat(e.target.value);
                e.target.previousElementSibling.querySelector('.val').innerText = viewer.exportOptions.hotspotCardOpacity;
            };

            const hudLoop = container.querySelector('#opt-hud-loop');
            if (hudLoop) hudLoop.onchange = (e) => viewer.exportOptions.hudLoop = e.target.checked;

            const hudAutoOpen = container.querySelector('#opt-hud-autoopen');
            if (hudAutoOpen) hudAutoOpen.onchange = (e) => viewer.exportOptions.hudAutoOpen = e.target.checked;

            // Export Canvas Settings
            const canvasPreset = container.querySelector('#opt-canvas-preset');
            if (canvasPreset) {
                canvasPreset.onchange = (e) => {
                    if (e.target.value === 'custom') return;
                    const [w, h] = e.target.value.split('x').map(Number);
                    viewer.exportOptions.canvasWidth = w;
                    viewer.exportOptions.canvasHeight = h;
                    viewer.updateInspector();
                };
            }

            const canvasW = container.querySelector('#opt-canvas-width');
            if (canvasW) canvasW.onchange = (e) => viewer.exportOptions.canvasWidth = parseInt(e.target.value) || 800;

            const canvasH = container.querySelector('#opt-canvas-height');
            if (canvasH) canvasH.onchange = (e) => viewer.exportOptions.canvasHeight = parseInt(e.target.value) || 600;

            const bgColor = container.querySelector('#opt-bg-color');
            if (bgColor) bgColor.oninput = (e) => {
                viewer.exportOptions.backgroundColor = e.target.value;
                e.target.nextElementSibling.innerText = e.target.value;
            };

            const bgTrans = container.querySelector('#opt-bg-transparent');
            if (bgTrans) bgTrans.onchange = (e) => viewer.exportOptions.transparentBackground = e.target.checked;

            const exportPhy = container.querySelector('#opt-export-physics');
            if (exportPhy) exportPhy.onchange = (e) => viewer.exportOptions.exportPhysics = e.target.checked;

            const addLayer = container.querySelector('#insp-add-layer');
            if (addLayer) {
                addLayer.onclick = () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.glb';
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const arrayBuffer = await file.arrayBuffer();
                            await viewer.loadModel(arrayBuffer, file.name.replace('.glb', ''));
                        }
                    };
                    input.click();
                };
            }

        }, 0);
    }

    static renderBehaviorParams(viewer) {
        if (!viewer.activeBehavior) return '';
        const p = viewer.behaviorParams || {};

        if (viewer.activeBehavior === 'pulse') {
            return `
                < div class="insp-row" >
                    <div class="insp-label">Speed <span class="val">${p.speed || 2}x</span></div>
                    <input type="range" class="insp-range beh-param" data-param="speed" min="0.1" max="10" step="0.1" value="${p.speed || 2}">
                </div>
                <div class="insp-input-group">
                    <div style="flex:1">
                        <label class="insp-label">Min Scale</label>
                        <input type="number" class="insp-input beh-param-val" data-param="scaleMin" step="0.1" value="${p.scaleMin || 0.9}">
                    </div>
                    <div style="flex:1">
                        <label class="insp-label">Max Scale</label>
                        <input type="number" class="insp-input beh-param-val" data-param="scaleMax" step="0.1" value="${p.scaleMax || 1.1}">
                    </div>
                </div>
            `;
        } else if (viewer.activeBehavior === 'orbit') {
            return `
                < div class="insp-row" >
                    <div class="insp-label">Speed <span class="val">${p.speed || 1}x</span></div>
                    <input type="range" class="insp-range beh-param" data-param="speed" min="-5" max="5" step="0.1" value="${p.speed || 1}">
                </div>
                <div class="insp-row">
                    <div class="insp-label">Radius <span class="val">${p.radius || 5}u</span></div>
                    <input type="range" class="insp-range beh-param" data-param="radius" min="0" max="20" step="0.5" value="${p.radius || 5}">
                </div>
                <div class="insp-row">
                    <label class="insp-label">Axis</label>
                    <select class="insp-select beh-param-select" data-param="axis">
                        <option value="Y" ${!p.axis || p.axis === 'Y' ? 'selected' : ''}>Y Up (Standard)</option>
                        <option value="X" ${p.axis === 'X' ? 'selected' : ''}>X Side</option>
                    </select>
                </div>
            `;
        } else if (viewer.activeBehavior === 'rotate') {
            return `
                < div class="insp-input-group" >
                    <div style="flex:1">
                        <label class="insp-label">Speed X</label>
                        <input type="number" class="insp-input beh-param-val" data-param="speedX" step="0.1" value="${p.speedX || 0}">
                    </div>
                    <div style="flex:1">
                        <label class="insp-label">Speed Y</label>
                        <input type="number" class="insp-input beh-param-val" data-param="speedY" step="0.1" value="${p.speedY || 1}">
                    </div>
                    <div style="flex:1">
                        <label class="insp-label">Speed Z</label>
                        <input type="number" class="insp-input beh-param-val" data-param="speedZ" step="0.1" value="${p.speedZ || 0}">
                    </div>
                </div >
                `;
        } else if (viewer.activeBehavior === 'organic_pulse') {
            return `
                < div class="insp-row" >
                    <div class="insp-label">Amplitude (Power) <span class="val">${p.amplitude || 0.1}</span></div>
                    <input type="range" class="insp-range beh-param" data-param="amplitude" min="0" max="2" step="0.05" value="${p.amplitude || 0.1}">
                </div>
                <div class="insp-row">
                    <div class="insp-label">Frequency (Speed) <span class="val">${p.frequency || 1}</span></div>
                    <input type="range" class="insp-range beh-param" data-param="frequency" min="0.1" max="10" step="0.1" value="${p.frequency || 1}">
                </div>
                <div class="insp-row">
                    <div class="insp-label">Focus Height (Y) <span class="val">${p.focusY || -0.5}</span></div>
                    <input type="range" class="insp-range beh-param" data-param="focusY" min="-5" max="5" step="0.1" value="${p.focusY || -0.5}">
                </div>
                <div class="insp-row">
                    <div class="insp-label">Falloff (Softness) <span class="val">${p.falloff || 0.5}</span></div>
                    <input type="range" class="insp-range beh-param" data-param="falloff" min="0.1" max="5" step="0.1" value="${p.falloff || 0.5}">
                </div>
            `;
        }
        return ``;
    }
}
