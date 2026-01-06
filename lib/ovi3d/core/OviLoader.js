import { BufferGeometry } from './OviGeometry.js';
import { Matrix4, Vector3, Quaternion } from './OviMath.js';

/**
 * OviLoader.js
 * Custom GLB (Binary GLTF) Parser for Ovi3D.
 * Supports scene hierarchy, multiple meshes, primitives, vertex colors, and textures.
 */
export default class OviLoader {
    constructor(renderer) {
        this.renderer = renderer;
        this.gl = renderer.gl;
        this.cache = new Map(); // Cache for textures/images
    }

    async loadGLB(arrayBuffer) {
        const data = new DataView(arrayBuffer);

        // 1. Check Header
        const magic = data.getUint32(0, true);
        if (magic !== 0x46546C67) {
            throw new Error("Not a GLB file (Magic mismatch)");
        }

        const jsonChunkLen = data.getUint32(12, true);
        const jsonStr = new TextDecoder().decode(new Uint8Array(arrayBuffer, 20, jsonChunkLen));
        const gltf = JSON.parse(jsonStr);

        console.log("OviLoader: Loading GLB...", {
            generator: gltf.asset?.generator,
            version: gltf.asset?.version,
            extensionsUsed: gltf.extensionsUsed,
            extensionsRequired: gltf.extensionsRequired,
            meshes: gltf.meshes?.length,
            nodes: gltf.nodes?.length
        });

        if (gltf.extensionsRequired) {
            const supported = ['KHR_materials_unlit', 'KHR_texture_transform']; // Add more as implemented
            for (const ext of gltf.extensionsRequired) {
                if (!supported.includes(ext)) {
                    console.warn(`OviLoader: Model requires unsupported extension '${ext}'. Rendering may be incomplete or fail.`);
                }
            }
        }

        // 2. Locate Binary Chunk
        const binChunkOffset = 20 + jsonChunkLen;
        const binData = arrayBuffer.slice(binChunkOffset + 8);

        // 3. Pre-load Textures
        const textures = [];
        if (gltf.textures) {
            for (let i = 0; i < gltf.textures.length; i++) {
                textures[i] = await this.loadTexture(gltf, binData, i);
            }
        }

        const parts = [];
        const sceneIdx = gltf.scene !== undefined ? gltf.scene : 0;
        const scene = gltf.scenes[sceneIdx];

        /**
         * Recursive node traversal to accumulate world matrices.
         */
        const traverseNode = (nodeIdx, parentMatrix) => {
            const node = gltf.nodes[nodeIdx];
            const localMatrix = new Matrix4().identity();

            if (node.matrix) {
                localMatrix.elements.set(node.matrix);
            } else {
                const translation = node.translation ? new Vector3(node.translation[0], node.translation[1], node.translation[2]) : new Vector3(0, 0, 0);
                const rotation = node.rotation ? new Quaternion(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]) : new Quaternion(0, 0, 0, 1);
                const scale = node.scale ? new Vector3(node.scale[0], node.scale[1], node.scale[2]) : new Vector3(1, 1, 1);
                localMatrix.compose(translation, rotation, scale);
            }

            const worldMatrix = new Matrix4();
            worldMatrix.elements.set(parentMatrix.elements);
            worldMatrix.multiply(localMatrix);

            if (node.mesh !== undefined) {
                const mesh = gltf.meshes[node.mesh];
                for (const primitive of mesh.primitives) {
                    try {
                        const attrs = primitive.attributes;
                        const posAcc = gltf.accessors[attrs.POSITION];
                        const normAcc = (attrs.NORMAL !== undefined) ? gltf.accessors[attrs.NORMAL] : null;
                        const colAcc = (attrs.COLOR_0 !== undefined) ? gltf.accessors[attrs.COLOR_0] : null;
                        const uvAcc = (attrs.TEXCOORD_0 !== undefined) ? gltf.accessors[attrs.TEXCOORD_0] : null;
                        const idxAccIdx = primitive.indices;
                        const idxAcc = idxAccIdx !== undefined ? gltf.accessors[idxAccIdx] : null;

                        if (!posAcc) continue;

                        const vertices = this.getBufferData(gltf, binData, posAcc);
                        const normals = normAcc ? this.getBufferData(gltf, binData, normAcc) : new Float32Array(vertices.length).fill(0);
                        const colors = colAcc ? this.getBufferData(gltf, binData, colAcc, true) : null;
                        const uvs = uvAcc ? this.getBufferData(gltf, binData, uvAcc) : null;
                        const indices = idxAcc ? this.getBufferData(gltf, binData, idxAcc) : null;

                        // Material processing
                        let color = [1, 1, 1, 1];
                        let texture = null;

                        if (primitive.material !== undefined) {
                            const mat = gltf.materials[primitive.material];
                            if (mat && mat.pbrMetallicRoughness) {
                                const pbr = mat.pbrMetallicRoughness;
                                if (pbr.baseColorFactor) color = pbr.baseColorFactor;
                                if (pbr.baseColorTexture) {
                                    texture = textures[pbr.baseColorTexture.index];
                                }
                            }
                        }

                        const geometry = new BufferGeometry(this.gl);
                        geometry.setAttributes(vertices, normals, indices, colors, uvs);

                        parts.push({
                            geometry,
                            material: { color: color.slice(0, 3), opacity: color[3], texture },
                            matrix: worldMatrix
                        });
                    } catch (e) {
                        console.warn(`OviLoader: Error parsing primitive in mesh ${node.mesh}, primitive index ${mesh.primitives.indexOf(primitive)}`, e);
                    }
                }
            }

            if (node.children) {
                for (const childIdx of node.children) {
                    traverseNode(childIdx, worldMatrix);
                }
            }
        };

