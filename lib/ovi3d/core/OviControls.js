/**
 * OviControls.js
 * Orbit controls for Ovi3D (Pan, Zoom, Rotate).
 */
import { Vector3, Matrix4 } from './OviMath.js';

export default class OviControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.target = new Vector3(0, 0, 0);
        this.phi = Math.PI / 4;
        this.theta = Math.PI / 4;
        this.radius = 5;

        this.isMouseDown = false;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;

        this.enabled = true;
        this.bindEvents();
        this.updateCamera();
    }

    syncWithCamera() {
        const offset = new Vector3().copy(this.camera.position).sub(this.camera.target);
        this.radius = offset.length();
        if (this.radius > 0) {
            this.phi = Math.acos(offset.y / this.radius);
            this.theta = Math.atan2(offset.x, offset.z);
        }
        this.target.copy(this.camera.target);
    }

    bindEvents() {
        this.domElement.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.isDragging = false;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown || !this.enabled) return;
            this.isDragging = true;
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            this.theta -= dx * 0.01;
            this.phi -= dy * 0.01;
            this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.updateCamera();
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.isDragging = false;
        });

        this.domElement.addEventListener('wheel', (e) => {
            if (!this.enabled) return;
            e.preventDefault();
            this.radius += e.deltaY * 0.005;
            this.radius = Math.max(1, Math.min(50, this.radius));
            this.updateCamera();
        }, { passive: false });
    }

    updateCamera() {
        const x = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
        const y = this.radius * Math.cos(this.phi);
        const z = this.radius * Math.sin(this.phi) * Math.cos(this.theta);

        this.camera.position.set(
            this.target.x + x,
            this.target.y + y,
            this.target.z + z
        );
        this.camera.updateMatrices();
    }
}
