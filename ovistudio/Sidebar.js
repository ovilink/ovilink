
export default class Sidebar {
    static render(engine, pluginInstance) {
        if (!pluginInstance) return;
        const activeEditor = pluginInstance.getActiveEditor();
        console.log("Sidebar Render:", activeEditor ? `Mode=${activeEditor.audioMode}` : "No Editor");

        const oviStateTabs = Array.from(engine.tabManager.tabs.entries())
            .filter(([id, tab]) => tab.pluginId === 'ovistate')
            .map(([id, tab]) => ({ id, title: tab.tabEl.querySelector('span').innerText }));

        engine.layoutManager.setSidebarContent(`
            <style>
                .studio-sidebar {
                    padding: 16px;
                    color: var(--text-primary);
                    font-family: inherit;
                }
                .studio-header {
                    margin-bottom: 24px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .studio-header h3 {
                    margin: 0;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .section-label {
                    font-size: 10px;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                    display: block;
                    font-weight: 600;
                }
                .online-badge {
                    background: #27ae6020;
                    color: #2ecc71;
                    font-size: 9px;
                    font-weight: bold;
                    padding: 2px 6px;
                    border-radius: 10px;
                    letter-spacing: 0.5px;
                }
                .sidebar-card {
                    margin-bottom: 16px;
                    padding: 12px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                }
                .btn-studio-new {
                    padding: 6px 12px;
                    background: var(--text-accent);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 600;
                    transition: opacity 0.2s;
                }
                .btn-studio-new:hover { opacity: 0.9; }
            </style>

            <div class="studio-sidebar">
                <div class="studio-header">
                    <h3>Smart Studio</h3>
                    <button id="studio-new-btn" class="btn-studio-new">New</button>
                </div>

                ${!activeEditor ? `
                    <div style="text-align: center; padding: 40px 10px; color: var(--text-secondary); background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: 8px;">
                        <p style="font-size: 13px; margin: 0;">No active project.</p>
                        <p style="font-size: 11px; margin-top: 5px; opacity: 0.7;">Create a new project to start directing.</p>
                    </div>
                ` : `
                    <!-- === 1. SOURCE PANEL === -->
                    ${activeEditor.sourceMode === 'ovistate' ? `
                        <div style="margin-bottom: 15px;">
                            <label class="section-label">Simulation Source</label>
                            <select id="studio-link-select" style="width: 100%; padding: 8px; background: var(--bg-input); color: white; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px;">
                                <option value="">Select OviState Tab</option>
                                ${oviStateTabs.map(tab => `<option value="${tab.id}" ${activeEditor.linkedSimulationTabId === tab.id ? 'selected' : ''}>${tab.title}</option>`).join('')}
                            </select>
                        </div>
                    ` : `
                        <div class="sidebar-card" style="background: rgba(52, 152, 219, 0.05); border-color: rgba(52, 152, 219, 0.2);">
                            <div style="font-size: 11px; color: #3498db; font-weight: 600;">HTML MODE ACTIVE</div>
                            <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px;">External content is ready for capture.</div>
                        </div>
                    `}

                    <!-- === 2. AUDIO PANEL === -->
                    <div style="margin-top: 24px;">
                        <label class="section-label">Audio Controller</label>

                        <!-- MODE: TTS -->
                        ${activeEditor.audioMode === 'tts' ? `
                            <div class="sidebar-card">
                                <h4 style="margin: 0 0 12px 0; font-size: 11px; color: var(--text-primary); text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
                                    <span>Neural Voice</span>
                                    <span class="online-badge">ONLINE</span>
                                </h4>
                                
                                <!-- Persona Selector -->
                                <div style="margin-bottom: 12px;">
                                    <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 4px;">Voice Persona</label>
                                    <select id="voice-persona-select" style="width: 100%; padding: 6px; background: var(--bg-input); color: white; border: 1px solid var(--border-color); border-radius: 4px; font-size: 11px;">
                                        <option value="female">Female (Default)</option>
                                        <option value="male">Male (Simulated)</option>
                                        <option value="child">Child (Simulated)</option>
                                    </select>
                                </div>

                                <!-- Manual Parameters -->
                                <div style="display: flex; gap: 12px; margin-bottom: 10px;">
                                    <div style="flex: 1;">
                                        <label style="font-size: 9px; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            Pitch <span id="val-pitch" style="color: var(--text-accent);">0</span>
                                        </label>
                                        <input type="range" id="voice-pitch-slider" min="-1000" max="1000" step="50" value="0" style="width: 100%; height: 4px;">
                                    </div>
                                    <div style="flex: 1;">
                                        <label style="font-size: 9px; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            Speed <span id="val-speed" style="color: var(--text-accent);">1.0</span>
                                        </label>
                                        <input type="range" id="voice-speed-slider" min="0.5" max="2.0" step="0.05" value="1.0" style="width: 100%; height: 4px;">
                                    </div>
                                </div>
                            </div>

                            <!-- Main Script Input -->
                            <div style="margin-bottom: 24px;">
                                <label class="section-label">Director Script (Bangla)</label>
                                <textarea id="studio-script-input" style="width: 100%; height: 100px; background: var(--bg-input); color: white; border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; font-size: 13px; line-height: 1.5; resize: vertical;" placeholder="এখানে আপনার স্ক্রিপ্টটি লিখুন...">${activeEditor.fullScript}</textarea>
                            </div>

                            <!-- Sync Timeline -->
                            <div id="sentence-blocks">
                                <h4 style="font-size: 11px; color: var(--text-accent); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Sync Timeline</h4>
                                ${activeEditor.sentences.map((s, idx) => `
                                    <div class="sentence-card" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 10px; transition: border-color 0.2s;">
                                        <div style="font-size: 12px; color: var(--text-primary); margin-bottom: 8px; line-height: 1.4;">${s.text}</div>
                                        <div style="display: flex; flex-direction: column; gap: 6px;">
                                            <select class="action-select" data-idx="${idx}" style="width: 100%; font-size: 10px; background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-color); padding: 6px; border-radius: 4px;">
                                                <option value="">No Action</option>
                                                <option value="play" ${s.action === 'play' ? 'selected' : ''}>Play Simulation</option>
                                                <option value="pause" ${s.action === 'pause' ? 'selected' : ''}>Pause Simulation</option>
                                                <option value="reset" ${s.action === 'reset' ? 'selected' : ''}>Reset Simulation</option>
                                                <option value="highlight" ${s.action === 'highlight' ? 'selected' : ''}>Highlight Object</option>
                                                <option value="pointer" ${s.action === 'pointer' ? 'selected' : ''}>Point at Target</option>
                                            </select>
                                            
                                            ${(s.action === 'highlight' || s.action === 'pointer') ? `
                                                <input type="text" class="target-input" data-idx="${idx}" value="${s.target || ''}" 
                                                    placeholder="Object ID or 'center'" 
                                                    style="width: 100%; font-size: 10px; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color); padding: 5px; border-radius: 4px; outline: none;">
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        <!-- MODE: MIC -->
                        ${activeEditor.audioMode === 'mic' ? `
                            <div class="sidebar-card" style="border-left: 3px solid #e74c3c;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                                    <div style="width: 8px; height: 8px; background: #e74c3c; border-radius: 50%; box-shadow: 0 0 6px #e74c3c;"></div>
                                    <h4 style="margin: 0; font-size: 11px; color: var(--text-primary); text-transform: uppercase;">Live Microphone</h4>
                                </div>
                                <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
                                    Speak to record voiceover during production. The script will act as a teleprompter.
                                </div>
                                <div style="height: 3px; background: var(--bg-input); border-radius: 2px; overflow: hidden;">
                                    <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60); animation: mic-pulse 1.5s infinite alternate ease-in-out;"></div>
                                </div>
                            </div>
                            <style>
                                @keyframes mic-pulse {
                                    0% { width: 10%; opacity: 0.3; }
                                    100% { width: 85%; opacity: 1; }
                                }
                            </style>
                        ` : ''}

                        <!-- MODE: FILE -->
                        ${activeEditor.audioMode === 'file' ? `
                             <div class="sidebar-card">
                                <h4 style="margin: 0 0 10px 0; font-size: 11px; color: var(--text-primary); text-transform: uppercase;">Audio File</h4>
                                <div style="font-size: 10px; color: ${activeEditor.audioFileUrl ? '#2ecc71' : 'var(--text-secondary)'};">
                                    ${activeEditor.audioFileUrl ? '✓ File successfully loaded' : 'No file selected'}
                                </div>
                             </div>
                        ` : ''}

                        <!-- 3. Production Controls -->
                        <div style="position: sticky; bottom: 0; background: var(--bg-primary); padding: 20px 0 0 0; margin-top: 24px; border-top: 1px solid var(--border-color);">
                            <button id="studio-record-btn" style="width: 100%; padding: 14px; background: #e74c3c; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                                <div style="width: 10px; height: 10px; background: white; border-radius: 2px;"></div>
                                Start Production
                            </button>
                            <button id="studio-stop-btn" style="width: 100%; padding: 14px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: none;">
                                 Stop Directing
                            </button>
                        </div>
                    </div>
                `}
            </div>
        `);

        // Bind Events
        setTimeout(() => {
            const scriptInput = document.getElementById('studio-script-input');
            if (scriptInput) {
                scriptInput.onchange = () => {
                    activeEditor.updateScript(scriptInput.value);
                };
            }

            const actionSelects = document.querySelectorAll('.action-select');
            actionSelects.forEach(select => {
                select.onchange = () => {
                    const idx = select.getAttribute('data-idx');
                    activeEditor.sentences[idx].action = select.value;
                    this.render(engine, pluginInstance); // Refresh to show/hide target input
                };
            });

            // ... existing listeners ...

            // Voice Model Loading Logic
            const modelInput = document.getElementById('voice-model-file');
            const configInput = document.getElementById('voice-config-file');
            const voiceStatus = document.getElementById('voice-status');

            let loadedModel = null;
            let loadedConfig = null;

            const updateVoiceStatus = () => {
                if (loadedModel && loadedConfig) {
                    voiceStatus.innerText = "✅ Neural Model Ready (Bangla)";
                    voiceStatus.style.color = "#27ae60";

                    // Activate in OviVoice
                    const voicePlugin = engine.pluginManager.getPlugin('ovivoice');
                    if (voicePlugin && voicePlugin.neuralEngine) {
                        voicePlugin.neuralEngine.loadModel(null, loadedModel, loadedConfig);
                    }
                } else if (loadedModel) {
                    voiceStatus.innerText = "⚠️ Config missing (.json)";
                } else if (loadedConfig) {
                    voiceStatus.innerText = "⚠️ Model missing (.onnx)";
                }
            };

            if (modelInput) {
                modelInput.onchange = (e) => {
                    if (e.target.files.length > 0) {
                        loadedModel = e.target.files[0];
                        updateVoiceStatus();
                    }
                };
            }

            if (configInput) {
                configInput.onchange = (e) => {
                    if (e.target.files.length > 0) {
                        loadedConfig = e.target.files[0];
                        updateVoiceStatus();
                    }
                };
            }

            // Voice UI Logic (Existing)
            const personaSelect = document.getElementById('voice-persona-select');
            const pitchSlider = document.getElementById('voice-pitch-slider');
            const speedSlider = document.getElementById('voice-speed-slider');
            const valPitch = document.getElementById('val-pitch');
            const valSpeed = document.getElementById('val-speed');

            if (personaSelect) {
                // Initialize UI safely
                if (activeEditor) {
                    if (activeEditor.voicePersona) personaSelect.value = activeEditor.voicePersona;
                    if (pitchSlider) pitchSlider.value = activeEditor.voicePitch || 0;
                    if (speedSlider) speedSlider.value = activeEditor.voiceSpeed || 1.0;
                    if (valPitch && pitchSlider) valPitch.innerText = pitchSlider.value;
                    if (valSpeed && speedSlider) valSpeed.innerText = speedSlider.value;
                }

                personaSelect.onchange = () => {
                    console.log('Voice Settings Changed'); // Debug
                    if (!activeEditor) return;
                    const persona = personaSelect.value;
                    let pitch = 0;
                    let speed = 1.0;

                    if (persona === 'male') {
                        pitch = -750; // Deeper to compensate for speed
                        speed = 1.05; // Slightly faster as requested
                    } else if (persona === 'child') {
                        pitch = 350;
                        speed = 1.1;
                    }

                    if (pitchSlider) pitchSlider.value = pitch;
                    if (speedSlider) speedSlider.value = speed;
                    if (valPitch) valPitch.innerText = pitch;
                    if (valSpeed) valSpeed.innerText = speed;

                    activeEditor.voicePersona = persona;
                    activeEditor.voicePitch = pitch;
                    activeEditor.voiceSpeed = speed;
                };

                // Add Slider Listeners
                if (pitchSlider) {
                    pitchSlider.oninput = () => {
                        if (activeEditor) {
                            activeEditor.voicePitch = parseInt(pitchSlider.value);
                            if (valPitch) valPitch.innerText = pitchSlider.value;
                        }
                    };
                }
                if (speedSlider) {
                    speedSlider.oninput = () => {
                        if (activeEditor) {
                            activeEditor.voiceSpeed = parseFloat(speedSlider.value);
                            if (valSpeed) valSpeed.innerText = speedSlider.value;
                        }
                    };
                }
            }


            const linkSelect = document.getElementById('studio-link-select');
            if (linkSelect) {
                linkSelect.onchange = () => {
                    activeEditor.linkedSimulationTabId = linkSelect.value;
                    this.render(engine, pluginInstance);
                };
            }

            const recordBtn = document.getElementById('studio-record-btn');
            const stopBtn = document.getElementById('studio-stop-btn');
            if (recordBtn && stopBtn) {
                recordBtn.onclick = () => {
                    activeEditor.startProduction();
                    recordBtn.style.display = 'none';
                    stopBtn.style.display = 'block';
                };
                stopBtn.onclick = () => {
                    activeEditor.stopProduction();
                    recordBtn.style.display = 'block';
                    stopBtn.style.display = 'none';
                };
            }

            const newBtn = document.getElementById('studio-new-btn');
            if (newBtn) {
                newBtn.onclick = () => {
                    const name = prompt("Production Title:", "My New Video");
                    if (name) pluginInstance.createNewProject(name);
                };
            }
        }, 0);
    }
}
