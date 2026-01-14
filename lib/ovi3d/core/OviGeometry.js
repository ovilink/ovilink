/**
 * OviGeometry.js
 * Manages vertex and index buffers for WebGL.
 */

export class BufferGeometry {
    constructor(gl) {
        this.gl = gl;
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.nbo = gl.createBuffer(); // Normal buffer
        this.cbo = gl.createBuffer(); // Color buffer
        this.tbo = gl.createBuffer(); // Texture (UV) buffer
        this.ebo = gl.createBuffer(); // Element buffer
        this.count = 0;

        // CPU-side data for raycasting/physics
        this.vertices = null;
        this.indices = null;

        this.hasIndices = false;
        this.hasColors = false;
        this.hasUVs = false;
    }

    setAttributes(vertices, normals, indices = null, colors = null, uvs = null) {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);

        // Position Attribute (location 0)
        this.vertices = vertices;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        // Normal Attribute (location 1)
        this.normals = normals;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(1);

        // Color Attribute (location 2)
        if (colors) {
            this.colors = colors;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
            const size = colors.length / (vertices.length / 3);
            gl.vertexAttribPointer(2, size, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(2);
            this.hasColors = true;
        } else {
            gl.disableVertexAttribArray(2);
            this.hasColors = false;
        }

        // Texture Coordination (location 3)
        if (uvs) {
            this.uvs = uvs;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.tbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
            gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(3);
            this.hasUVs = true;
        } else {
            gl.disableVertexAttribArray(3);
            this.hasUVs = false;
        }

        if (indices) {
            this.indices = indices;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
            this.count = indices.length;
            this.hasIndices = true;
        } else {
            this.indices = null;
            this.count = vertices.length / 3;
            this.hasIndices = false;
        }

        gl.bindVertexArray(null);
    }

    static createBox(gl, width = 1, height = 1, depth = 1) {
        const w = width / 2, h = height / 2, d = depth / 2;
        const vertices = [
            // Front face
            -w, -h, d, w, -h, d, w, h, d, -w, h, d,
            // Back face
            -w, -h, -d, -w, h, -d, w, h, -d, w, -h, -d,
            // Top face
            -w, h, -d, -w, h, d, w, h, d, w, h, -d,
            // Bottom face
            -w, -h, -d, w, -h, -d, w, -h, d, -w, -h, d,
            // Right face
            w, -h, -d, w, h, -d, w, h, d, w, -h, d,
            // Left face
            -w, -h, -d, -w, -h, d, -w, h, d, -w, h, -d,
        ];

        const normals = [
            // Front
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            // Back
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            // Top
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            // Bottom
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            // Right
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            // Left
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        ];

        const indices = [
            0, 1, 2, 0, 2, 3,    // Front
            4, 5, 6, 4, 6, 7,    // Back
            8, 9, 10, 8, 10, 11,  // Top
            12, 13, 14, 12, 14, 15, // Bottom
            16, 17, 18, 16, 18, 19, // Right
            20, 21, 22, 20, 22, 23  // Left
        ];

        const geom = new BufferGeometry(gl);
        geom.setAttributes(vertices, normals, indices);
        return geom;
    }

    updateVertices(vertices) {
        if (!this.vbo) return;
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        // Use bufferSubData for partial updates if possible, but here we likely replace all positions.
        // If the size matches, bufferSubData is faster. 
        // For simplicity and robustness with changing sizes (though unlikely here), bufferData is safer but slower.
        // efficient: gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(vertices));
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}
