
// Ovi3D Runtime - Unified Core (High Fidelity + Interactive HUD)
// Bundles Math, Renderer, Geometry, Loader, Controls, and Runtime into one self-contained module.


import { Vector3, Matrix4, Quaternion } from '../core/OviMath.js';

// Ovi3D Runtime - Unified Core (High Fidelity + Interactive HUD)
// Bundles Math, Renderer, Geometry, Loader, Controls, and Runtime into one self-contained module.

export class BufferGeometry {
    constructor(gl) {
        this.gl = gl; this.vao = gl.createVertexArray(); this.vbo = gl.createBuffer(); this.nbo = gl.createBuffer(); this.cbo = gl.createBuffer(); this.tbo = gl.createBuffer(); this.ebo = gl.createBuffer(); this.count = 0;
        this.hasColors = false; this.hasUVs = false;
        this.vertices = null; this.normals = null;
    }
    setAttributes(vertices, normals, indices = null, colors = null, uvs = null) {
        this.vertices = vertices; this.normals = normals;
        const gl = this.gl; gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(1);
        if (colors) { gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW); gl.vertexAttribPointer(2, colors.length / (vertices.length / 3), gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(2); this.hasColors = true; }
        if (uvs) { gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(3); this.hasUVs = true; }
        if (indices) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW); this.count = indices.length; } else { this.count = vertices.length / 3; }
        gl.bindVertexArray(null);
    }
    updateVertices(vertices) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));
    }
}

export class OviRenderer {
    constructor(canvas) {
        this.canvas = canvas; this.gl = canvas.getContext('webgl2', { antialias: true, alpha: true }) || canvas.getContext('webgl', { alpha: true });
        if (!this.gl) return;
        this.setSize(canvas.width, canvas.height);
        this.gl.enable(this.gl.DEPTH_TEST); this.gl.enable(this.gl.BLEND); this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.lightPos = [5, 10, 7]; this.skyColor = [1.0, 1.0, 1.0]; this.viewPos = [0, 0, 5];
        this.ambientIntensity = 0.3; this.envIntensity = 1.0; this.exposure = 1.0;
        this.program = this.createProgram();
    }
    createProgram() {
        const vs = `#version 300 es
            layout(location = 0) in vec3 aPos; layout(location = 1) in vec3 aNorm; layout(location = 2) in vec4 aCol; layout(location = 3) in vec2 aUV;
            uniform mat4 uM, uV, uP; out vec3 vN, vP, vC; out vec2 vUV;
            void main() {
                vec4 wP = uM * vec4(aPos, 1.0); vP = wP.xyz; vN = mat3(uM) * aNorm; vC = aCol.rgb; vUV = aUV;
                gl_Position = uP * uV * wP;
            }`;
        const fs = `#version 300 es
            precision highp float; in vec3 vN, vP, vC; in vec2 vUV;
            uniform vec3 uCol, uLP, uVP, uSC; uniform float uO, uAI, uEI, uEx, uSP, uSS; uniform bool uUVC, uUT; uniform sampler2D uBT;
            out vec4 fC;
            void main() {
                vec3 n = normalize(vN), ld = normalize(uLP - vP), vd = normalize(uVP - vP);
                vec3 amb = uAI * uSC; float d = max(dot(n, ld), 0.0);
                vec3 r = reflect(-ld, n); float s = pow(max(dot(vd, r), 0.0), uSP);
                vec3 base = uCol; if(uUVC) base *= vC; if(uUT) base *= texture(uBT, vUV).rgb;
                vec3 env = uEI * uSC * 0.2; 
                vec3 res = (base * (amb + d + env) + (s * uSS)) * uEx;
                fC = vec4(res, uO);
            }`;
        const s = (t, src) => { const sh = this.gl.createShader(t); this.gl.shaderSource(sh, src); this.gl.compileShader(sh); return sh; };
        const p = this.gl.createProgram(); this.gl.attachShader(p, s(this.gl.VERTEX_SHADER, vs)); this.gl.attachShader(p, s(this.gl.FRAGMENT_SHADER, fs)); this.gl.linkProgram(p); return p;
    }
    setSize(w, h) { this.canvas.width = w; this.canvas.height = h; this.gl.viewport(0, 0, w, h); }
    clear() { this.gl.clearColor(0, 0, 0, 0); this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT); }
    draw(geom, m, v, p, mat) {
        this.gl.useProgram(this.program);
        const loc = (n) => this.gl.getUniformLocation(this.program, n);
        this.gl.uniformMatrix4fv(loc("uM"), false, m.elements); this.gl.uniformMatrix4fv(loc("uV"), false, v.elements); this.gl.uniformMatrix4fv(loc("uP"), false, p.elements);
        this.gl.uniform3fv(loc("uCol"), mat.color || [1, 1, 1]); this.gl.uniform1f(loc("uO"), mat.opacity !== undefined ? mat.opacity : 1);
        this.gl.uniform1i(loc("uUVC"), geom.hasColors ? 1 : 0);
        if (mat.texture && geom.hasUVs) {
            this.gl.activeTexture(this.gl.TEXTURE0); this.gl.bindTexture(this.gl.TEXTURE_2D, mat.texture);
            this.gl.uniform1i(loc("uBT"), 0); this.gl.uniform1i(loc("uUT"), 1);
        } else this.gl.uniform1i(loc("uUT"), 0);
        this.gl.uniform3fv(loc("uLP"), this.lightPos); this.gl.uniform3fv(loc("uVP"), this.viewPos); this.gl.uniform3fv(loc("uSC"), this.skyColor);
        this.gl.uniform1f(loc("uAI"), this.ambientIntensity); this.gl.uniform1f(loc("uEI"), this.envIntensity); this.gl.uniform1f(loc("uEx"), this.exposure);
        this.gl.uniform1f(loc("uSP"), mat.shininess || 32.0); this.gl.uniform1f(loc("uSS"), mat.specularStrength !== undefined ? mat.specularStrength : 0.5);
        this.gl.bindVertexArray(geom.vao); this.gl.drawElements(this.gl.TRIANGLES, geom.count, this.gl.UNSIGNED_INT, 0);
    }
}

