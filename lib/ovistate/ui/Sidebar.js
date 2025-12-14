export default class Sidebar {
    static render(engine, pluginInstance) {
        engine.layoutManager.setSidebarContent(`
            <style>
                .sidebar-section {
                    margin-bottom: 20px;
                }
                .sidebar-section h3 {
                    font-size: 12px;
                    color: var(--text-primary);
                    margin-bottom: 10px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid var(--border-color);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .draggable-object {
                    padding: 8px;
                    margin-bottom: 6px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: grab;
                    transition: all 0.2s;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .draggable-object:hover {
                    background: var(--bg-hover);
                    border-color: var(--text-accent);
                }
                .draggable-object:active {
                    cursor: grabbing;
                }
                .draggable-behavior {
                    padding: 6px 8px;
                    margin-bottom: 4px;
                    border-radius: 3px;
                    cursor: grab;
                    font-size: 11px;
                    color: white;
                    transition: opacity 0.2s;
                }
                .draggable-behavior:hover {
                    opacity: 0.8;
                }
            </style>

            <div class="sidebar-section">
                <h3>📋 Templates</h3>
                <button id="browse-templates-btn" class="btn-full" style="
                    background: var(--accent-primary);
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 10px;
                    transition: all 0.2s;
                ">Browse Templates</button>
            </div>

            <div class="sidebar-section">
                <button id="ovistate-new-btn" class="btn-full btn-primary">New Simulation</button>
                <button id="ovistate-export-btn" class="btn-full btn-secondary">📥 Export HTML5</button>
            </div>

            <div class="sidebar-section">
                <h3>Objects</h3>
                <div class="draggable-object" draggable="true" data-type="circle">
                    <span>⚪</span>
                    <span>Circle</span>
                </div>
                <div class="draggable-object" draggable="true" data-type="rect">
                    <span>⬜</span>
                    <span>Rectangle</span>
                </div>
                <div class="draggable-object" draggable="true" data-type="text">
                    <span>✍️</span>
                    <span>Text</span>
                </div>
                <div id="add-symbol-btn" class="draggable-object" style="cursor: pointer;">
                    <span>😀</span>
                    <span>Symbol</span>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>Controls</h3>
                <div class="draggable-object" draggable="true" data-type="slider">
                    <span>🎚️</span>
                    <span>Slider</span>
                </div>
                <div class="draggable-object" draggable="true" data-type="button">
                    <span>🔘</span>
                    <span>Button</span>
                </div>
                <div class="draggable-object" draggable="true" data-type="checkbox">
                    <span>☑️</span>
                    <span>Checkbox</span>
                </div>
                <div class="draggable-object" draggable="true" data-type="dropdown">
                    <span>📂</span>
                    <span>Dropdown</span>
                </div>
                <div class="draggable-object" draggable="true" data-type="color_picker">
                    <span>🎨</span>
                    <span>Color Picker</span>
                </div>
                <div class="draggable-object" draggable="true" data-type="text_input">
                    <span>🔤</span>
                    <span>Text Input</span>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>Graphs</h3>
                <div class="draggable-object" draggable="true" data-type="graph">
                    <span>📊</span>
                    <span>Line Graph</span>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>🎭 Behaviors</h3>
                
                <details open>
                    <summary style="cursor: pointer; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">🏃 Motion (6)</summary>
                    <div class="draggable-behavior" draggable="true" data-type="wiggle" style="background: #9c27b0;">
                        〰️ Wiggle
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="shake" style="background: #9c27b0;">
                        📳 Shake
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="float" style="background: #9c27b0;">
                        ☁️ Float
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="spiral" style="background: #9c27b0;">
                        🌀 Spiral
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="zigzag" style="background: #9c27b0;">
                        ⚡ Zigzag
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="wave_motion" style="background: #9c27b0;">
                        🌊 Wave Motion
                    </div>
                </details>
                
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">🔄 Transform (5)</summary>
                    <div class="draggable-behavior" draggable="true" data-type="rotate_continuous" style="background: #2196f3;">
                        🔄 Rotate
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="scale_breath" style="background: #2196f3;">
                        💨 Scale Breath
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="color_cycle" style="background: #2196f3;">
                        🎨 Color Cycle
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="glow" style="background: #2196f3;">
                        ✨ Glow
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="fade_cycle" style="background: #2196f3;">
                        👻 Fade Cycle
                    </div>
                </details>
                
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">👆 Interactive (5)</summary>
                    <div class="draggable-behavior" draggable="true" data-type="follow_mouse_smooth" style="background: #e91e63;">
                        🖱️ Follow Mouse
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="hover_grow" style="background: #e91e63;">
                        🔍 Hover Grow
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="magnet" style="background: #e91e63;">
                        🧲 Magnet
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="repel" style="background: #e91e63;">
                        💨 Repel
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="click_response" style="background: #e91e63;">
                        👆 Click Response
                    </div>
                </details>
                
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">🛤️ Path (4)</summary>
                    <div class="draggable-behavior" draggable="true" data-type="figure_eight" style="background: #ff9800;">
                        ∞ Figure Eight
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="circle_path" style="background: #ff9800;">
                        ⭕ Circle Path
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="random_walk" style="background: #ff9800;">
                        🎲 Random Walk
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="bounce_path" style="background: #ff9800;">
                        ⚡ Bounce Path
                    </div>
                </details>
                
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">🔧 Legacy (4)</summary>
                    <div class="draggable-behavior" draggable="true" data-type="follow_mouse" style="background: #607d8b;">
                        🖱️ Follow Mouse (Old)
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="orbit" style="background: #607d8b;">
                        🔄 Orbit Around
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="bounce" style="background: #607d8b;">
                        💥 Bounce
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="pulse" style="background: #607d8b;">
                        💓 Pulse
                    </div>
                </details>
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">✍️ Text FX (3)</summary>
                    <div class="draggable-behavior" draggable="true" data-type="typewriter" style="background: #8e44ad;">
                        ⌨️ Typewriter
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="pulse_text" style="background: #8e44ad;">
                        💓 Pulse Text
                    </div>
                    <div class="draggable-behavior" draggable="true" data-type="rainbow_text" style="background: #8e44ad;">
                        🌈 Rainbow
                    </div>
                </details>

            <div class="sidebar-section">
                <h3>Physics</h3>
                <div style="margin-bottom: 10px;">
                    <label style="font-size: 11px; display: block; margin-bottom: 5px; color: var(--text-secondary);">Gravity</label>
                    <input type="range" id="physics-gravity" min="0" max="20" step="0.1" value="9.8" 
                        style="width: 100%; margin-bottom: 5px;">
                    <span id="gravity-value" style="font-size: 11px; color: var(--text-primary); font-weight: 600;">9.8 m/s²</span>
                </div>
            </div>
        `);

        // Bind Events
        setTimeout(() => {
            // Browse Templates button
            const browseTemplatesBtn = document.getElementById('browse-templates-btn');
            if (browseTemplatesBtn) {
                browseTemplatesBtn.onclick = async () => {
                    // Lazy load template system
                    const { default: TemplateManager } = await import('../templates/TemplateManager.js');
                    const { default: TemplateBrowser } = await import('./TemplateBrowser.js');

                    if (!pluginInstance.templateManager) {
                        pluginInstance.templateManager = new TemplateManager();
                    }

                    if (!pluginInstance.templateBrowser && pluginInstance.activeEditor) {
                        pluginInstance.templateBrowser = new TemplateBrowser(
                            pluginInstance.templateManager,
                            pluginInstance.activeEditor
                        );
                    }

                    if (pluginInstance.templateBrowser) {
                        pluginInstance.templateBrowser.show();
                    } else {
                        alert('Please create a simulation first.');
                    }
                };

                // Hover effect
                browseTemplatesBtn.addEventListener('mouseenter', () => {
                    browseTemplatesBtn.style.background = 'var(--accent-hover)';
                });
                browseTemplatesBtn.addEventListener('mouseleave', () => {
                    browseTemplatesBtn.style.background = 'var(--accent-primary)';
                });
            }

            // New Simulation button
            const newBtn = document.getElementById('ovistate-new-btn');
            if (newBtn) {
                newBtn.onclick = () => {
                    if (pluginInstance.createNewSimulation) {
                        pluginInstance.createNewSimulation(engine);
                    }
                };
            }

            // Export button
            const exportBtn = document.getElementById('ovistate-export-btn');
            if (exportBtn) {
                exportBtn.onclick = () => {
                    if (pluginInstance.activeEditor) {
                        import('../editor/EnhancedExporter.js').then(module => {
                            const simulationData = pluginInstance.activeEditor.getSimulationData();
                            module.default.export(simulationData);
                        });
                    } else {
                        alert('Please create a simulation first.');
                    }
                };
            }

            // Symbol Picker Integration
            const addSymbolBtn = document.getElementById('add-symbol-btn');
            if (addSymbolBtn && pluginInstance.activeEditor) {
                addSymbolBtn.onclick = async () => {
                    // Lazy load symbol picker
                    const { default: SymbolPicker } = await import('./components/SymbolPicker.js');

                    if (!pluginInstance.symbolPicker) {
                        pluginInstance.symbolPicker = new SymbolPicker(engine);
                    }

                    // Open picker and handle selection
                    pluginInstance.symbolPicker.open((selectedSymbol) => {
                        // Create symbol object at canvas center
                        const editor = pluginInstance.activeEditor;
                        const symbolObj = {
                            id: 'symbol_' + Date.now(),
                            type: 'symbol',
                            symbol: selectedSymbol,
                            x: editor.runtime.width / 2,
                            y: editor.runtime.height / 2,
                            size: 48, // Default size
                            rotation: 0,
                            opacity: 1,
                            selected: true
                        };

                        // Deselect all other objects
                        editor.runtime.objects.forEach(o => o.selected = false);

                        // Add to objects array
                        editor.runtime.addObject(symbolObj);
                        editor.simulationData.objects.push(symbolObj);

                        // Select the new symbol
                        editor.selectedObject = symbolObj;

                        // Update inspector
                        import('./Inspector.js').then(module => {
                            module.default.render(engine, editor.selectedObject);
                        });
                    });
                };
            }

            // Physics gravity slider
            const gravityInput = document.getElementById('physics-gravity');
            const gravityValue = document.getElementById('gravity-value');
            if (gravityInput && gravityValue) {
                gravityInput.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    gravityValue.textContent = value.toFixed(1) + ' m/s²';
                    if (pluginInstance.activeEditor && pluginInstance.activeEditor.physics) {
                        pluginInstance.activeEditor.physics.gravity = value;
                        pluginInstance.activeEditor.simulationData.physics.gravity = value;
                    }
                });
            }

            // Setup drag events for objects
            const draggables = document.querySelectorAll('.draggable-object, .draggable-behavior');
            draggables.forEach(el => {
                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('itemType', el.getAttribute('data-type'));
                    e.dataTransfer.setData('category', el.classList.contains('draggable-behavior') ? 'behavior' : 'object');
                    e.dataTransfer.effectAllowed = 'copy';
                });
            });
        }, 0);
    }
}
