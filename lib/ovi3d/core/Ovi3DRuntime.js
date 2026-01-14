import { Vector3, Matrix4 } from './OviMath.js';
import OviRenderer from './OviRenderer.js';
import OviCamera from './OviCamera.js';
import OviControls from './OviControls.js';
import OviLoader from './OviLoader.js';
import OviGeomEngine from './OviGeomEngine.js';

/**
 * Ovi3DRuntime
 * Bootstrapper for 3D objects in the OviState exported environment.
 */
export default class Ovi3DRuntime {
    constructor(canvas, objData) {
        this.canvas = canvas;
        this.objData = objData;

        this.renderer = new OviRenderer(canvas);
        this.camera = new OviCamera(45, canvas.width / canvas.height, 0.1, 1000);
        this.controls = new OviControls(this.camera, canvas);
        this.loader = new OviLoader(this.renderer);
        this.geomEngine = new OviGeomEngine(this.renderer.gl);

        // Create hotspot overlay
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'absolute';
        this.overlay.style.top = '0'; this.overlay.style.left = '0';
        this.overlay.style.width = '100%'; this.overlay.style.height = '100%';
        this.overlay.style.pointerEvents = 'none';
        this.canvas.parentElement.style.position = 'relative';
        this.canvas.parentElement.appendChild(this.overlay);

        // Add CSS for pulsing and transitions
        const style = document.createElement('style');
        style.textContent = `
            @keyframes hspulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.7); }
                70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(26, 115, 232, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26, 115, 232, 0); }
            }
            .hs-dot { animation: hspulse 2s infinite; pointer-events: auto; cursor: pointer; }
            .hs-dot:hover { animation: none; transform: scale(1.3); }
            .ovi3d-toggle-btn {
                position: absolute; right: 15px; top: 15px; width: 36px; height: 36px;
                background: rgba(255,255,255,0.2); backdrop-filter: blur(8px);
                border: 1px solid rgba(255,255,255,0.3); border-radius: 50%;
                cursor: pointer; pointer-events: auto; display: flex; align-items: center; justify-content: center;
                transition: all 0.3s;
            }
            .ovi3d-toggle-btn:hover { background: rgba(255,255,255,0.4); transform: scale(1.1); }
            .ovi3d-toggle-btn svg { width: 22px; height: 22px; fill: #fff; }
            /* Guide Mode UI */
            .ovi3d-info-panel {
                position: absolute; bottom: 30px; left: 30px; width: 320px;
                background: rgba(20, 20, 30, 0.85); backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px;
                padding: 24px; color: #fff; opacity: 0; transform: translateY(20px); transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
                box-shadow: 0 10px 40px rgba(0,0,0,0.5); pointer-events: none;
            }
            .ovi3d-info-panel.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
            .ovi3d-info-title { font-size: 24px; font-weight: 700; margin: 0 0 10px 0; background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .ovi3d-info-desc { font-size: 14px; line-height: 1.6; color: #d0d0d0; margin-bottom: 20px; }
            .ovi3d-nav-controls { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
            .ovi3d-nav-btn {
                background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
                color: #fff; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px;
                transition: all 0.2s; display: flex; align-items: center; gap: 6px;
            }
            .ovi3d-nav-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-2px); }
            .ovi3d-step-indicator { font-size: 12px; color: #888; font-family: monospace; }
            
            /* Hybrid Mode: Subtle Hotspots */
            .hs-dot {
                width: 24px; height: 24px; border: 2px solid rgba(26, 115, 232, 0.4); border-radius: 50%;
                background: transparent; box-shadow: none; animation: none;
                transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
            }
            .hs-dot::after {
                content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 8px; height: 8px; background: rgba(26, 115, 232, 0.6); border-radius: 50%;
            }
            .hs-dot:hover, .hs-dot.active {
                border-color: #fff; background: rgba(26, 115, 232, 0.2);
                box-shadow: 0 0 15px rgba(26, 115, 232, 0.6); transform: scale(1.1);
            }
            .hs-dot:hover::after, .hs-dot.active::after { background: #1a73e8; }
            
            /* Smart Glass Tooltip */
            .hs-card {
                position: absolute; left: 40px; top: -10px; width: 220px;
                background: rgba(20, 20, 30, 0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px;
                padding: 15px; color: #fff; opacity: 0; transform: scale(0.9) translateX(10px);
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                pointer-events: none; z-index: 100;
                transform-origin: left center;
            }
            .hs-card.active { opacity: 1; transform: scale(1) translateX(0); pointer-events: auto; }
            
            .hs-card-title {
                font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 6px;
                text-transform: uppercase; letter-spacing: 0.5px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 4px;
            }
            .hs-card-desc { font-size: 12px; line-height: 1.5; color: #ddd; }
            
            .hs-connector {
                position: absolute; width: 40px; height: 2px;
                background: linear-gradient(90deg, rgba(26,115,232,0.8), rgba(255,255,255,0.2));
                top: 50%; left: -40px; transform-origin: right center;
                opacity: 0; transition: width 0.3s ease-out;
            }
            .hs-card.active .hs-connector { opacity: 1; width: 40px; }

            /* Contextual UI: Auto-Fade */
            .ovi3d-info-panel, .ovi3d-toggle-btn, .ovi3d-hotspot {
                transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .ovi3d-ui-hidden .ovi3d-info-panel { opacity: 0; transform: translateY(20px); pointer-events: none; }
            .ovi3d-ui-hidden .ovi3d-toggle-btn { opacity: 0; transform: translateY(-20px); pointer-events: none; }
            .ovi3d-ui-hidden .ovi3d-hotspot { opacity: 0; pointer-events: none; }

            /* Quiz Mode */
            .ovi3d-quiz-card {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.9);
                width: 400px; padding: 25px;
                background: rgba(20, 20, 30, 0.9); backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px;
                color: #fff; opacity: 0; pointer-events: none;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 20px 60px rgba(0,0,0,0.6); z-index: 200;
            }
            .ovi3d-quiz-card.visible { opacity: 1; transform: translate(-50%, -50%) scale(1); pointer-events: auto; }
            .ovi3d-quiz-question { font-size: 18px; font-weight: 700; margin-bottom: 20px; line-height: 1.4; }
            .ovi3d-quiz-option {
                background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1);
                padding: 12px 15px; margin-bottom: 10px; border-radius: 10px; cursor: pointer;
                transition: all 0.2s; font-size: 14px; display: flex; align-items: center; justify-content: space-between;
            }
            .ovi3d-quiz-option:hover { background: rgba(255,255,255,0.2); transform: translateX(5px); }
            .ovi3d-quiz-option.correct { background: rgba(46, 204, 113, 0.25); border-color: #2ecc71; color: #2ecc71; }
            .ovi3d-quiz-option.incorrect { background: rgba(231, 76, 60, 0.25); border-color: #e74c3c; color: #e74c3c; }
            .ovi3d-quiz-feedback { margin-top: 15px; font-size: 13px; color: #ccc; font-style: italic; min-height: 20px; }
            .ovi3d-quiz-close { 
                position: absolute; top: 15px; right: 15px; width: 24px; height: 24px; cursor: pointer; opacity: 0.7; 
            }
            .ovi3d-quiz-close:hover { opacity: 1; transform: rotate(90deg); transition: all 0.3s; }

            /* X-Ray Slider Control */
            .ovi3d-xray-control {
                position: absolute; bottom: 30px; right: 30px; width: 220px;
                background: rgba(20, 20, 30, 0.85); backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px;
                padding: 15px; color: #fff; pointer-events: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .ovi3d-ui-hidden .ovi3d-xray-control { opacity: 0; transform: translateY(20px); pointer-events: none; }
            .ovi3d-xray-control label {
                font-size: 11px; font-weight: 600; display: block; margin-bottom: 10px;
                text-transform: uppercase; letter-spacing: 0.5px;
                background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            }
            .ovi3d-xray-control input[type="range"] {
                width: 100%; margin-bottom: 8px; cursor: pointer;
                -webkit-appearance: none; appearance: none; background: transparent;
            }
            .ovi3d-xray-control input[type="range"]::-webkit-slider-track {
                background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px;
            }
            .ovi3d-xray-control input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none; appearance: none;
                width: 16px; height: 16px; border-radius: 50%;
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                cursor: pointer; margin-top: -5px;
                box-shadow: 0 2px 8px rgba(79, 172, 254, 0.5);
            }
            .ovi3d-xray-control input[type="range"]::-moz-range-track {
                background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px;
            }
            .ovi3d-xray-control input[type="range"]::-moz-range-thumb {
                width: 16px; height: 16px; border-radius: 50%; border: none;
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                cursor: pointer; box-shadow: 0 2px 8px rgba(79, 172, 254, 0.5);
            }
            .ovi3d-xray-control span {
                font-size: 11px; color: #888; font-family: monospace; display: block; text-align: center;
            }
        `;
        document.head.appendChild(style);

        // Interaction Tracker
        this.lastInteraction = Date.now();
        this.isUserInteracting = false;
        const resetTimer = () => {
            this.lastInteraction = Date.now();
            this.isUserInteracting = true;
            this.overlay.classList.remove('ovi3d-ui-hidden');
            // Resume drift after delay
            clearTimeout(this.driftTimer);
            this.driftTimer = setTimeout(() => { this.isUserInteracting = false; }, 3000);
        };
        ['mousemove', 'mousedown', 'touchstart', 'touchmove', 'click', 'wheel'].forEach(evt => {
            this.canvas.addEventListener(evt, resetTimer);
            this.overlay.addEventListener(evt, resetTimer);
        });

        // Loop to check idle state
        setInterval(() => {
            if (Date.now() - this.lastInteraction > 4000 && !this.isUserInteracting) {
                this.overlay.classList.add('ovi3d-ui-hidden');
            }
        }, 1000);

        // Read Export Settings (Default to TRUE for backward compatibility)
        const settings = objData.metadata?.exportSettings || { guideMode: true, smartDrift: true, autoHideUI: true, defaultVisible: true };
        this.settings = settings;

        // Guide Mode State
        this.guideMode = { active: settings.guideMode, step: -1 };

        // Create Info Panel (Only if Guide Mode is enabled)
        if (this.guideMode.active) {
            this.infoPanel = document.createElement('div');
            this.infoPanel.className = 'ovi3d-info-panel';
            this.infoPanel.innerHTML = `
                <h2 class="ovi3d-info-title">Interactive Guide</h2>
                <div class="ovi3d-info-desc">Welcome to the 3D tour. Use the navigation buttons to explore step-by-step.</div>
                <div class="ovi3d-nav-controls">
                    <button class="ovi3d-nav-btn" id="ovi3d-prev">← Prev</button>
                    <div class="ovi3d-step-indicator" id="ovi3d-step">Start</div>
                    <button class="ovi3d-nav-btn" id="ovi3d-next">Next →</button>
                </div>
            `;
            this.overlay.appendChild(this.infoPanel);


            // Show panel (Transition in)
            setTimeout(() => this.infoPanel.classList.add('visible'), 500);

            this.infoPanel.querySelector('#ovi3d-prev').onclick = () => this.navigateGuide(-1);
            this.infoPanel.querySelector('#ovi3d-next').onclick = () => this.navigateGuide(1);
        }

        // Add Toggle Visibility Button
        this.showHotspots = settings.defaultVisible;
        this.toggleBtn = document.createElement('div');
        this.toggleBtn.className = 'ovi3d-toggle-btn';
        this.toggleBtn.title = 'Toggle Hotspots';
        this.updateToggleIcon();
        this.toggleBtn.onclick = () => {
            this.showHotspots = !this.showHotspots;
            this.hotspotElements.forEach(hse => hse.element.style.visibility = this.showHotspots ? 'visible' : 'hidden');
            this.updateToggleIcon();
        };
        this.overlay.appendChild(this.toggleBtn);

        // Interaction Tracker (Only if Auto-Hide is enabled)
        if (settings.autoHideUI) {
            this.lastInteraction = Date.now();
            this.isUserInteracting = false;
            const resetTimer = () => {
                this.lastInteraction = Date.now();
                this.isUserInteracting = true;
                this.overlay.classList.remove('ovi3d-ui-hidden');
                clearTimeout(this.driftTimer);
                this.driftTimer = setTimeout(() => { this.isUserInteracting = false; }, 3000);
            };
            ['mousemove', 'mousedown', 'touchstart', 'touchmove', 'click', 'wheel'].forEach(evt => {
                this.canvas.addEventListener(evt, resetTimer);
                this.overlay.addEventListener(evt, resetTimer);
            });

            // Loop to check idle state
            setInterval(() => {
                if (Date.now() - this.lastInteraction > 4000 && !this.isUserInteracting) {
                    this.overlay.classList.add('ovi3d-ui-hidden');
                }
            }, 1000);
        } else {
            // If Auto-Hide is OFF, ensure UI is always visible
            setTimeout(() => this.infoPanel?.classList.add('visible'), 500);
        }

        this.hotspots = objData.metadata?.hotspots || [];
        this.hotspotElements = [];
        this.activeHotspot = null;

        // Camera animation state
        // Camera animation & Orbit state
        this.camAnim = {
            active: false,
            startPos: new Vector3(), endPos: new Vector3(),
            startTarget: new Vector3(), endTarget: new Vector3(),
            time: 0, duration: 1500 // Slower for cinematic feel
        };
        this.orbitIdling = { active: false, angle: 0, center: new Vector3() };

        // Apply shared lighting/metadata settings
        if (objData.metadata) {
            if (objData.metadata.lightPos) {
                const lp = objData.metadata.lightPos;
                this.renderer.setLightPosition(lp.x, lp.y, lp.z);
            }
            if (objData.metadata.ambientIntensity !== undefined) {
                this.renderer.setAmbientIntensity(objData.metadata.ambientIntensity);
            }
        }


        this.model = null; // { parts: [], transform }
        this.models = []; // Multi-layer support
        this.isRunning = false;

        // X-Ray Slider Control
        this.xrayDepth = objData.metadata?.xrayDepth || 0; // 0-100
        if (settings.enableXRaySlider) {
            const xrayControl = document.createElement('div');
            xrayControl.className = 'ovi3d-xray-control';
            xrayControl.innerHTML = `
                <label>X-Ray Depth</label>
                <input type="range" id="ovi3d-xray-runtime" min="0" max="100" value="${this.xrayDepth}">
                <span id="ovi3d-xray-runtime-value">${this.xrayDepth}%</span>
            `;
            this.overlay.appendChild(xrayControl);

            const slider = xrayControl.querySelector('#ovi3d-xray-runtime');
            const valueSpan = xrayControl.querySelector('#ovi3d-xray-runtime-value');
            slider.oninput = (e) => {
                this.xrayDepth = parseInt(e.target.value);
                valueSpan.innerText = this.xrayDepth + '%';
                this.updateXRayLayers();
            };
        }

        this.init();
    }

