export default class Sidebar {
    static render(engine, pluginInstance) {
        engine.layoutManager.setSidebarContent(`
            <style>
                .sidebar-section {
                    margin-bottom: 20px;
                }
                .sidebar-section h3 {
                    font-size: 11px;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                    padding-bottom: 4px;
                    border-bottom: 1px solid var(--border-color);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                }
                /* Toolbar Grid Layout */
                .tools-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 4px;
                }
                .draggable-object {
                    width: 100%;
                    aspect-ratio: 1;
                    padding: 6px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: grab;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .draggable-object:hover {
                    background: var(--bg-hover);
                    border-color: var(--accent-primary);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .draggable-object:active {
                    cursor: grabbing;
                    transform: translateY(0);
                }
                .draggable-object img {
                    width: 24px;
                    height: 24px;
                    pointer-events: none;
                    filter: grayscale(100%) opacity(0.8);
                    transition: all 0.2s;
                }
                .draggable-object:hover img {
                    filter: none;
                    transform: scale(1.1);
                }
                /* Tooltip logic usually handled by 'title' attribute, simplified here */
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
                    width: 100%;
                ">Browse Templates</button>
            </div>

            <div class="sidebar-section">
                <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                    <button id="ovistate-new-btn" class="btn-full" style="flex: 1; padding: 8px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer;">New</button>
                    <button id="ovistate-import-btn" class="btn-full" style="flex: 1; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; padding: 8px;">Import</button>
                    <input type="file" id="ovistate-import-file" accept=".html,.htm" style="display: none;">
                </div>
                <button id="ovistate-export-btn" class="btn-full" style="width: 100%; padding: 8px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer;">Export Smart HTML</button>
            </div>

            <div class="sidebar-section">
                <h3>Tools & Objects</h3>
                <div class="tools-grid">
                    <!-- Basic Shapes -->
                    <div class="draggable-object" draggable="true" data-type="rect" title="Rectangle">
                        <img src="icon/Rectangle.svg" alt="Rect">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="circle" title="Circle">
                        <img src="icon/circle.svg" alt="Circle">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="path" title="Path / Pen Tool">
                        <img src="icon/path.svg" alt="Path">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="text" title="Text">
                        <img src="icon/text.svg" alt="Text">
                    </div>
                    <div id="add-symbol-btn" class="draggable-object" title="Symbol Library">
                        <img src="icon/symbol.svg" alt="Symbol">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="sprite" title="Animated Sprite">
                        <img src="icon/animated_sprite.svg" alt="Sprite">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="emitter" title="Particle Emitter">
                        <img src="icon/emitter.svg" alt="Emitter">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="trigger_zone" title="Trigger Zone">
                        <img src="icon/trigger_zone.svg" alt="Zone">
                    </div>
                    
                    <!-- Physics & Force Fields -->
                    <div class="draggable-object" draggable="true" data-type="force_field" data-subtype="wind" title="Wind Force">
                        <img src="icon/wind.svg" alt="Wind">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="force_field" data-subtype="magnet" title="Magnet Force">
                        <img src="icon/magnet.svg" alt="Magnet">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="spring" title="Spring / Rope">
                        <img src="icon/spring.svg" alt="Spring">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="joint" title="Physics Joint">
                        <img src="icon/physics_joint.svg" alt="Joint">
                    </div>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>UI Controls</h3>
                <div class="tools-grid">
                    <!-- Placeholder Icons for UI Controls using Generic Shapes/Text for now -->
                   <div class="draggable-object" draggable="true" data-type="button" title="Button">
                        <img src="icon/button.svg" alt="Button">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="slider" title="Slider">
                         <img src="icon/slider.svg" alt="Slider">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="joystick" title="Joystick">
                         <img src="icon/joystick.svg" alt="Joystick">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="checkbox" title="Checkbox">
                         <img src="icon/checkbox.svg" alt="Checkbox">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="dropdown" title="Dropdown">
                         <img src="icon/dropdown.svg" alt="Dropdown">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="color_picker" title="Color Picker">
                         <img src="icon/color_picker.svg" alt="Color">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="text_input" title="Text Input">
                         <img src="icon/text_input.svg" alt="Text">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="progress_bar" title="Progress Bar">
                         <img src="icon/progress_bar.svg" alt="Progress">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="toggle_switch" title="Toggle Switch">
                         <img src="icon/toggle_switch.svg" alt="Toggle">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="trackpad" title="Trackpad">
                         <img src="icon/trackpad.svg" alt="Trackpad">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="knob" title="Rotary Knob">
                         <img src="icon/rotary_knob.svg" alt="Knob">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="graph" title="Line Graph">
                         <img src="icon/line_graph.svg" alt="Graph">
                    </div>
                </div>
            </div>
            
            <div class="sidebar-section">
                 <h3>Logic & Data</h3>
                 <div class="tools-grid">
                    <div class="draggable-object" draggable="true" data-type="variable" title="Variable">
                        <img src="icon/variable.svg" alt="Variable">
                    </div>
                    <div class="draggable-object" draggable="true" data-type="timer" title="Timer">
                        <img src="icon/timer.svg" alt="Timer">
                    </div>
                 </div>
            </div>

            <div class="sidebar-section">
                <h3>Global Physics</h3>
                <!-- Compact Vertical Sliders maybe? Keeping standard styles for proper control -->
                <div style="margin-bottom: 8px;">
                    <label style="font-size: 10px; display: block; margin-bottom: 2px; color: var(--text-secondary);">GRAVITY Y</label>
                    <input type="range" id="physics-gravity" min="-5000" max="5000" step="10" value="1500" class="mini-slider" style="width:100%">
                    <span id="gravity-value" style="font-size: 10px; color: #aaa; float:right; margin-top:-16px; pointer-events:none;">1500</span>
                </div>
                
                 <div style="margin-bottom: 8px;">
                    <label style="font-size: 10px; display: block; margin-bottom: 2px; color: var(--text-secondary);">WIND X</label>
                    <input type="range" id="physics-wind" min="-2000" max="2000" step="10" value="0" class="mini-slider" style="width:100%">
                    <span id="wind-value" style="font-size: 10px; color: #aaa; float:right; margin-top:-16px; pointer-events:none;">0</span>
                </div>
            </div>

                <div style="margin-bottom: 10px;">
                    <label style="font-size: 11px; display: block; margin-bottom: 5px; color: var(--text-secondary);">Air Resistance</label>
                    <input type="range" id="physics-friction" min="0" max="2" step="0.01" value="0.1" 
                        style="width: 100%; margin-bottom: 5px;">
                    <span id="friction-value" style="font-size: 11px; color: var(--text-primary); font-weight: 600;">0.1</span>
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="font-size: 11px; display: block; margin-bottom: 5px; color: var(--text-secondary);">Time Scale</label>
                    <input type="range" id="physics-timescale" min="0.1" max="5" step="0.1" value="1" 
                        style="width: 100%; margin-bottom: 5px;">
                    <span id="timescale-value" style="font-size: 11px; color: var(--text-primary); font-weight: 600;">1.0x</span>
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="font-size: 11px; display: block; margin-bottom: 5px; color: var(--text-secondary);">Wall Bounciness</label>
                    <input type="range" id="physics-wall-bounce" min="0" max="2" step="0.1" value="0.8" 
                        style="width: 100%; margin-bottom: 5px;">
                    <span id="wall-bounce-value" style="font-size: 11px; color: var(--text-primary); font-weight: 600;">0.8</span>
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

            // Import Logic
            const importFile = document.getElementById('ovistate-import-file');
            const importBtn = document.getElementById('ovistate-import-btn');

            if (importBtn && importFile) {
                importBtn.onclick = () => importFile.click();
                importFile.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                        const html = evt.target.result;
                        const { default: HTMLImporter } = await import('./HTMLImporter.js');
                        const importer = new HTMLImporter();
                        const projectData = importer.parse(html);

                        // Load into Active Simulation
                        if (pluginInstance.activeEditor) {
                            const editor = pluginInstance.activeEditor;

                            // 1. Clear existing objects
                            editor.runtime.objects = [];
                            editor.simulationData.objects = [];

                            // 2. Load Objects
                            if (projectData.objects) {
                                projectData.objects.forEach(obj => {
                                    // Ensure basic properties
                                    if (obj.x === undefined) obj.x = editor.runtime.width / 2;
                                    if (obj.y === undefined) obj.y = editor.runtime.height / 2;

                                    editor.runtime.addObject(obj);
                                    editor.simulationData.objects.push(obj);
                                    console.log('Added Object:', obj);
                                });
                            }

                            // 3. Load Parameters (as Global Controls)
                            // "ProjectExporter" used 'parameters', "EnhancedExporter" uses 'controls'. Handle both.
                            const importedControls = projectData.controls || projectData.parameters || [];
                            if (importedControls.length > 0) {
                                editor.simulationData.controls = importedControls;
                                importedControls.forEach(c => {
                                    editor.runtime.addControl(c);
                                });
                                // Force UI to Render the new controls
                                if (editor.runtime.ui && editor.runtime.ui.init) {
                                    editor.runtime.ui.init();
                                }
                            }

                            // 4. Load Scripts
                            if (projectData.scripts) {
                                const combinedScript = projectData.scripts.map(s => s.content).join('\n\n');
                                editor.simulationData.globalScript = combinedScript;
                            } else if (projectData.globalScript) {
                                // EnhancedExporter stores it as globalScript string directly sometimes, or valid format
                                editor.simulationData.globalScript = projectData.globalScript;
                            }

                            console.log('OviState Import Complete:', editor.simulationData);
                            editor.importedProject = projectData; // Keep reference for export

                            const objCount = (projectData.objects || []).length;
                            const paramCount = importedControls.length;
                            alert(`Successfully Imported:\n- ${objCount} Visual Objects\n- ${paramCount} Interactive Parameters\n- Logic Scripts`);
                        } else {
                            alert('Create a simulation first to import data into.');
                        }
                    };
                    reader.readAsText(file);
                };
            }

            // Export button (Updated to Use ProjectExporter)
            const exportBtn = document.getElementById('ovistate-export-btn');
            if (exportBtn) {
                exportBtn.onclick = () => {
                    if (pluginInstance.activeEditor) {
                        import('../editor/EnhancedExporter.js').then(module => {
                            // Using the original EnhancedExporter which includes the full runtime
                            // We modified it to ALSO include the Smart Data Tag for re-import.
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

            // Initialization check for existing editor physics
            if (pluginInstance.activeEditor && pluginInstance.activeEditor.simulationData.physics) {
                const phys = pluginInstance.activeEditor.simulationData.physics;
                if (phys.gravity !== undefined) {
                    const el = document.getElementById('physics-gravity');
                    if (el) el.value = phys.gravity;
                    const valEl = document.getElementById('gravity-value');
                    if (valEl) valEl.textContent = phys.gravity + ' px/s²';
                }
                if (phys.gravityX !== undefined) {
                    const el = document.getElementById('physics-wind');
                    if (el) el.value = phys.gravityX;
                    const valEl = document.getElementById('wind-value');
                    if (valEl) valEl.textContent = phys.gravityX + ' px/s²';
                }
                if (phys.friction !== undefined) {
                    const el = document.getElementById('physics-friction');
                    if (el) el.value = phys.friction;
                    const valEl = document.getElementById('friction-value');
                    if (valEl) valEl.textContent = phys.friction.toFixed(2);
                }
                if (phys.timeScale !== undefined) {
                    const el = document.getElementById('physics-timescale');
                    if (el) el.value = phys.timeScale;
                    const valEl = document.getElementById('timescale-value');
                    if (valEl) valEl.textContent = phys.timeScale.toFixed(1) + 'x';
                }
                if (phys.wallBounciness !== undefined) {
                    const el = document.getElementById('physics-wall-bounce');
                    if (el) el.value = phys.wallBounciness;
                    const valEl = document.getElementById('wall-bounce-value');
                    if (valEl) valEl.textContent = phys.wallBounciness.toFixed(1);
                }
            }

            // Physics gravity slider
            const gravityInput = document.getElementById('physics-gravity');
            const gravityValue = document.getElementById('gravity-value');
            if (gravityInput && gravityValue) {
                gravityInput.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    gravityValue.textContent = value + ' px/s²';
                    if (pluginInstance.activeEditor) {
                        const editor = pluginInstance.activeEditor;
                        if (editor.runtime) editor.runtime.gravity = value;
                        editor.simulationData.physics.gravity = value;
                    }
                });
            }

            // Physics: Wind
            const windInput = document.getElementById('physics-wind');
            const windValue = document.getElementById('wind-value');
            if (windInput && windValue) {
                windInput.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    windValue.textContent = value + ' px/s²';
                    if (pluginInstance.activeEditor) {
                        const editor = pluginInstance.activeEditor;
                        if (editor.runtime) editor.runtime.gravityX = value;
                        editor.simulationData.physics.gravityX = value;
                    }
                });
            }

            // Physics: Friction
            const frictionInput = document.getElementById('physics-friction');
            const frictionValue = document.getElementById('friction-value');
            if (frictionInput && frictionValue) {
                frictionInput.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    frictionValue.textContent = value.toFixed(2);
                    if (pluginInstance.activeEditor) {
                        const editor = pluginInstance.activeEditor;
                        if (editor.runtime) editor.runtime.friction = value;
                        editor.simulationData.physics.friction = value;
                    }
                });
            }

            // Physics: Time Scale
            const timeScaleInput = document.getElementById('physics-timescale');
            const timeScaleValue = document.getElementById('timescale-value');
            if (timeScaleInput && timeScaleValue) {
                timeScaleInput.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    timeScaleValue.textContent = value.toFixed(1) + 'x';
                    if (pluginInstance.activeEditor) {
                        const editor = pluginInstance.activeEditor;
                        if (editor.runtime) editor.runtime.timeScale = value;
                        editor.simulationData.physics.timeScale = value;
                    }
                });
            }

            // Physics: Wall Bounciness
            const wallBounceInput = document.getElementById('physics-wall-bounce');
            const wallBounceValue = document.getElementById('wall-bounce-value');
            if (wallBounceInput && wallBounceValue) {
                wallBounceInput.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    wallBounceValue.textContent = value.toFixed(1);
                    if (pluginInstance.activeEditor) {
                        const editor = pluginInstance.activeEditor;
                        if (editor.runtime) editor.runtime.wallBounciness = value;
                        editor.simulationData.physics.wallBounciness = value;
                    }
                });
            }

            // Setup drag events for objects
            const draggables = document.querySelectorAll('.draggable-object, .draggable-behavior');
            draggables.forEach(el => {
                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('itemType', el.getAttribute('data-type'));
                    e.dataTransfer.setData('category', el.classList.contains('draggable-behavior') ? 'behavior' : 'object');
                    // Pass subtype if exists (for force fields, joints, etc.)
                    const subtype = el.getAttribute('data-subtype');
                    if (subtype) {
                        e.dataTransfer.setData('subtype', subtype);
                    }
                    e.dataTransfer.effectAllowed = 'copy';
                });
            });
        }, 0);
    }
}