export class OviLoader {
    constructor(renderer) { this.renderer = renderer; this.gl = renderer.gl; }
    async loadGLB(buffer) {
        const data = new DataView(buffer), jsonLen = data.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLen))), bin = buffer.slice(20 + jsonLen + 8);
        const textures = []; if (json.textures) for (let i = 0; i < json.textures.length; i++) textures[i] = await this.loadTexture(json, bin, i);
        const parts = [];
        const traverse = (idx, parent) => {
            const node = json.nodes[idx], mat = new Matrix4();
            if (node.matrix) mat.elements.set(node.matrix);
            else {
                const t = node.translation ? new Vector3(node.translation[0], node.translation[1], node.translation[2]) : new Vector3(0, 0, 0);
                const r = node.rotation ? { _x: node.rotation[0], _y: node.rotation[1], _z: node.rotation[2], _w: node.rotation[3] } : { _x: 0, _y: 0, _z: 0, _w: 1 };
                const s = node.scale ? new Vector3(node.scale[0], node.scale[1], node.scale[2]) : new Vector3(1, 1, 1);
                mat.compose(t, r, s);
            }
            const world = new Matrix4().copy(parent).multiply(mat);
            if (node.mesh !== undefined) {
                for (const prim of json.meshes[node.mesh].primitives) {
                    const get = (accIdx, norm = false) => {
                        if (accIdx === undefined) return null; const a = json.accessors[accIdx], bv = json.bufferViews[a.bufferView];
                        const off = (bv.byteOffset || 0) + (a.byteOffset || 0), cnt = a.count * (a.type === 'SCALAR' ? 1 : a.type === 'VEC2' ? 2 : a.type === 'VEC3' ? 3 : 4);
                        if (a.componentType === 5126) return new Float32Array(bin, off, cnt);
                        if (a.componentType === 5123) return new Uint16Array(bin, off, cnt);
                        if (a.componentType === 5125) return new Uint32Array(bin, off, cnt);
                        if (a.componentType === 5121) { const b = new Uint8Array(bin, off, cnt); if (norm) { const f = new Float32Array(cnt); for (let i = 0; i < cnt; i++) f[i] = b[i] / 255; return f; } return b; }
                        return null;
                    };
                    const geom = new BufferGeometry(this.gl);
                    geom.setAttributes(get(prim.attributes.POSITION), get(prim.attributes.NORMAL), get(prim.indices), get(prim.attributes.COLOR_0, true), get(prim.attributes.TEXCOORD_0));
                    let col = [1, 1, 1, 1], tex = null;
                    if (prim.material !== undefined) {
                        const m = json.materials[prim.material]; if (m?.pbrMetallicRoughness) {
                            if (m.pbrMetallicRoughness.baseColorFactor) col = m.pbrMetallicRoughness.baseColorFactor;
                            if (m.pbrMetallicRoughness.baseColorTexture) tex = textures[m.pbrMetallicRoughness.baseColorTexture.index];
                        }
                    }
                    parts.push({ geometry: geom, material: { color: col.slice(0, 3), opacity: col[3], texture: tex }, matrix: world });
                }
            }
            if (node.children) node.children.forEach(c => traverse(c, world));
        };
        const scene = json.scenes[json.scene || 0]; if (scene) scene.nodes.forEach(n => traverse(n, new Matrix4().identity()));
        return { parts };
    }
    async loadTexture(json, bin, idx) {
        const src = json.images[json.textures[idx].source], bv = json.bufferViews[src.bufferView];
        const blob = new Blob([new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength)], { type: src.mimeType });
        return new Promise(res => {
            const img = new Image(); img.src = URL.createObjectURL(blob);
            img.onload = () => {
                const t = this.gl.createTexture(); this.gl.bindTexture(this.gl.TEXTURE_2D, t);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
                this.gl.generateMipmap(this.gl.TEXTURE_2D); res(t);
            };
        });
    }
}

