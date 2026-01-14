import StudioWorkspace from '../StudioWorkspace.js';

export default class ModeTutorial extends StudioWorkspace {
    constructor(editor) {
        super(editor);
        this.name = "Tutorial Maker";

        // --- State ---
        this.settings = {
            cursorHalo: false,
            clickRipple: false,
            spotlight: false,
            haloColor: '#ffff00',
            facecam: false,
            facecamShape: 'circle',
            facecamSize: 160,
            facecamX: 20,
            facecamY: 20,
            keyCaster: false,
            telestrator: false,
            watermark: null,
            logoScale: 100,
            logoOpacity: 0.8,
            logoX: 20,
            logoY: 20,
            quickFocus: false
        };

        this.facecamStream = null;
        this.facecamEl = null;
        this.isQuickFocusActive = false;
        this.lastKeyPress = "";
        this.lastKeyTime = 0;
        this._keyListener = null;
        this._messageListener = null;

        // Shared Style Helpers (Moved from StudioInspector or kept here)
        this.styles = {
            section: `background: #252526; border-radius: 6px; padding: 10px; border: 1px solid #333; margin-bottom: 10px;`,
            sectionTitle: `font-weight: 600; color: white; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;`,
            toggleRow: `display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin-bottom: 4px;`
        };
    }

    activate() {
        console.log("🛠️ Mode: Tutorial Activated");
        this.setupEventListeners();
    }

    deactivate() {
        console.log("🛠️ Mode: Tutorial Deactivated");
        this.cleanup();
    }

