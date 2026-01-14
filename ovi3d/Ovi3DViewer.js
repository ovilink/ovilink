import OviRenderer from './core/OviRenderer.js';
import OviCamera from './core/OviCamera.js';
import OviControls from './core/OviControls.js';
import OviLoader from './core/OviLoader.js';
import OviRaycaster from './core/OviRaycaster.js';
import OviGeomEngine from './core/OviGeomEngine.js';
import { Behavior3DRegistry } from '/lib/ovi3d/exporter/RuntimeOvi3DBehaviors.js'; // Fixed casing
// Since RuntimeOvi3DBehaviors export a string LIBS, we might need a local class for Editor usage or extract the class.
// For now, let's assume we can define the class locally or import it if extracted properly.
// ACTUALLY: The file I created exports a STRING `OVI3D_BEHAVIORS_LIB`.
// I need to instantiate the class from that string or duplicate the class code here for the editor.
// To keep it clean, I will inline the class logic or create a proper JS module for the editor later.
// For now, let's paste the class definition into a new file `lib/ovi3d/core/OviBehaviors.js` and import it.
// Wait, I can't restart the task to create a new file easily.
// I will just add the class definition to Ovi3DViewer for now to get it working immediately.
import Inspector from './ui/Inspector.js';
import { BufferGeometry } from '/lib/ovi3d/core/OviGeometry.js';
import { Matrix4, Vector3, Box3 } from '/lib/ovi3d/core/OviMath.js';

export default class Ovi3DViewer {
    constructor(engine) {
        this.engine = engine;
        this.renderer = null;
        this.camera = null;
        this.controls = null;
        this.loader = null;
        this.raycaster = new OviRaycaster();
        this.geomEngine = null;
        this.markerGeom = null;

        this.models = []; // Array of { name, parts, transform, visible, opacity }
        this.activeModelIndex = 0; // Currently selected model for editing
        this.hotspots = [];
        this.hotspotMode = false;
        this.showHotspots = true;
        this.isRunning = false;

        // Behaviors - Removed Global State
        // this.activeBehavior = null; 
        // this.behaviorParams = {};
        this.behaviorRegistry = null;


        // Export Options
        this.exportOptions = {
            smartDrift: true,
            driftSpeed: 1.0,
            driftType: 'idle', // always, idle
            driftIdleDelay: 5,   // seconds
            autoHideUI: true,
            defaultVisible: true,
            smartTooltips: true,
            enableXRaySlider: true,
            hotspotStyle: 'title_desc', // number, title, title_desc
            hotspotHover: 'scale',       // scale, glow, none
            hudColor: '#4facfe',
            hudPosition: 'bottom',       // top, bottom, right
            hudStyle: 'modern',          // modern, minimal, floating, glass
            hudPace: 5,                  // seconds per spot in autopilot
            showHud: true,               // Show/hide Guide Panel in export
            hudGlassBlur: 20,            // Glassmorphism intensity (px)
            hudGlassOpacity: 0.7,        // Glassmorphism opacity (0-1)
            hudScale: 1.0,               // HUD Scale factor (0.8-1.2)
            hudLoop: false,              // Loop tour back to start
            hudAutoOpen: true,           // Auto-open first tooltip on start
            envType: 'neutral',          // neutral, studio, warm, cool
            envIntensity: 1.0,           // HDR environment intensity
            exposure: 1.0,               // Overall exposure
            canvasWidth: 800,            // Exported canvas width
            canvasHeight: 600,           // Exported canvas height
            backgroundColor: '#ffffff',  // Scene background color
            transparentBackground: false, // Enable transparent background
            hotspotMarkerOpacity: 1.0,   // Default marker opacity
            hotspotCardOpacity: 0.95,    // Default card opacity
            lightAzimuth: 45,            // Light horizontal angle
            lightElevation: 45,          // Light vertical angle
            lightFollowCamera: false,    // Light moves with camera
            ambientIntensity: 0.3,       // Global ambient level
            envIntensity: 1.0,           // HDR environment intensity
            exposure: 1.0,               // Overall brightness
            exportPhysics: false         // Enable physics in export
        };

        this.exportWidth = 800; // Deprecated, will use exportOptions.canvasWidth
        this.exportHeight = 600; // Deprecated, will use exportOptions.canvasHeight
        this.enablePhysics = false;
        this.lightPos = { x: 5, y: 10, z: 7 };
        this.ambientIntensity = 0.3;
        this.xrayDepth = 0; // 0-100% for progressive X-Ray
    }