export class OviCamera {
    constructor(fov = 45, aspect = 1, near = 0.1, far = 1000) {
        this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
        this.position = new Vector3(0, 0, 5); this.target = new Vector3(0, 0, 0); this.up = new Vector3(0, 1, 0);
        this.updateMatrices();
    }
    updateMatrices() {
        this.projectionMatrix = Matrix4.perspective(this.fov * (Math.PI / 180), this.aspect, this.near, this.far);
        this.viewMatrix = Matrix4.lookAt(this.position, this.target, this.up);
    }
}

export class OviControls {
    constructor(camera, dom) {
        this.camera = camera; this.dom = dom; this.phi = Math.PI / 4; this.theta = Math.PI / 4; this.radius = 5;
        this.enabled = true; this.isMouseDown = false; this.isDragging = false;
        this.onInteraction = null; // Callback for reset idle
        this.bind(); this.update();
    }
    bind() {
        // Mouse Events
        this.dom.addEventListener('mousedown', (e) => { this.isMouseDown = true; this.lastX = e.clientX; this.lastY = e.clientY; if (this.onInteraction) this.onInteraction(); });
        window.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown || !this.enabled) return; this.isDragging = true;
            this.theta -= (e.clientX - this.lastX) * 0.01; this.phi -= (e.clientY - this.lastY) * 0.01;
            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi)); this.lastX = e.clientX; this.lastY = e.clientY; this.update();
            if (this.onInteraction) this.onInteraction();
        });
        window.addEventListener('mouseup', () => { this.isMouseDown = false; setTimeout(() => this.isDragging = false, 50); });

        // Touch Events
        this.dom.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isMouseDown = true; this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY;
                if (this.onInteraction) this.onInteraction();
            }
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (!this.isMouseDown || !this.enabled || e.touches.length !== 1) return;
            this.isDragging = true;
            this.theta -= (e.touches[0].clientX - this.lastX) * 0.01; this.phi -= (e.touches[0].clientY - this.lastY) * 0.01;
            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi)); this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY; this.update();
            if (this.onInteraction) this.onInteraction();
            e.preventDefault();
        }, { passive: false });
        window.addEventListener('touchend', () => { this.isMouseDown = false; setTimeout(() => this.isDragging = false, 50); });

        this.dom.addEventListener('wheel', (e) => { if (!this.enabled) return; e.preventDefault(); this.radius = Math.max(1, Math.min(50, this.radius + e.deltaY * 0.005)); this.update(); if (this.onInteraction) this.onInteraction(); }, { passive: false });
    }
    update() {
        this.camera.position.set(this.camera.target.x + this.radius * Math.sin(this.phi) * Math.sin(this.theta), this.camera.target.y + this.radius * Math.cos(this.phi), this.camera.target.z + this.radius * Math.sin(this.phi) * Math.cos(this.theta));
        this.camera.updateMatrices();
    }
    syncWithCamera() {
        const off = new Vector3().copy(this.camera.position).sub(this.camera.target); this.radius = off.length();
        if (this.radius > 0) { this.phi = Math.acos(off.y / this.radius); this.theta = Math.atan2(off.x, off.z); }
    }
}

export class OviGeomEngine {
    constructor(gl) { this.gl = gl; }
    extrudePath(pts, depth = 0.2) {
        const vertices = [], normals = [], indices = [], count = pts.length;
        for (let i = 0; i < count; i++) { vertices.push(pts[i].x, pts[i].y, depth / 2); normals.push(0, 0, 1); }
        for (let i = 0; i < count; i++) { vertices.push(pts[i].x, pts[i].y, -depth / 2); normals.push(0, 0, -1); }
        for (let i = 0; i < count; i++) {
            const next = (i + 1) % count, v0 = i, v1 = next, v2 = i + count, v3 = next + count;
            indices.push(v0, v1, v2); indices.push(v1, v3, v2);
        }
        const geom = new BufferGeometry(this.gl); geom.setAttributes(vertices, normals, indices); return geom;
    }
}

