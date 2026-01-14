/**
 * OviCamera.js
 * Perspective camera for Ovi3D.
 */
import { Matrix4, Vector3 } from './OviMath.js';

export default class OviCamera {
    constructor(fov = 45, aspect = 1, near = 0.1, far = 1000) {
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;

        this.position = new Vector3(0, 0, 5);
        this.target = new Vector3(0, 0, 0);
        this.up = new Vector3(0, 1, 0);

        this.projectionMatrix = new Matrix4();
        this.viewMatrix = new Matrix4();

        this.updateMatrices();
    }

    setAspect(aspect) {
        this.aspect = aspect;
        this.updateMatrices();
    }

    updateMatrices() {
        this.projectionMatrix = Matrix4.perspective(
            this.fov * (Math.PI / 180),
            this.aspect,
            this.near,
            this.far
        );

        this.viewMatrix = Matrix4.lookAt(
            this.position,
            this.target,
            this.up
        );
    }
}