    async init() {
        const metadata = this.objData.metadata || {};

        if (metadata.modelData) {
            // Load GLB from encoded Base64
            try {
                const buffer = this.base64ToArrayBuffer(metadata.modelData);
                const res = await this.loader.loadGLB(buffer);
                this.model = {
                    parts: res.parts,
                    transform: new Matrix4().identity()
                };
            } catch (e) {
                console.error("Ovi3DRuntime: Failed to load embedded GLB", e);
            }
        } else if (metadata.pathPoints) {
            // Extrude from OviVector path points
            this.model = {
                parts: [{
                    geometry: this.geomEngine.extrudePath(metadata.pathPoints),
                    material: { color: [0.8, 0.2, 0.2] },
                    matrix: new Matrix4().identity()
                }],
                transform: new Matrix4().identity()
            };
        }


        if (this.model) {
            // Populate models array for multi-layer support
            // For now, single model = single layer, but structure supports multiple
            this.models.push({
                name: metadata.modelName || 'Model',
                parts: this.model.parts,
                transform: this.model.transform,
                visible: true,
                opacity: 1.0
            });

            // Apply initial X-Ray depth if set
            if (this.xrayDepth > 0) {
                this.updateXRayLayers();
            }

            this.createHotspots();
            this.isRunning = true;

            // Initialize Smart Drift if enabled
            if (this.settings.smartDrift) {
                this.orbitIdling.active = true;
                this.orbitIdling.center.copy(this.camera.target);
                const offset = new Vector3(this.camera.position.x - this.camera.target.x, 0, this.camera.position.z - this.camera.target.z);
                this.orbitIdling.angle = Math.atan2(offset.x, offset.z);
                this.orbitIdling.distance = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
            }

            // Use try-catch to ensure UI failures don't block rendering
            try {
                if (this.settings.enableXRaySlider !== false) {
                    this.createLayerControls();
                }
            } catch (e) {
                console.error("Ovi3D UI Error:", e);
            }

            this.animate();
        }
    }