    setupEventListeners() {
        // Migration of mouse/message listeners from StudioEditor
        const stage = this.editor.container.querySelector(`#stage-container-${this.id}`);
        if (!stage) return;

        this._stageMouseMove = (e) => {
            if (this.settings.cursorHalo || this.settings.spotlight) {
                const rect = stage.getBoundingClientRect();
                const scale = this.editor.currentScale || 1;
                const x = (e.clientX - rect.left) / scale;
                const y = (e.clientY - rect.top) / scale;
                this.handleMouseMove(x, y);
            }
        };
        stage.addEventListener('mousemove', this._stageMouseMove);

        this._stageClick = (e) => {
            if (this.settings.clickRipple) {
                this.editor.createRipple(e, this.editor.container.querySelector(`#overlays-layer-${this.id}`));
            }
        };
        stage.addEventListener('click', this._stageClick);

        this._stageMouseDown = (e) => {
            if (this.settings.quickFocus && e.button === 2) {
                this.isQuickFocusActive = true;
                this.editor.updateOverlays();
                const rect = stage.getBoundingClientRect();
                const scale = this.editor.currentScale || 1;
                this.handleMouseMove((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
            }
        };
        stage.addEventListener('mousedown', this._stageMouseDown);

        this._stopQuickFocus = () => {
            if (this.isQuickFocusActive) {
                this.isQuickFocusActive = false;
                this.editor.updateOverlays();
            }
        };
        window.addEventListener('mouseup', this._stopQuickFocus);
        stage.addEventListener('mouseleave', this._stopQuickFocus);

        // Message Listener for Iframe
        this._messageListener = (e) => {
            const frameW = this.editor.htmlFrameW || this.editor.projectSettings.width;
            const frameH = this.editor.htmlFrameH || this.editor.projectSettings.height;
            const offsetX = (this.editor.projectSettings.width - frameW) / 2;
            const offsetY = (this.editor.projectSettings.height - frameH) / 2;

            if (e.data && e.data.type === `ovi-mouse-move-${this.id}`) {
                this.handleMouseMove(e.data.x + offsetX, e.data.y + offsetY);
            }
            if (e.data && e.data.type === `ovi-mousedown-${this.id}`) {
                if (this.settings.quickFocus && e.data.button === 2) {
                    this.isQuickFocusActive = true;
                    this.editor.updateOverlays();
                    this.handleMouseMove(e.data.x + offsetX, e.data.y + offsetY);
                }
            }
            if (e.data && e.data.type === `ovi-mouseup-${this.id}`) {
                if (this.isQuickFocusActive) {
                    this.isQuickFocusActive = false;
                    this.editor.updateOverlays();
                }
            }
            if (e.data && e.data.type === `ovi-click-${this.id}`) {
                if (this.settings.clickRipple) {
                    const internalX = e.data.x + offsetX;
                    const internalY = e.data.y + offsetY;
                    this.editor.createRipple(
                        { x: internalX, y: internalY, isInternal: true },
                        this.editor.container.querySelector(`#overlays-layer-${this.id}`)
                    );
                }
            }
        };
        window.addEventListener('message', this._messageListener);
    }

    cleanup() {
        if (this.facecamStream) {
            this.facecamStream.getTracks().forEach(t => t.stop());
            this.facecamStream = null;
        }
        if (this.facecamEl) this.facecamEl.remove();

        if (this._keyListener) window.removeEventListener('keydown', this._keyListener);
        if (this._messageListener) window.removeEventListener('message', this._messageListener);

        const stage = this.editor.container.querySelector(`#stage-container-${this.id}`);
        if (stage) {
            if (this._stageMouseMove) stage.removeEventListener('mousemove', this._stageMouseMove);
            if (this._stageClick) stage.removeEventListener('click', this._stageClick);
            if (this._stageMouseDown) stage.removeEventListener('mousedown', this._stageMouseDown);
        }
        window.removeEventListener('mouseup', this._stopQuickFocus);
    }

    toggleSetting(key) {
        this.setSetting(key, !this.settings[key]);
        if (key === 'facecam') this.toggleFacecam();
        if (key === 'keyCaster') this.toggleKeyCaster();
        if (key === 'telestrator') this.toggleTelestrator();
        this.editor.inspector.render();
    }

    setSetting(key, val) {
        this.settings[key] = val;
        if (key === 'facecamShape' || key === 'facecamSize') {
            this.updateFacecamShape(this.facecamEl);
        } else if (key === 'facecamLocked' || key === 'logoLocked') {
            this.updateLockStates();
        } else if (key === 'quickFocus') {
            this.editor.syncIframeSettings();
            this.editor.updateOverlays();
        } else {
            this.editor.updateOverlays();
        }
    }

    toggleFacecam() {
        if (this.settings.facecam) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    this.facecamStream = stream;
                    const x = this.settings.facecamX || 20;
                    const y = this.settings.facecamY || 20;
                    const size = this.settings.facecamSize || 160;

                    const video = document.createElement('video');
                    video.srcObject = stream;
                    video.autoplay = true;
                    video.muted = true;
                    video.id = `facecam-${this.id}`;
                    video.style.cssText = `
                        position: absolute; 
                        top: ${y}px; 
                        left: ${x}px; 
                        width: ${size}px; 
                        height: auto; 
                        aspect-ratio: 4/3;
                        object-fit: cover; 
                        border-radius: 8px; 
                        box-shadow: 0 4px 15px rgba(0,0,0,0.5); 
                        z-index: 60; 
                        cursor: move;
                        pointer-events: auto;
                    `;

                    this.updateFacecamShape(video);
                    this.bindDraggable(video, 'facecam');

                    const layer = this.editor.container.querySelector(`#overlays-layer-${this.id}`);
                    if (layer) layer.appendChild(video);
                    this.facecamEl = video;
                })
                .catch(e => {
                    alert("Camera blocked: " + e.message);
                    this.settings.facecam = false;
                    this.editor.inspector.render();
                });
        } else {
            if (this.facecamStream) {
                this.facecamStream.getTracks().forEach(t => t.stop());
                this.facecamStream = null;
            }
            if (this.facecamEl) this.facecamEl.remove();
            this.facecamEl = null;
        }
    }

    updateFacecamShape(videoEl) {
        if (!videoEl) return;
        const shape = this.settings.facecamShape || 'square';
        const size = this.settings.facecamSize || 160;
        videoEl.style.width = `${size}px`;
        if (shape === 'circle') {
            videoEl.style.borderRadius = '50%';
            videoEl.style.aspectRatio = '1/1';
        } else if (shape === 'square') {
            videoEl.style.borderRadius = '8px';
            videoEl.style.aspectRatio = '4/3';
        } else if (shape === 'vertical') {
            videoEl.style.borderRadius = '8px';
            videoEl.style.aspectRatio = '9/16';
        }
    }

    toggleKeyCaster() {
        if (this.settings.keyCaster && !this._keyListener) {
            this._keyListener = (e) => this.showKeyToast(e);
            window.addEventListener('keydown', this._keyListener);
        } else if (!this.settings.keyCaster && this._keyListener) {
            window.removeEventListener('keydown', this._keyListener);
            this._keyListener = null;
        }
    }

    showKeyToast(e) {
        const combo = [];
        if (e.ctrlKey) combo.push('Ctrl');
        if (e.shiftKey) combo.push('Shift');
        if (e.altKey) combo.push('Alt');
        if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt') combo.push(e.key.toUpperCase());

        if (combo.length > 0) {
            this.lastKeyPress = combo.join(' + ');
            this.lastKeyTime = Date.now();
            this.editor.updateOverlays();
            setTimeout(() => this.editor.updateOverlays(), 2000);
        }
    }

    toggleTelestrator() {
        let canvas = this.editor.container.querySelector(`#telestrator-canvas-${this.id}`);
        if (!canvas) {
            this.initTelestratorCanvas();
            canvas = this.editor.container.querySelector(`#telestrator-canvas-${this.id}`);
        }
        const layer = this.editor.container.querySelector(`#telestrator-layer-${this.id}`);
        if (this.settings.telestrator) {
            if (layer) layer.style.pointerEvents = 'auto';
            canvas.style.pointerEvents = 'auto';
            canvas.style.cursor = 'crosshair';
            this.enableDrawingMode(canvas);
        } else {
            if (layer) layer.style.pointerEvents = 'none';
            canvas.style.pointerEvents = 'none';
            canvas.style.cursor = 'default';
            this.disableDrawingMode(canvas);
        }
    }

    initTelestratorCanvas() {
        const layer = this.editor.container.querySelector(`#telestrator-layer-${this.id}`);
        if (!layer) return;
        const canvas = document.createElement('canvas');
        canvas.id = `telestrator-canvas-${this.id}`;
        canvas.style.position = 'absolute';
        canvas.style.top = '0'; canvas.style.left = '0';
        canvas.style.width = '100%'; canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '50';
        canvas.width = this.editor.projectSettings.width;
        canvas.height = this.editor.projectSettings.height;
        layer.appendChild(canvas);
    }

    enableDrawingMode(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#ff0000';
        this._drawStart = (e) => this.handleDrawStart(e, canvas, ctx);
        this._drawMove = (e) => this.handleDrawMove(e, canvas, ctx);
        this._drawEnd = (e) => this.handleDrawEnd(e, canvas, ctx);
        canvas.addEventListener('mousedown', this._drawStart);
        window.addEventListener('mouseup', this._drawEnd);
    }

    disableDrawingMode(canvas) {
        if (this._drawStart) {
            canvas.removeEventListener('mousedown', this._drawStart);
            window.removeEventListener('mouseup', this._drawEnd);
            canvas.removeEventListener('mousemove', this._drawMove);
        }
    }

    handleDrawStart(e, canvas, ctx) {
        this.isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const scale = this.editor.currentScale || 1;
        ctx.beginPath();
        ctx.moveTo((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
        canvas.addEventListener('mousemove', this._drawMove);
    }

    handleDrawMove(e, canvas, ctx) {
        if (!this.isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const scale = this.editor.currentScale || 1;
        ctx.lineTo((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
        ctx.stroke();
    }

    handleDrawEnd() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        const canvas = this.editor.container.querySelector(`#telestrator-canvas-${this.id}`);
        if (canvas) canvas.removeEventListener('mousemove', this._drawMove);
    }

    clearTelestrator() {
        const canvas = this.editor.container.querySelector(`#telestrator-canvas-${this.id}`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    handleMouseMove(x, y) {
        const tracker = this.editor.container.querySelector(`#cursor-tracker-${this.id}`);
        if (tracker) {
            const hasHalo = this.settings.cursorHalo;
            const hasSpotlight = this.settings.spotlight || this.isQuickFocusActive;
            const color = this.settings.haloColor || '#ffff00';

            if (hasSpotlight) {
                tracker.style.background = `radial-gradient(circle at ${x}px ${y}px, transparent 100px, rgba(0,0,0,0.8) 120px)`;
            } else {
                tracker.style.background = 'none';
            }

            if (hasHalo) {
                tracker.innerHTML = `<div style="position: absolute; left: ${x - 15}px; top: ${y - 15}px; width: 30px; height: 30px; border-radius: 50%; background: ${color}40; border: 2px solid ${color}; pointer-events: none; box-shadow: 0 0 10px ${color};"></div>`;
            } else {
                tracker.innerHTML = '';
            }
        }
    }

    renderOverlays() {
        let html = '';
        if (this.settings.watermark) {
            const w = this.settings.logoScale || 100;
            const op = this.settings.logoOpacity || 0.8;
            const x = this.settings.logoX || 20;
            const y = this.settings.logoY || 20;
            html += `<img id="logo-overlay-${this.id}" src="${this.settings.watermark}" style="position: absolute; top: ${y}px; left: ${x}px; width: ${w}px; opacity: ${op}; pointer-events: auto; cursor: move; user-select: none;">`;
        }
        if (this.settings.keyCaster && this.lastKeyPress && (Date.now() - this.lastKeyTime < 2000)) {
            html += `<div style="position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 8px; font-size: 24px; font-weight: bold; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 15px rgba(0,0,0,0.5);">${this.lastKeyPress}</div>`;
        }
        if (this.settings.cursorHalo || this.settings.spotlight || this.isQuickFocusActive) {
            html += `<div id="cursor-tracker-${this.id}" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none; z-index: 100;"></div>`;
        }
        return html;
    }

    bindDraggable(el, type) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        el.addEventListener('mousedown', (e) => {
            const locked = (type === 'facecam' ? this.settings.facecamLocked : this.settings.logoLocked);
            if (locked || e.button !== 0) return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            startLeft = parseInt(el.style.left || 0);
            startTop = parseInt(el.style.top || 0);
            e.preventDefault();

            const moveHandler = (me) => {
                if (!isDragging) return;
                const scale = this.editor.currentScale || 1;
                const dx = (me.clientX - startX) / scale;
                const dy = (me.clientY - startY) / scale;
                const newLeft = startLeft + dx;
                const newTop = startTop + dy;
                el.style.left = `${newLeft}px`;
                el.style.top = `${newTop}px`;
                if (type === 'facecam') { this.settings.facecamX = newLeft; this.settings.facecamY = newTop; }
                else { this.settings.logoX = newLeft; this.settings.logoY = newTop; }
            };

            const upHandler = () => {
                isDragging = false;
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('mouseup', upHandler);
            };
            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', upHandler);
        });
    }

    updateLockStates() {
        const logo = this.editor.container.querySelector(`#logo-overlay-${this.id}`);
        if (logo) logo.style.cursor = this.settings.logoLocked ? 'default' : 'move';
        if (this.facecamEl) this.facecamEl.style.cursor = this.settings.facecamLocked ? 'default' : 'move';
    }

    triggerLogoUpload() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    this.settings.watermark = evt.target.result;
                    this.settings.logoScale = 100; this.settings.logoOpacity = 0.8;
                    this.settings.logoX = 20; this.settings.logoY = 20;
                    this.editor.inspector.render();
                    this.editor.updateOverlays();
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    removeLogo() {
        this.settings.watermark = null;
        this.editor.inspector.render();
        this.editor.updateOverlays();
    }

    bindEvents(container) {
        this.updateLockStates();
        const logo = this.editor.container.querySelector(`#logo-overlay-${this.id}`);
        if (logo) this.bindDraggable(logo, 'logo');

        // Inspector Events (Delegated to mode)
        container.querySelectorAll('.toggle-row').forEach(row => {
            row.addEventListener('click', () => {
                this.toggleSetting(row.dataset.id);
            });
        });

        container.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (this[action]) this[action]();
            });
        });

        const colorPicker = container.querySelector('#halo-color');
        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => this.setSetting('haloColor', e.target.value));
        }

        container.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setSetting('facecamShape', btn.dataset.shape));
        });

        const upBtn = container.querySelector('#btn-upload-logo');
        if (upBtn) upBtn.addEventListener('click', () => this.triggerLogoUpload());

        const rmBtn = container.querySelector('#btn-remove-logo');
        if (rmBtn) rmBtn.addEventListener('click', () => this.removeLogo());

        container.querySelectorAll('.control-slider').forEach(input => {
            input.addEventListener('input', (e) => this.setSetting(e.target.dataset.id, e.target.value));
        });
    }
}
