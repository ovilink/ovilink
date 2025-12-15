import OviCanvas from '../../../js/ui/OviCanvas.js';
// PhysicsEngine removed (integrated into Core.js)
import OviStateRuntime from '../runtime/Core.js';
import Inspector from '../ui/Inspector.js';
import BehaviorSystem from '../runtime/BehaviorSystem.js';
import RuntimeUI from '../ui/RuntimeUI.js';

export default class OviStateEditor {
    constructor(engine) {
        this.engine = engine;
        this.canvas = null;
        this.runtime = null;
        this.behaviorSystem = null;
        this.physics = null; // Placeholder, not used explicitly anymore
        this.selectedObjects = new Set();

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
        topToolbar.style.height = '40px';
        topToolbar.style.backgroundColor = '#2d2d2d';
        topToolbar.style.borderBottom = '1px solid #333';
        topToolbar.style.display = 'flex';
        topToolbar.style.alignItems = 'center';
        topToolbar.style.justifyContent = 'space-between'; // Changed for center validation
        topToolbar.style.padding = '0 15px';

        // Left: Branding
        const brand = document.createElement('div');
        brand.innerHTML = '<span style="color:#ccc; font-size:12px;">OviState Editor</span>';
        topToolbar.appendChild(brand);

        // Center: Preview Controls
        const previewControls = document.createElement('div');
        previewControls.style.display = 'flex';
        previewControls.style.gap = '10px';

        const btnStyle = "padding: 4px 12px; border: 1px solid #444; background: #333; color: #fff; border-radius: 4px; cursor: pointer; font-size: 14px; transition: background 0.2s;";

        const playBtn = document.createElement('button');
        playBtn.innerHTML = '▶️';
        playBtn.title = "Play Simulation";
        playBtn.style.cssText = btnStyle;
        playBtn.onclick = () => this.play();

        const pauseBtn = document.createElement('button');
        pauseBtn.innerHTML = '⏸️';
        pauseBtn.title = "Pause Simulation";
        pauseBtn.style.cssText = btnStyle;
        pauseBtn.onclick = () => this.pause();

        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '⏹️';
        resetBtn.title = "Reset Simulation";
        resetBtn.style.cssText = btnStyle;
        resetBtn.onclick = () => this.reset();

        // Active State Helper
        this.updatePreviewButtons = () => {
            playBtn.style.background = this.isPlaying ? '#27ae60' : '#333';
            playBtn.style.borderColor = this.isPlaying ? '#2ecc71' : '#444';
        };

        previewControls.appendChild(playBtn);
        previewControls.appendChild(pauseBtn);
        previewControls.appendChild(resetBtn);
        topToolbar.appendChild(previewControls);

        // Right: Spacer (for balance)
        const spacer = document.createElement('div');
        spacer.style.width = '100px';
        topToolbar.appendChild(spacer);

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
        simulationWrapper.appendChild(resizableContainer);
        workspace.appendChild(simulationWrapper);

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

        this.behaviorSystem = new BehaviorSystem(this.runtime);
        // CRITICAL: Expose registry to runtime for RuntimeUI binding logic
        this.runtime.registry = this.behaviorSystem.registry;

        this.ui = new RuntimeUI(this.runtime);
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
        // --- Setup Drag & Selection Logic ---
        // Unified Mouse Handler for Overlay
        overlayZone.addEventListener('mousedown', (e) => {
            if (this.runtime) {
                this.runtime.isMouseDown = true;
                this.runtime.clickProcessed = false;
            }

            // Preview Mode: Disable Editor Selection/Dragging
            if (this.isPlaying) return;

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
                    const rect = resizableContainer.getBoundingClientRect();
                    this.dragOffset = {
                        x: (e.clientX - rect.left) - control.x,
                        y: (e.clientY - rect.top) - control.y
                    };
                    return;
                }
            }

            // 2. Background/Object Selection
            const rect = resizableContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            let found = false;
            // Reverse order for hit testing (top-most first)
            for (let i = this.runtime.objects.length - 1; i >= 0; i--) {
                const obj = this.runtime.objects[i];
                if (this.isPointInObject(x, y, obj)) {
                    this.selectObject(obj, e.shiftKey);

                    // Start Drag Physics Object
                    this.isDraggingObject = true;
                    // For dragging logic in multi-select, we drag the one clicked, but we apply delta to all?
                    // MVP: Just drag the one clicked if it's new, OR if we click on an existing selection?
                    // Complex. For now, let's just track the 'primary' dragged object.

                    this.draggedObject = obj;
                    this.dragOffset = {
                        x: x - obj.x,
                        y: y - obj.y
                    };

                    // Stop motion while dragging for ALL selected
                    if (this.selectedObjects.has(obj)) {
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
                this.runtime.mouseX = e.clientX - rect.left;
                this.runtime.mouseY = e.clientY - rect.top;
            }

            const GRID = 10;
            // ... (Rest of drag logic)

            // Case A: Dragging DOM UI
            if (this.isDraggingUI && this.draggedControl && this.draggedEl) {
                let rawX = (e.clientX - rect.left) - this.dragOffset.x;
                let rawY = (e.clientY - rect.top) - this.dragOffset.y;

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
                let rawX = (e.clientX - rect.left) - this.dragOffset.x;
                let rawY = (e.clientY - rect.top) - this.dragOffset.y;

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
            if (this.runtime) this.runtime.isMouseDown = false;
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

            console.log('⬇️ Drop received:', { type, category });

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
                        this.behaviorSystem.addBehaviorTo(obj, type);
                    });
                    console.log(`Added behavior ${type} to ${targets.length} objects.`);
                    Inspector.update(this.engine, targets[0]); // Update inspector for one (or multi-view later)
                } else {
                    alert('Select an object or drop onto an object to apply behavior!');
                }

            } else {
                // Objects or Controls
                if (['circle', 'rect', 'text', 'emitter'].includes(type)) {
                    this.createObject(type, x, y);
                } else if (['button', 'slider', 'checkbox', 'display', 'dropdown', 'color_picker', 'text_input'].includes(type)) {
                    this.createUIComponent(type, zone, { x, y });
                } else if (type === 'graph') {
                    this.createGraph(zone, { x, y });
                }
            }
        });
    }

    createObject(type, x, y) {
        const obj = {
            id: `${type}_${Date.now()}`,
            type: type,
            x: x,
            y: y,
            physics: { enabled: true, velocity: { x: 0, y: 0 }, mass: 1, bounciness: 0.8 },
            behaviors: []
        };

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
        }

        this.runtime.addObject(obj);
        this.simulationData.objects.push(obj);
        this.selectObject(obj);
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
            style: { background: '#007acc', color: '#ffffff' },
            min: 0, max: 100, value: 50, step: 1,
            placeholder: 'Enter text...',
            options: ['Option 1', 'Option 2'],
            checked: true
        };

        this.simulationData.controls.push(control);
        this.runtime.addControl(control); // Sync with Runtime for Preview Mode Logic
        this.renderUIComponent(control, parent);
    }

    renderUIComponent(control, parent) {
        // Delegate for Graph
        if (control.type === 'graph') {
            this.renderGraph(control, parent);
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
            content = `<button class="ui-widget-button" data-id="${control.id}" style="cursor:pointer; padding: 8px 16px; background: ${control.style.background}; color: ${control.style.color}; border: none; border-radius: 4px;">${control.label}</button>`;
        } else if (control.type === 'slider') {
            content = `
            <div style="background: #eee; padding: 8px; border-radius: 4px; box-shadow:0 2px 5px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <label style="font-size:10px; font-weight:bold;">${control.label}</label>
                    <span class="val-display" style="font-size:10px; color:#666;">${control.value}</span>
                </div>
                <input class="ui-widget-input" data-id="${control.id}" type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}" style="width:100%;">
            </div>`;
        } else if (control.type === 'checkbox') {
            content = `<div style="background:white; padding:4px; border-radius:4px; border:1px solid #ccc; display:flex; align-items:center;"><input class="ui-widget-checkbox" data-id="${control.id}" type="checkbox" ${control.checked ? 'checked' : ''}> <span style="font-size:12px; margin-left:4px;">${control.label}</span></div>`;
        } else if (control.type === 'dropdown') {
            const opts = (control.options || []).map(o => `<option>${o.trim()}</option>`).join('');
            content = `
                <select class="ui-widget-select" data-id="${control.id}" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc; background: white; font-size: 12px; min-width: 100px;">
                    ${opts}
                </select>`;
        } else if (control.type === 'color_picker') {
            content = `<div style="background:white; padding:4px; border-radius:4px; border:1px solid #ccc; display:flex; align-items:center;"><input class="ui-widget-input" data-id="${control.id}" type="color" value="${control.value || '#ff0000'}" style="border:none; width:30px; height:30px; cursor:pointer;"> <span style="font-size:12px; margin-left:6px;">Color</span></div>`;
        } else if (control.type === 'text_input') {
            content = `
            <div style="display:flex; align-items:center; background:white; padding:4px; border-radius:4px; border:1px solid #ccc;">
                <span class="drag-handle" style="cursor:move; margin-right:6px; color:#999; font-size:14px; line-height:1; user-select:none;">✥</span>
                <input class="ui-widget-input" data-id="${control.id}" type="text" placeholder="${control.placeholder}" value="${control.value || ''}" style="border:none; outline:none; font-size:12px; width:100px; color:#333;">
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

                    if (control.binding && control.binding.targetId && control.binding.action) {
                        const target = this.runtime.objects.find(o => o.id === control.binding.targetId);
                        if (target) {
                            // Delegate to RuntimeUI for unified handling
                            if (this.ui) {
                                this.ui.triggerAction(control.binding.action, target, control.binding.actionId); // Note: actionId needs to be in binding data
                            }
                        }
                    }
                });
            }
        }

        // --- Interactivity: Capture changes from Canvas UI ---
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
            });
        }



        parent.appendChild(wrapper);
    }

    selectUI(control) {
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
            x: pos.x,
            y: pos.y,
            width: 250,
            height: 150,
            isUI: true,
            data: [],
            maxPoints: 200, // History length
            min: -100, // Auto-scale usually better but defaults
            max: 100,
            style: { background: 'white', color: '#007acc' }
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
    }

    isPointInObject(x, y, obj) {
        if (obj.type === 'circle') {
            const dist = Math.sqrt((x - obj.x) ** 2 + (y - obj.y) ** 2);
            return dist <= (obj.radius || 20);
        } else if (obj.type === 'rect') {
            const w = obj.width || 50;
            const h = obj.height || 50;
            return x >= obj.x - w / 2 && x <= obj.x + w / 2 && y >= obj.y - h / 2 && y <= obj.y + h / 2;
        } else if (obj.type === 'text') {
            const fontSize = obj.fontSize || 20;
            const lineHeight = (obj.lineHeight || 1.2) * fontSize;
            const text = obj.text || '';

            let width = 0;
            let height = 0;

            if (obj.wordWrap) {
                width = obj.width || 300;
                // Estimate lines: (char count * approx char width) / width
                const charWidth = fontSize * 0.6;
                const charsPerLine = width / charWidth;
                const estimatedLines = Math.ceil(text.length / charsPerLine) || 1;
                const newLineCount = (text.match(/\n/g) || []).length;
                height = Math.max(estimatedLines, newLineCount + 1) * lineHeight;
            } else {
                const lines = text.split('\n');
                height = lines.length * lineHeight;
                const maxChars = Math.max(...lines.map(l => l.length));
                width = maxChars * (fontSize * 0.6);
            }

            // Adjust X/Y based on alignment
            let boxX = obj.x;
            let boxY = obj.y;

            // Align X
            if (obj.align === 'left' || obj.align === 'justify') boxX = obj.x;
            else if (obj.align === 'right') boxX = obj.x - width;
            else boxX = obj.x - width / 2; // Default center

            // Align Y
            if (obj.verticalAlign === 'top') boxY = obj.y;
            else if (obj.verticalAlign === 'bottom') boxY = obj.y - height;
            else boxY = obj.y - height / 2; // Default middle

            return x >= boxX && x <= boxX + width &&

                y >= boxY && y <= boxY + height;
        } else if (obj.type === 'emitter') {
            const w = obj.width || 32;
            const h = obj.height || 32;
            return x >= obj.x - w / 2 && x <= obj.x + w / 2 &&
                y >= obj.y - h / 2 && y <= obj.y + h / 2;
        } else if (obj.type === 'symbol') {
            const size = obj.size !== undefined ? obj.size : 48; // Default size if not set
            // Symbols are centered, so box is x - size/2 to x + size/2
            return x >= obj.x - size / 2 && x <= obj.x + size / 2 &&
                y >= obj.y - size / 2 && y <= obj.y + size / 2;
        }
        return false;
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
            this.initialState = JSON.stringify(this.runtime.objects);
        }

        this.isPlaying = true;
        this.updatePreviewButtons();

        // Ensure Physics is active
        if (this.runtime.physicsEngine) {
            this.runtime.physicsEngine.paused = false;
        }
    }

    pause() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.updatePreviewButtons();

        // Pause Physics
        if (this.runtime.physicsEngine) {
            this.runtime.physicsEngine.paused = true;
        }
    }

    reset() {
        this.isPlaying = false;
        this.updatePreviewButtons();

        if (this.initialState) {
            console.log('🔄 Restoring simulation state...');
            try {
                // Restore Objects
                this.runtime.objects = JSON.parse(this.initialState);

                // Re-select null to avoid stale inspector references
                if (window.oviEditor) {
                    window.oviEditor.selectedObject = null;
                    Inspector.render(this.engine, null);
                }

            } catch (e) {
                console.error("Failed to restore state:", e);
            }

            this.initialState = null; // Clear snapshot so next Play takes new one
        }
    }
}