        const rootMatrix = new Matrix4().identity();
        if (scene && scene.nodes) {
            for (const nodeIdx of scene.nodes) {
                traverseNode(nodeIdx, rootMatrix);
            }
        }

        return { parts, name: gltf.meshes[0]?.name || "GLB Model" };
    }

    async loadTexture(gltf, binData, texIdx) {
        const tex = gltf.textures[texIdx];
        const imgIdx = tex.source;
        const img = gltf.images[imgIdx];

        let blob;
        if (img.bufferView !== undefined) {
            const bv = gltf.bufferViews[img.bufferView];
            const offset = bv.byteOffset || 0;
            const length = bv.byteLength;
            const data = new Uint8Array(binData, offset, length);
            blob = new Blob([data], { type: img.mimeType });
        } else if (img.uri) {
            // Unlikely in GLB, but for completeness:
            return null;
        }

        if (!blob) return null;

        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                const webglTex = this.gl.createTexture();
                this.gl.bindTexture(this.gl.TEXTURE_2D, webglTex);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

                // Set default wrap/filter
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

                resolve(webglTex);
            };
            image.src = URL.createObjectURL(blob);
        });
    }

    getBufferData(gltf, binData, accessor, normalize = false) {
        if (!accessor) return null;
        const bv = gltf.bufferViews[accessor.bufferView];
        const offset = (bv.byteOffset || 0) + (accessor.byteOffset || 0);
        const count = accessor.count * this.getComponentCount(accessor.type);
        const type = accessor.componentType;

        if (type === 5126) { // FLOAT
            return new Float32Array(binData, offset, count);
        } else if (type === 5123) { // UNSIGNED_SHORT
            return new Uint16Array(binData, offset, count);
        } else if (type === 5125) { // UNSIGNED_INT
            return new Uint32Array(binData, offset, count);
        } else if (type === 5121) { // UNSIGNED_BYTE
            const bytes = new Uint8Array(binData, offset, count);
            if (normalize) {
                const floats = new Float32Array(count);
                for (let i = 0; i < count; i++) floats[i] = bytes[i] / 255;
                return floats;
            }
            return bytes;
        }
        return null;
    }

    getComponentCount(type) {
        const counts = { 'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4 };
        return counts[type] || 0;
    }
}
