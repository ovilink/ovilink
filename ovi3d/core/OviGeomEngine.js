/**
 * OviGeomEngine.js
 * Extrusion and Beveling logic for converting 2D paths to 3D.
 */
import { BufferGeometry } from './OviGeometry.js';

export default class OviGeomEngine {
    constructor(gl) {
        this.gl = gl;
    }

    extrudePath(pathPoints, depth = 0.2, bevel = 0.05) {
        // 1. Create Front and Back Faces
        // We'll simplify and treat pathPoints as a closed polygon
        const vertices = [];
        const normals = [];
        const indices = [];

        const count = pathPoints.length;

        // Front Face (z = depth/2)
        for (let i = 0; i < count; i++) {
            vertices.push(pathPoints[i].x, pathPoints[i].y, depth / 2);
            normals.push(0, 0, 1);
        }

        // Back Face (z = -depth/2)
        for (let i = 0; i < count; i++) {
            vertices.push(pathPoints[i].x, pathPoints[i].y, -depth / 2);
            normals.push(0, 0, -1);
        }

        // Side Faces
        for (let i = 0; i < count; i++) {
            const next = (i + 1) % count;
            const v0 = i;
            const v1 = next;
            const v2 = i + count;
            const v3 = next + count;

            // Simple normal calculation for side
            const dx = pathPoints[next].x - pathPoints[i].x;
            const dy = pathPoints[next].y - pathPoints[i].y;
            const nx = dy;
            const ny = -dx;
            const len = Math.sqrt(nx * nx + ny * ny);

            // Quad for the side
            // (We'd ideally duplicate vertices here for hard normals, but keeping it simple)
            indices.push(v0, v1, v2);
            indices.push(v1, v3, v2);
        }

        // Triangulate Front and Back (Simplification using fan for convex or simple shapes)
        // In a production engine, we'd use Earcut here.
        for (let i = 1; i < count - 1; i++) {
            indices.push(0, i, i + 1); // Front
            indices.push(count, count + i + 1, count + i); // Back
        }

        const geometry = new BufferGeometry(this.gl);
        geometry.setAttributes(vertices, normals, indices);
        return geometry;
    }
}