    createHotspots() {
        this.hotspots.forEach(hs => {
            const el = document.createElement('div');
            el.className = 'ovi3d-hotspot';

            if (this.settings.smartTooltips !== false) {
                el.innerHTML = `<div class="hs-dot"></div>
                <div class="hs-card">
                    <div class="hs-connector"></div>
                    <div class="hs-card-title">${hs.label}</div>
                    <div class="hs-card-desc">${hs.detail || 'Use mouse to explore details.'}</div>
                </div>`;
            } else {
                el.innerHTML = `<div class="hs-dot"></div>
                <div class="hs-label" style="
                    position: absolute; left: 30px; top: -5px; background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(8px); color: #fff; padding: 5px 10px; border-radius: 6px;
                    font-size: 12px; font-weight: 500; white-space: nowrap; pointer-events: none; opacity: 0; 
                    transform: translateX(10px); transition: all 0.4s;
                    border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                ">${hs.label}</div>
                <div class="hs-content" style="
                    position: absolute; left: 20px; top: 18px; background: rgba(255,255,255,0.95);
                    color: #1a1a1a; padding: 10px; border-radius: 8px; width: 170px; font-size: 11px; line-height: 1.4;
                    pointer-events: none; opacity: 0; transform: translateY(10px); transition: all 0.4s;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.2); border-left: 3px solid #1a73e8;
                ">${hs.detail || ''}</div>`;
            }

            el.style.position = 'absolute';
            el.style.left = '0'; el.style.top = '0'; el.style.pointerEvents = 'none';
            el.style.visibility = this.settings.defaultVisible ? 'visible' : 'hidden';
            if (!this.settings.defaultVisible) el.style.display = 'none';

            const dot = el.querySelector('.hs-dot');
            dot.onclick = () => {
                this.flyTo(hs);
                if (hs.quizData) this.showQuiz(hs);
                if (hs.audioUrl) this.playAudio(hs.audioUrl);
            };

            dot.onmouseenter = () => {
                const card = el.querySelector('.hs-card');
                if (card) {
                    // Smart Logic
                    const dotRect = dot.getBoundingClientRect();
                    const overlayRect = this.overlay.getBoundingClientRect();
                    const posX = dotRect.left - overlayRect.left;
                    const posY = dotRect.top - overlayRect.top;
                    const cardW = 260; const cardH = 100;

                    // Reset
                    card.style.left = '40px'; card.style.top = '-10px';
                    card.style.right = 'auto'; card.style.bottom = 'auto';
                    card.style.transformOrigin = 'left center';
                    const conn = card.querySelector('.hs-connector');
                    conn.style.left = '-40px'; conn.style.right = 'auto';
                    conn.style.transformOrigin = 'right center';
                    conn.style.background = 'linear-gradient(90deg, rgba(26,115,232,0.8), rgba(255,255,255,0.2))';

                    // Flip
                    if ((posX + cardW) > overlayRect.width) {
                        card.style.left = 'auto'; card.style.right = '40px';
                        card.style.transformOrigin = 'right center';
                        conn.style.left = 'auto'; conn.style.right = '-40px';
                        conn.style.transformOrigin = 'left center';
                        conn.style.background = 'linear-gradient(-90deg, rgba(26,115,232,0.8), rgba(255,255,255,0.2))';
                    }
                    if ((posY + cardH) > overlayRect.height) {
                        card.style.top = 'auto'; card.style.bottom = '10px';
                    }
                    card.classList.add('active');
                } else {
                    // Legacy Logic
                    const l = el.querySelector('.hs-label');
                    const c = el.querySelector('.hs-content');
                    if (l) { l.style.opacity = '1'; l.style.transform = 'translateX(0)'; }
                    if (c) { c.style.opacity = '1'; c.style.transform = 'translateY(0)'; }
                }
                dot.classList.add('active');
            };

            dot.onmouseleave = () => {
                if (this.activeHotspot !== hs) {
                    dot.classList.remove('active');
                    const card = el.querySelector('.hs-card');
                    if (card) {
                        card.classList.remove('active');
                    } else {
                        const l = el.querySelector('.hs-label');
                        const c = el.querySelector('.hs-content');
                        if (l) { l.style.opacity = '0'; l.style.transform = 'translateX(10px)'; }
                        if (c) { c.style.opacity = '0'; c.style.transform = 'translateY(10px)'; }
                    }
                }
            };

            this.overlay.appendChild(el);
            this.hotspotElements.push({ hotspot: hs, element: el });
        });
    }

