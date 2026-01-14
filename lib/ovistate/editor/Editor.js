import OviCanvas from '../../../js/ui/OviCanvas.js';
// PhysicsEngine removed (integrated into Core.js)
import OviStateRuntime from '../runtime/Core.js';
import Inspector from '../ui/Inspector.js';
import BehaviorSystem from '../runtime/BehaviorSystem.js';
import RuntimeUI from '../ui/RuntimeUI.js';
import SceneRegistry from '../../../js/core/SceneRegistry.js';
import ConnectionRenderer from './ConnectionRenderer.js';
import Timeline from './Timeline.js';
import GraphEditor from '../../ovigraph/GraphEditor.js';

export default class OviStateEditor {
    constructor(engine) {
        this.engine = engine;
        this.canvas = null;
        this.runtime = null;
        this.behaviorSystem = null;
        this.physics = null; // Placeholder, not used explicitly anymore
        this.selectedObjects = new Set();
        this.connectionRenderer = new ConnectionRenderer(this);

        // Preview Mode State
        this.isPlaying = false;
        this.initialState = null;

        this.simulationData = {
            metadata: { title: 'My Simulation', version: '1.0' },
            canvas: { width: 800, height: 600, background: '#f0f8ff' },
            physics: {
                gravity: 1500, // Updated for Time-Based Physics (was 9.8)
                gravityX: 0,
                friction: 0.1,
                timeScale: 1,
                wallBounciness: 0.8
            },
            objects: [],
            controls: [],
            graphs: [],
            globalScript: ''
        };

        this.timeline = new Timeline(this);

        // Custom Styles for UI Widgets
        const styleId = 'ovi-widget-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .ui-widget-input[type="range"] {
                    -webkit-appearance: none;
                    background: var(--track-color, rgba(255,255,255,0.1));
                    height: 4px;
                    border-radius: 2px;
                    outline: none;
                }
                .ui-widget-input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    background: var(--accent, #007acc);
                    border-radius: 50%;
                    cursor: pointer;
                    transition: transform 0.1s;
                }
                .ui-widget-input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
                .ui-widget-input[type="range"]::-moz-range-thumb {
                    width: 12px;
                    height: 12px;
                    background: var(--accent, #007acc);
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
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

    create() {
        // --- Root Container ---
        const rootContainer = document.createElement('div');
        rootContainer.style.width = '100%';
        rootContainer.style.height = '100%';
        rootContainer.style.display = 'flex';
        rootContainer.style.flexDirection = 'column';
        rootContainer.style.backgroundColor = '#1e1e1e';

        // --- Toolbar ---
        const topToolbar = document.createElement('div');
        topToolbar.style.height = '44px';
        topToolbar.style.backgroundColor = '#181818';
        topToolbar.style.borderBottom = '1px solid #252525';
        topToolbar.style.display = 'flex';
        topToolbar.style.alignItems = 'center';
        topToolbar.style.justifyContent = 'space-between';
        topToolbar.style.padding = '0 12px';
        topToolbar.style.fontFamily = "'Segoe UI', Roboto, sans-serif";

        // --- Left Group (Brand & Navigation) ---
        const leftGroup = document.createElement('div');
        leftGroup.style.display = 'flex';
        leftGroup.style.alignItems = 'center';
        leftGroup.style.gap = '16px';

        // 1. Brand
        const brand = document.createElement('div');
        brand.innerHTML = '<span style="color:#fff; font-weight:600; font-size:13px; letter-spacing:0.5px;">OVISTATE</span>';
        leftGroup.appendChild(brand);

        // Divider
        const div1 = document.createElement('div');
        div1.style.width = '1px';
        div1.style.height = '16px';
        div1.style.background = '#333';
        leftGroup.appendChild(div1);

        // 2. View Switcher (Text Only, Professional Tabs)
        const viewContainer = document.createElement('div');
        viewContainer.style.display = 'flex';
        viewContainer.style.gap = '4px';

        const createViewBtn = (label, mode) => { // Removed icon param
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.border = 'none';
            btn.style.background = 'transparent';
            btn.style.color = '#777';
            btn.style.padding = '4px 12px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '12px';
            btn.style.fontWeight = '500';
            btn.style.borderRadius = '4px';
            btn.style.transition = 'all 0.2s';

            btn.onclick = () => this.switchView(mode);
            btn.dataset.mode = mode;
            return btn;
        };

        const btnScene = createViewBtn('Scene', 'scene');
        const btnGraph = createViewBtn('Logic Graph', 'graph');

        // Store buttons for update logic
        this.viewButtons = { scene: btnScene, graph: btnGraph };

        viewContainer.appendChild(btnScene);
        viewContainer.appendChild(btnGraph);

        // Timeline Toggle (Separate Style)
        const btnTimeline = document.createElement('button');
        btnTimeline.textContent = 'Timeline';
        btnTimeline.style.cssText = "border: none; background: transparent; color: #777; padding: 4px 12px; cursor: pointer; font-size: 12px; font-weight: 500; border-radius: 4px; transition: all 0.2s; margin-left: 8px;";
        btnTimeline.onclick = () => {
            this.timeline.toggle();
            btnTimeline.style.color = this.timeline.isVisible ? '#007acc' : '#777';
        };
        viewContainer.appendChild(btnTimeline);

        leftGroup.appendChild(viewContainer);

        topToolbar.appendChild(leftGroup);

        // --- Center Group (Preview Controls) ---
        // Floating pill look
        const previewControls = document.createElement('div');
        previewControls.style.display = 'flex';
        previewControls.style.gap = '2px';
        previewControls.style.background = '#222';
        previewControls.style.padding = '2px';
        previewControls.style.borderRadius = '6px';
        previewControls.style.border = '1px solid #303030';

        const btnStyle = "width: 28px; height: 26px; border: none; background: transparent; color: #bbb; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.1s;";

        const playBtn = document.createElement('button');
        playBtn.innerHTML = '<span style="font-size:10px;">▶</span>';
        playBtn.title = "Play";
        playBtn.style.cssText = btnStyle;
        playBtn.onclick = () => this.play();

        const pauseBtn = document.createElement('button');
        pauseBtn.innerHTML = '<span style="font-size:10px;">❚❚</span>';
        pauseBtn.title = "Pause";
        pauseBtn.style.cssText = btnStyle;
        pauseBtn.onclick = () => this.pause();

        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '<span style="font-size:10px;">■</span>';
        resetBtn.title = "Stop";
        resetBtn.style.cssText = btnStyle;
        resetBtn.onclick = () => this.reset();

        // Active State Logic
        this.updatePreviewButtons = () => {
            playBtn.style.background = 'transparent';
            playBtn.style.color = '#bbb';
            if (this.isPlaying) {
                playBtn.style.background = '#388e3c'; // Darker professional green
                playBtn.style.color = '#fff';
            }
        };

        previewControls.appendChild(playBtn);
        previewControls.appendChild(pauseBtn);
        previewControls.appendChild(resetBtn);
        topToolbar.appendChild(previewControls);

        // --- Right Group (Canvas Settings) ---
        const rightGroup = document.createElement('div');
        rightGroup.style.display = 'flex';
        rightGroup.style.alignItems = 'center';
        rightGroup.style.gap = '12px';

        // Resolution & BG (OviStudio Style)
        const resContainer = document.createElement('div');
        resContainer.style.cssText = "display: flex; align-items: center; background: #1e1e1e; padding: 3px 6px; border-radius: 4px; border: 1px solid #333; gap: 4px;";

        const resLabel = document.createElement('div');
        resLabel.textContent = 'RES';
        resLabel.style.cssText = "font-size: 10px; color: #666; font-weight: bold;";

        // Res Preset Dropdown (Arrow only)
        const presets = document.createElement('select');
        presets.style.cssText = "width: 15px; height: 20px; border: none; background: transparent; color: #888; cursor: pointer; font-size: 10px; outline: none;";

        const opts = [
            { label: '▼', w: 0, h: 0 }, // Placeholder
            { label: 'Standard (800x600)', w: 800, h: 600 },
            { label: 'HD (1280x720)', w: 1280, h: 720 },
            { label: 'Full HD (1920x1080)', w: 1920, h: 1080 },
            { label: 'Mobile (360x640)', w: 360, h: 640 },
            { label: 'Square (600x600)', w: 600, h: 600 }
        ];

        opts.forEach(opt => {
            const o = document.createElement('option');
            o.textContent = opt.label;
            o.value = opt.w ? `${opt.w},${opt.h}` : '';
            presets.appendChild(o);
        });

        // Inputs
        const inputStyle = "width: 40px; background: transparent; border: none; color: white; font-size: 11px; -moz-appearance: textfield; outline: none;";

        const wInput = document.createElement('input');
        wInput.type = 'number';
        wInput.value = '800';
        wInput.step = '10';
        wInput.style.cssText = inputStyle + "text-align: right;";

        const xLabel = document.createElement('span');
        xLabel.textContent = 'x';
        xLabel.style.cssText = "color: #444; font-size: 10px; margin: 0 2px;";

        const hInput = document.createElement('input');
        hInput.type = 'number';
        hInput.value = '600';
        hInput.step = '10';
        hInput.style.cssText = inputStyle + "text-align: left;";

        // Vertical Divider
        const vDiv = document.createElement('div');
        vDiv.style.cssText = "width: 1px; height: 12px; background: #444; margin: 0 4px;";

        // BG Input
        const bgInput = document.createElement('input');
        bgInput.type = 'color';
        bgInput.value = '#1e1e1e';
        bgInput.title = "Background Color";
        bgInput.style.cssText = "width: 18px; height: 18px; border: none; padding: 0; background: none; cursor: pointer; border-radius: 2px;";

        // Events
        presets.onchange = () => {
            if (presets.value) {
                const [w, h] = presets.value.split(',').map(Number);
                if (w && h) {
                    wInput.value = w;
                    hInput.value = h;
                    this.resizeCanvas(w, h);
                }
            }
            presets.selectedIndex = 0; // Reset to ▼
        };

        const updateSize = () => {
            const w = parseInt(wInput.value) || 800;
            const h = parseInt(hInput.value) || 600;
            this.resizeCanvas(w, h);
        };

        wInput.onchange = updateSize;
        hInput.onchange = updateSize;

        bgInput.addEventListener('input', (e) => {
            if (this.runtime) {
                if (!this.runtime.config) this.runtime.config = {};
                this.runtime.config.background = e.target.value;
                if (this.runtime.canvas) this.runtime.canvas.style.backgroundColor = e.target.value;
            }
        });

        resContainer.appendChild(resLabel);
        resContainer.appendChild(presets);
        resContainer.appendChild(wInput);
        resContainer.appendChild(xLabel);
        resContainer.appendChild(hInput);
        resContainer.appendChild(vDiv);
        resContainer.appendChild(bgInput);

        rightGroup.appendChild(resContainer);

        // Divider 3
        const div3 = document.createElement('div');
        div3.style.width = '1px';
        div3.style.height = '16px';
        div3.style.background = '#333';
        rightGroup.appendChild(div3);

        // Export Controls (Icons)
        const exportContainer = document.createElement('div');
        exportContainer.style.display = 'flex';
        exportContainer.style.gap = '4px';

        const exportBtnStyle = "padding: 4px; background: transparent; color: #888; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; display: flex; align-items: center; transition: all 0.2s;";

        const exportHtmlBtn = document.createElement('button');
        exportHtmlBtn.innerHTML = 'HTML';
        exportHtmlBtn.title = "Export Smart HTML";
        exportHtmlBtn.style.cssText = exportBtnStyle + "font-size: 10px; font-weight: 700; padding: 4px 8px;";
        exportHtmlBtn.onmouseenter = () => exportHtmlBtn.style.color = '#fff';
        exportHtmlBtn.onmouseleave = () => exportHtmlBtn.style.color = '#888';
        exportHtmlBtn.onclick = () => {
            import('./EnhancedExporter_DEBUG.js').then(mod => {
                mod.default.export(this.getSimulationData());
            });
        };

        const exportJsonBtn = document.createElement('button');
        exportJsonBtn.innerHTML = 'JSON';
        exportJsonBtn.title = "Save/Export Project JSON";
        exportJsonBtn.style.cssText = exportBtnStyle + "font-size: 10px; font-weight: 700; padding: 4px 8px;";
        exportJsonBtn.onmouseenter = () => exportJsonBtn.style.color = '#fff';
        exportJsonBtn.onmouseleave = () => exportJsonBtn.style.color = '#888';
        exportJsonBtn.onclick = () => this.exportJSON();

        exportContainer.appendChild(exportHtmlBtn);
        exportContainer.appendChild(exportJsonBtn);
        rightGroup.appendChild(exportContainer);

        topToolbar.appendChild(rightGroup);

        rootContainer.appendChild(topToolbar);

        // --- Workspace (Canvas Only - Tools are in Global Sidebar) ---
        const workspace = document.createElement('div');
        workspace.style.flex = '1';
        workspace.style.display = 'flex';
        workspace.style.justifyContent = 'center';
        workspace.style.alignItems = 'center';
        workspace.style.backgroundColor = '#111'; // Dark backdrop
        workspace.style.overflow = 'hidden';
        rootContainer.appendChild(workspace);

        // --- Center Canvas Area ---
        const simulationWrapper = document.createElement('div');
        simulationWrapper.style.position = 'relative';
        simulationWrapper.style.border = '1px solid #444';
        simulationWrapper.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        // FIXED: Wrapper must have size for OviCanvas to work
        simulationWrapper.style.width = '100%';
        simulationWrapper.style.height = '100%';

        const resizableContainer = document.createElement('div');
        resizableContainer.style.width = '800px';
        resizableContainer.style.height = '600px';
        resizableContainer.style.position = 'relative';
        resizableContainer.style.backgroundColor = '#ffffff';

        // Overlay Zone (For Drops & UI)
        const overlayZone = document.createElement('div');
        overlayZone.className = 'drop-zone overlay-zone';
        overlayZone.style.position = 'absolute';
        overlayZone.style.top = '0';
        overlayZone.style.left = '0';
        overlayZone.style.width = '100%';
        overlayZone.style.height = '100%';
        overlayZone.style.zIndex = '50';
        overlayZone.style.pointerEvents = 'all'; // Needs to capture drops

        this.overlayZone = overlayZone; // Store for re-rendering UI updates

        resizableContainer.appendChild(overlayZone);
        // simulationWrapper.appendChild(resizableContainer); // Replaced by OviCanvas
        workspace.appendChild(simulationWrapper);

        // --- Initialize OviCanvas (Pan/Zoom/SVG) ---
        this.canvas = new OviCanvas(simulationWrapper);
        // Center the 800x600 container in the view? Or 0,0.
        // For now 0,0. OviCanvas handles the 'world' layer.
        this.canvas.addNode(resizableContainer, 0, 0);


        // --- Graph View Container (Hidden by default) ---
        const graphContainer = document.createElement('div');
        graphContainer.style.width = '100%';
        graphContainer.style.height = '100%';
        graphContainer.style.display = 'none'; // Start hidden
        graphContainer.style.position = 'absolute'; // Overlay on workspace
        graphContainer.style.top = '0';
        graphContainer.style.left = '0';
        graphContainer.style.zIndex = '100';
        graphContainer.style.background = '#1e1e1e'; // Darker graph bg

        workspace.appendChild(graphContainer);
        this.graphContainer = graphContainer;
        this.graphEditor = null; // Lazy init

        // Initialize Timeline (Overlay)
        this.timeline.init(rootContainer);

        // --- Initialization ---
        this.runtime = new OviStateRuntime(resizableContainer, {
            width: 800,
            height: 600,
            enablePhysics: true,
            // NEW: Pass advanced physics config to Runtime (Core.js)
            gravity: this.simulationData.physics.gravity,
            gravityX: this.simulationData.physics.gravityX,
            friction: this.simulationData.physics.friction,
            timeScale: this.simulationData.physics.timeScale,
            wallBounciness: this.simulationData.physics.wallBounciness
        });

        // Flag for rendering logic (e.g. show hidden emitters)
        this.runtime.isEditor = true;

        this.behaviorSystem = new BehaviorSystem(this.runtime);
        // CRITICAL: Expose registry to runtime for RuntimeUI binding logic
        this.runtime.registry = this.behaviorSystem.registry;

        // Initialize UI with Overlay Container
        this.ui = new RuntimeUI(this.runtime, this.overlayZone);
        this.runtime.attachUI(this.ui);

        // REMOVED: Separate PhysicsEngine.js usage.
        // Core.js (Runtime) now handles advanced physics internally to match Export.
        this.physics = null;

        // Hook update loop
        const originalUpdate = this.runtime.update.bind(this.runtime);
        this.runtime.update = (dt) => {
            // REMOVED: this.physics.update(dt) (Double physics avoided)

            // Conditional Execution: Only run behaviors if playing
            if (this.isPlaying && this.behaviorSystem) {
                this.behaviorSystem.executeAll(this.runtime.objects, dt);
            }

            // Note: Physics update is internal to Runtime (originalUpdate)
            // We need to verify if Runtime Physics should also be conditional
            // Ideally, we pause ORIGINAL update too if not playing?
            // Actually, Runtime.update does drawing too. We must draw!
            // So we need to inject 'paused' state into Runtime or just skip update part.
            // But OviStateRuntime likely updates physics in its update().

            // HACK: We can control physics via timeScale = 0 when paused?
            // Better: We let OriginalUpdate run for DRAWING, but we assume it handles physics internally.
            // If runtime.update DOES physics, we need to stop it.
            // Looking at Core.js (implied), it likely does.
            // Let's assume we can't easily stop internal physics without a flag.
            // BUT: If the user says "Preview Mode", they imply "Edit Mode" is static.

            // Solution: Temporarily set timeScale to 0 when !isPlaying? 
            // Or just rely on the fact that without 'behaviors', things might not move much 
            // UNLESS gravity is on.
            // Gravity moves things. So yes, we need to stop physics.

            if (this.runtime.physicsEngine) {
                // If Playing, unpause. If Paused/Stopped, pause.
                this.runtime.physicsEngine.paused = !this.isPlaying;
            }

            // Render & Physics (Core)
            originalUpdate(dt);

            // Render Logic Connections
            this.connectionRenderer.render();

            // Refresh Timeline UI (Live Update)
            if (this.timeline) {
                this.timeline.draw();
            }

            // --- Visual Indicators (Overlay) ---
            if (this.isPlaying || (this.runtime.timelineSystem && this.runtime.timelineSystem.isRecording)) {
                this.runtime.ctx.save();
                this.runtime.ctx.font = 'bold 12px Segoe UI, sans-serif';
                this.runtime.ctx.textBaseline = 'top';
                let offset = 10;

                if (this.isPlaying) {
                    this.runtime.ctx.fillStyle = '#4caf50';
                    this.runtime.ctx.fillText('▶ PLAYING', 10, offset);
                    offset += 20;
                }

                if (this.runtime.timelineSystem && this.runtime.timelineSystem.isRecording) {
                    const alpha = Math.abs(Math.sin(Date.now() / 300));
                    this.runtime.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
                    this.runtime.ctx.fillText('🔴 RECORDING', 10, offset);
                }
                this.runtime.ctx.restore();
            }

            // --- Execute Data Bindings (Unified via RuntimeUI) ---
            // We use the same logic as the Exported Runtime
            if (this.ui) {
                this.ui.update(dt);
            }
        };

        // --- Setup Selection (Pass-through) ---
        // Since overlay is on top with pointer-events:all, we need it to handle selection too
        // or pass it down. For now, let's keep it simple: 
        // We attach listener to overlayZone to calculate coords relative to canvas.
        // Unified Mouse Handler for Overlay
        overlayZone.addEventListener('mousedown', (e) => {
            const rect = resizableContainer.getBoundingClientRect();
            const scaleX = rect.width / resizableContainer.offsetWidth;
            const scaleY = rect.height / resizableContainer.offsetHeight;
            const mouseX = (e.clientX - rect.left) / scaleX;
            const mouseY = (e.clientY - rect.top) / scaleY;

            if (this.runtime) {
                this.runtime.mouseX = mouseX;
                this.runtime.mouseY = mouseY;
                this.runtime.isMouseDown = true;
                this.runtime.clickProcessed = false;
            }

            // Preview Mode: Disable Editor Selection/Dragging
            if (this.isPlaying) {
                // We still need to allow the runtime to process physics/interaction
                // But we don't do any Editor-level selection here.
                return;
            }

            // --- PICK TARGET MODE (For Joints) ---
            if (this._pickTargetMode) {
                const x = (e.clientX - rect.left) / scaleX;
                const y = (e.clientY - rect.top) / scaleY;

                for (let i = this.runtime.objects.length - 1; i >= 0; i--) {
                    const obj = this.runtime.objects[i];
                    // Don't let a joint pick itself
                    if (this.isPointInObject(x, y, obj) && obj.id !== this._pickTargetMode.joint.id) {
                        Inspector.updateProperty(this, this._pickTargetMode.prop, obj.id);
                        if (window.showOviToast) window.showOviToast(`Linked to: ${obj.name || obj.id || obj.type}`);

                        if (this._pickTargetMode.button) this._pickTargetMode.button.classList.remove('active');
                        delete this._pickTargetMode;
                        Inspector.update(this.engine, this.selectedObject);
                        return;
                    }
                }
            }

            // 1. Check for UI Selection/Drag
            const widget = e.target.closest('.ui-widget-wrapper');
            if (widget) {
                const id = widget.dataset.id;
                const control = this.simulationData.controls.find(c => c.id === id);
                if (control) {
                    this.selectUI(control);

                    // Start Drag UI
                    this.isDraggingUI = true;
                    this.draggedControl = control;
                    this.draggedEl = widget;
                    this.dragOffset = {
                        x: mouseX - control.x,
                        y: mouseY - control.y
                    };
                    return;
                }
            }

            // 2. Background/Object Selection
            const x = mouseX;
            const y = mouseY;


            // 2. Vertex/Path Point Selection (Priority)
            for (let i = this.runtime.objects.length - 1; i >= 0; i--) {
                const obj = this.runtime.objects[i];
                if (obj.type === 'path' && obj.points) {
                    const world = this.runtime.getWorldTransform(obj);
                    const dx = x - world.x;
                    const dy = y - world.y;
                    const rad = -world.rotation * Math.PI / 180;
                    const lx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / world.scale;
                    const ly = (dx * Math.sin(rad) + dy * Math.cos(rad)) / world.scale;

                    // Check Points
                    const vertexRadius = 8;
                    const hitIdx = obj.points.findIndex(p => {
                        const dist = Math.sqrt((p.x - lx) ** 2 + (p.y - ly) ** 2);
                        return dist <= vertexRadius;
                    });

                    if (hitIdx !== -1) {
                        // Select the path object so Inspector shows up
                        this.selectObject(obj, false);

                        // Initiate Vertex Drag
                        this.runtime._draggingPath = obj;
                        this.runtime._draggingVertexIndex = hitIdx;
                        this.runtime._clickHandled = true; // prevent other clicks
                        return;
                    }
                }
            }

            let found = false;
            // Reverse order for hit testing (top-most first)
            for (let i = this.runtime.objects.length - 1; i >= 0; i--) {
                const obj = this.runtime.objects[i];
                if (this.isPointInObject(x, y, obj)) {
                    // Traverse UP to find the group
                    let target = obj;
                    // If not alt-clicking, traverse to the top-most group
                    if (!e.altKey) {
                        while (target.parent) {
                            const p = this.runtime.getObject(target.parent);
                            if (p && p.type === 'group') target = p;
                            else break;
                        }
                    }
                    this.selectObject(target, e.shiftKey);

                    // Start Drag Physics Object
                    this.isDraggingObject = true;
                    this.draggedObject = target;
                    this.dragOffset = {
                        x: x - target.x,
                        y: y - target.y
                    };

                    // Stop motion while dragging for ALL selected
                    if (this.selectedObjects.has(target)) {
                        this.selectedObjects.forEach(sel => {
                            if (sel.physics) sel.physics.velocity = { x: 0, y: 0 };
                        });
                    }

                    found = true;
                    return;
                }
            }
            // Only deselect if not shifting
            if (!found && !e.shiftKey) {
                this.deselectObject();
            }
        });

        // Drag Move (UI Layout & Objects)
        window.addEventListener('mousemove', (e) => {
            const rect = resizableContainer.getBoundingClientRect();
            // --- FORWARD INPUT TO RUNTIME ---
            if (this.runtime) {
                const scaleX = rect.width / resizableContainer.offsetWidth;
                const scaleY = rect.height / resizableContainer.offsetHeight;

                this.runtime.mouseX = (e.clientX - rect.left) / scaleX;
                this.runtime.mouseY = (e.clientY - rect.top) / scaleY;

                // DEBUG: Trace mouse position in Editor
                if (Math.random() < 0.01) {
                    console.log(`🖱️ Editor Mouse: ${this.runtime.mouseX}, ${this.runtime.mouseY}`);
                }
            }

            const GRID = 10;
            // ... (Rest of drag logic)

            // Case A: Dragging DOM UI
            if (this.isDraggingUI && this.draggedControl && this.draggedEl) {
                const scaleX = rect.width / resizableContainer.offsetWidth;
                const scaleY = rect.height / resizableContainer.offsetHeight;
                const mouseX = (e.clientX - rect.left) / scaleX;
                const mouseY = (e.clientY - rect.top) / scaleY;

                let rawX = mouseX - this.dragOffset.x;
                let rawY = mouseY - this.dragOffset.y;

                const snapX = Math.round(rawX / GRID) * GRID;
                const snapY = Math.round(rawY / GRID) * GRID;

                this.draggedControl.x = snapX;
                this.draggedControl.y = snapY;

                this.draggedEl.style.left = snapX + 'px';
                this.draggedEl.style.top = snapY + 'px';
            }
            // Case B: Dragging Canvas Object
            else if (this.isDraggingObject && this.draggedObject) {
                // Calculate Delta based on the Primary Dragged Object
                const scaleX = rect.width / resizableContainer.offsetWidth;
                const scaleY = rect.height / resizableContainer.offsetHeight;
                const mouseX = (e.clientX - rect.left) / scaleX;
                const mouseY = (e.clientY - rect.top) / scaleY;

                let rawX = mouseX - this.dragOffset.x;
                let rawY = mouseY - this.dragOffset.y;

                const snapX = Math.round(rawX / GRID) * GRID;
                const snapY = Math.round(rawY / GRID) * GRID;

                const dx = snapX - this.draggedObject.x;
                const dy = snapY - this.draggedObject.y;

                if (dx !== 0 || dy !== 0) {
                    // Update all selected objects
                    this.selectedObjects.forEach(obj => {
                        obj.x += dx;
                        obj.y += dy;
                        if (obj.physics) obj.physics.velocity = { x: 0, y: 0 };
                    });
                }
            }
            // Case C: Hover Feedback (Cursor)
            else {
                let cursor = 'default';
                const scaleX = rect.width / resizableContainer.offsetWidth;
                const scaleY = rect.height / resizableContainer.offsetHeight;
                const x = (e.clientX - rect.left) / scaleX;
                const y = (e.clientY - rect.top) / scaleY;

                // Priority 1: UI Widgets
                if (e.target.closest('.ui-widget-wrapper')) cursor = 'move';
                else {
                    // Priority 2: Path Vertices
                    for (let i = this.runtime.objects.length - 1; i >= 0; i--) {
                        const obj = this.runtime.objects[i];
                        if (obj.type === 'path' && obj.points) {
                            const world = this.runtime.getWorldTransform(obj);
                            // Transform mouse to local
                            const dx = x - world.x;
                            const dy = y - world.y;
                            const rad = -world.rotation * Math.PI / 180;
                            const s = world.scale || 1;
                            const lx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / s;
                            const ly = (dx * Math.sin(rad) + dy * Math.cos(rad)) / s;

                            // Check Vertices
                            const hitV = obj.points.some(p => Math.sqrt((p.x - lx) ** 2 + (p.y - ly) ** 2) <= 8);
                            if (hitV) {
                                cursor = 'crosshair'; // Distinct for points
                                break;
                            }
                            // Check Segments (Re-use isPointInObject logic or simplified)
                            if (this.isPointInObject(x, y, obj)) {
                                cursor = 'pointer'; // Hand for path body
                                // Don't break yet, vertex might be on top of another path? 
                                // Actually we want top-most, so break is fine if we found vertex. 
                                // If just body, we keep 'pointer' but continue checking if a vertex of another obj is higher? 
                                // Reverse loop means top-most first.
                                break;
                            }
                        } else if (this.isPointInObject(x, y, obj)) {
                            cursor = 'move'; // Standard object move
                            break;
                        }
                    }
                }
                overlayZone.style.cursor = cursor;
            }
        });

        // Drag End
        window.addEventListener('mouseup', () => {
            if (this.isDraggingUI) {
                this.isDraggingUI = false;
                this.draggedControl = null;
                this.draggedEl = null;
                if (this.selectedObject) Inspector.update(this.engine, this.selectedObject);
            }
            if (this.isDraggingObject) {
                this.isDraggingObject = false;
                this.draggedObject = null;
                // Only update Inspector if we have a valid single selection, 
                // OR if it's multi-select we might want to refresh but the panel is static.
                if (this.selectedObject) {
                    Inspector.update(this.engine, this.selectedObject);
                }
            }
            if (this.runtime) {
                this.runtime.isMouseDown = false;
                // Fix: Also clear path dragging state which might persist if canvas events are blocked
                this.runtime._draggingPath = null;
                this.runtime._draggingVertexIndex = null;
            }
        });

        // Keyboard Shortcuts (Delete)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Ignore if typing in an input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                if (this.selectedObjects.size > 0) {
                    this.deleteSelected();
                } else if (this.selectedObject) {
                    // Fallback for UI components if they still rely on selectedObject separate logic
                    // (Our UI logic currently uses selectedObject too, need to check selectUI)
                    // UI Deletion Logic if needed?
                }
            }
        });

        // --- Path Point Editing (Double Click) ---
        overlayZone.addEventListener('dblclick', (e) => {
            const rect = resizableContainer.getBoundingClientRect();
            const scaleX = rect.width / resizableContainer.offsetWidth;
            const scaleY = rect.height / resizableContainer.offsetHeight;

            const x = (e.clientX - rect.left) / scaleX;
            const y = (e.clientY - rect.top) / scaleY;

            // Check if clicking on an existing vertex to DELETE
            for (let i = this.runtime.objects.length - 1; i >= 0; i--) {
                const obj = this.runtime.objects[i];
                if (obj.type === 'path' && obj.points) {
                    const world = this.runtime.getWorldTransform(obj);
                    const dx = x - world.x;
                    const dy = y - world.y;
                    const rad = -world.rotation * Math.PI / 180;
                    const lx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / world.scale;
                    const ly = (dx * Math.sin(rad) + dy * Math.cos(rad)) / world.scale;

                    // 1. Check Vertex Hit (Delete)
                    const vertexRadius = 8; // Slightly larger for easier hit
                    const hitIdx = obj.points.findIndex(p => {
                        const dist = Math.sqrt((p.x - lx) ** 2 + (p.y - ly) ** 2);
                        return dist <= vertexRadius;
                    });

                    if (hitIdx !== -1) {
                        if (obj.points.length > 2) { // Minimum 2 points
                            obj.points.splice(hitIdx, 1);
                            // Reset selection/drag state just in case
                            this.runtime._draggingPath = null;
                            this.runtime._draggingVertexIndex = null;
                            return; // Handled
                        }
                    }

                    // 2. Check Segment Hit (Insert)
                    // 2. Check Spline Hit (Insert) using Curve
                    const getSplinePoint = (pts, t, closed) => {
                        const tension = obj.tension !== undefined ? obj.tension : 0.5;
                        const len = pts.length;
                        let i = Math.floor(t * (closed ? len : len - 1));
                        if (i >= (closed ? len : len - 1)) i = (closed ? len : len - 1) - 1;
                        const localT = (t * (closed ? len : len - 1)) - i;
                        const p1 = pts[i];
                        const p2 = pts[(i + 1) % len];
                        const p0 = pts[i === 0 ? (closed ? len - 1 : 0) : i - 1];
                        const p3 = pts[(i + 2) % len];
                        const t2 = localT * localT;
                        const t3 = t2 * localT;
                        const f1 = -tension * t3 + 2 * tension * t2 - tension * localT;
                        const f2 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
                        const f3 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * localT;
                        const f4 = tension * t3 - tension * t2;
                        return {
                            x: f1 * p0.x + f2 * p1.x + f3 * p2.x + f4 * p3.x,
                            y: f1 * p0.y + f2 * p1.y + f3 * p2.y + f4 * p3.y
                        };
                    };

                    const steps = obj.points.length * 10;
                    let prevP = getSplinePoint(obj.points, 0, obj.closed);

                    for (let k = 1; k <= steps; k++) {
                        const t = k / steps;
                        const currP = getSplinePoint(obj.points, t, obj.closed);

                        // Distance from (lx, ly) to spline segment (prevP -> currP)
                        const A = lx - prevP.x;
                        const B = ly - prevP.y;
                        const C = currP.x - prevP.x;
                        const D = currP.y - prevP.y;
                        const dot = A * C + B * D;
                        const lenSq = C * C + D * D;
                        let param = -1;
                        if (lenSq !== 0) param = dot / lenSq;

                        let xx, yy;
                        if (param < 0) { xx = prevP.x; yy = prevP.y; }
                        else if (param > 1) { xx = currP.x; yy = currP.y; }
                        else { xx = prevP.x + param * C; yy = prevP.y + param * D; }

                        const dist = Math.sqrt((lx - xx) ** 2 + (ly - yy) ** 2);

                        if (dist <= 6) { // Tolerance
                            // Found a hit on the curve!
                            // Determine Segment Index to Insert After
                            const len = obj.points.length;
                            // Use 't' from the **current step 'k'** (or midpoint of previous/current)
                            // Actually 't' corresponds to 'currP'. The hit is somewhere between prevP (t_prev) and currP (t).
                            // Let's use 't - 0.5/steps' to get midpoint t for index calculation? 
                            // Or just use t. If t=0.1. Seg index = floor(0.1 * len). Correct.

                            let idx = Math.floor(t * (obj.closed ? len : len - 1));
                            if (idx >= (obj.closed ? len : len - 1)) idx = (obj.closed ? len : len - 1) - 1;

                            // Insert AFTER this index (between i and i+1)
                            // So at index + 1
                            obj.points.splice(idx + 1, 0, { x: lx, y: ly });
                            return;
                        }
                        prevP = currP;
                    }
                }
            }
        });

        // --- Setup DROP Logic (Consuming Sidebar.js events) ---
        this.setupDropZone(overlayZone);

        // --- Register ---
        this.engine.tabManager.openTab('Simulation', 'ovistate', rootContainer, this);

        this.runtime.start();
        Inspector.render(this.engine);
        window.oviEditor = this;
    }

    deleteSelected() {
        if (this.selectedObjects.size === 0) return;

        // Convert to array to avoid modification issues during iteration if needed
        const toDelete = Array.from(this.selectedObjects);

        toDelete.forEach(obj => {
            // Unregister from OviHub
            SceneRegistry.unregister(obj.id);

            // Remove from Runtime
            const idx = this.runtime.objects.indexOf(obj);
            if (idx > -1) this.runtime.objects.splice(idx, 1);

            // Remove from Simulation Data
            const simIdx = this.simulationData.objects.indexOf(obj);
            if (simIdx > -1) this.simulationData.objects.splice(simIdx, 1);

            // TODO: Also remove UI widgets if we unify selection? 
            // Currently UI widgets are in simulationData.controls, handled separately?
            // selectUI uses this.selectedObject = control (generic).
            // But selectObject uses this.selectedObjects.
            // We need to check if 'obj' is in controls or objects.
            const ctrlIdx = this.simulationData.controls.indexOf(obj);
            if (ctrlIdx > -1) {
                this.simulationData.controls.splice(ctrlIdx, 1);
                // Remove DOM element
                const el = this.overlayZone?.querySelector(`[data-id="${obj.id}"]`);
                if (el) el.remove();
            }
        });

        this.selectedObjects.clear();
        this.selectedObject = null; // Legacy clear
        Inspector.render(this.engine);
    }

    // --- View Switching ---
    switchView(mode) {
        if (this.viewMode === mode) return;
        this.viewMode = mode;

        // Update UI Buttons
        Object.values(this.viewButtons).forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.color = '#aaa';
        });
        if (this.viewButtons[mode]) {
            this.viewButtons[mode].style.background = '#007acc';
            this.viewButtons[mode].style.color = 'white';
        }

        // Toggle Containers
        if (mode === 'scene') {
            this.canvas.container.style.display = 'block';
            this.graphContainer.style.display = 'none';
        } else if (mode === 'graph') {
            this.canvas.container.style.display = 'none';
            this.graphContainer.style.display = 'block';

            // Lazy Init Graph Editor
            if (!this.graphEditor) {
                this.graphEditor = new GraphEditor(this.engine);
                // We need to modify GraphEditor to accept a container instead of opening a tab
                // For now, since GraphEditor uses `create()` to make its own Tab, we might need a modified initialization.
                // Let's assume we can manually setup it or we'll modify GraphEditor next.
                // HACK: We will manually inject it into our container

                // GraphEditor.js assumes it creates a new Tab. We need to override or adapt.
                // Let's try to mimic what GraphEditor.create() does but inside our container.

                const ge = this.graphEditor;
                ge.canvas = new OviCanvas(this.graphContainer);
                ge.setupDropZone(this.graphContainer);
                ge.setupInteraction(this.graphContainer);
                ge.bindEvents(); // Attach listeners

                // Handle Connections
                ge.onConnect = (data) => {
                    const { sourceNode, sourcePort, targetNode, targetPort } = data;
                    const sourceId = sourceNode.dataset.objectId;
                    const targetId = targetNode.dataset.objectId;

                    // Decode Port Metadata
                    // We need to store prop data on ports when creating them
                    const sourceProp = sourcePort.dataset.prop || 'default';
                    const targetProp = targetPort.dataset.prop || 'default';
                    this.addBinding(targetId, targetProp, sourceId, sourceProp);
                };

                ge.onDisconnect = (data) => {
                    const { targetNode, targetPort } = data;
                    const targetId = targetNode.dataset.objectId;
                    const targetProp = targetPort.dataset.prop || 'default';

                    this.removeBinding(targetId, targetProp);
                };
            }

            // Sync EVERY time we switch to graph view
            this.syncSceneToGraph();
        }
    }

    syncSceneToGraph() {
        if (!this.graphEditor || !this.runtime) return;

        // Clear existing (simple approach)
        // TODO: Smart diffing later
        // For V1, just ensure every object has a node

        // Combine both Logic Objects and UI Controls for graph visibility
        const allNodes = [
            ...(this.runtime.objects || []),
            ...(this.simulationData.controls || [])
        ];

        allNodes.forEach(obj => {
            // Check if node exists for this object
            const existing = this.graphEditor.nodes.find(n => n.dataset.objectId === obj.id);
            if (!existing) {
                // Determine Node Type
                let type = 'generic';
                if (obj.type === 'timer' || obj.isUI) type = 'event';

                // Position: Just scatter them for now
                const newNode = this.graphEditor.createNode(obj.name || obj.label || obj.id, type, 100 + Math.random() * 400, 100 + Math.random() * 300);

                // Link Node to Object
                newNode.dataset.objectId = obj.id;
                newNode.querySelector('.node-header').innerText = `${obj.name || obj.label || obj.id} (${obj.type})`;

                // --- Customize Ports ---
                // Clear defaults
                newNode.querySelectorAll('.node-port').forEach(p => p.remove());

                // Helper to add port with prop binding
                const addP = (io, label, prop) => {
                    const p = this.graphEditor.addPort(newNode, io, label, newNode.querySelectorAll(`.node-port[data-type="${io}"]`).length);
                    p.dataset.prop = prop;
                    p.title = `${io}put: ${prop}`;
                };

                if (obj.type === 'timer') {
                    addP('input', 'Start', 'start');
                    addP('input', 'Reset', 'reset');
                    addP('output', 'Time', 'currentTime');
                    addP('output', 'Finished', 'onFinish'); // Logic Event
                } else if (obj.type === 'trigger_zone') {
                    addP('output', 'On Enter', 'onEnter');
                    addP('output', 'On Stay', 'onStay');
                    addP('output', 'On Exit', 'onExit');
                } else if (obj.type === 'text') {
                    addP('input', 'Text', 'text');
                    addP('input', 'Color', 'fill');
                    addP('output', 'Clicked', 'click');
                } else if (obj.type === 'circle' || obj.type === 'rect') {
                    addP('input', 'X', 'x');
                    addP('input', 'Y', 'y');
                    addP('input', 'Color', 'fill');
                    addP('output', 'Clicked', 'click');
                } else if (obj.type === 'variable') {
                    addP('input', 'Set Value', 'value');
                    addP('output', 'Current Value', 'value');
                } else if (obj.isUI) {
                    // Premium UI Handling
                    if (obj.type === 'progress_bar') {
                        addP('input', 'Value', 'value');
                        addP('input', 'Color', 'style.accentColor');
                    } else if (obj.type === 'toggle_switch') {
                        addP('input', 'Set State', 'checked');
                        addP('output', 'State Change', 'checked');
                    } else if (obj.type === 'knob') {
                        addP('input', 'Value', 'value');
                        addP('output', 'Value Change', 'value');
                    } else if (obj.type === 'trackpad') {
                        addP('output', 'X', 'trackpad.x');
                        addP('output', 'Y', 'trackpad.y');
                    } else {
                        addP('input', 'Value', 'value');
                        addP('output', 'Value', 'value');
                    }
                } else {
                    // Generic fallback
                    addP('input', 'In', 'default');
                    addP('output', 'Out', 'default');
                }
            }
        });
    }

    // --- Binding Logic (Called from Inspector) ---
    // --- Binding Logic (Called from Inspector or Graph) ---
    addBinding(targetId, targetProp = null, sourceId = null, sourceProp = null) {
        // If arguments are missing, try to read from DOM (Inspector case)
        if (!targetProp) targetProp = document.getElementById('bind-target-prop')?.value;
        if (!sourceId) sourceId = document.getElementById('bind-source-obj')?.value;
        if (!sourceProp) sourceProp = document.getElementById('bind-source-prop')?.value;

        if (!targetId || !targetProp || !sourceId || !sourceProp) {
            console.warn("Missing binding parameters");
            return;
        }

        const obj = this.runtime.getObject(targetId);
        if (obj) {
            if (!obj.bindings) obj.bindings = {};
            // Store binding format: "sourceId.sourceProperty"
            obj.bindings[targetProp] = `${sourceId}.${sourceProp}`;
            console.log(`🔗 Bound ${targetId}.${targetProp} to ${sourceId}.${sourceProp}`);

            // Refresh Inspector
            Inspector.update(this.engine, obj);

            // Refresh Connections
            if (this.connectionRenderer) this.connectionRenderer.render();
        }
    }

    removeBinding(targetId, targetProp) {
        const obj = this.runtime.getObject(targetId);
        if (obj && obj.bindings) {
            delete obj.bindings[targetProp];
            console.log(`🔗 Unbound ${targetId}.${targetProp}`);

            // Refresh Inspector
            Inspector.update(this.engine, obj);
        }
    }

    setupDropZone(zone) {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            zone.style.outline = '2px dashed #007acc';
            zone.style.outlineOffset = '-2px';
        });

        zone.addEventListener('dragleave', () => {
            zone.style.outline = 'none';
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.outline = 'none';

            // CONSUMING DATA FROM SIDEBAR.JS
            // Sidebar.js sets: 'itemType' (string) and 'category' (string)
            const type = e.dataTransfer.getData('itemType');
            const category = e.dataTransfer.getData('category');
            const subtype = e.dataTransfer.getData('subtype'); // For force_field, joint, etc.

            console.log('⬇️ Drop received:', { type, category, subtype });

            if (!type) return;

            const rect = zone.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Logic to distinguish items
            if (category === 'behavior') {
                // If dropped on an object (via hit test) or if we have a selection?
                // The drop event is on the overlay, so we check what's under mouse or if current selection is valid.

                // 1. Check if dropped directly on an object
                let targetObj = null;
                for (let i = this.runtime.objects.length - 1; i >= 0; i--) {
                    if (this.isPointInObject(x, y, this.runtime.objects[i])) {
                        targetObj = this.runtime.objects[i];
                        break;
                    }
                }

                // 2. Logic:
                // - If dropped on an object that is part of selection -> Apply to ALL selected.
                // - If dropped on an object NOT in selection -> Select it (single) and apply to it.
                // - If dropped on empty space but selection exists -> Apply to ALL selected (optional user convenience?).

                let targets = [];

                if (targetObj) {
                    if (this.selectedObjects.has(targetObj)) {
                        targets = Array.from(this.selectedObjects);
                    } else {
                        // New single target
                        this.selectObject(targetObj, false);
                        targets = [targetObj];
                    }
                } else if (this.selectedObjects.size > 0) {
                    // Dropped on empty space, apply to selection?
                    targets = Array.from(this.selectedObjects);
                }

                if (targets.length > 0) {
                    targets.forEach(obj => {
                        if (!obj.behaviors) obj.behaviors = [];
                        if (!obj.behaviors.includes(type)) {
                            obj.behaviors.push(type);
                        }
                    });
                    console.log(`Added behavior ${type} to ${targets.length} objects.`);
                    Inspector.update(this.engine, targets[0]); // Update inspector for one (or multi-view later)
                } else {
                    alert('Select an object or drop onto an object to apply behavior!');
                }

            } else {
                // Objects or Controls
                if (['circle', 'rect', 'text', 'emitter', 'sprite', 'joint', 'spring', 'variable', 'timer', 'trigger_zone', 'path', 'force_field'].includes(type)) {
                    this.createObject(type, x, y, subtype); // Pass subtype
                } else if (['button', 'slider', 'checkbox', 'joystick', 'display', 'dropdown', 'color_picker', 'text_input', 'progress_bar', 'toggle_switch', 'trackpad', 'knob'].includes(type)) {
                    this.createUIComponent(type, zone, { x, y });
                } else if (type === 'graph') {
                    this.createGraph(zone, { x, y });
                }
            }
        });
    }

    createObject(type, x, y, subtype = null) {
        const obj = {
            id: `${type}_${Date.now()}`,
            name: `${type}_${this.runtime.objects.length + 1}`, // Human readable name
            type: type,
            x: x,
            y: y,
            rotation: 0,
            physics: { enabled: true, velocity: { x: 0, y: 0 }, mass: 1, bounciness: 0.8 },
            behaviors: []
        };

        // Set subtype if provided
        if (subtype) {
            obj.subtype = subtype;
        }

        if (type === 'circle') {
            obj.radius = 30;
            obj.fill = '#ff6b6b';
            obj.stroke = '#c92a2a';
            obj.strokeWidth = 2;
        } else if (type === 'rect') {
            obj.width = 60;
            obj.height = 60;
            obj.fill = '#51cf66';
            obj.stroke = '#37b24d';
            obj.strokeWidth = 2;
        } else if (type === 'text') {
            obj.text = 'New Text';
            obj.fontSize = 24;
            obj.fontFamily = 'Arial';
            obj.fill = '#333333';
            obj.align = 'center';
            // Text is usually a label, so disable physics by default
            obj.physics.enabled = false;
        } else if (type === 'emitter') {
            obj.width = 32;
            obj.height = 32;
            obj.rate = 20;
            obj.speed = 150;
            obj.lifetime = 1.0;
            obj.color = '#ffa500';
            obj.angle = -90;
            obj.spread = 45;
            // Emitter is static usually
            obj.physics.enabled = false;
        } else if (type === 'spring') {
            obj.targetA = null;
            obj.targetB = null;
            obj.stiffness = 0.1;
            obj.damping = 0.5;
            obj.length = 100;
            obj.width = 4;
            obj.style = 'coil'; // 'line', 'coil', 'chain'
            obj.color = '#555555';
            obj.anchorA = { x: 0, y: 0 };
            obj.anchorB = { x: 0, y: 0 };
            obj.physics.enabled = true; // Uses custom physics logic
            obj.physics.isConstraint = true;
        } else if (type === 'sprite') {
            obj.width = 100;
            obj.height = 100;
            obj.spriteSheet = ''; // URL placeholder
            obj.spriteCols = 4;
            obj.spriteRows = 1;
            obj.frameCount = 4;
            obj.spriteFPS = 12;
            obj.loop = true;
            obj.physics.enabled = true;
        } else if (type === 'joint') {
            obj.targetA = null;
            obj.targetB = null;
            obj.subtype = 'hinge'; // 'hinge', 'rope'
            obj.anchorA = { x: 0, y: 0 };
            obj.anchorB = { x: 0, y: 0 };
            obj.strength = 1.0;
            obj.length = 100;
            obj.width = 2;
            obj.color = '#2980b9';
            obj.physics.enabled = true;
            obj.physics.isConstraint = true;
        } else if (type === 'variable') {
            obj.width = 100;
            obj.height = 50;
            obj.varName = 'myVar';
            obj.varType = 'Number'; // Number, String, Boolean
            obj.value = 0;
            obj.min = 0;
            obj.max = 100;
            obj.isLogic = true; // Flag to potentially hide in runtime or treat differently
            obj.fill = '#34495e';
            obj.stroke = '#2c3e50';
            obj.strokeWidth = 1;
            obj.opacity = 0.9;
            obj.physics.enabled = false;
        } else if (type === 'path') {
            obj.points = [
                { x: 0, y: 0 },
                { x: 100, y: -50 },
                { x: 200, y: 50 }
            ];
            obj.color = '#3498db';
            obj.width = 4;
            obj.closed = false;
            obj.filled = false;
            obj.fillColor = '#3498db';
            obj.dashed = false;
            obj.tension = 0.5; // For spline
            obj.physics.enabled = false;
        } else if (type === 'trigger_zone') {
            obj.width = 120;
            obj.height = 120;
            obj.color = '#f1c40f'; // Yellow/Gold
            obj.opacity = 0.3;
            obj.showInExport = false;
            obj.physics.enabled = false;
            // State for runtime
            obj._entering = [];
            obj._staying = [];
        } else if (type === 'force_field') {
            obj.physics.enabled = false;
            obj.showInExport = false;
            obj.strength = 500;

            if (obj.subtype === 'wind') {
                obj.visualStyle = 'arrow'; // 'arrow', 'stream', 'fan'
                obj.fanAnimate = true;
                obj.direction = 0; // degrees (0 = right, 90 = down)
                obj.width = 60; // Visual Source Size (e.g. Fan)
                obj.height = 60;
                obj.range = 400; // Force Zone Length
                obj.zoneWidth = 200; // Force Zone Width
                obj.turbulence = 0.1;
                obj.color = '#00bcd4'; // Cyan
                obj.opacity = 0.3;
            } else if (obj.subtype === 'magnet') {
                obj.radius = 150;
                obj.mode = 'attract'; // or 'repel'
                obj.falloff = 'linear'; // 'linear', 'quadratic', 'constant'
                obj.color = '#e91e63'; // Pink/Magenta
                obj.opacity = 0.4;
            }
        } else if (type === 'timer') {
            obj.width = 80;
            obj.height = 40;
            obj.duration = 5;
            obj.mode = 'countdown'; // countdown, stopwatch
            obj.autoStart = false;
            obj.isRunning = false;
            obj.currentTime = 0;
            obj.isLogic = true;
            obj.physics.enabled = false;
        }

        this.addObject(obj);

        // Register with OviHub
        SceneRegistry.register({
            id: obj.id,
            name: obj.name,
            type: obj.type,
            originPlugin: 'ovistate'
        });

        this.selectObject(obj);
    }

    syncAllToRegistry() {
        this.runtime.objects.forEach(obj => {
            SceneRegistry.register({
                id: obj.id,
                name: obj.name || obj.id,
                type: obj.type,
                originPlugin: 'ovistate'
            });
        });
    }

    createUIComponent(type, parent, pos) {
        const id = `${type}_${Date.now()}`;
        const control = {
            id,
            type,
            x: pos.x,
            y: pos.y,
            isUI: true, // Marker for Inspector
            // Defaults
            label: type === 'button' ? 'Button' : (type === 'checkbox' ? 'Enable' : 'Label'),
            style: {
                background: '#007acc',
                color: '#ffffff',
                accentColor: '#007acc',
                trackColor: '#444444',
                surfaceColor: '#1e1e1e',
                opacity: 0.8,
                borderRadius: 4,
                showSurface: true,
                labelPosition: 'Top',
                textAlign: 'Left',
                labelColor: '#ffffff',
                valueColor: '#ffffff',
                orientation: 'Horizontal',
                size: 1
            },
            width: ['slider', 'progress_bar'].includes(type) ? 120 : (['joystick', 'trackpad', 'knob'].includes(type) ? 100 : undefined),
            height: ['joystick', 'trackpad', 'knob'].includes(type) ? 100 : (type === 'progress_bar' ? 20 : undefined),
            min: 0, max: type === 'progress_bar' ? 100 : 500, value: type === 'progress_bar' ? 50 : 100, step: 1,
            // Premium UI Metadata
            bar: type === 'progress_bar' ? {
                mode: 'Horizontal', // Horizontal, Vertical, Circular
                showValue: true,
                gradient: true
            } : undefined,
            switch: type === 'toggle_switch' ? {
                on: false,
                style: 'iOS' // iOS, Material, Neon
            } : undefined,
            knob: type === 'knob' ? {
                angle: 0,
                startAngle: -135,
                endAngle: 135,
                snap: 0
            } : undefined,
            // Joystick/Trackpad Specific
            joystick: type === 'joystick' ? {
                radius: 50, handleRadius: 20, returnToCenter: true, sensitivity: 1.0, axisX: 0, axisY: 0
            } : undefined,
            trackpad: type === 'trackpad' ? {
                x: 0.5, y: 0.5, sensitivity: 1.0
            } : undefined,
            placeholder: 'Enter text...',
            options: ['Option 1', 'Option 2'],
            checked: true
        };

        this.simulationData.controls.push(control);
        this.runtime.addControl(control); // Sync with Runtime for Preview Mode Logic
        this.renderUIComponent(control, parent);
    }

    renderUIComponent(control, parent) {
        // Delegate for Complex Widgets
        if (control.type === 'graph') {
            this.renderGraph(control, parent);
            return;
        }
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
        if (control.type === 'knob') {
            this.renderKnob(control, parent);
            return;
        }

        // Remove existing if any (re-rendering)
        const existing = parent.querySelector(`[data-id="${control.id}"]`);
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.pointerEvents = 'auto';
        wrapper.style.cursor = 'pointer';

        // Add selection outline if selected
        if (control.selected) {
            wrapper.style.outline = '2px solid #007acc';
            wrapper.style.outlineOffset = '2px';
        }

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
                --hover-bg: ${hoverBg}; --hover-scale: ${hoverScale};">${control.label}</button>`;
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

            const hoverScale = control.style?.hoverScale || 1.1;
            const showHoverGlow = control.style?.showHoverGlow !== false;
            const glowOpacity = showHoverGlow ? '26' : '00';
            const hoverGlow = showHoverGlow ? `0 0 0 4px ${accent}${glowOpacity}` : 'none';

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
            if (surface.startsWith('#')) {
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
                <label style="font-size:12px; font-weight:bold; color: ${labelColor}; margin: ${labelMargin}; cursor: pointer;">${control.label}</label>
                <div class="ui-custom-checkbox ${control.checked ? 'checked' : ''}" data-id="${control.id}"
                     style="transform: scale(${size}); --box-color: ${accent}; --check-color: #ffffff; --radius: ${radius}px;">
                </div>
            </div>`;
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
            if (surface.startsWith('#')) {
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
            const opts = safeOpts.map(o => `<option>${o.trim()}</option>`).join('');

            content = `
            <div style="${surfaceStyle} display: flex; flex-direction: ${flexDirection}; align-items: ${alignItems}; justify-content: ${justifyText}; font-family: sans-serif;">
                <label style="font-size:10px; font-weight:bold; color: ${labelColor}; margin: ${labelMargin}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${control.label}</label>
                <select class="ui-widget-select" data-id="${control.id}" 
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
                <div style="display:flex; align-items:center; background:${bg}; padding:2px; border-radius:${radius}px; border:1px solid #ccc; position:relative;">
                    <span class="drag-handle" style="cursor:move; margin-right:4px; color:#999; font-size:14px; line-height:1; user-select:none;">✥</span>
                    <input class="ui-widget-input" data-id="${control.id}" type="color" value="${colorValue}" 
                        style="border:none; width:30px; height:30px; cursor:pointer; background:transparent;">
                </div>
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
            if (surface.startsWith('#')) {
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
                <div style="display:flex; align-items:center; background:${bg}; padding:4px; border-radius:${radius}px; border:1px solid #ccc; position:relative;">
                    <span class="drag-handle" style="cursor:move; margin-right:6px; color:#999; font-size:14px; line-height:1; user-select:none;">✥</span>
                    <input class="ui-widget-input" data-id="${control.id}" type="text" placeholder="${control.placeholder || ''}" value="${control.value || ''}" 
                        style="border:none; outline:none; background:transparent; font-size:${fontSize}px; width:100px; color:${color};">
                </div>
            </div>`;
        } else if (control.type === 'display') {
            content = `<div style="background: white; border: 1px solid #ccc; padding: 5px; text-align: center; width: 80px;">0.00</div>`;
        }

        wrapper.innerHTML = content;

        // --- Button Interaction ---
        if (control.type === 'button') {
            const btn = wrapper.querySelector('button');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log('Button clicked!', control.binding);

                    // Unified Handling via RuntimeUI (if attached and in playback)
                    if (this.isPlaying) {
                        if (this.ui) {
                            // Determine Targets: Support both .targets (Array) and .targetId (Legacy)
                            const targetIds = control.binding?.targets || (control.binding?.targetId ? [control.binding.targetId] : []);

                            targetIds.forEach(tid => {
                                const target = this.runtime.getObject(tid) || this.runtime.objects.find(o => o.id === tid);
                                if (target) {
                                    this.ui.triggerAction(control, target);
                                }
                            });

                            // Broadcast Action ID globally
                            if (control.binding?.actionId) {
                                this.runtime.emitAction(control.binding.actionId);
                            }
                        }
                    } else {
                        // In Edit Mode, just select the control (already handled by wrapper click usually)
                    }
                });
            }
        }

        // --- Interactivity: Capture changes from Canvas UI ---
        const checkbox = wrapper.querySelector('.ui-custom-checkbox');
        if (checkbox) {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                control.checked = !control.checked;
                checkbox.classList.toggle('checked', control.checked);

                // Sync Inspector
                if (window.oviEditor.selectedObject === control) {
                    const inspectorCheck = document.querySelector('.toggle-switch[data-property="checked"]');
                    if (inspectorCheck) {
                        inspectorCheck.classList.toggle('active', control.checked);
                    }
                }
            });
        }

        const input = wrapper.querySelector('input, select');
        if (input) {
            // Allow interactions to also select the component by bubbling
            // but we might want to prevent drag-start if implemented later.
            // For now, bubbling is fine for selection.
            // input.addEventListener('mousedown', (e) => e.stopPropagation()); 

            const eventType = (control.type === 'text_input' || control.type === 'color_picker') ? 'change' : 'input';

            input.addEventListener(eventType, (e) => {
                // Update Model
                if (control.type === 'checkbox') {
                    control.checked = e.target.checked;
                } else if (control.type === 'slider') {
                    control.value = parseFloat(e.target.value);
                } else {
                    control.value = e.target.value;
                }

                // Sync Inspector if this is the selected object
                if (this.selectedObject === control) {
                    // Try to update Inspector value display without full re-render
                    const inspectorInput = document.querySelector(`input[data-property="value"]`);
                    const inspectorSlider = document.querySelector(`input[type="range"][data-property="value"]`);
                    const inspectorCheck = document.querySelector(`input[type="checkbox"][data-property="checked"]`);

                    if (control.type === 'slider') {
                        if (inspectorInput) inspectorInput.value = control.value;
                        if (inspectorSlider) inspectorSlider.value = control.value;
                    } else if (control.type === 'checkbox') {
                        if (inspectorCheck) inspectorCheck.checked = control.checked;
                    }
                }

                // NEW: Trigger Bound Object Update (Crucial for Play Mode)
                if (this.isPlaying && this.ui) {
                    this.ui.updateBoundObject(control);
                }
            });
        }



        parent.appendChild(wrapper);
    }

    selectUI(control) {
        // OviLink: Don't select if in connection mode
        if (this._oviLinkMode) {
            console.log('🔗 OviLink: Skipping selection during connection mode');
            return;
        }

        // For UI, let's keep it simple: Single select for now unless we implement full multi-select for UI too.
        // But to support deletion, we MUST add it to selectedObjects.

        this.deselectObject(); // Clear physics objects (and UI? deselectObject clears everything now)

        // Single select UI logic for now to keep inspector simple
        this.selectedObjects.add(control);
        this.selectedObject = control; // Legacy support

        // Update selection state and visuals non-destructively
        this.simulationData.controls.forEach(c => {
            c.selected = (c === control);
            const el = this.overlayZone?.querySelector(`[data-id="${c.id}"]`);
            if (el) {
                if (c.selected) {
                    el.style.outline = '2px solid #007acc';
                    el.style.outlineOffset = '2px';
                    el.style.zIndex = '100'; // Bring to front
                } else {
                    el.style.outline = 'none';
                    el.style.zIndex = '';
                }
            }
        });

        Inspector.update(this.engine, control);
    }

    createGraph(parent, pos) {
        const id = `graph_${Date.now()}`;
        const control = {
            id,
            type: 'graph',
            subtype: 'line', // 'line' or 'gauge'
            x: pos.x,
            y: pos.y,
            width: 300,
            height: 200,
            isUI: true,
            data: [],
            maxPoints: 100,
            // Data Scaling
            autoScale: true,
            min: 0,
            max: 100,

            // Visual Styles
            style: {
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#007acc',
                lineWidth: 2,
                tension: 0.1,
                fillArea: false,
                fillColor: 'rgba(0, 122, 204, 0.2)'
            },

            // Gauge Specifics
            gauge: {
                startAngle: -Math.PI, // 180 degrees (half circle)
                endAngle: 0,
                segments: [
                    { percent: 0.6, color: '#007acc' }, // Normal
                    { percent: 0.8, color: '#ffa500' }, // Warning
                    { percent: 1.0, color: '#ff4444' }  // Danger
                ]
            },

            // Components
            grid: {
                show: true,
                color: 'rgba(0,0,0,0.1)',
                steps: 5
            },
            axes: {
                show: true,
                color: '#666',
                labels: true,
                fontSize: 10
            },
            badge: {
                show: true,
                color: '#007acc'
            }
        };

        this.simulationData.controls.push(control);
        this.renderGraph(control, parent);
    }

    renderGraph(control, parent) {
        const existing = parent.querySelector(`[data-id="${control.id}"]`);
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = (control.width || 250) + 'px';
        wrapper.style.height = (control.height || 150) + 'px';
        wrapper.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        wrapper.style.border = '1px solid #ccc';
        wrapper.style.borderRadius = '6px';
        wrapper.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
        wrapper.style.pointerEvents = 'auto'; // allow selection
        wrapper.style.overflow = 'hidden';

        if (control.selected) {
            wrapper.style.outline = '2px solid #007acc';
        }

        // Canvas setup
        const h = (control.height || 150) - 25;
        const w = (control.width || 250);

        wrapper.innerHTML = `
            <div style="padding: 5px 8px; font-size: 10px; font-weight: bold; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; background: #f8f9fa; color: #444;">
                <span>${control.binding?.property || 'Select Source...'}</span>
                <span class="graph-value" style="color: ${control.style.color}; font-family: monospace;">--</span>
            </div>
            <div style="position: relative; width: 100%; height: ${h}px; background: #fff;">
                <canvas width="${w}" height="${h}" style="width:100%; height:100%; display:block;"></canvas>
            </div>
        `;

        parent.appendChild(wrapper);

        // Draw static preview
        const cvs = wrapper.querySelector('canvas');
        if (cvs) {
            const ctx = cvs.getContext('2d');
            this.drawGraphPreview(ctx, control, w, h);
        }
    }

    drawGraphPreview(ctx, control, w, h) {
        ctx.clearRect(0, 0, w, h);

        if (control.subtype === 'gauge') {
            const cx = w / 2, cy = h * 0.85;
            const r = Math.min(w, h) * 0.55;
            const startAngle = control.gauge?.startAngle ?? -Math.PI;
            const endAngle = control.gauge?.endAngle ?? 0;
            const totalAngle = endAngle - startAngle;

            // Background Arc
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.lineWidth = 10;
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Value Arc (Preview half full)
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + totalAngle * 0.5);
            ctx.lineWidth = 10;
            ctx.strokeStyle = control.style?.color || '#007acc';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Needle
            const needleAngle = startAngle + totalAngle * 0.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(needleAngle) * r * 0.8, cy + Math.sin(needleAngle) * r * 0.8);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#333';
            ctx.stroke();

            ctx.fillStyle = '#666';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("GAUGE PREVIEW", cx, h - 10);
        } else {
            // Line chart preview
            ctx.strokeStyle = control.style?.color || '#007acc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, h * 0.8);
            ctx.lineTo(w * 0.2, h * 0.4);
            ctx.lineTo(w * 0.4, h * 0.7);
            ctx.lineTo(w * 0.6, h * 0.2);
            ctx.lineTo(w * 0.8, h * 0.5);
            ctx.lineTo(w, h * 0.3);
            ctx.stroke();

            ctx.fillStyle = '#999';
            ctx.font = '10px sans-serif';
            ctx.fillText("Graph Preview", 5, 15);
        }
    }

    renderJoystick(control, parent) {
        const existing = parent.querySelector(`[data-id="${control.id}"]`);
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = (control.width || 100) + 'px';
        wrapper.style.height = (control.height || 100) + 'px';

        const opacity = control.style?.opacity !== undefined ? control.style.opacity : 0.8;
        const surfaceColor = control.style?.surfaceColor || '#ffffff';
        const showBase = control.style?.showSurface !== false;

        wrapper.style.background = showBase ? `rgba(${this.hexToRgb(surfaceColor)}, ${opacity * 0.2})` : 'none';
        wrapper.style.border = showBase ? `1px solid rgba(${this.hexToRgb(surfaceColor)}, ${opacity * 0.4})` : 'none';
        wrapper.style.borderRadius = '50%';
        wrapper.style.boxShadow = showBase ? `inset 0 2px 5px rgba(0,0,0,${opacity * 0.1})` : 'none';
        wrapper.style.pointerEvents = 'auto';

        if (control.selected) {
            wrapper.style.outline = '2px solid #007acc';
            wrapper.style.outlineOffset = '4px';
        }

        const h = (control.height || 100);
        const w = (control.width || 100);

        wrapper.innerHTML = `<canvas width="${w}" height="${h}" style="width:100%; height:100%; display:block;"></canvas>`;

        parent.appendChild(wrapper);

        const canvas = wrapper.querySelector('canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            this.drawJoystickPreview(ctx, control, w, h);
        }
    }

    drawJoystickPreview(ctx, control, w, h) {
        const cx = w / 2, cy = h / 2;
        const r = (control.joystick?.radius || 50) * 0.8;
        const hr = (control.joystick?.handleRadius || 20);

        const baseColor = control.style?.background || '#000000';
        const handleColor = control.style?.accentColor || '#333333';
        const opacity = control.style?.opacity !== undefined ? control.style.opacity : 0.8;
        const showBase = control.style?.showSurface !== false;

        ctx.clearRect(0, 0, w, h);

        if (showBase) {
            // Base
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.hexToRgb(baseColor)}, ${opacity * 0.1})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${this.hexToRgb(handleColor)}, ${opacity * 0.3})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Handle
        ctx.beginPath();
        ctx.arc(cx, cy, hr, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hr);
        grad.addColorStop(0, this.lightenColor(handleColor, 20));
        grad.addColorStop(1, handleColor);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = `rgba(0,0,0,${opacity * 0.5})`;
        ctx.stroke();

        // Label (Optional: only if it helps in editor)
        // ctx.fillStyle = `rgba(${this.hexToRgb(handleColor)}, ${opacity * 0.6})`;
        // ctx.font = '9px sans-serif';
        // ctx.textAlign = 'center';
        // ctx.fillText("JOYSTICK", cx, cy + r + 12);
    }

    isPointInObject(mouseX, mouseY, obj) {
        const world = this.runtime.getWorldTransform(obj);

        // Transform mouse point to local space
        const dx = mouseX - world.x;
        const dy = mouseY - world.y;

        const rad = -world.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const x = (dx * cos - dy * sin) / (world.scale || 1);
        const y = (dx * sin + dy * cos) / (world.scale || 1);

        if (obj.type === 'circle') {
            const radius = obj.radius || 30;
            return x * x + y * y <= radius * radius;
        } else if (obj.type === 'vector_path') {
            if (obj._path2d && this.runtime.ctx) {
                // For path testing, we need the "Path Space" mouse
                const alx = x - (obj.renderOffset ? obj.renderOffset.x : 0);
                const aly = y - (obj.renderOffset ? obj.renderOffset.y : 0);
                if (this.runtime.ctx.isPointInPath(obj._path2d, alx, aly)) return true;
            }
            // Fallback to AABB (Visual center is 0,0)
            const w = obj.width || 50;
            const h = obj.height || 50;
            return x >= -w / 2 && x <= w / 2 && y >= -h / 2 && y <= h / 2;
        } else if (obj.type === 'path') {
            const points = obj.points || [];
            if (points.length < 2) return false;

            // Use Spline Interpolation for Hit Test
            // We sample the spline and check distance to those segments
            const tolerance = (obj.width || 4) / 2 + 6; // Hit radius
            const tension = obj.tension !== undefined ? obj.tension : 0.5;

            // Inline Helper for Spline Point (Matched to Core.js)
            const getSplinePoint = (pts, t, closed) => {
                const len = pts.length;
                let i = Math.floor(t * (closed ? len : len - 1));
                if (i >= (closed ? len : len - 1)) i = (closed ? len : len - 1) - 1;
                const localT = (t * (closed ? len : len - 1)) - i;
                const p1 = pts[i]; // i is safe index
                const p2 = pts[(i + 1) % len];
                const p0 = pts[i === 0 ? (closed ? len - 1 : 0) : i - 1]; // Handle closed loop or edge
                const p3 = pts[(i + 2) % len];

                // Catmull-Rom logic
                const t2 = localT * localT;
                const t3 = t2 * localT;
                const f1 = -tension * t3 + 2 * tension * t2 - tension * localT;
                const f2 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
                const f3 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * localT;
                const f4 = tension * t3 - tension * t2;
                return {
                    x: f1 * p0.x + f2 * p1.x + f3 * p2.x + f4 * p3.x,
                    y: f1 * p0.y + f2 * p1.y + f3 * p2.y + f4 * p3.y
                };
            };

            const steps = points.length * 10;
            let prevP = getSplinePoint(points, 0, obj.closed);

            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const currP = getSplinePoint(points, t, obj.closed);

                // Check dist to segment prevP -> currP
                const A = x - prevP.x;
                const B = y - prevP.y;
                const C = currP.x - prevP.x;
                const D = currP.y - prevP.y;
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                let param = -1;
                if (lenSq !== 0) param = dot / lenSq;

                let xx, yy;
                if (param < 0) { xx = prevP.x; yy = prevP.y; }
                else if (param > 1) { xx = currP.x; yy = currP.y; }
                else { xx = prevP.x + param * C; yy = prevP.y + param * D; }

                const dist = Math.sqrt((x - xx) ** 2 + (y - yy) ** 2);
                if (dist <= tolerance) return true;

                prevP = currP;
            }

            // Check fill if closed and filled (Use control points for cheap approx)
            if (obj.closed && obj.filled) {
                let inside = false;
                for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                    const xi = points[i].x, yi = points[i].y;
                    const xj = points[j].x, yj = points[j].y;
                    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
                }
                if (inside) return true;
            }

            return false;
        } else if (obj.type === 'rect' || obj.type === 'emitter' || obj.type === 'sprite' || obj.type === 'text' || obj.type === 'variable' || obj.type === 'timer' || obj.type === 'trigger_zone' || (obj.type === 'force_field' && obj.subtype === 'wind')) {
            const w = obj.width || 50;
            const h = obj.height || (obj.type === 'text' ? (obj.fontSize || 20) * 1.2 : 50);
            return x >= -w / 2 && x <= w / 2 && y >= -h / 2 && y <= h / 2;
        } else if (obj.type === 'force_field' && obj.subtype === 'magnet') {
            // Magnet uses circular hit detection
            const radius = obj.radius || 150;
            return x * x + y * y <= radius * radius;
        } else if (obj.type === 'symbol') {
            const size = obj.size || 48;
            return x >= -size / 2 && x <= size / 2 && y >= -size / 2 && y <= size / 2;
        } else if (obj.type === 'spring' || obj.type === 'joint') {
            // Editor Selection Logic for Springs & Joints
            // 'x' and 'y' here are Local Mouse Coordinates relative to obj.x/obj.y
            // Unconnected Spring/Joint (Placeholder)
            if (!obj.targetA || !obj.targetB) {
                return (Math.abs(x) <= 15 && Math.abs(y) <= 30);
            }

            // Connected (World Space Line)
            const bodyA = this.runtime.getObject(obj.targetA);
            const bodyB = this.runtime.getObject(obj.targetB);

            if (bodyA && bodyB) {
                const wa = this.runtime.getWorldTransform(bodyA);
                const wb = this.runtime.getWorldTransform(bodyB);

                const x1 = wa.x, y1 = wa.y;
                const x2 = wb.x, y2 = wb.y;

                const A = mouseX - x1, B = mouseY - y1;
                const C = x2 - x1, D = y2 - y1;
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                let param = -1;
                if (lenSq !== 0) param = dot / lenSq;

                let xx, yy;
                if (param < 0) { xx = x1; yy = y1; }
                else if (param > 1) { xx = x2; yy = y2; }
                else { xx = x1 + param * C; yy = y1 + param * D; }

                const dx = mouseX - xx;
                const dy = mouseY - yy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                return (dist <= (obj.width || 10) + 5);
            }
            return false;
        }
        return false;
    }

    addObject(obj) {
        // Ensure standard properties exist for OviState compatibility
        if (!obj.name) obj.name = obj.id;
        if (!obj.behaviors) obj.behaviors = [];
        if (!obj.behaviorParams) obj.behaviorParams = {};
        if (obj.physics === undefined) obj.physics = { enabled: false, type: 'dynamic' };

        this.runtime.addObject(obj);
        this.simulationData.objects.push(obj);

        // Register with OviHub
        SceneRegistry.register({
            id: obj.id,
            name: obj.name,
            type: obj.type,
            originPlugin: 'ovistate'
        });

        // Update UI
        Inspector.update(this.engine, obj);
    }

    selectObject(obj, toggle = false) {
        if (!toggle) {
            // Single select: Clear others
            this.selectedObjects.clear();
            this.runtime.objects.forEach(o => o.selected = false);

            // FIX: Also clear UI selection visuals
            if (this.simulationData.controls) {
                this.simulationData.controls.forEach(c => {
                    c.selected = false;
                    const el = this.overlayZone?.querySelector(`[data-id="${c.id}"]`);
                    if (el) {
                        el.style.outline = 'none';
                        el.style.zIndex = '';
                    }
                });
            }
        }

        if (toggle && this.selectedObjects.has(obj)) {
            // Toggle off
            this.selectedObjects.delete(obj);
            obj.selected = false;
        } else {
            // Select
            this.selectedObjects.add(obj);
            obj.selected = true;
        }

        // FIX: Sync Legacy 'selectedObject' for mouseup handlers
        if (this.selectedObjects.size === 1) {
            this.selectedObject = Array.from(this.selectedObjects)[0];
            Inspector.update(this.engine, this.selectedObject);
        } else if (this.selectedObjects.size > 1) {
            this.selectedObject = null; // Multi-select mode
            Inspector.update(this.engine, { isMultiSelect: true, count: this.selectedObjects.size });
        } else {
            this.selectedObject = null;
            Inspector.render(this.engine);
        }
    }

    deselectObject() {
        this.selectedObjects.clear();
        this.runtime.objects.forEach(o => o.selected = false);
        Inspector.render(this.engine);
    }

    removeBehavior(behaviorId) {
        if (!this.selectedObject) return;
        this.behaviorSystem.removeBehavior(this.selectedObject, behaviorId);
        Inspector.update(this.engine, this.selectedObject);
    }

    getSimulationData() {
        // SYNC: Ensure simulationData is up to date with Runtime Objects
        // This is critical because _behaviorParams and positions live in Runtime Objects
        if (this.runtime && this.runtime.objects) {
            this.simulationData.objects = this.runtime.objects.map(obj => {
                // We return the live object reference since JSON.stringify will clean it up later.
                // Note: Cyclic references would break this, but our objects should be DAGs.
                return obj;
            });

        }
        return this.simulationData;
    }
    // --- Preview Mode Logic ---

    play() {
        if (this.isPlaying) return;

        // Snapshot Initial State (Deep Clone)
        if (!this.initialState) {
            console.log('📸 Snapshotting simulation state...');
            this.initialState = JSON.stringify(this.runtime.objects, (key, value) => {
                if (key === 'activeCollisions') return undefined;
                return value;
            });
        }

        this.isPlaying = true;
        this.runtime.isEditorPreview = true; // Hide helpers

        // --- Smart Solution: Clear Selection on Play ---
        this.selectedObjects.clear();
        this.selectedObject = null;
        Inspector.render(this.engine);

        this.updatePreviewButtons();

        // Ensure Physics is active
        if (this.runtime.physicsEngine) {
            this.runtime.physicsEngine.paused = false;
        }

        // --- NEW: Play Timeline ---
        if (this.runtime.timelineSystem) {
            this.runtime.timelineSystem.play();
        }
    }

    pause() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.runtime.isEditorPreview = false; // Show helpers
        this.updatePreviewButtons();

        // Pause Physics
        if (this.runtime.physicsEngine) {
            this.runtime.physicsEngine.paused = true;
        }

        // --- NEW: Pause Timeline ---
        if (this.runtime.timelineSystem) {
            this.runtime.timelineSystem.pause();
        }
    }

    reset() {
        this.isPlaying = false;
        this.runtime.isEditorPreview = false; // Reset preview flag
        this.updatePreviewButtons();

        // Reset Editor dragging state
        this.isDraggingObject = false;
        this.isDraggingUI = false;
        this.runtime.isMouseDown = false;
        this.runtime._draggingObj = null;
        this.runtime._clickHandled = false;

        // Ensure runtime loop is running for editor interaction
        this.runtime.start();

        // --- NEW: Stop Timeline ---
        if (this.runtime.timelineSystem) {
            this.runtime.timelineSystem.stop();
        }

        // --- NEW: Sync Puppeteering Data Back to Source ---
        // Before we kill the runtime objects, we must save any recorded keyframes
        this.runtime.objects.forEach(runtimeObj => {
            const sourceObj = this.simulationData.objects.find(o => o.id === runtimeObj.id);
            if (sourceObj) {
                // If it has new animation clips, sync them all
                if (runtimeObj.animations) {
                    sourceObj.animations = JSON.parse(JSON.stringify(runtimeObj.animations));
                }
                // Also legacy sync if needed (though we mostly use animations now)
                if (runtimeObj.timeline) {
                    sourceObj.timeline = JSON.parse(JSON.stringify(runtimeObj.timeline));
                }
            }
        });

        // --- Smart Solution: Clear Selection on Reset ---
        this.selectedObjects.clear();
        this.selectedObject = null;
        Inspector.render(this.engine);

        // Restore initial state (Actually we re-initialize from simulationData below)
        if (this.initialState) {
            // we could parse it, but we prefer simulationData for fresh re-link
        }

        // Re-initialize Runtime fully from Data to be safe
        this.runtime.objects = [];
        this.runtime.controls = [];
        this.simulationData.objects.forEach(obj => {
            // Deep clone to break reference from editor state
            const instance = JSON.parse(JSON.stringify(obj, (key, value) => {
                if (key === 'activeCollisions') return undefined;
                return value;
            }));
            // Restore physics if needed
            if (!instance.physics) instance.physics = { enabled: true, velocity: { x: 0, y: 0 } };

            // Clear any runtime-only flags
            instance._isDragging = false;
            instance.isHovered = false;

            this.runtime.addObject(instance);
        });
        this.simulationData.controls.forEach(c => this.runtime.addControl(c));

        // Restore behaviors registry connection
        this.runtime.registry = this.behaviorSystem.registry;

        this.runtime.render();
        console.log("⏹️ Simulation Reset");
    }

    resizeCanvas(w, h) {
        w = parseInt(w);
        h = parseInt(h);
        if (!w || !h) return;

        this.simulationData.canvas.width = w;
        this.simulationData.canvas.height = h;

        // Resize Runtime
        if (this.runtime) {
            this.runtime.resize(w, h);
        }

        // Resize DOM wrappers
        const container = this.runtime.canvas.parentElement; // resizableContainer
        if (container) {
            container.style.width = w + 'px';
            container.style.height = h + 'px';
        }
    }

    exportJSON() {
        const data = this.getSimulationData();
        // Use the same replacer fix we made for the Exporter to be safe
        const json = JSON.stringify(data, (key, value) => {
            if (key === 'activeCollisions') return undefined;
            return value;
        }, 2);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.metadata.title || 'simulation'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    renderProgressBar(control, parent) {
        const existing = parent.querySelector(`[data-id="${control.id}"]`);
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = (control.width || 120) + 'px';
        wrapper.style.height = (control.height || 20) + 'px';
        wrapper.style.pointerEvents = 'auto';

        const pct = Math.min(100, Math.max(0, ((control.value - control.min) / (control.max - control.min)) * 100));
        const color = control.style?.accentColor || '#4caf50';

        wrapper.innerHTML = `
            <div style="width: 100%; height: 100%; background: #333; border-radius: 10px; overflow: hidden; border: 1px solid #444; position: relative;">
                <div class="progress-fill" style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, ${color}, #81c784); transition: width 0.3s ease;"></div>
                ${control.bar?.showValue ? `<div style="position: absolute; width: 100%; text-align: center; top: 50%; transform: translateY(-50%); font-size: 10px; color: white; mix-blend-mode: difference;">${Math.round(pct)}%</div>` : ''}
            </div>
        `;

        if (control.selected) {
            wrapper.style.outline = '2px solid #007acc';
            wrapper.style.outlineOffset = '2px';
        }

        parent.appendChild(wrapper);
    }

    renderToggleSwitch(control, parent) {
        const existing = parent.querySelector(`[data-id="${control.id}"]`);
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = '50px';
        wrapper.style.height = '26px';
        wrapper.style.pointerEvents = 'auto';

        const isOn = control.value > 0 || control.checked;
        const color = control.style?.accentColor || '#4cd964';

        wrapper.innerHTML = `
            <div class="premium-toggle ${isOn ? 'on' : ''}" style="
                width: 100%; height: 100%; background: ${isOn ? color : '#e9e9eb'}; 
                border-radius: 20px; position: relative; cursor: pointer; transition: background 0.3s;">
                <div style="
                    width: 22px; height: 22px; background: white; border-radius: 50%;
                    position: absolute; top: 2px; left: ${isOn ? '26px' : '2px'};
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: left 0.3s ease;"></div>
            </div>
            <div style="font-size: 10px; color: #fff; text-align: center; margin-top: 4px;">${control.label}</div>
        `;

        wrapper.onclick = (e) => {
            e.stopPropagation();
            control.checked = !control.checked;
            control.value = control.checked ? 1 : 0;
            this.renderToggleSwitch(control, parent);
            Inspector.update(this.engine, control);
        };

        if (control.selected) {
            wrapper.style.outline = '2px solid #007acc';
            wrapper.style.outlineOffset = '2px';
        }

        parent.appendChild(wrapper);
    }

    renderTrackpad(control, parent) {
        const existing = parent.querySelector(`[data-id="${control.id}"]`);
        if (existing) existing.remove();

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
        wrapper.style.borderRadius = '8px';
        wrapper.style.pointerEvents = 'auto';

        const dot = document.createElement('div');
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.background = control.style?.accentColor || '#007acc';
        dot.style.borderRadius = '50%';
        dot.style.position = 'absolute';
        dot.style.left = (control.trackpad.x * 100) + '%';
        dot.style.top = (control.trackpad.y * 100) + '%';
        dot.style.transform = 'translate(-50%, -50%)';
        dot.style.boxShadow = '0 0 10px rgba(0,122,204,0.5)';

        wrapper.appendChild(dot);

        const handleMove = (e) => {
            const rect = wrapper.getBoundingClientRect();
            const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
            control.trackpad.x = x;
            control.trackpad.y = y;
            dot.style.left = (x * 100) + '%';
            dot.style.top = (y * 100) + '%';
            Inspector.update(this.engine, control);
        };

        wrapper.onmousedown = (e) => {
            // Only stop propagation if we are in Play Mode (Interacting)
            // In Editor Mode, we want it to bubble so it can be selected/moved
            if (this.isPlaying) {
                e.stopPropagation();
            }
            const onMove = (e) => handleMove(e);
            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            handleMove(e);
        };

        if (control.selected) {
            wrapper.style.outline = '2px solid #007acc';
            wrapper.style.outlineOffset = '2px';
        }

        parent.appendChild(wrapper);
    }

    renderKnob(control, parent) {
        const existing = parent.querySelector(`[data-id="${control.id}"]`);
        if (existing) existing.remove();

        const wrapper = document.createElement('div');
        wrapper.className = 'ui-widget-wrapper';
        wrapper.setAttribute('data-id', control.id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = control.x + 'px';
        wrapper.style.top = control.y + 'px';
        wrapper.style.width = (control.width || 80) + 'px';
        wrapper.style.height = (control.height || 80) + 'px';
        wrapper.style.pointerEvents = 'auto';

        const pct = (control.value - control.min) / (control.max - control.min);
        const angle = control.knob.startAngle + pct * (control.knob.endAngle - control.knob.startAngle);

        wrapper.innerHTML = `
            <div style="width: 100%; height: 100%; background: #1a1a1a; border-radius: 50%; border: 4px solid #333; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #2c2c2c 0%, #111 100%); border-radius: 50%;"></div>
                <div class="knob-indicator" style="
                    width: 4px; height: 35%; background: ${control.style?.accentColor || '#007acc'};
                    position: absolute; top: 15%; left: 50%; transform-origin: 50% 100%;
                    transform: translateX(-50%) rotate(${angle}deg); border-radius: 2px;"></div>
                <div style="position: absolute; bottom: -20px; width: 100%; text-align: center; color: white; font-size: 10px;">${control.label}</div>
            </div>
        `;

        let startY = 0;
        let startValue = 0;

        wrapper.onmousedown = (e) => {
            // Only stop propagation if we are in Play Mode (Interacting)
            // In Editor Mode, we want it to bubble so it can be selected/moved
            if (this.isPlaying) {
                e.stopPropagation();
            }
            startY = e.clientY;
            startValue = control.value;

            const onMove = (me) => {
                const dy = startY - me.clientY;
                const range = control.max - control.min;
                const sensitivity = range / 200; // 200px for full range
                let newVal = startValue + dy * sensitivity;
                newVal = Math.min(control.max, Math.max(control.min, newVal));

                if (control.knob.snap > 0) newVal = Math.round(newVal / control.knob.snap) * control.knob.snap;

                control.value = newVal;
                this.renderKnob(control, parent);
                Inspector.update(this.engine, control);
            };

            const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };

        if (control.selected) {
            wrapper.style.outline = '2px solid #007acc';
            wrapper.style.outlineOffset = '2px';
        }

        parent.appendChild(wrapper);
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
