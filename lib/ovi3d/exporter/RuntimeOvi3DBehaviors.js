
import { Matrix4, Vector3 } from '../core/OviMath.js';

// 3D Behavior Registry shim & Runtime Logic
export class Behavior3DRegistry {
    constructor(viewer) {
        this.viewer = viewer;
        // No local map needed if we iterate viewer.models directly, 
        // but keeping a map could be useful for caching runtime state (like base scale).
        this.runtimeState = new Map(); // Map<modelID, stateObj>
    }

    update(dt) {
        if (!this.viewer.models) return;

        this.viewer.models.forEach((model, index) => {
            if (!model.visible || !model.behaviors) return;

            // Ensure unique ID for state tracking (using index if no ID, but ID is safer if models reorder)
            const modelId = model.id || `model_${index}`;

            // Initialize runtime state if missing
            if (!this.runtimeState.has(modelId)) {
                this.runtimeState.set(modelId, {
                    baseScale: new Vector3(1, 1, 1), // Ideally capture from transform, but for now 1,1,1 or current
                    time: 0,
                    initTransform: new Matrix4().copy(model.transform) // Capture initial transform? 
                    // Note: capturing initTransform is risky if the user moves the object. 
                    // Better to apply delta rotations or oscillating offsets.
                });

                // Hack: Try to verify if we need to snapshot scale
                // accessing matrix elements directly: 0, 5, 10 are scales if no rotation
                // For robust scale extraction we need decompostion. 
                // efficient hack:
                const els = model.transform.elements;
                const sx = Math.sqrt(els[0] * els[0] + els[1] * els[1] + els[2] * els[2]);
                const sy = Math.sqrt(els[4] * els[4] + els[5] * els[5] + els[6] * els[6]);
                const sz = Math.sqrt(els[8] * els[8] + els[9] * els[9] + els[10] * els[10]);
                this.runtimeState.get(modelId).baseScale.set(sx, sy, sz);
            }

            const state = this.runtimeState.get(modelId);
            state.time += dt;

            // Process Active Behaviors
            // We support multiple, but usually UI only allows selecting one "Active Behavior" + maybe others active in background
            // The structure is model.behaviors = { 'pulse': { enabled: true, ...params } }

            for (const [type, settings] of Object.entries(model.behaviors)) {
                if (!settings.enabled) continue;

                switch (type) {
                    case 'pulse':
                        this.applyPulse(model, settings, state, dt);
                        break;
                    case 'rotate':
                        this.applyRotate(model, settings, dt);
                        break;
                    case 'orbit':
                        this.applyOrbit(model, settings, state, dt);
                        break;
                    case 'organic_pulse':
                        this.applyOrganicPulse(model, settings, state, dt);
                        break;
                }
            }
        });
    }

    applyPulse(model, params, state, dt) {
        const speed = params.speed || 2;
        const min = params.scaleMin || 0.9;
        const max = params.scaleMax || 1.1;

        // Sine wave between 0 and 1
        const t = (Math.sin(state.time * speed) + 1) / 2;
        const scaleFactor = min + (max - min) * t;

        // Apply to base scale. 
        // We must re-compose the matrix or just update the scale diagonal if no rotation.
        // But simply multiplying the current matrix by a scale delta causes explosion.
        // SAFE APPROACH: Reset to Identity -> Re-Apply Translation/Rotation -> Apply Scale? No, too hard without components.
        // BETTER APPROACH: Scale is the last operation in column-major multiplication if we treat it as T * R * S
        // Actually, if we just want to "visualy" pulse, we can multiply the matrix by a scale oscillation 
        // BUT we need to undo the previous frame's scale first? Complex.

        // SIMPLEST ROBUST: 
        // Just scale the Basis Vectors of the matrix to the desired length.
        const els = model.transform.elements;

        // Normalize basis vectors (remove old scale)
        const sx = Math.sqrt(els[0] * els[0] + els[1] * els[1] + els[2] * els[2]);
        const sy = Math.sqrt(els[4] * els[4] + els[5] * els[5] + els[6] * els[6]);
        const sz = Math.sqrt(els[8] * els[8] + els[9] * els[9] + els[10] * els[10]);

        if (sx === 0 || sy === 0 || sz === 0) return;

        // New target scale absolute
        const targetS = state.baseScale.x * scaleFactor;
        // (Assuming uniform pulse for now)

        const ratio = targetS / sx;

        // Apply ratio to basis vectors
        els[0] *= ratio; els[1] *= ratio; els[2] *= ratio;
        els[4] *= ratio; els[5] *= ratio; els[6] *= ratio;
        els[8] *= ratio; els[9] *= ratio; els[10] *= ratio;
    }