    flyTo(hs) {
        if (!hs.camera) return;

        // Remove active class from previous
        if (this.activeHotspot) {
            const prevEl = this.hotspotElements.find(h => h.hotspot === this.activeHotspot)?.element;
            if (prevEl) prevEl.querySelector('.hs-dot').classList.remove('active');
        }

        this.activeHotspot = hs;
        // Highlight new
        const newEl = this.hotspotElements.find(h => h.hotspot === hs)?.element;
        if (newEl) newEl.querySelector('.hs-dot').classList.add('active');

        this.orbitIdling.active = false; // Stop idling during transition
        this.camAnim.active = true;
        this.camAnim.startTime = Date.now();
        this.camAnim.startPos = new Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z);
        this.camAnim.startTarget = new Vector3(this.camera.target.x, this.camera.target.y, this.camera.target.z);
        this.camAnim.endPos = new Vector3(hs.camera.position.x, hs.camera.position.y, hs.camera.position.z);
        this.camAnim.endTarget = new Vector3(hs.camera.target.x, hs.camera.target.y, hs.camera.target.z);
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        // Handle Camera Animation
        if (this.camAnim.active) {
            const elapsed = Date.now() - this.camAnim.startTime;
            let t = Math.min(elapsed / this.camAnim.duration, 1);
            const s = t * t * (3 - 2 * t); // Smoothstep

            this.camera.position.x = this.camAnim.startPos.x + (this.camAnim.endPos.x - this.camAnim.startPos.x) * s;
            this.camera.position.y = this.camAnim.startPos.y + (this.camAnim.endPos.y - this.camAnim.startPos.y) * s;
            this.camera.position.z = this.camAnim.startPos.z + (this.camAnim.endPos.z - this.camAnim.startPos.z) * s;

            this.camera.target.x = this.camAnim.startTarget.x + (this.camAnim.endTarget.x - this.camAnim.startTarget.x) * s;
            this.camera.target.y = this.camAnim.startTarget.y + (this.camAnim.endTarget.y - this.camAnim.startTarget.y) * s;
            this.camera.target.z = this.camAnim.startTarget.z + (this.camAnim.endTarget.z - this.camAnim.startTarget.z) * s;

            this.camera.updateMatrices();
            if (t >= 1) {
                this.camAnim.active = false;
                this.controls.enabled = true;
                this.controls.syncWithCamera();
                // Start Orbit Idling
                if (this.guideMode.active && this.activeHotspot && this.showHotspots) {
                    this.orbitIdling.active = true;
                    this.orbitIdling.center.copy(this.camera.target);
                    // Calculate current angle relative to target
                    const offset = new Vector3(this.camera.position.x - this.orbitIdling.center.x, 0, this.camera.position.z - this.orbitIdling.center.z);
                    this.orbitIdling.angle = Math.atan2(offset.x, offset.z);
                    this.orbitIdling.distance = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
                }
            }
        }