    async init() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.background = '#1e1e1e';
        container.style.position = 'relative';

        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);

        this.renderer = new OviRenderer(canvas);
        this.renderer.setSize(800, 600); // Default, will resize via CSS/engine if needed

        this.camera = new OviCamera(45, 800 / 600, 0.1, 1000);
        this.controls = new OviControls(this.camera, canvas);
        this.loader = new OviLoader(this.renderer);
        this.geomEngine = new OviGeomEngine(this.renderer.gl);
        this.markerGeom = BufferGeometry.createBox(this.renderer.gl, 0.1, 0.1, 0.1);

        this.initBehaviors();

        // Create Overlay for Editor UI (Eye Icon & Hotspot Labels)
        const overlay = document.createElement('div');
        overlay.id = 'ovi3d-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        container.appendChild(overlay);

        this.hotspotOverlay = document.createElement('div');
        this.hotspotOverlay.style.width = '100%';
        this.hotspotOverlay.style.height = '100%';
        this.hotspotOverlay.style.position = 'absolute';
        overlay.appendChild(this.hotspotOverlay);

        const style = document.createElement('style');
        style.textContent = `
            .ovi3d-toggle-btn {
                position: absolute; right: 15px; top: 15px; width: 36px; height: 36px;
                background: rgba(255,255,255,0.2); backdrop-filter: blur(8px);
                border: 1px solid rgba(255,255,255,0.3); border-radius: 50%;
                cursor: pointer; pointer-events: auto; display: flex; align-items: center; justify-content: center;
                transition: all 0.3s; z-index: 1000;
            }
            .ovi3d-toggle-btn:hover { background: rgba(255,255,255,0.4); transform: scale(1.1); }
            .ovi3d-toggle-btn svg { width: 22px; height: 22px; fill: #fff; }

            .hs-marker-2d {
                position: absolute;
                pointer-events: auto;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
                transform: translate(-50%, -50%);
                transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .hs-dot {
                width: 12px; height: 12px;
                background: #1a73e8;
                border: 2px solid #fff;
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            }
            .hs-label-box {
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(4px);
                color: #fff;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                white-space: nowrap;
                border: 1px solid rgba(255,255,255,0.2);
            }
            .hs-marker-2d.hovered {
                z-index: 1001;
            }
            .hs-marker-2d.hovered .hs-dot {
                background: #fff;
                transform: scale(1.3);
            }
        `;
        document.head.appendChild(style);

        this.toggleBtn = document.createElement('div');
        this.toggleBtn.className = 'ovi3d-toggle-btn';
        this.toggleBtn.title = 'Toggle Hotspots';
        overlay.appendChild(this.toggleBtn);
        this.updateToggleIcon();

        this.toggleBtn.onclick = () => {
            this.showHotspots = !this.showHotspots;
            this.updateToggleIcon();
        };

        // Open Tab
        this.engine.tabManager.openTab('Ovi3D Setup', 'ovi3d', container);

        this.isRunning = true;
        this.animate();
        this.bindEvents();
        this.updateInspector();
    }

    async loadModel(arrayBuffer, name) {
        this.arrayBuffer = arrayBuffer;
        this.modelName = name;
        this.modelData = this.arrayBufferToBase64(arrayBuffer);

        try {
            const modelData = await this.loader.loadGLB(arrayBuffer);
            const newModel = {
                name: name || `Model ${this.models.length + 1}`,
                parts: modelData.parts,
                transform: new Matrix4().identity(),
                visible: true,
                opacity: 1.0,
                behaviors: {} // Initialize empty behaviors
            };
            this.models.push(newModel);
            this.activeModelIndex = this.models.length - 1;

            // Auto-fit the new model
            this.autoFitModel(newModel);

            this.updateInspector();
        } catch (e) {
            console.error("Failed to load GLB:", e);
            alert("Error loading GLB. Ensure it is a valid binary .glb file.");
        }
    }

    calculateModelBounds(model) {
        const box = new Box3();
        model.parts.forEach(part => {
            const vertices = part.geometry.vertices;
            const matrix = new Matrix4();
            matrix.elements.set(model.transform.elements);
            if (part.matrix) matrix.multiply(part.matrix);

            for (let i = 0; i < vertices.length; i += 3) {
                const v = new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
                v.applyMatrix4(matrix);
                box.expandByPoint(v);
            }
        });
        return box;
    }

    autoFitModel(model) {
        const box = this.calculateModelBounds(model);
        const center = box.getCenter();
        const size = box.getSize();
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim === 0) return;

        // Target size (~4 units)
        const scale = 4 / maxDim;

        // Apply scale and translation to center the model at (0,0,0)
        // Correct math: Scale the model first, then translate by the scaled center offset
        model.transform.makeScale(scale, scale, scale);
        model.transform.translate(-center.x * scale, -center.y * scale, -center.z * scale);

        console.log(`Ovi3D: Auto-fitted model '${model.name}' - Center: [${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}], Scale: ${scale.toFixed(4)}`);
    }

    async loadFromVector(pathPoints) {
        const newModel = {
            name: 'Vector Path',
            parts: [{
                geometry: this.geomEngine.extrudePath(pathPoints),
                material: { color: [0.8, 0.2, 0.2] },
                matrix: new Matrix4().identity()
            }],
            transform: new Matrix4().identity(),
            visible: true,
            opacity: 1.0,
            behaviors: {}
        };
        this.models.push(newModel);
        this.activeModelIndex = this.models.length - 1;
        this.pathPoints = pathPoints; // Store for export/regeneration
        this.updateInspector();
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        this.renderer.clear(0.12, 0.12, 0.12, 1);

        // Render all models
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

        // Apply Smart Drift
        if (this.exportOptions.smartDrift) {
            let shouldRotate = false;
            if (this.exportOptions.driftType === 'always') {
                shouldRotate = true;
            } else if (this.exportOptions.driftType === 'idle') {
                const idleTime = (Date.now() - this.lastInteraction) / 1000;
                if (idleTime > this.exportOptions.driftIdleDelay) {
                    shouldRotate = true;
                }
            }

            if (shouldRotate && !this.hotspotMode) {
                if (this.controls && !this.controls.isDragging) {
                    this.controls.theta += 0.005 * this.exportOptions.driftSpeed;
                    this.controls.updateCamera();
                }
            }
        }

        // Sync Hotspot Overlay
        this.updateHotspotOverlay();

        // Draw 3D Hotspots (Markers) - Optional if we use 2D markers
        if (this.showHotspots && !this.exportOptions.hotspotStyle) {
            this.hotspots.forEach(hs => {
                const world = new Matrix4().identity();
                world.translate(hs.position.x, hs.position.y, hs.position.z);
                this.renderer.draw(this.markerGeom, world, this.camera.viewMatrix, this.camera.projectionMatrix, { color: [0.1, 0.45, 0.91] });
            });
        }


        // Removed explicit overwrite of model.behaviors this frame. 
        // Behavior state is now managed by Inspector setting proper properties on model.behaviors

        if (this.behaviorRegistry) {
            this.behaviorRegistry.update(0.016); // Approx 60fps dt
        }
    }

    updateHotspotOverlay() {
        if (!this.hotspotOverlay) return;

        if (!this.showHotspots) {
            this.hotspotOverlay.innerHTML = '';
            return;
        }

        const rect = this.renderer.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Use a pool of elements or clear/rebuild (simple for now)
        let html = '';
        this.hotspots.forEach((hs, i) => {
            const v = new Vector3(hs.position.x, hs.position.y, hs.position.z);
            v.applyMatrix4(this.camera.viewMatrix);
            v.applyMatrix4(this.camera.projectionMatrix);

            // Visibility Check (Z sorting in NDC is -1 to 1)
            if (v.z < -1 || v.z > 1) return;

            const x = (v.x * 0.5 + 0.5) * width;
            const y = (-v.y * 0.5 + 0.5) * height;

            const isHovered = this.hoveredHotspotIndex === i;
            const hStyle = this.exportOptions.hotspotStyle || 'title_desc';
            const hoverEffect = this.exportOptions.hotspotHover || 'scale';

            let label = '';
            if (hStyle === 'number') label = i + 1;
            else if (hStyle === 'title') label = hs.label;
            else if (hStyle === 'title_desc') label = `<strong>${hs.label}</strong>${hs.detail ? '<br>' + hs.detail : ''}`;

            const scaleStyle = (isHovered && hoverEffect === 'scale') ? 'transform: translate(-50%, -50%) scale(1.2);' : '';
            const glowStyle = (isHovered && hoverEffect === 'glow') ? 'box-shadow: 0 0 15px #1a73e8;' : '';

            html += `
                <div class="hs-marker-2d ${isHovered ? 'hovered' : ''}" 
                     style="left: ${x}px; top: ${y}px; ${scaleStyle}">
                    <div class="hs-dot" style="${glowStyle}"></div>
                    ${(isHovered || this.exportOptions.defaultVisible) ? `
                        <div class="hs-label-box">${label}</div>
                    ` : ''}
                </div>
            `;
        });
        this.hotspotOverlay.innerHTML = html;
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    bindEvents() {
        const canvas = this.renderer.canvas;

        canvas.addEventListener('mousedown', (e) => {
            if (!this.hotspotMode || this.models.length === 0) return;

            const rect = canvas.getBoundingClientRect();
            const mouse = {
                x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((e.clientY - rect.top) / rect.height) * 2 + 1
            };

            this.raycaster.setFromCamera(mouse, this.camera);

            // Check all visible models for intersection
            let intersectPoint = null;
            for (const model of this.models) {
                if (!model.visible) continue;
                intersectPoint = this.raycaster.intersectModel(model);
                if (intersectPoint) break;
            }

            if (intersectPoint) {
                this.addHotspot(intersectPoint);
                this.hotspotMode = false;
                canvas.style.cursor = 'default';
                if (this.controls) this.controls.enabled = true;

                // Notify sidebar/plugin of mode change
                const event = new CustomEvent('ovi3d-mode-update', {
                    detail: { mode: 'hotspot', active: false },
                    // The instruction provided `enablePhysics: ${data.physics.enabled !== undefined ? data.physics.enabled : true}` here.
                    // This would cause a syntax error as `data` is not defined in this scope.
                    // Keeping the original code as it is syntactically correct.
                });
                canvas.dispatchEvent(event);

                this.updateInspector();
            } else {
                console.log("No intersection found");
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            this.lastInteraction = Date.now();
            const rect = canvas.getBoundingClientRect();
            const mouse = {
                x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
                y: -((e.clientY - rect.top) / rect.height) * 2 + 1
            };

            // Raycast for hotspots (simplified distance check in screen space or ray-point check)
            let closestHs = -1;
            let minDist = 20; // px threshold

            this.hotspots.forEach((hs, i) => {
                const v = new Vector3(hs.position.x, hs.position.y, hs.position.z);
                v.applyMatrix4(this.camera.viewMatrix);
                v.applyMatrix4(this.camera.projectionMatrix);

                if (v.z < -1 || v.z > 1) return;

                const screenX = (v.x * 0.5 + 0.5) * rect.width;
                const screenY = (-v.y * 0.5 + 0.5) * rect.height;

                const dist = Math.sqrt(Math.pow(screenX - (e.clientX - rect.left), 2) + Math.pow(screenY - (e.clientY - rect.top), 2));
                if (dist < minDist) {
                    minDist = dist;
                    closestHs = i;
                }
            });

            if (this.hoveredHotspotIndex !== closestHs) {
                this.hoveredHotspotIndex = closestHs;
                canvas.style.cursor = closestHs !== -1 ? 'pointer' : (this.hotspotMode ? 'crosshair' : 'default');
            }
        });
    }

    addHotspot(point) {
        const hotspot = {
            id: 'hs_' + Date.now(),
            position: { x: point.x, y: point.y, z: point.z },
            label: 'New Hotspot',
            detail: '',
            camera: {
                position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
                target: { x: this.camera.target.x, y: this.camera.target.y, z: this.camera.target.z }
            }
        };
        this.hotspots.push(hotspot);
        this.engine.layoutManager.showToast ? this.engine.layoutManager.showToast("Hotspot placed!") : console.log("Hotspot placed!");
        this.updateInspector();
    }

    updateInspector() {
        Inspector.render(this.engine, this);
    }

    updateToggleIcon() {
        if (!this.toggleBtn) return;
        this.toggleBtn.innerHTML = this.showHotspots
            ? `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`
            : `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;
    }

    async exportStandalone() {
        if (!this.models || this.models.length === 0) {
            alert("No model loaded to export!");
            return;
        }

        // Package as a minimal simulation data
        const obj = {
            id: '3d_standalone',
            name: this.modelName || 'Custom 3D',
            type: '3d_model',
            x: this.exportOptions.canvasWidth / 2,
            y: this.exportOptions.canvasHeight / 2,
            width: this.exportOptions.canvasWidth,
            height: this.exportOptions.canvasHeight,
            physics: {
                enabled: this.exportOptions.exportPhysics,
                velocity: { x: 0, y: 0 },
                mass: 1,
                bounciness: 0.8
            },
            metadata: {
                engine: 'ovi3d_custom',
                hotspots: this.hotspots,
                modelName: this.modelName,
                modelData: this.modelData || null,
                pathPoints: this.pathPoints || null,
                lightPos: this.lightPos,
                // Store all models info for Multi-Layer support
                models: this.models.map(m => ({
                    name: m.name,
                    visible: m.visible,
                    opacity: m.opacity,
                    shininess: m.shininess !== undefined ? m.shininess : 32.0,
                    specularStrength: m.specularStrength !== undefined ? m.specularStrength : 0.5,
                    transform: m.transform.elements ? Array.from(m.transform.elements) : null,
                    behaviors: m.behaviors || {}
                })),
                modelTransform: this.models[this.activeModelIndex]?.transform.elements ? Array.from(this.models[this.activeModelIndex].transform.elements) : null,
                ambientIntensity: this.ambientIntensity,
                enablePhysics: this.exportOptions.exportPhysics,
                xrayDepth: this.xrayDepth,
                exportSettings: { ...this.exportOptions }
            },
            behaviors: this.models[this.activeModelIndex]?.behaviors || {} // Deprecated single accessor
        };

        // Re-inflate physics if partial or missing (this block was misplaced in animate)
        if (!obj.physics) {
            obj.physics = { enabled: this.exportOptions.exportPhysics };
        }

        const simData = {
            metadata: { title: this.modelName || 'Ovi3D Model' },
            canvas: {
                width: this.exportOptions.canvasWidth,
                height: this.exportOptions.canvasHeight,
                background: this.exportOptions.transparentBackground ? 'none' : this.exportOptions.backgroundColor
            },
            physics: {
                gravity: this.exportOptions.exportPhysics ? 9.8 : 0,
                friction: 0.1,
                timeScale: 1,
                wallBounciness: 0.8,
                enabled: this.exportOptions.exportPhysics
            },
            objects: [obj],
            controls: []
        };

        // Invoke Exporter
        try {
            const mod = await import('../ovistate/editor/EnhancedExporter.js');
            const Exporter = mod.default;
            Exporter.export(simData);
        } catch (e) {
            console.error("Export failed:", e);
            alert("Failed to export: " + e.message);
        }
    }
    initBehaviors() {
        this.behaviorRegistry = new Behavior3DRegistry(this);
    }
}

