import Director from './Director.js';
import StudioInspector from './StudioInspector.js';
import Recorder from './Recorder.js';
import ModeTutorial from './modes/ModeTutorial.js';
import ModeAdMaker from './modes/ModeAdMaker.js';

export default class StudioEditor {
    constructor(engine, plugin) {
        this.engine = engine;
        this.plugin = plugin;
        this.id = null;

        // --- Project Settings ---
        this.projectSettings = {
            width: 1280,
            height: 720,
            fps: 30,
            bgColor: '#ffffff'
        };

        // --- Source & Content ---
        this.sourceMode = 'ovistate'; // 'ovistate' | 'html'
        this.linkedSimulationTabId = null;
        this.htmlContentString = null; // Raw HTML for srcdoc

        // --- HTML Content Sizing (Anti-Stretch) ---
        this.htmlFrameW = null; // null = match project width
        this.htmlFrameH = null; // null = match project height

        // --- Audio ---
        this.audioMode = 'tts'; // 'tts' | 'file' | 'mic'
        this.inspector = new StudioInspector(this);

        this.audioElement = document.createElement('audio');
        this.bgmElement = document.createElement('audio');
        this.bgmElement.loop = true;
        this.bgmVolume = 0.3; // Default 30% for BGM
        this.bgmFileUrl = null;

        // --- Modes & Workspace ---
        this.modes = {
            'tutorial': new ModeTutorial(this),
            'admaker': new ModeAdMaker(this)
        };
        this.activeMode = this.modes['tutorial'];

        // Streams & Assets
        this.micStream = null;
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = "anonymous";

        // --- TTS State ---
        this.fullScript = "";
        this.sentences = [];
        this.currentSentenceIndex = -1;
        this.voicePersona = 'female';
        this.voicePitch = 0;
        this.voiceSpeed = 1.0;

        // --- Core ---
        this.director = new Director(engine, this);
        this.recorder = new Recorder(engine);

        this.container = document.createElement('div');
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.background = '#1e1e1e';
        this.container.style.color = '#eee';
        this.container.style.fontFamily = 'var(--font-family)';

        this.render();

        // --- Activate Initial Mode ---
        if (this.activeMode) this.activeMode.activate();
    }

    updateScript(text) {
        this.fullScript = text;
        const rawSentences = text.split(/([।\.!\?])/g);
        const combined = [];
        for (let i = 0; i < rawSentences.length; i += 2) {
            const s = rawSentences[i]?.trim();
            const p = rawSentences[i + 1] || "";
            if (s) {
                const existing = this.sentences.find(oldS => oldS.text === s + p);
                combined.push(existing ? existing : { text: s + p, action: null, target: "" });
            }
        }
        this.sentences = combined;
        // In TTS mode, script update might trigger re-render or just status update
        if (this.audioMode === 'tts') this.render();
        if (this.plugin && this.plugin.refreshSidebar) this.plugin.refreshSidebar();

        // Mount Inspector
        if (this.engine.layoutManager) {
            const inspectorContent = this.inspector.render();
            // Pass DOM element directly now that LayoutManager supports it
            this.engine.layoutManager.setInspectorContent(inspectorContent);
        }
    }

    // --- INSPECTOR ACTIONS ---
    setMode(modeId) {
        if (!this.modes[modeId]) return;
        if (this.activeMode) this.activeMode.deactivate();
        this.activeMode = this.modes[modeId];
        this.activeMode.activate();
        this.render();
        this.refreshInspector();
    }

    refreshInspector() {
        if (this.engine.layoutManager) {
            this.engine.layoutManager.setInspectorContent(this.inspector.render());
        }
    }