        // SMART DRIFT Logic
        // Respects the export setting
        if (this.settings.smartDrift && this.orbitIdling.active && !this.camAnim.active && !this.controls.isDragging && !this.isUserInteracting) {
            this.orbitIdling.angle += 0.001; // Very slow, subtle drift
            const dist = this.orbitIdling.distance;
            this.camera.position.x = this.orbitIdling.center.x + Math.sin(this.orbitIdling.angle) * dist;
            this.camera.position.z = this.orbitIdling.center.z + Math.cos(this.orbitIdling.angle) * dist;
            this.camera.updateMatrices();
        }

        this.renderer.clear(0, 0, 0, 0); // Transparent background for overlays

        // Render all models with opacity support
        this.models.forEach(model => {
            if (!model.visible) return; // Skip invisible models

            for (const part of model.parts) {
                const partWorldMatrix = new Matrix4();
                partWorldMatrix.elements.set(model.transform.elements);
                if (part.matrix) {
                    partWorldMatrix.multiply(part.matrix);
                }

                // Apply opacity to material
                const material = { ...part.material };
                if (model.opacity !== undefined && model.opacity < 1.0) {
                    material.opacity = model.opacity;
                }

                this.renderer.draw(
                    part.geometry,
                    partWorldMatrix,
                    this.camera.viewMatrix,
                    this.camera.projectionMatrix,
                    material
                );
            }
        });