    applyRotate(model, params, dt) {
        // Simple Euler rotation addition
        const sx = (params.speedX || 0) * dt;
        const sy = (params.speedY || 1) * dt;
        const sz = (params.speedZ || 0) * dt;

        // Create rotation matrix for this frame
        const rotM = new Matrix4();
        // We want to rotate "locally" or "globally"? 
        // "Spin" usually implies local axis, but World Y is common for "turntable".
        // Let's do Local Rotation for X/Z and generally World Y?
        // Actually, multiplying by rotation matrix on the right = Local, on the left = Global.

        // Let's try Standard Local Rotation (Post-Multiply)
        if (sx !== 0) {
            const rx = new Matrix4().makeRotationX(sx);
            model.transform.multiply(rx);
        }
        if (sy !== 0) {
            const ry = new Matrix4().makeRotationY(sy);
            model.transform.multiply(ry);
        }
        if (sz !== 0) {
            const rz = new Matrix4().makeRotationZ(sz);
            model.transform.multiply(rz);
        }
    }

    applyOrbit(model, params, state, dt) {
        // Orbit requires moving around a point (usually 0,0,0 or original pos).
        // If we assume the object was placed at radius R, we just rotate it around World Origin?
        // OR we move it in a circle based on time.

        // Simpler implementation:
        // Rotate the entire Position vector around the Y axis (or chosen axis).
        // This is effectively "Global Rotation" of the translation component.

        const speed = (params.speed || 1) * dt;
        const els = model.transform.elements;

        // Access Translation directly
        let x = els[12];
        let y = els[13];
        let z = els[14];

        // Rotate (X, Z) around Y axis
        // x' = x cos θ - z sin θ
        // z' = x sin θ + z cos θ
        const cos = Math.cos(speed);
        const sin = Math.sin(speed);

        const nx = x * cos - z * sin;
        const nz = x * sin + z * cos;

        els[12] = nx;
        els[14] = nz;

        // Also rotate the object itself to face the path? (Optional, maybe a toggle)
        // For simple orbit, usually we just move position.

        // If "Face Center" is implied, we would rotate the basis too. 
        // For now, just orbit position.
    }

    applyOrganicPulse(model, params, state, dt) {
        // Reference (Sample_OviPlatform) Organic Pulse
        // Params: amplitude, frequency, focusY, falloff

        const amp = params.amplitude !== undefined ? params.amplitude : 0.1;
        const freq = params.frequency !== undefined ? params.frequency : 1.0;
        const focusY = params.focusY !== undefined ? params.focusY : -0.5;
        const falloff = params.falloff !== undefined ? params.falloff : 0.5;

        state.time += dt;

        // Deformation
        const meshes = model.parts || (model.geometry ? [{ geometry: model.geometry }] : []);

        for (const mesh of meshes) {
            if (!mesh.geometry || !mesh.geometry.vertices) continue;

            // Initialize State Cache for this mesh if needed
            if (!state.meshCache) state.meshCache = new Map();
            if (!state.meshCache.has(mesh.geometry)) {
                // Store COPY of original vertices and bounds
                const v = mesh.geometry.vertices;
                // Also need Normals for "Organic" pulse (expansion along normal)
                // If no normals, fallback to center expansion?
                // Sample Logic uses Normals.

                state.meshCache.set(mesh.geometry, {
                    base: new Float32Array(v),
                    normals: mesh.geometry.normals ? new Float32Array(mesh.geometry.normals) : null
                });
            }

            const cache = state.meshCache.get(mesh.geometry);
            const base = cache.base;
            const norms = cache.normals;
            const current = mesh.geometry.vertices;

            // If no normals, we can't do the "True" organic pulse which expands surface.
            // Using simple center expansion as fallback if needed, but Sample Code required Normals.
            // OviGeometry usually generates normals.
            if (!norms) continue;

            const sinVal = Math.sin(state.time * freq) * amp;
            let modified = false;

            for (let i = 0; i < base.length; i += 3) {
                const y = base[i + 1];

                // Distance from Focus Plane
                const dist = Math.abs(y - focusY);

                // Mask: Smooth falloff
                let mask = 1.0 - Math.min(dist / Math.max(falloff, 0.001), 1.0);
                mask = Math.max(0, mask);
                // Hermite interpolation (smoothstep-like)
                mask = mask * mask * (3.0 - 2.0 * mask);

                if (mask > 0.001) {
                    const disp = sinVal * mask;

                    current[i] = base[i] + norms[i] * disp;
                    current[i + 1] = base[i + 1] + norms[i + 1] * disp;
                    current[i + 2] = base[i + 2] + norms[i + 2] * disp;
                    modified = true;
                } else {
                    // Reset to base
                    current[i] = base[i];
                    current[i + 1] = base[i + 1];
                    current[i + 2] = base[i + 2];
                }
            }

            if (modified && mesh.geometry.updateVertices) {
                mesh.geometry.updateVertices(current);
            }
        }
    }
}
