import { Vector3, Matrix4, Ray } from './OviMath.js';

export default class OviRaycaster {
    constructor() {
        this.ray = new Ray();
    }

    setFromCamera(mouse, camera) {
        const nearPoint = new Vector3(mouse.x, mouse.y, -1);
        const farPoint = new Vector3(mouse.x, mouse.y, 1);

        const mInvProj = new Matrix4().copy(camera.projectionMatrix).invert();
        const mInvView = new Matrix4().copy(camera.viewMatrix).invert();

        nearPoint.applyMatrix4(mInvProj).applyMatrix4(mInvView);
        farPoint.applyMatrix4(mInvProj).applyMatrix4(mInvView);

        this.ray.origin.copy(nearPoint);
        this.ray.direction.copy(farPoint).sub(nearPoint).normalize();
    }

    intersectModel(model) {
        if (!model) return null;
        let bestPoint = null;
        let minDistance = Infinity;

        for (const part of model.parts) {
            const geom = part.geometry;
            const worldMatrix = new Matrix4().copy(model.transform);
            if (part.matrix) worldMatrix.multiply(part.matrix);

            const invWorld = new Matrix4().copy(worldMatrix).invert();
            const localRay = new Ray(
                new Vector3().copy(this.ray.origin).applyMatrix4(invWorld),
                new Vector3().copy(this.ray.direction).transformDirection(invWorld)
            );

            if (geom.hasIndices && geom.indices) {
                const pos = geom.vertices;
                const indices = geom.indices;
                for (let i = 0; i < indices.length; i += 3) {
                    const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
                    const v0 = new Vector3(pos[i0], pos[i0 + 1], pos[i0 + 2]);
                    const v1 = new Vector3(pos[i1], pos[i1 + 1], pos[i1 + 2]);
                    const v2 = new Vector3(pos[i2], pos[i2 + 1], pos[i2 + 2]);

                    const t = localRay.intersectTriangle(v0, v1, v2, false);
                    if (t !== null) {
                        const hitPointWorld = new Vector3().copy(localRay.direction).multiplyScalar(t).add(localRay.origin).applyMatrix4(worldMatrix);
                        const dist = new Vector3().copy(hitPointWorld).sub(this.ray.origin).length();
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestPoint = hitPointWorld;
                        }
                    }
                }
            } else if (geom.vertices) {
                const pos = geom.vertices;
                for (let i = 0; i < pos.length; i += 9) {
                    const v0 = new Vector3(pos[i], pos[i + 1], pos[i + 2]);
                    const v1 = new Vector3(pos[i + 3], pos[i + 4], pos[i + 5]);
                    const v2 = new Vector3(pos[i + 6], pos[i + 7], pos[i + 8]);

                    const t = localRay.intersectTriangle(v0, v1, v2, false);
                    if (t !== null) {
                        const hitPointWorld = new Vector3().copy(localRay.direction).multiplyScalar(t).add(localRay.origin).applyMatrix4(worldMatrix);
                        const dist = new Vector3().copy(hitPointWorld).sub(this.ray.origin).length();
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestPoint = hitPointWorld;
                        }
                    }
                }
            }
        }
        return bestPoint;
    }
}