        // Project Hotspots
        const mvp = new Matrix4();
        mvp.elements.set(this.camera.projectionMatrix.elements);
        mvp.multiply(this.camera.viewMatrix);

        this.hotspotElements.forEach(hse => {
            const pos = new Vector3(hse.hotspot.position.x, hse.hotspot.position.y, hse.hotspot.position.z);
            pos.applyMatrix4(mvp);

            // NDC to Screen
            const rect = this.canvas.getBoundingClientRect();
            const x = (pos.x * 0.5 + 0.5) * rect.width;
            const y = (-pos.y * 0.5 + 0.5) * rect.height;

            // Depth check
            if (pos.z < -1 || pos.z > 1 || !this.showHotspots) {
                hse.element.style.display = 'none';
            } else {
                hse.element.style.display = 'block';
                hse.element.style.transform = `translate(${x}px, ${y}px)`;
            }
        });
    }

    base64ToArrayBuffer(base64) {
        const binary = window.atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    createLayerControls() {
        // Remove potentially existing UI from constructor
        const oldUI = this.overlay.querySelector('.ovi3d-xray-control');
        if (oldUI) oldUI.remove();

        // Create Panel
        const container = document.createElement('div');
        container.className = 'ovi3d-xray-control';
        container.style.height = 'auto';
        container.style.maxHeight = '40vh';
        container.style.overflowY = 'auto';
        container.style.zIndex = '10000'; // Force on top
        container.style.bottom = '80px'; // Move up slightly

        // Header
        const header = document.createElement('div');
        header.style.cssText = "font-weight:bold; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:8px; font-size:12px; color:#fff; letter-spacing:1px;";
        header.innerHTML = `LAYERS (${this.models.length})`;
        container.appendChild(header);

        this.models.forEach((model, idx) => {
            const row = document.createElement('div');
            row.style.marginBottom = '12px';

            // Layer Name
            const label = document.createElement('div');
            label.innerText = model.name;
            label.style.fontSize = '11px';
            label.style.fontWeight = '600';
            label.style.color = 'var(--accent, #4facfe)';
            label.style.marginBottom = '4px';

            // Slider Row
            const slideCont = document.createElement('div');
            slideCont.style.display = 'flex';
            slideCont.style.alignItems = 'center';
            slideCont.style.gap = '8px';

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '100';
            slider.value = Math.round((model.opacity || 1) * 100);
            slider.style.flex = '1';
            slider.style.marginBottom = '0'; // override css

            const val = document.createElement('span');
            val.innerText = Math.round((model.opacity || 1) * 100) + '%';
            val.style.width = '30px';
            val.style.textAlign = 'right';

            slider.oninput = (e) => {
                const pct = parseInt(e.target.value);
                model.opacity = pct / 100;
                val.innerText = pct + '%';
                // If opacity > 0 ensure visible
                model.visible = model.opacity > 0;
            };

            slideCont.appendChild(slider);
            slideCont.appendChild(val);

            row.appendChild(label);
            row.appendChild(slideCont);
            container.appendChild(row);
        });

        this.overlay.appendChild(container);
    }


    updateToggleIcon() {
        if (!this.toggleBtn) return;
        this.toggleBtn.innerHTML = this.showHotspots
            ? `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`
            : `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;

        // Ensure idling stops if hidden
        if (!this.showHotspots) {
            this.orbitIdling.active = false;
        }
    }

    updateXRayLayers() {
        if (!this.models || this.models.length === 0) return;

        // Progressive transparency based on xrayDepth (0-100%)
        this.models.forEach((model, idx) => {
            if (idx === 0) {
                // Outer layer: fade from 1.0 (solid) to 0.1 (nearly transparent)
                model.opacity = 1.0 - (this.xrayDepth / 100) * 0.9;
                model.visible = true; // Always visible
            } else {
                // Inner layers: fade in as X-Ray increases
                // At 0%: invisible, At 30%+: start fading in
                const fadeInThreshold = 30; // Start showing at 30%
                if (this.xrayDepth < fadeInThreshold) {
                    model.visible = false;
                    model.opacity = 0;
                } else {
                    model.visible = true;
                    model.opacity = Math.min(1.0, (this.xrayDepth - fadeInThreshold) / (100 - fadeInThreshold));
                }
            }
        });
    }


    navigateGuide(dir) {
        if (!this.hotspots.length) return;
        this.guideMode.step += dir;

        // Loop or clamp? Let's Clamp
        if (this.guideMode.step < 0) this.guideMode.step = 0;
        if (this.guideMode.step >= this.hotspots.length) this.guideMode.step = this.hotspots.length - 1;

        const hs = this.hotspots[this.guideMode.step];
        this.flyTo(hs);

        // Update UI
        this.infoPanel.querySelector('.ovi3d-info-title').innerText = hs.label;
        this.infoPanel.querySelector('.ovi3d-info-desc').innerText = hs.detail || "Explore the details of this section.";
        this.infoPanel.querySelector('#ovi3d-step').innerText = `${this.guideMode.step + 1} / ${this.hotspots.length}`;
    }

    stop() {
        this.isRunning = false;
    }

    playSound(type) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            if (type === 'success') {
                oscillator.frequency.value = 800; // High pitch
                oscillator.type = 'sine';
            } else {
                oscillator.frequency.value = 200; // Low pitch
                oscillator.type = 'sawtooth';
            }

            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
            console.warn('Audio playback not supported:', e);
        }
    }

    playAudio(url) {
        if (!url) return;

        // Stop any currently playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }

        try {
            this.currentAudio = new Audio(url);
            this.currentAudio.play().catch(err => {
                console.warn('Audio playback failed:', err);
            });
        } catch (e) {
            console.warn('Audio initialization failed:', e);
        }
    }

    showQuiz(hs) {
        // Remove existing quiz if any
        const existing = this.overlay.querySelector('.ovi3d-quiz-card');
        if (existing) existing.remove();

        const quiz = document.createElement('div');
        quiz.className = 'ovi3d-quiz-card';

        let optionsHtml = '';
        hs.quizData.options.forEach((opt, idx) => {
            optionsHtml += `<div class="ovi3d-quiz-option" data-idx="${idx}">${opt}</div>`;
        });

        quiz.innerHTML = `
            <div class="ovi3d-quiz-close">✕</div>
            <div class="ovi3d-quiz-question">${hs.quizData.question}</div>
            <div class="ovi3d-quiz-options">${optionsHtml}</div>
            <div class="ovi3d-quiz-feedback"></div>
        `;

        this.overlay.appendChild(quiz);

        // Event Listeners
        quiz.querySelector('.ovi3d-quiz-close').onclick = () => {
            quiz.classList.remove('visible');
            setTimeout(() => quiz.remove(), 400);
        };

        const feedbackEl = quiz.querySelector('.ovi3d-quiz-feedback');
        const opts = quiz.querySelectorAll('.ovi3d-quiz-option');

        opts.forEach(opt => {
            opt.onclick = () => {
                if (opt.classList.contains('answered')) return; // Prevent multiple clicks
                const idx = parseInt(opt.getAttribute('data-idx'));
                const isCorrect = idx === hs.quizData.correctIndex;

                // Mark all as answered to lock
                opts.forEach(o => o.classList.add('answered'));

                if (isCorrect) {
                    opt.classList.add('correct');
                    opt.innerHTML += ' ✓';
                    feedbackEl.innerText = hs.quizData.feedback || "Correct! Well done.";
                    feedbackEl.style.color = '#2ecc71';
                    this.playSound('success');
                } else {
                    opt.classList.add('incorrect');
                    opt.innerHTML += ' ✕';
                    feedbackEl.innerText = "Incorrect. Try again!";
                    feedbackEl.style.color = '#e74c3c';
                    this.playSound('error');

                    // Highlight correct one
                    const correctOpt = quiz.querySelector(`.ovi3d-quiz-option[data-idx="${hs.quizData.correctIndex}"]`);
                    if (correctOpt) correctOpt.classList.add('correct');
                }
            };
        });

        // Show Animation
        requestAnimationFrame(() => quiz.classList.add('visible'));
    }
}