    syncIframeSettings() {
        const frame = this.container.querySelector(`#html-frame-${this.id}`);
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({
                type: 'sync-settings',
                settings: { quickFocus: this.activeMode.settings?.quickFocus || false }
            }, '*');
        }
    }


    updateOverlays() {
        const layer = this.container.querySelector(`#overlays-layer-${this.id}`);
        if (layer) {
            // Let the active mode handle overlay rendering
            // Note: If ModeTutorial has facecamEl, we manage it here to avoid reloading video stream if possible,
            // or we let ModeTutorial manage its own DOM elements inside activate/deactivate.
            // For now, let's simplify and let renderOverlays return the HTML.
            layer.innerHTML = this.activeMode.renderOverlays();
            this.activeMode.bindEvents(layer);
        }
    }


    createRipple(e, container) {
        const circle = document.createElement('div');
        const diameter = Math.max(container.clientWidth, container.clientHeight) * 0.1; // 10% size
        const radius = diameter / 2;
        const color = this.activeMode.settings?.haloColor || '#ffff00';

        let x, y;
        if (e.isInternal) {
            x = e.x;
            y = e.y;
        } else {
            const rect = container.getBoundingClientRect();
            const scale = this.currentScale || 1;
            x = (e.clientX - rect.left) / scale;
            y = (e.clientY - rect.top) / scale;
        }

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${x - radius}px`;
        circle.style.top = `${y - radius}px`;
        circle.style.position = 'absolute';
        circle.style.borderRadius = '50%';
        circle.style.border = `2px solid ${color}`;
        circle.style.backgroundColor = `${color}4D`; // 30% Opacity
        circle.style.pointerEvents = 'none';
        circle.style.zIndex = '100';
        circle.style.animation = 'ripple 0.6s linear';

        // Inline keyframe if not present, but better in CSS? 
        // We will just animate via JS or assume ripple class.
        // Let's use transition for simplicity or Web Animation API
        circle.animate([
            { transform: 'scale(0)', opacity: 1 },
            { transform: 'scale(2)', opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        }).onfinish = () => circle.remove();

        const layer = this.container.querySelector(`#overlays-layer-${this.id}`) || container;
        layer.appendChild(circle);
    }


    render() {
        // --- CLEAN RECORDING MODE LOGIC ---
        const frameW = this.htmlFrameW || this.projectSettings.width;
        const frameH = this.htmlFrameH || this.projectSettings.height;
        const isRecording = this.recorder && this.recorder.isRecording;

        this.container.innerHTML = `
            <!-- TOOLBAR (Updated) -->
            <div id="toolbar-${this.id}" style="height: 48px; background: #252526; border-bottom: 1px solid #333; display: flex; align-items: center; padding: 0 10px; gap: 8px; flex-shrink: 0; white-space: nowrap; overflow: hidden; transition: height 0.3s, opacity 0.3s;">
                
                <!-- WORKSPACE SWITCHER (NEW) -->
                <div style="display: flex; align-items: center; background: #1e1e1e; padding: 2px 8px; border-radius: 4px; border: 1px solid #444; margin-right: 5px;">
                    <select id="mode-switcher-${this.id}" style="background: transparent; border: none; color: #3794ff; font-weight: bold; font-size: 11px; cursor: pointer; outline: none;">
                        ${Object.entries(this.modes).map(([id, m]) => `
                            <option value="${id}" ${this.activeMode === m ? 'selected' : ''}>${m.name.toUpperCase()}</option>
                        `).join('')}
                    </select>
                </div>

                <div style="width: 1px; height: 20px; background: #444; margin-right: 5px;"></div>

                <!-- Resolution & BG -->
                <div style="display: flex; align-items: center; background: #1e1e1e; padding: 3px 6px; border-radius: 4px; border: 1px solid #333; gap: 4px;">
                    <div style="font-size: 10px; color: #666; font-weight: bold;">RES</div>
                    
                     <!-- Res Preset -->
                    <select id="res-preset-${this.id}" style="width: 15px; height: 20px; border: none; background: transparent; color: #888; cursor: pointer; font-size: 10px;">
                        <option value="">▼</option>
                        <option value="1920,1080">1080p (FHD)</option>
                        <option value="1280,720">720p (HD)</option>
                        <option value="360,640">Portrait (Mobile)</option>
                        <option value="640,360">Landscape (Mobile)</option>
                        <option value="1080,1080">Square (Ig/Fb)</option>
                    </select>

                    <input type="number" id="res-w-${this.id}" value="${this.projectSettings.width}" style="width: 40px; background: transparent; border: none; color: white; text-align: right; font-size: 11px; -moz-appearance: textfield;">
                    <span style="color: #444; font-size: 10px;">x</span>
                    <input type="number" id="res-h-${this.id}" value="${this.projectSettings.height}" style="width: 40px; background: transparent; border: none; color: white; text-align: left; font-size: 11px; -moz-appearance: textfield;">
                    


                    <div style="width: 1px; height: 12px; background: #444; margin: 0 4px;"></div>
                    <input type="color" id="bg-color-${this.id}" value="${this.projectSettings.bgColor}" title="Background Color" style="width: 18px; height: 18px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 2px;">
                </div>

                <div style="width: 1px; height: 20px; background: #444;"></div>

                <!-- Source Mode (Hidden in Ad Maker for clarity) -->
                ${!this.activeMode?.name.includes("Ad Maker") ? `
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="display: flex; background: #333; border-radius: 4px; padding: 2px;">
                        ${this.renderToggleBtn('ovistate', 'OviState', this.sourceMode === 'ovistate')}
                        ${this.renderToggleBtn('html', 'HTML', this.sourceMode === 'html')}
                    </div>
                </div>
                ` : `
                <div style="font-size: 11px; color: #444; font-weight: bold; border: 1px solid #333; padding: 4px 10px; border-radius: 4px; background: rgba(0,0,0,0.2);">
                    AD SCENE MODE
                </div>
                `}

                <!-- HTML Content Size (Visible only in HTML Mode) -->
                ${this.sourceMode === 'html' ? `
                    <div style="display: flex; align-items: center; gap: 5px; border-left: 1px solid #444; padding-left: 10px;">
                        <span style="font-size: 11px; color: #888; text-transform: uppercase;">Content:</span>
                        <input type="number" id="html-w-${this.id}" placeholder="Auto" value="${this.htmlFrameW || ''}" style="width: 50px; background: #333; border: 1px solid #444; color: white; padding: 2px 5px; border-radius: 3px; border-color: ${this.htmlFrameW ? '#27ae60' : '#444'}">
                        <span style="color: #666;">x</span>
                        <input type="number" id="html-h-${this.id}" placeholder="Auto" value="${this.htmlFrameH || ''}" style="width: 50px; background: #333; border: 1px solid #444; color: white; padding: 2px 5px; border-radius: 3px; border-color: ${this.htmlFrameW ? '#27ae60' : '#444'}">
                        
                        <!-- PRESETS -->
                        <select id="size-preset-${this.id}" style="width: 15px; height: 20px; border: none; background: #333; color: white; cursor: pointer; border-radius: 3px; font-size: 10px;">
                            <option value="">Presets</option>
                            <option value="360,640">Mobile Portrait (360x640)</option>
                            <option value="640,360">Mobile Landscape (640x360)</option>
                            <option value="1280,720">HD (1280x720)</option>
                            <option value="1920,1080">Full HD (1920x1080)</option>
                            <option value="800,600">Retro (800x600)</option>
                            <option value="erase">Reset (Auto/Fill)</option>
                        </select>


                    </div>
                ` : ''}

                <div style="width: 1px; height: 20px; background: #444;"></div>

                <!-- Audio Mode -->
                <div style="display: flex; background: #333; border-radius: 4px; padding: 2px;">
                    ${this.renderToggleBtn('audio-tts', 'TTS', this.audioMode === 'tts')}
                    ${this.renderToggleBtn('audio-file', 'File', this.audioMode === 'file')}
                    ${this.renderToggleBtn('audio-mic', 'Mic', this.audioMode === 'mic')}
                </div>

                <div style="flex: 1;"></div>

                <!-- Controls -->
                 <button id="btn-start-prod-${this.id}" 
                    class="btn-primary" 
                    title="${isRecording ? 'Stop Production' : 'Start Production'}"
                    style="background: ${isRecording ? '#e74c3c' : '#27ae60'}; border: none; padding: 8px 12px; border-radius: 4px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: background 0.2s;">
                    ${isRecording ? '⏹' : '▶'}
                </button>
            </div>

            <!-- MAIN STAGE (Canvas / Iframe) -->
            <div style="flex: 1; position: relative; overflow: hidden; background: inherit; display: flex; align-items: center; justify-content: center;">
                
                <!-- Stage Container (Scaled to Fit) -->
                <div id="stage-container-${this.id}" style="
                    width: ${this.projectSettings.width}px; 
                    height: ${this.projectSettings.height}px; 
                    background: ${this.projectSettings.bgColor}; 
                    position: relative; 
                    transform-origin: center center;
                    display: flex; align-items: center; justify-content: center;
                ">
                    <canvas id="mirror-canvas-${this.id}" 
                        width="${this.projectSettings.width}" 
                        height="${this.projectSettings.height}" 
                        style="width: 100%; height: 100%; display: ${this.sourceMode === 'ovistate' ? 'block' : 'none'}; object-fit: contain;">
                    </canvas>

                    <!-- HTML Mode: Iframe (Sized & Centered) using srcdoc -->
                    <iframe id="html-frame-${this.id}" 
                        srcdoc="${(this.htmlContentString ?
                `<script>
                                let quickFocusEnabled = ${this.activeMode.settings?.quickFocus ? 'true' : 'false'};
                                window.addEventListener('message', (e) => {
                                    if (e.data && e.data.type === 'sync-settings') {
                                        if (e.data.settings.quickFocus !== undefined) quickFocusEnabled = e.data.settings.quickFocus;
                                    }
                                });
                                document.addEventListener('mousemove', (e) => {
                                    window.parent.postMessage({
                                        type: 'ovi-mouse-move-${this.id}',
                                        x: e.clientX,
                                        y: e.clientY
                                    }, '*');
                                });
                                document.addEventListener('mousedown', (e) => {
                                    window.parent.postMessage({
                                        type: 'ovi-mousedown-${this.id}',
                                        button: e.button,
                                        x: e.clientX,
                                        y: e.clientY
                                    }, '*');
                                });
                                document.addEventListener('mouseup', (e) => {
                                    window.parent.postMessage({
                                        type: 'ovi-mouseup-${this.id}',
                                        button: e.button
                                    }, '*');
                                });
                                document.addEventListener('contextmenu', (e) => {
                                    if (quickFocusEnabled) e.preventDefault();
                                });
                                document.addEventListener('click', (e) => {
                                    window.parent.postMessage({
                                        type: 'ovi-click-${this.id}',
                                        x: e.clientX,
                                        y: e.clientY
                                    }, '*');
                                });
                            </script>` + this.htmlContentString
                : '').replace(/"/g, '&quot;')}"
                        style="
                            width: ${frameW}px; 
                            height: ${frameH}px; 
                            border: none; 
                            background: transparent; 
                            display: ${this.sourceMode === 'html' ? 'block' : 'none'};
                        "
                        sandbox="allow-scripts allow-popups allow-pointer-lock allow-forms">
                    </iframe>

                    <div id="msg-overlay-${this.id}" style="position: absolute; pointer-events: none; color: white; background: rgba(0,0,0,0.7); padding: 10px 20px; border-radius: 6px; display: none;">
                        Status Message
                    </div>

                    <!-- EFFECT OVERLAYS LAYER -->
                <div id="overlays-layer-${this.id}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50; overflow: hidden;"></div>

                <!-- TELESTRATOR LAYER (Separate to avoid overwrite) -->
                <div id="telestrator-layer-${this.id}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 200;"></div>

                ${this.renderImportOverlay()}
            </div>

            <!-- CLEAN RECORDING OVERLAY (STOP BUTTON) -->
            <div id="recording-overlay-${this.id}" style="
                    position: absolute; 
                    bottom: 20px; 
                    right: 20px; 
                    background: rgba(0,0,0,0.8); 
                    padding: 10px 20px; 
                    border-radius: 30px; 
                    display: none; 
                    align-items: center; 
                    gap: 10px; 
                    z-index: 999;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                ">
                    <div style="width: 10px; height: 10px; background: #e74c3c; border-radius: 50%; box-shadow: 0 0 10px #e74c3c; animation: pulse 1s infinite;"></div>
                    <span style="color: white; font-weight: bold; font-size: 12px; letter-spacing: 1px;">ON AIR</span>
                    <button id="btn-stop-overlay-${this.id}" style="margin-left: 10px; background: white; color: black; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 11px;">STOP</button>
                    <style>
                        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                        
                        /* Global Transitions */
                        .ovi-transition-fade { animation: ovi-fade 0.5s ease; }
                        @keyframes ovi-fade { from { opacity: 0; } to { opacity: 1; } }
                        
                        .ovi-transition-zoom { animation: ovi-zoom 0.5s cubic-bezier(0.165, 0.84, 0.44, 1); }
                        @keyframes ovi-zoom { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    </style>
                </div>

            </div>

            <!-- BOTTOM PANEL (Audio / Script) -->
            <div id="bottom-panel-${this.id}" style="height: 120px; background: #1e1e1e; border-top: 1px solid #333; display: flex; transition: height 0.3s, opacity 0.3s;">
                ${this.renderBottomPanel()}
            </div>
        `;

        this.bindEvents();
        this.updateStageScale();

        if (this.sourceMode === 'ovistate') {
            this.setupMirroring();
        } else {
            if (this.mirrorInterval) clearInterval(this.mirrorInterval);
        }

        // MOUNT INSPECTOR (Fixed)
        if (this.engine.layoutManager) {
            this.engine.layoutManager.setInspectorContent(this.inspector.render());
        }
    }

    renderToggleBtn(id, label, active) {
        const bg = active ? '#3794ff' : 'transparent';
        const color = active ? 'white' : '#aaa';
        return `<div data-action="toggle-${id}" style="padding: 4px 10px; border-radius: 3px; cursor: pointer; background: ${bg}; color: ${color}; font-size: 11px;">${label}</div>`;
    }

    renderImportOverlay() {
        // Skip import overlays if in Ad Maker mode
        if (this.activeMode && this.activeMode.name.includes("Ad Maker")) {
            return '';
        }

        if (this.sourceMode === 'html' && !this.htmlContentString) {
            return `
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); z-index: 10;">
                    <div style="font-size: 40px; margin-bottom: 20px;">🌐</div>
                    <h3 style="margin: 0 0 10px 0;">Import HTML Animation</h3>
                    <p style="color: #888; margin-bottom: 20px; font-size: 12px; max-width: 300px; text-align: center;">select .html file containing your interactive animation.</p>
                    <input type="file" id="html-upload-${this.id}" accept=".html" style="display: none;">
                    <button onclick="document.getElementById('html-upload-${this.id}').click()" class="btn-secondary" style="padding: 8px 20px;">Select HTML File</button>
                    <p style="color: #666; font-size: 10px; margin-top: 10px;">Safe Import via srcdoc</p>
                </div>
            `;
        }
        if (this.sourceMode === 'ovistate' && !this.linkedSimulationTabId) {
            return `
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); pointer-events: none;">
                    <span style="background: rgba(0,0,0,0.8); color: #aaa; padding: 10px 20px; border-radius: 6px;">Link an OviState Project from Sidebar</span>
                </div>
            `;
        }
        return '';
    }

    renderBottomPanel() {
        if (this.activeMode && this.activeMode.renderBottomPanel) {
            return this.activeMode.renderBottomPanel();
        }

        if (this.audioMode === 'file') {
            const hasFile = !!this.audioFileUrl;
            return `
                <div style="flex: 1; padding: 20px; display: flex; align-items: center; justify-content: center; gap: 20px;">
                    ${!hasFile ? `
                        <input type="file" id="audio-upload-${this.id}" accept="audio/*" style="display: none;">
                        <button onclick="document.getElementById('audio-upload-${this.id}').click()" class="btn-secondary">📂 Import Audio File</button>
                    ` : `
                        <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                            <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">Audio Loaded</div>
                            <audio id="audio-preview-${this.id}" controls src="${this.audioFileUrl}" style="width: 80%; max-width: 600px; height: 30px;"></audio>
                            <button id="btn-clear-audio-${this.id}" style="background: none; border: none; color: #e74c3c; font-size: 11px; margin-top: 5px; cursor: pointer;">Remove</button>
                        </div>
                    `}
                </div>
            `;
        } else {
            return `
                <div id="teleprompter-${this.id}" style="flex: 1; padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: white;">
                    <div id="prompter-text-${this.id}" style="font-size: 18px; font-weight: 500; max-width: 800px; color: #fff;">
                        ${this.sentences.length > 0 ? (this.currentSentenceIndex >= 0 ? this.sentences[this.currentSentenceIndex].text : 'Ready to Start') : 'Setup script in Sidebar.'}
                    </div>
                </div>
            `;
        }
    }

    bindEvents() {
        // Toggles
        this.container.querySelectorAll('[data-action^="toggle-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'toggle-ovistate') this.setSourceMode('ovistate');
                if (action === 'toggle-html') this.setSourceMode('html');
                if (action === 'toggle-audio-tts') this.setAudioMode('tts');
                if (action === 'toggle-audio-file') this.setAudioMode('file');
                if (action === 'toggle-audio-mic') {
                    this.audioMode = 'mic';
                    // Request Mic Permission immediately for UX
                    navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(stream => {
                            this.micStream = stream;
                            console.log("🎤 Microphone Access Granted");
                            this.render();
                            if (this.plugin) this.plugin.refreshSidebar();
                        })
                        .catch(e => {
                            alert("Microphone access denied: " + e.message);
                            this.audioMode = 'tts'; // Fallback
                            this.render();
                        });
                }
            });
        });


        // Resolution
        const wInput = this.container.querySelector(`#res-w-${this.id}`);
        const hInput = this.container.querySelector(`#res-h-${this.id}`);
        const updateRes = () => {
            if (wInput && hInput) {
                this.projectSettings.width = parseInt(wInput.value) || 1280;
                this.projectSettings.height = parseInt(hInput.value) || 720;
                this.updateStageScale();
                this.render();
            }
        };
        wInput?.addEventListener('change', updateRes);
        hInput?.addEventListener('change', updateRes);



        // Resolution Presets (New)
        const resPreset = this.container.querySelector(`#res-preset-${this.id}`);
        if (resPreset) {
            resPreset.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val) {
                    const parts = val.split(',');
                    this.projectSettings.width = parseInt(parts[0]);
                    this.projectSettings.height = parseInt(parts[1]);
                    this.updateStageScale();
                    this.render();
                }
            });
        }

        // BG Color
        const bgInput = this.container.querySelector(`#bg-color-${this.id}`);
        if (bgInput) {
            bgInput.addEventListener('change', (e) => {
                this.projectSettings.bgColor = e.target.value;
                const stage = this.container.querySelector(`#stage-container-${this.id}`);
                if (stage) stage.style.background = this.projectSettings.bgColor;
            });
        }

        // HTML Content Size
        const htmlW = this.container.querySelector(`#html-w-${this.id}`);
        const htmlH = this.container.querySelector(`#html-h-${this.id}`);
        const presetSel = this.container.querySelector(`#size-preset-${this.id}`);
        const updateHtmlSize = () => {
            if (htmlW) this.htmlFrameW = parseInt(htmlW.value) || null;
            if (htmlH) this.htmlFrameH = parseInt(htmlH.value) || null;
            this.render();
        };
        htmlW?.addEventListener('change', updateHtmlSize);
        htmlH?.addEventListener('change', updateHtmlSize);

        if (presetSel) {
            presetSel.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === "erase") {
                    this.htmlFrameW = null;
                    this.htmlFrameH = null;
                } else if (val) {
                    const parts = val.split(',');
                    this.htmlFrameW = parseInt(parts[0]);
                    this.htmlFrameH = parseInt(parts[1]);
                }
                this.render();
            });
        }

        // HTML Upload (Read as Text for srcdoc + Parsing)
        const htmlInput = this.container.querySelector(`#html-upload-${this.id}`);
        if (htmlInput) {
            htmlInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const content = evt.target.result;
                        this.htmlContentString = content;

                        // Smart Parse
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(content, 'text/html');
                        const canvas = doc.querySelector('canvas');
                        if (canvas) {
                            const w = parseInt(canvas.getAttribute('width'));
                            const h = parseInt(canvas.getAttribute('height'));
                            if (!isNaN(w) && !isNaN(h)) {
                                this.htmlFrameW = w;
                                this.htmlFrameH = h;
                            }
                        }
                        this.render();
                    };
                    reader.readAsText(file);
                }
            });
        }

        // Audio Upload
        const audioInput = this.container.querySelector(`#audio-upload-${this.id}`);
        if (audioInput) {
            audioInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.audioFileUrl = URL.createObjectURL(file);
                    this.audioElement.src = this.audioFileUrl;
                    this.render();
                }
            });
        }

        const clearAudioBtn = this.container.querySelector(`#btn-clear-audio-${this.id}`);
        if (clearAudioBtn) {
            clearAudioBtn.addEventListener('click', () => {
                this.audioFileUrl = null;
                this.audioElement.src = "";
                this.render();
            });
        }

        const startBtn = this.container.querySelector(`#btn-start-prod-${this.id}`);
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (this.recorder.isRecording) this.stopProduction();
                else this.startProduction();
            });
        }

        // Mode Switcher
        const modeSwitcher = this.container.querySelector(`#mode-switcher-${this.id}`);
        if (modeSwitcher) {
            modeSwitcher.addEventListener('change', (e) => this.setMode(e.target.value));
        }

        // Delegate to active mode
        if (this.activeMode && this.activeMode.bindEvents) {
            this.activeMode.bindEvents(this.container);
        }

        if (!this._resizeObserver) {
            this._resizeObserver = new ResizeObserver(() => this.updateStageScale());
            this._resizeObserver.observe(this.container);
        }
    }

    setMode(modeId) {
        if (this.modes[modeId]) {
            if (this.activeMode && this.activeMode.deactivate) {
                this.activeMode.deactivate();
            }
            this.activeMode = this.modes[modeId];
            this.activeMode.activate();
            this.render();
            console.log(`🚀 Switched to: ${this.activeMode.name}`);
        }
    }

    setSourceMode(mode) {
        this.sourceMode = mode;
        this.render();
    }

    setAudioMode(mode) {
        this.audioMode = mode;
        if (this.plugin) this.plugin.refreshSidebar();
        this.render();
    }

    updateOverlays() {
        const layer = this.container.querySelector(`#overlays-layer-${this.id}`);
        if (layer && this.activeMode) {
            layer.innerHTML = this.activeMode.renderOverlays();
        }
    }

    refreshInspector() {
        if (this.engine.layoutManager && this.inspector) {
            this.engine.layoutManager.setInspectorContent(this.inspector.render());
        }
    }

    updateStageScale() {
        const stage = this.container.querySelector(`#stage-container-${this.id}`);
        if (!stage) return;

        // Dynamic calculation based on visibility of bars
        const toolbar = this.container.querySelector(`#toolbar-${this.id}`);
        const bottom = this.container.querySelector(`#bottom-panel-${this.id}`);

        // Use offsetHeight which will be 0 when hidden
        const toolbarH = toolbar ? toolbar.offsetHeight : 50;
        const bottomH = bottom ? bottom.offsetHeight : 120;

        const parentH = this.container.clientHeight - toolbarH - bottomH;
        const parentW = this.container.clientWidth;
        const padding = 20; // Reduce padding for immersive look
        const availW = parentW - padding;
        const availH = parentH - padding;
        const scale = Math.min(
            availW / this.projectSettings.width,
            availH / this.projectSettings.height
        );
        this.currentScale = Math.min(scale, 1);
        stage.style.transform = `scale(${this.currentScale})`;
    }




    setupMirroring() {
        if (this.mirrorInterval) clearInterval(this.mirrorInterval);
        this.mirrorInterval = setInterval(() => {
            const mirrorCanvas = this.container.querySelector(`#mirror-canvas-${this.id}`);
            const sim = this.getLinkedSimulation();
            const isAdMaker = this.activeMode && this.activeMode.name.includes("Ad Maker");

            if (mirrorCanvas) {
                const mctx = mirrorCanvas.getContext('2d');
                if (this.sourceMode === 'ovistate' && sim && sim.runtime?.canvas) {
                    const source = sim.runtime.canvas;
                    mctx.fillStyle = 'black';
                    mctx.fillRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
                    const scale = Math.min(
                        mirrorCanvas.width / source.width,
                        mirrorCanvas.height / source.height
                    );
                    const x = (mirrorCanvas.width - source.width * scale) / 2;
                    const y = (mirrorCanvas.height - source.height * scale) / 2;
                    mctx.drawImage(source, 0, 0, source.width, source.height, x, y, source.width * scale, source.height * scale);
                    if (this.director.isActive && this.director.overlayCanvas) {
                        mctx.drawImage(this.director.overlayCanvas, 0, 0, mirrorCanvas.width, mirrorCanvas.height);
                    }
                } else {
                    // Transparent or custom clear for Ad Maker
                    mctx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
                }
            }

            // --- Real-time Overlays (Kinetic Text, Halo, etc) ---
            this.updateOverlays();

            // Real-time Timeline Update
            const timeEl = this.container.querySelector('#timeline-time');
            if (timeEl && this.audioElement) {
                const sec = this.audioElement.currentTime;
                const m = Math.floor(sec / 60).toString().padStart(2, '0');
                const s = Math.floor(sec % 60).toString().padStart(2, '0');
                const ms = Math.floor((sec % 1) * 100).toString().padStart(2, '0');
                if (timeEl.innerText !== `${m}:${s}.${ms}`) {
                    timeEl.innerText = `${m}:${s}.${ms}`;
                }

                // Active Scene Highlight
                if (this.activeMode && this.activeMode.scenes) {
                    this.updateActiveSceneHighlight(sec);
                }
            }
        }, 32);
    }

    updateActiveSceneHighlight(time) {
        const blocks = this.container.querySelectorAll('.scene-block');
        this.activeMode.scenes.forEach((s, i) => {
            const block = blocks[i];
            if (block) {
                if (time >= s.start && time < s.end) {
                    block.style.borderColor = '#3794ff';
                    block.style.background = '#323233';
                } else {
                    block.style.borderColor = (this.activeMode.activeSceneIndex === i) ? '#3794ff' : '#444';
                    block.style.background = '#2d2d2d';
                }
            }
        });
    }

    getLinkedSimulation() {
        if (!this.linkedSimulationTabId) return null;
        const tab = this.engine.tabManager.tabs.get(this.linkedSimulationTabId);
        return tab ? tab.editorInstance : null;
    }

    toggleCleanMode(enable) {
        const toolbar = this.container.querySelector(`#toolbar-${this.id}`);
        const bottom = this.container.querySelector(`#bottom-panel-${this.id}`);
        const overlay = this.container.querySelector(`#recording-overlay-${this.id}`);

        if (enable) {
            if (toolbar) toolbar.style.display = 'none';
            if (bottom) bottom.style.display = 'none';
            if (overlay) overlay.style.display = 'flex';
            this.container.style.background = this.projectSettings.bgColor; // Seamless BG
        } else {
            if (toolbar) toolbar.style.display = 'flex';
            if (bottom) bottom.style.display = 'flex';
            if (overlay) overlay.style.display = 'none';
            this.container.style.background = '#1e1e1e'; // Restore Dark BG
        }

        // Recalculate layout immediately so stage centers
        // Small delay to allow DOM update
        setTimeout(() => this.updateStageScale(), 50);
    }

    async startProduction() {
        console.log("🎬 Starting Production...");

        // 1. Prepare Audio Stream EARLY (Silence for now)
        let audioFileStream = null;
        if (this.audioMode === 'file') {
            if (!this.audioFileUrl) {
                alert("Please import an audio file first.");
                return;
            }
            // Capture stream before playing to set up mixer.
            // Note: In some browsers, we might need a dummy play/pause, but captureStream usually works on src.
            if (this.audioElement.captureStream) audioFileStream = this.audioElement.captureStream();
            else if (this.audioElement.mozCaptureStream) audioFileStream = this.audioElement.mozCaptureStream();
        } else if (this.audioMode === 'tts') {
            if (!this.sentences || this.sentences.length === 0) {
                alert("Please add a script in the sidebar for TTS mode!");
                return;
            }
            this.currentSentenceIndex = 0;
            this.render();
        } else if (this.audioMode === 'mic') {
            this.currentSentenceIndex = 0; // Teleprompter still works if script exists, but not required
            this.render();
        }

        // 2. Start Logic
        if (this.sourceMode === 'ovistate') {
            const sim = this.getLinkedSimulation();
            if (!sim) {
                alert("No OviState project linked!");
                return;
            }
            const recordCanvas = this.container.querySelector(`#mirror-canvas-${this.id}`);

            // For OviState, immediate start is fine
            if (this.audioMode === 'file') this.audioElement.play();
            this.director.start(sim);
            this.recorder.start(recordCanvas, audioFileStream);

        } else if (this.sourceMode === 'html') {

            // --- SMART CAPTURE: Direct Canvas Detection ---
            const iframe = this.container.querySelector(`#html-frame-${this.id}`);
            let internalCanvas = null;
            try {
                if (iframe && iframe.contentDocument) {
                    internalCanvas = iframe.contentDocument.querySelector('canvas');
                }
            } catch (e) {
                console.warn("Could not access iframe content (CORS?):", e);
            }

            // A) DIRECT CANVAS PATH (Crystal Clear, No Audio from iframe)
            if (internalCanvas) {
                console.log("🎥 OPTIMIZED: Using Direct Internal Canvas Capture!");

                // Show countdown for UX consistency
                await this.showCountdown(3);
                this.toggleCleanMode(true);

                // Start Director/Audio
                if (this.audioMode === 'file') {
                    this.audioElement.play();
                } else if (this.sentences && this.sentences.length > 0) {
                    this.director.start(null);
                }

                // Capture Stream directly
                const stream = internalCanvas.captureStream(this.projectSettings.fps);

                // Mix Audio (Studio Audio Only)
                // Note: We skip getDisplayMedia, so we lose "System/Tab" audio. 
                // This is a trade-off for 100% video quality.
                const systemStream = this.engine.audioManager ? this.engine.audioManager.getStream() : null;
                const mixedAudioTrack = this.mixAudioStreams(null, audioFileStream, this.micStream, systemStream);

                let finalTracks = [...stream.getVideoTracks()];
                if (mixedAudioTrack) finalTracks.push(mixedAudioTrack);

                const finalStream = new MediaStream(finalTracks);
                this.recorder.startFromStream(finalStream);

            } else {

                // B) FALLBACK: Screen Recording (DOM/SVG content)
                alert("Please select the 'Studio' tab or this specific window when prompted.\n\nNOTE: Audio will start AUTO-MAGICALLY after you pick the screen!");
                try {
                    // 3. Request Screen (Blocks here until user picks)
                    const displayStream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: this.projectSettings.fps,
                            displaySurface: "browser"
                        },
                        audio: true
                    });

                    // 4. Stream Obtained! NOW we sync audio.

                    // OPTIONAL: Warm up stream?

                    // --- QUALITY FIX: FORCE 100% SCALE ---
                    // To get crystal clear DOM recording, we must render 1:1 pixels.
                    // We temporarily remove the fit-to-screen scaling.
                    const stageContainer = this.container.querySelector(`#stage-container-${this.id}`);
                    if (stageContainer) {
                        this._originalTransform = stageContainer.style.transform;
                        stageContainer.style.transform = 'scale(1)'; // Force Native Res
                        // Ensure it is visible - we might need to handle overflow
                        // For now, let's trust the user has enough screen space or standard Flex handling
                    }

                    // --- COUNTDOWN START ---
                    await this.showCountdown(3);
                    // --- COUNTDOWN END ---

                    // ENABLE CLEAN MODE
                    this.toggleCleanMode(true);
                    this.isCapturing = true; // Use explicit flag for capture loop

                    const stageEl = this.container.querySelector(`#stage-container-${this.id}`);
                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = this.projectSettings.width;
                    cropCanvas.height = this.projectSettings.height;
                    const ctx = cropCanvas.getContext('2d');

                    const tempVideo = document.createElement('video');
                    tempVideo.srcObject = displayStream;
                    tempVideo.muted = true;
                    tempVideo.play().catch(e => console.warn("Video play error", e));

                    const drawCrop = () => {
                        // Check local flag instead of recorder state
                        if (!this.isCapturing) {
                            // Clean up
                            if (displayStream) displayStream.getTracks().forEach(t => t.stop());
                            tempVideo.srcObject = null;
                            tempVideo.remove();
                            cropCanvas.remove();

                            // RESTORE SCALE
                            if (stageContainer && this._originalTransform) {
                                stageContainer.style.transform = this._originalTransform;
                            }
                            return; // Stop loop
                        }

                        if (tempVideo.paused || tempVideo.ended) {
                            requestAnimationFrame(drawCrop);
                            return;
                        }

                        const streamW = tempVideo.videoWidth;
                        const streamH = tempVideo.videoHeight;

                        if (streamW && streamH) {
                            const windowW = window.innerWidth;
                            const windowH = window.innerHeight;
                            const scaleX = streamW / windowW;
                            let scaleY = streamH / windowH;

                            // FIX: Prevent Horizontal Stretching
                            // If scales are roughly equal (within 5%), force uniformity
                            // This assumes pixels are square on the monitor
                            if (Math.abs(scaleX - scaleY) < 0.05) {
                                scaleY = scaleX;
                            }

                            let activeStage = stageEl;
                            if (!activeStage.isConnected) {
                                activeStage = this.container.querySelector(`#stage-container-${this.id}`);
                            }
                            if (!activeStage) return;

                            const rect = activeStage.getBoundingClientRect();

                            const sx = rect.left * scaleX;
                            const sy = rect.top * scaleY;
                            const sWidth = rect.width * scaleX;
                            const sHeight = rect.height * scaleY;

                            ctx.fillStyle = this.projectSettings.bgColor || '#ffffff';
                            ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

                            if (sWidth > 0 && sHeight > 0) {
                                try {
                                    ctx.drawImage(tempVideo, sx, sy, sWidth, sHeight, 0, 0, cropCanvas.width, cropCanvas.height);

                                    // Burn current script into the video (Teleprompter Effect)
                                    if (this.sentences && this.currentSentenceIndex >= 0 && this.sentences[this.currentSentenceIndex]) {
                                        const text = this.sentences[this.currentSentenceIndex].text;
                                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                                        ctx.fillRect(0, cropCanvas.height - 80, cropCanvas.width, 80);

                                        ctx.fillStyle = 'white';
                                        ctx.font = 'bold 24px sans-serif';
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        ctx.fillText(text, cropCanvas.width / 2, cropCanvas.height - 40);
                                    }
                                } catch (e) {
                                    if (Math.random() < 0.01) console.warn("🎥 Recording Capture Error:", e);
                                }
                            }
                        }
                        requestAnimationFrame(drawCrop);
                    };

                    // 5. READY TO ROLL
                    tempVideo.onloadedmetadata = async () => {
                        // Start Drawing Loop immediately
                        drawCrop();

                        // START AUDIO NOW (Sync Point with Warm-up)
                        if (this.audioMode === 'file') {
                            setTimeout(async () => {
                                try {
                                    await this.audioElement.play();
                                } catch (e) {
                                    console.error("Auto-play failed", e);
                                }
                            }, 500); // 500ms Warm-up delay to prevent start stutter
                        } else if (this.sentences && this.sentences.length > 0) {
                            // Use Director to manage the narration sequence even in HTML mode
                            setTimeout(() => {
                                this.director.start(null);
                            }, 500);
                        }

                        // MIX & RECORD
                        const croppedVideoStream = cropCanvas.captureStream(this.projectSettings.fps);
                        const systemStream = this.engine.audioManager ? this.engine.audioManager.getStream() : null;
                        const bgmStream = this.bgmElement && this.bgmElement.src ? (this.bgmElement.captureStream ? this.bgmElement.captureStream() : null) : null;

                        const mixedAudioTrack = this.mixAudioStreams(displayStream, audioFileStream, this.micStream, systemStream, bgmStream);

                        const tracks = [...croppedVideoStream.getVideoTracks()];

                        if (mixedAudioTrack) {
                            console.log("🎥 Using Mixed Audio Track");
                            tracks.push(mixedAudioTrack);
                        } else {
                            const systemTracks = systemStream ? systemStream.getAudioTracks() : [];
                            const displayTracks = displayStream.getAudioTracks();

                            if (systemTracks.length > 0) {
                                console.log("🎥 Falling back to Direct System/TTS Audio track");
                                tracks.push(systemTracks[0]);
                            } else if (displayTracks.length > 0) {
                                console.log("🎥 Falling back to Display/System audio track");
                                tracks.push(displayTracks[0]);
                            }
                        }

                        if (tracks.filter(t => t.kind === 'audio').length === 0) {
                            console.error("🎥 CRITICAL: No audio tracks found for recording!");
                        }

                        const finalStream = new MediaStream(tracks);
                        this.recorder.startFromStream(finalStream);
                    };

                } catch (err) {
                    console.error("Screen recording cancelled or failed", err);
                    this.stopProduction();
                }
            }
        }
    }

    mixAudioStreams(displayStream, fileStream, micStream, systemStream = null, bgmStream = null) {
        if (!this.mixerCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.mixerCtx = new AudioContext();
        }
        const ctx = this.mixerCtx;

        // Critical: Ensure context is running (fixes silent audio)
        if (ctx.state === 'suspended') {
            ctx.resume().then(() => console.log("🔊 Audio Mixer Context Resumed"));
        }

        const dest = ctx.createMediaStreamDestination();
        let hasSource = false;

        if (displayStream && displayStream.getAudioTracks().length > 0) {
            try {
                const source = ctx.createMediaStreamSource(displayStream);
                const gain = ctx.createGain();
                gain.gain.value = 1.0;
                source.connect(gain);
                gain.connect(dest);
                hasSource = true;
                console.log("🔊 Mixer: Added System Audio");
            } catch (e) { console.warn("Mixer Error (System):", e); }
        }

        if (fileStream && fileStream.getAudioTracks().length > 0) {
            try {
                const source = ctx.createMediaStreamSource(fileStream);
                const gain = ctx.createGain();
                gain.gain.value = 1.0;
                source.connect(gain);
                gain.connect(dest);
                hasSource = true;
                console.log("🔊 Mixer: Added File Audio");
            } catch (e) { console.warn("Mixer Error (File):", e); }
        }

        if (micStream && micStream.getAudioTracks().length > 0) {
            try {
                const source = ctx.createMediaStreamSource(micStream);
                const gain = ctx.createGain();
                gain.gain.value = 1.0; // Todo: Add Mic Volume slider
                source.connect(gain);
                gain.connect(dest);
                hasSource = true;
                console.log("🔊 Mixer: Added Microphone Audio");
            } catch (e) { console.warn("Mixer Error (Mic):", e); }
        }

        if (systemStream && systemStream.getAudioTracks().length > 0) {
            try {
                const source = ctx.createMediaStreamSource(systemStream);
                const gain = ctx.createGain();
                gain.gain.value = 1.0;
                source.connect(gain);
                gain.connect(dest);
                hasSource = true;
                console.log("🔊 Mixer: Added System/TTS Audio");
            } catch (e) { console.warn("Mixer Error (System):", e); }
        }

        if (bgmStream && bgmStream.getAudioTracks().length > 0) {
            try {
                const source = ctx.createMediaStreamSource(bgmStream);
                const gain = ctx.createGain();
                gain.gain.value = this.bgmVolume || 0.3;
                source.connect(gain);
                gain.connect(dest);
                hasSource = true;
                console.log("🔊 Mixer: Added BGM Audio");
            } catch (e) { console.warn("Mixer Error (BGM):", e); }
        }

        // Return null if no sources, to fall back to simple track usage if needed
        return hasSource ? dest.stream.getAudioTracks()[0] : null;
    }

    stopProduction() {
        console.log("🎬 Stopping Production...");
        this.isCapturing = false; // Stop drawCrop loop
        if (this.audioMode === 'file') this.audioElement.pause();
        this.director.stop();
        this.recorder.stop();
        this.currentSentenceIndex = -1;

        // Restore UI
        if (this.sourceMode === 'html') {
            this.toggleCleanMode(false);
        }
    }

    showCountdown(seconds) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(0,0,0,0.7)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '9999';
            overlay.style.color = 'white';
            overlay.style.fontSize = '120px';
            overlay.style.fontWeight = 'bold';
            overlay.style.fontFamily = 'sans-serif';
            overlay.innerHTML = seconds;

            this.container.appendChild(overlay);

            let count = seconds;
            const interval = setInterval(() => {
                count--;
                if (count > 0) {
                    overlay.innerHTML = count;
                } else {
                    clearInterval(interval);
                    overlay.remove();
                    resolve();
                }
            }, 1000);
        });
    }
    speak(sentence) {
        if (!sentence || this.audioMode !== 'tts') return;
        const voicePlugin = this.engine.pluginManager.getPlugin('ovivoice');
        if (voicePlugin) {
            voicePlugin.speak(sentence.text || sentence, {
                lang: 'bn-BD',
                dspPitch: this.voicePitch || 0,
                dspSpeed: this.voiceSpeed || 1.0
            });
        }
    }

    updateTeleprompter(index) {
        this.currentSentenceIndex = index;
        const textEl = this.container.querySelector(`#prompter-text-${this.id}`);
        if (textEl) {
            const text = (this.sentences && this.sentences[index]) ? this.sentences[index].text : 'Ready to Start';
            textEl.innerText = text;
        }
    }
}