export class Ovi3DRuntime {
    constructor(canvas, objData) {
        this.canvas = canvas; this.objData = objData;
        this.renderer = new OviRenderer(canvas);
        this.camera = new OviCamera(45, canvas.width / canvas.height, 0.1, 1000);
        this.controls = new OviControls(this.camera, canvas);
        this.loader = new OviLoader(this.renderer);
        this.geom = new OviGeomEngine(this.renderer.gl);
        this.models = []; this.hotspots = objData.metadata?.hotspots || []; this.hotspotElements = []; this.isRunning = false;

        const m = objData.metadata || {};
        const config = m.exportSettings || {};
        this.showHotspots = config.defaultVisible !== undefined ? config.defaultVisible : true;
        this.hudWrapper = null; // Store for auto-hide

        // Behavior Sync State
        this.lastInteractionTime = Date.now();
        this.lastAutoMoveTime = Date.now();
        this.controls.onInteraction = () => {
            this.lastInteractionTime = Date.now();
            this.lastAutoMoveTime = Date.now(); // Reset tour timer on manual move
        };

        // Canvas Click for Deselection
        this.canvas.addEventListener('click', () => {
            if (!this.controls.isDragging) {
                this.deselectHotspot();
            }
        });

        // CSS & Overlay Init
        const hudColor = config.hudColor || '#1a73e8';
        const hudScale = config.hudScale || 1.0;
        const hudBlur = config.hudGlassBlur !== undefined ? config.hudGlassBlur : 20;
        const hudOpacity = config.hudGlassOpacity !== undefined ? config.hudGlassOpacity : 0.7;
        this.markerMaxOpacity = config.hotspotMarkerOpacity !== undefined ? config.hotspotMarkerOpacity : 1.0;
        this.cardMaxOpacity = config.hotspotCardOpacity !== undefined ? config.hotspotCardOpacity : 0.95;
        const hudStyle = config.hudStyle || 'modern';

        // Lighting & Env Sync
        this.renderer.exposure = config.exposure !== undefined ? config.exposure : 1.0;
        this.renderer.ambientIntensity = config.ambientIntensity !== undefined ? config.ambientIntensity : 0.3;
        this.renderer.envIntensity = config.envIntensity !== undefined ? config.envIntensity : 1.0;
        this.lightFollowCamera = config.lightFollowCamera || false;

        const azi = (config.lightAzimuth !== undefined ? config.lightAzimuth : 45) * (Math.PI / 180);
        const ele = (config.lightElevation !== undefined ? config.lightElevation : 45) * (Math.PI / 180);
        const r = 15;
        this.renderer.lightPos = [
            r * Math.cos(ele) * Math.sin(azi),
            r * Math.sin(ele),
            r * Math.cos(ele) * Math.cos(azi)
        ];

        const style = document.createElement('style');
        style.textContent = `
            @keyframes hspulse { 
                0% { box-shadow: 0 0 0 0 ${hudColor}cc; transform: scale(1); }
                70% { box-shadow: 0 0 0 15px ${hudColor}00; transform: scale(1.1); }
                100% { box-shadow: 0 0 0 0 ${hudColor}00; transform: scale(1); }
            }
            .hs-dot { 
                width: 14px; height: 14px; 
                background: ${hudColor}; 
                border-radius: 50%; 
                cursor: pointer; 
                pointer-events: auto; 
                position: absolute; 
                z-index: 100001; 
                box-shadow: 0 0 0 4px rgba(255,255,255,0.2), 0 0 15px ${hudColor}; 
                animation: hspulse 2s infinite; 
                transition: transform 0.3s;
                transform: translate(-50%, -50%);
            }
            .hs-dot:hover { transform: translate(-50%, -50%) scale(1.5) !important; filter: brightness(1.2); }
            .hs-dot.active { transform: translate(-50%, -50%) scale(1.2); }
            
            .hs-card { 
                position: absolute; 
                left: 30px; 
                top: 50%; 
                width: 200px; 
                background: rgba(10,10,15,${this.cardMaxOpacity}); 
                color: #fff; 
                padding: 10px 14px; 
                border-radius: 8px; 
                font-size: 13px; 
                opacity: 0; 
                pointer-events: none; 
                transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); 
                z-index: 100002; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.6); 
                border: 1px solid rgba(255,255,255,0.1); 
                transform: translateY(-50%) translateX(10px); 
                backdrop-filter: ${config.smartTooltips !== false ? 'blur(10px)' : 'none'};
                line-height: 1.4;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }
            .hs-card b { color: ${hudColor}; font-size: 14px; display: block; margin-bottom: 4px; }
            .hs-dot:hover + .hs-card, .hs-dot.active + .hs-card { opacity: 1; transform: translateY(-50%) translateX(0); }
            
            .hs-line {
                position: absolute;
                left: 7px; top: 7px;
                height: 1px; width: 30px;
                background: linear-gradient(90deg, ${hudColor}, transparent);
                transform-origin: left center;
                opacity: 0.2;
                pointer-events: none;
                z-index: 100000;
                transition: 0.3s;
            }
            .hs-dot:hover ~ .hs-line, .hs-dot.active ~ .hs-line { opacity: 0.6; width: 40px; }
            
            .ovi3d-info-panel { 
                padding: ${25 * hudScale}px; 
                background: rgba(20,20,30,${hudOpacity}); 
                color: #fff; 
                border-radius: ${15 * hudScale}px; 
                font-family: 'Inter', system-ui, -apple-system, sans-serif; 
                pointer-events: auto; 
                border: 1px solid rgba(255,255,255,0.1); 
                box-shadow: 0 15px 40px rgba(0,0,0,0.6); 
                backdrop-filter: blur(${hudBlur}px); 
                min-width: ${320 * hudScale}px;
                max-width: 80%;
                max-height: 90%;
                box-sizing: border-box;
                transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                position: relative;
            }

            /* Smart Spot List Menu */
            .ovi-spot-list {
                position: absolute;
                bottom: 100%;
                left: 0;
                width: 100%;
                background: rgba(15,15,25,0.95);
                backdrop-filter: blur(20px);
                border-radius: ${15 * hudScale}px;
                margin-bottom: 15px;
                max-height: ${300 * hudScale}px;
                overflow-y: auto;
                display: none;
                flex-direction: column;
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 0 20px 50px rgba(0,0,0,0.9);
                z-index: 1000001;
            }
            .ovi-spot-list.show { display: flex; animation: slideUp 0.3s ease; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            
            .ovi-spot-item {
                padding: ${12 * hudScale}px ${20 * hudScale}px;
                cursor: pointer;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                font-size: ${14 * hudScale}px;
                transition: 0.2s;
            }
            .ovi-spot-item:hover { background: rgba(255,255,255,0.1); padding-left: ${25 * hudScale}px; }
            .ovi-spot-item.active { border-left: 4px solid ${hudColor}; background: rgba(255,255,255,0.05); }

            .ovi-nav-header { cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none; }
            .ovi-nav-header:hover #ovi-title { opacity: 0.8; }
            .ovi-progress-badge { font-size: 10px; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 10px; opacity: 0.6; }

            /* Minimalist Preset (Professional Refinement) */
            .ovi3d-info-panel.minimal {
                padding: ${8 * hudScale}px ${12 * hudScale}px;
                background: rgba(0, 0, 0, 0.7);
                border-radius: ${50 * hudScale}px;
                min-width: unset;
                display: flex;
                align-items: center;
                gap: ${8 * hudScale}px;
                border: 1px solid rgba(255,255,255,0.15);
                backdrop-filter: blur(15px);
            }
            .minimal #ovi-desc { display: none; }
            .minimal .ovi-progress-badge { display: none; }
            .minimal #ovi-title { margin-bottom: 0 !important; font-size: ${13 * hudScale}px !important; white-space: nowrap; padding: 0 ${12 * hudScale}px; font-weight: 500; }
            .minimal .ovi-spot-list { bottom: calc(100% + 15px); border-radius: ${25 * hudScale}px; }

            /* Floating Card Preset */
            .ovi3d-info-panel.floating {
                background: #fff;
                color: #222;
                border-radius: ${12 * hudScale}px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                border: none;
                backdrop-filter: none;
            }
            .floating #ovi-title { color: ${hudColor}; }
            .floating #ovi-desc { color: #555; }
            .floating .ovi-spot-list { background: #fff; color: #333; }
            .floating .ovi-spot-item { border-bottom: 1px solid #eee; }
            .floating .ovi-spot-item:hover { background: #f9f9f9; }

            /* Glass Preset */
            .ovi3d-info-panel.glass {
                background: rgba(255,255,255,0.05);
                backdrop-filter: blur(30px);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: ${25 * hudScale}px;
            }
            
            .ovi3d-hud-wrapper {
                position: absolute;
                inset: 0;
                padding: 4%;
                display: flex;
                pointer-events: none;
                z-index: 1000000;
                box-sizing: border-box;
            }

            /* Smart Flex Positioning */
            .ovi-flex-top-center { align-items: flex-start; justify-content: center; }
            .ovi-flex-bottom-center { align-items: flex-end; justify-content: center; }
            .ovi-flex-right { align-items: flex-end; justify-content: flex-end; }
            
            .ovi3d-nav-btn { background: ${hudColor}; color: #fff; border: none; padding: ${10 * hudScale}px ${20 * hudScale}px; border-radius: ${8 * hudScale}px; cursor: pointer; transition: 0.2s; font-size: ${12 * hudScale}px; font-weight: 600; display: flex; align-items: center; justify-content: center; letter-spacing: 0.5px; }
            .ovi3d-nav-btn:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }

            .minimal .ovi3d-nav-btn {
                width: ${36 * hudScale}px;
                height: ${36 * hudScale}px;
                border-radius: 50%;
                padding: 0;
                font-size: 0;
            }
            .minimal #ovi-prev::after { content: '←'; font-size: ${18 * hudScale}px; }
            .minimal #ovi-next::after { content: '→'; font-size: ${18 * hudScale}px; }
        `;
        document.head.appendChild(style);
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:100000; overflow: visible;";
        canvas.parentElement.appendChild(this.overlay);

        this.init();
    }
    async init() {
        const m = this.objData.metadata || {};
        try {
            if (m.modelData) {
                const res = await this.loader.loadGLB(this.base64ToArrayBuffer(m.modelData));

                // Multi-model re-inflation
                if (m.models && m.models.length > 0) {
                    m.models.forEach(mInfo => {
                        const transform = new Matrix4().identity();
                        if (mInfo.transform) transform.elements.set(mInfo.transform);

                        this.models.push({
                            name: mInfo.name,
                            parts: res.parts, // Currently all layers use the same GLB parts (simple multi-layer)
                            transform: transform,
                            visible: mInfo.visible !== undefined ? mInfo.visible : true,
                            opacity: mInfo.opacity !== undefined ? mInfo.opacity : 1.0,
                            shininess: mInfo.shininess !== undefined ? mInfo.shininess : 32.0,
                            specularStrength: mInfo.specularStrength !== undefined ? mInfo.specularStrength : 0.5,
                            behaviors: mInfo.behaviors || {}
                        });
                    });
                } else {
                    const transform = new Matrix4().identity();
                    if (m.modelTransform) transform.elements.set(m.modelTransform);
                    this.models.push({ parts: res.parts, transform: transform, visible: true, opacity: 1.0, shininess: 32.0, specularStrength: 0.5 });
                }
            }
            this.createHotspots();
            if (m.exportSettings?.showHud !== false) this.createGuideMode();

            // Initialize Behaviors (if library is loaded)
            if (typeof Behavior3DRegistry !== 'undefined') {
                this.behaviorRegistry = new Behavior3DRegistry(this);
            }

            this.isRunning = true; this.animate();
        } catch (e) { console.error("Ovi3D Init Error:", e); }
    }
    createHotspots() {
        this.hotspots.forEach((hs, idx) => {
            const el = document.createElement('div'); el.style.position = 'absolute';
            el.innerHTML = `<div class="hs-dot"></div><div class="hs-card"><b>${hs.label}</b><span>${hs.detail || ''}</span></div><div class="hs-line"></div>`;
            el.querySelector('.hs-dot').onclick = () => {
                this.guideStep = idx;
                this.navigateGuide(0);
                this.flyTo(hs);
            };
            this.overlay.appendChild(el); this.hotspotElements.push({ hotspot: hs, element: el });
        });
    }
    deselectHotspot() {
        this.guideStep = -1;
        this.updateHUDIdleState();
    }
    updateHUDIdleState() {
        const title = document.querySelector('#ovi-title');
        const desc = document.querySelector('#ovi-desc');
        const progress = document.querySelector('#ovi-progress');
        const list = document.querySelector('#ovi-spot-list');

        if (title) title.innerText = "Interactive Guide";
        if (desc) desc.innerText = "Select a hotspot to begin your journey.";
        if (progress) progress.innerText = `0 of ${this.hotspots.length}`;
        if (list) {
            list.querySelectorAll('.ovi-spot-item').forEach(item => item.classList.remove('active'));
        }
    }
    createGuideMode() {
        const config = (this.objData.metadata || {}).exportSettings || {};
        const pos = config.hudPosition || 'bottom';
        const hudStyle = config.hudStyle || 'modern';
        let flexClass = 'ovi-flex-bottom-center';
        if (pos === 'top') flexClass = 'ovi-flex-top-center';
        else if (pos === 'right') flexClass = 'ovi-flex-right';

        const wrapper = document.createElement('div');
        wrapper.className = `ovi3d-hud-wrapper ${flexClass} ${hudStyle}`;

        const panel = document.createElement('div');
        panel.className = `ovi3d-info-panel ${hudStyle}`;
        panel.innerHTML = `
            <div class="ovi-spot-list" id="ovi-spot-list"></div>
            <div class="ovi-nav-header" id="ovi-nav-header">
                <div id="ovi-title" style="font-weight:bold;font-size:18px">Interactive Guide</div>
                <div class="ovi-progress-badge" id="ovi-progress">0 of 0</div>
            </div>
            <div id="ovi-desc" style="font-size:13px;margin-top:10px;margin-bottom:15px;opacity:0.8;line-height:1.4">Select a hotspot to begin your journey.</div>
            <div style="display:flex;gap:10px;margin-top:10px">
                <button class="ovi3d-nav-btn" id="ovi-prev">PREVIOUS</button>
                <button class="ovi3d-nav-btn" id="ovi-next">NEXT SPOT</button>
            </div>
        `;
        wrapper.appendChild(panel);

        const list = panel.querySelector('#ovi-spot-list');
        const hudColor = config.hudColor || '#1a73e8';

        // Master Visibility Toggle at top of list
        const toggleItem = document.createElement('div');
        toggleItem.className = 'ovi-spot-item';
        toggleItem.style.cssText = "border-bottom: 2px solid rgba(255,255,255,0.1); font-weight: bold; color: " + hudColor;
        toggleItem.innerHTML = `<span style="display:flex; justify-content:space-between; align-items:center;">
            Toggle Hotspots 
            <small class="toggle-status">ON</small>
        </span>`;
        toggleItem.onclick = (e) => {
            e.stopPropagation();
            this.showHotspots = !this.showHotspots;
            toggleItem.querySelector('.toggle-status').innerText = this.showHotspots ? "ON" : "OFF";
            toggleItem.style.color = this.showHotspots ? hudColor : "#888";
        };
        list.appendChild(toggleItem);

        this.hotspots.forEach((hs, i) => {
            const item = document.createElement('div');
            item.className = 'ovi-spot-item';
            item.innerText = `${i + 1}. ${hs.label}`;
            item.onclick = (e) => {
                e.stopPropagation();
                this.guideStep = i;
                this.navigateGuide(0);
                list.classList.remove('show');
            };
            list.appendChild(item);
        });

        panel.querySelector('#ovi-nav-header').onclick = (e) => {
            e.stopPropagation();
            list.classList.toggle('show');
        };

        window.addEventListener('click', () => list.classList.remove('show'));

        const simWrapper = document.getElementById('sim-wrapper');
        this.hudWrapper = wrapper; // Save for logic
        if (simWrapper) simWrapper.appendChild(wrapper);
        else this.overlay.appendChild(wrapper);

        this.guideStep = -1;
        panel.querySelector('#ovi-prev').onclick = (e) => { e.stopPropagation(); this.navigateGuide(-1); };
        panel.querySelector('#ovi-next').onclick = (e) => { e.stopPropagation(); this.navigateGuide(1); };
        panel.querySelector('#ovi-progress').innerText = `0 of ${this.hotspots.length}`;
    }
    navigateGuide(dir) {
        if (this.hotspots.length === 0) return;
        const newStep = (this.guideStep < 0 ? 0 : this.guideStep) + dir;

        if (newStep < 0 || newStep >= this.hotspots.length) {
            this.deselectHotspot();
            return;
        }

        this.guideStep = newStep;
        this.lastAutoMoveTime = Date.now(); // Reset autopilot timer on nav
        const hs = this.hotspots[this.guideStep]; this.flyTo(hs);

        const title = document.querySelector('#ovi-title');
        const desc = document.querySelector('#ovi-desc');
        const progress = document.querySelector('#ovi-progress');
        const list = document.querySelector('#ovi-spot-list');

        if (title) title.innerText = hs.label;
        if (desc) desc.innerText = hs.detail || "";
        if (progress) progress.innerText = `${this.guideStep + 1} of ${this.hotspots.length}`;

        if (list) {
            list.querySelectorAll('.ovi-spot-item').forEach((item, idx) => {
                item.classList.toggle('active', idx === this.guideStep);
            });
        }
    }
    flyTo(hs) {
        if (!hs.camera) return;
        this.camAnim = { startPos: new Vector3().copy(this.camera.position), endPos: new Vector3().copy(hs.camera.position), startTarget: new Vector3().copy(this.camera.target), endTarget: new Vector3().copy(hs.camera.target), startTime: Date.now(), duration: 1000 };
    }
    resize(w, h) {
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateMatrices();
    }
    animate() {
        if (!this.isRunning) return; requestAnimationFrame(() => this.animate());

        // Calculate Delta Time
        const now = Date.now();
        const dt = (now - (this.lastFrameTime || now)) / 1000;
        this.lastFrameTime = now;

        // Update Behaviors
        if (this.behaviorRegistry) this.behaviorRegistry.update(dt);

        if (this.camAnim) {
            const t = Math.min(1, (Date.now() - this.camAnim.startTime) / this.camAnim.duration), s = t * t * (3 - 2 * t);
            this.camera.position.x = this.camAnim.startPos.x + (this.camAnim.endPos.x - this.camAnim.startPos.x) * s;
            this.camera.position.y = this.camAnim.startPos.y + (this.camAnim.endPos.y - this.camAnim.startPos.y) * s;
            this.camera.position.z = this.camAnim.startPos.z + (this.camAnim.endPos.z - this.camAnim.startPos.z) * s;
            this.camera.target.x = this.camAnim.startTarget.x + (this.camAnim.endTarget.x - this.camAnim.startTarget.x) * s;
            this.camera.target.y = this.camAnim.startTarget.y + (this.camAnim.endTarget.y - this.camAnim.startTarget.y) * s;
            this.camera.target.z = this.camAnim.startTarget.z + (this.camAnim.endTarget.z - this.camAnim.startTarget.z) * s;
            this.camera.updateMatrices(); if (t >= 1) { this.camAnim = null; this.controls.syncWithCamera(); }
        }
        // Sync real-time View Position for Specular Highlights
        this.renderer.viewPos = [this.camera.position.x, this.camera.position.y, this.camera.position.z];

        // Follow Camera Light Logic
        if (this.lightFollowCamera) {
            this.renderer.lightPos = [this.camera.position.x, this.camera.position.y, this.camera.position.z];
        }

        // Global Behaviors: Smart Drift & Autopilot
        const cfg = (this.objData.metadata || {}).exportSettings || {};

        // 1. Smart Drift (Auto-Rotation)
        if (cfg.smartDrift && !this.controls.isMouseDown && !this.camAnim) {
            const now = Date.now();
            const idleTime = (now - this.lastInteractionTime) / 1000;
            const canRotate = cfg.driftType === 'always' || (cfg.driftType === 'idle' && idleTime > (cfg.driftIdleDelay || 5));

            if (canRotate) {
                const speed = (cfg.driftSpeed || 1) * 0.005;
                this.controls.theta += speed;
                this.controls.update();
            }
        }

        // 2. Autopilot (Auto-Tour)
        if (cfg.hudLoop !== undefined && this.hotspots.length > 0 && !this.controls.isMouseDown && !this.controls.isDragging && !this.camAnim) {
            const now = Date.now();
            const timeSinceMove = (now - this.lastAutoMoveTime) / 1000;
            const pace = cfg.hudPace || 5;

            if (timeSinceMove > pace) {
                this.lastAutoMoveTime = now;
                let nextStep = this.guideStep + 1;
                if (nextStep >= this.hotspots.length) {
                    if (cfg.hudLoop) nextStep = 0;
                    else nextStep = -1; // End tour
                }

                if (nextStep !== -1) {
                    this.guideStep = nextStep;
                    this.navigateGuide(0); // This will call flyTo and update HUD
                } else if (this.guideStep !== -1) {
                    this.deselectHotspot();
                }
            }
        }

        // 3. Auto-Hide Toolbars
        if (cfg.autoHideUI && this.hudWrapper) {
            const isInteracting = this.controls.isMouseDown || this.controls.isDragging || !!this.camAnim;
            const targetOp = isInteracting ? '0.1' : '1.0';
            if (this.hudWrapper.style.opacity !== targetOp) {
                this.hudWrapper.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                this.hudWrapper.style.opacity = targetOp;
                // Never set to 'auto' as it blocks the canvas. The inner panel has its own 'auto'.
                this.hudWrapper.style.pointerEvents = 'none';
            }
        }

        this.renderer.clear();
        this.models.forEach(m => m.parts.forEach(p => {
            const world = new Matrix4().copy(m.transform); if (p.matrix) world.multiply(p.matrix);

            // Sync per-model material properties
            const material = { ...p.material };
            if (m.shininess !== undefined) material.shininess = m.shininess;
            if (m.specularStrength !== undefined) material.specularStrength = m.specularStrength;

            this.renderer.draw(p.geometry, world, this.camera.viewMatrix, this.camera.projectionMatrix, material);
        }));
        const mvp = new Matrix4().copy(this.camera.projectionMatrix).multiply(this.camera.viewMatrix);
        const cw = this.canvas.clientWidth;
        const ch = this.canvas.clientHeight;

        if (!this._lastLog || Date.now() - this._lastLog > 2000) {
            console.log(`[Ovi3D] HUD Update.SimUnits: ${cw}x${ch}, Hotspots: ${this.hotspotElements.length} `);
            this._lastLog = Date.now();
        }

        this.hotspotElements.forEach((hse, idx) => {
            if (!this.showHotspots) {
                hse.element.style.display = 'none';
                return;
            }
            const hpos = hse.hotspot.position;
            const p = new Vector3(hpos.x, hpos.y, hpos.z).applyMatrix4(mvp);

            // Calculate distance for scaling
            const dx = this.camera.position.x - hpos.x;
            const dy = this.camera.position.y - hpos.y;
            const dz = this.camera.position.z - hpos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Smart Scaling: Solid presence at all distances
            const scale = Math.max(0.7, Math.min(1.2, 12 / dist));

            if (p.z < -1 || p.z > 1) { // Only cull if truly outside view frustum
                hse.element.style.display = 'none';
            } else {
                hse.element.style.display = 'block';

                // Active state check
                const dot = hse.element.querySelector('.hs-dot');
                if (dot) {
                    dot.classList.toggle('active', this.guideStep === idx);
                }

                // Precision Alignment using direct CSS Percentages on the element
                const left = (p.x * 0.5 + 0.5) * 100;
                const top = (-p.y * 0.5 + 0.5) * 100;
                hse.element.style.left = `${left}%`;
                hse.element.style.top = `${top}%`;
                hse.element.style.transform = `translate(-50%, -50%) scale(${scale})`;

                // Opacity Profile: User Baseline (100% saturation for front & side markers)
                const zFade = Math.max(0, Math.min(1, 1.5 - p.z));
                const isActive = this.guideStep === idx;
                hse.element.style.opacity = isActive ? this.markerMaxOpacity : (this.markerMaxOpacity * zFade);
            }
        });
    }
    base64ToArrayBuffer(b64) {
        const bin = window.atob(b64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return bytes.buffer;
    }
}