/**
 * OviMath.js
 * Core mathematical foundations for Ovi3D Engine.
 * Provides Vector3, Matrix4, and Quaternion classes.
 */

export class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x, y, z) {
        this.x = x; this.y = y; this.z = z;
        return this;
    }

    copy(v) {
        this.x = v.x; this.y = v.y; this.z = v.z;
        return this;
    }

    add(v) {
        this.x += v.x; this.y += v.y; this.z += v.z;
        return this;
    }

    sub(v) {
        this.x -= v.x; this.y -= v.y; this.z -= v.z;
        return this;
    }

    multiplyScalar(s) {
        this.x *= s; this.y *= s; this.z *= s;
        return this;
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v) {
        const ax = this.x, ay = this.y, az = this.z;
        const bx = v.x, by = v.y, bz = v.z;
        this.x = ay * bz - az * by;
        this.y = az * bx - ax * bz;
        this.z = ax * by - ay * bx;
        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const len = this.length();
        if (len > 0) this.multiplyScalar(1 / len);
        return this;
    }

    applyMatrix4(m) {
        const x = this.x, y = this.y, z = this.z;
        const e = m.elements;
        const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
        this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
        this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
        this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
        return this;
    }

    transformDirection(m) {
        const x = this.x, y = this.y, z = this.z;
        const e = m.elements;
        this.x = e[0] * x + e[4] * y + e[8] * z;
        this.y = e[1] * x + e[5] * y + e[9] * z;
        this.z = e[2] * x + e[6] * y + e[10] * z;
        return this.normalize();
    }
}

export class Matrix4 {
    constructor() {
        this.elements = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    copy(m) {
        this.elements.set(m.elements);
        return this;
    }

    identity() {
        const te = this.elements;
        te[0] = 1; te[4] = 0; te[8] = 0; te[12] = 0;
        te[1] = 0; te[5] = 1; te[9] = 0; te[13] = 0;
        te[2] = 0; te[6] = 0; te[10] = 1; te[14] = 0;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    multiply(m) {
        const ae = this.elements;
        const be = m.elements;
        const te = new Float32Array(16);

        const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
        const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
        const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
        const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

        const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
        const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
        const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
        const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

        te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
        te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
        te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
        te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

        te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
        te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
        te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
        te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

        te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
        te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
        te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
        te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

        te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
        te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
        te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
        te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

        this.elements = te;
        return this;
    }

    makeTranslation(x, y, z) {
        this.identity();
        this.elements[12] = x;
        this.elements[13] = y;
        this.elements[14] = z;
        return this;
    }

    translate(x, y, z) {
        const te = this.elements;
        te[12] += x;
        te[13] += y;
        te[14] += z;
        return this;
    }

    scale(x, y, z) {
        const te = this.elements;
        te[0] *= x; te[4] *= y; te[8] *= z;
        te[1] *= x; te[5] *= y; te[9] *= z;
        te[2] *= x; te[6] *= y; te[10] *= z;
        te[3] *= x; te[7] *= y; te[11] *= z;
        return this;
    }

    makeRotationX(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        this.identity();
        const te = this.elements;
        te[5] = c; te[6] = s;
        te[9] = -s; te[10] = c;
        return this;
    }

    makeRotationY(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        this.identity();
        const te = this.elements;
        te[0] = c; te[2] = -s;
        te[8] = s; te[10] = c;
        return this;
    }

    makeRotationZ(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        this.identity();
        const te = this.elements;
        te[0] = c; te[1] = s;
        te[4] = -s; te[5] = c;
        return this;
    }

    makeScale(x, y, z) {
        this.identity();
        this.elements[0] = x;
        this.elements[5] = y;
        this.elements[10] = z;
        return this;
    }

    fromQuaternion(q) {
        const x = q._x, y = q._y, z = q._z, w = q._w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const te = this.elements;
        te[0] = 1 - (yy + zz); te[4] = xy - wz; te[8] = xz + wy; te[12] = 0;
        te[1] = xy + wz; te[5] = 1 - (xx + zz); te[9] = yz - wx; te[13] = 0;
        te[2] = xz - wy; te[6] = yz + wx; te[10] = 1 - (xx + yy); te[14] = 0;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;

        return this;
    }

    compose(translation, quaternion, scale) {
        const te = this.elements;

        const x = quaternion._x, y = quaternion._y, z = quaternion._z, w = quaternion._w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;

        const sx = scale.x, sy = scale.y, sz = scale.z;

        te[0] = (1 - (yy + zz)) * sx;
        te[1] = (xy + wz) * sx;
        te[2] = (xz - wy) * sx;
        te[3] = 0;

        te[4] = (xy - wz) * sy;
        te[5] = (1 - (xx + zz)) * sy;
        te[6] = (yz + wx) * sy;
        te[7] = 0;

        te[8] = (xz + wy) * sz;
        te[9] = (yz - wx) * sz;
        te[10] = (1 - (xx + yy)) * sz;
        te[11] = 0;

        te[12] = translation.x;
        te[13] = translation.y;
        te[14] = translation.z;
        te[15] = 1;

        return this;
    }

    static perspective(fov, aspect, near, far) {
        const m = new Matrix4();
        const te = m.elements;
        const f = 1.0 / Math.tan(fov * 0.5);
        const invDet = 1.0 / (near - far);

        te[0] = f / aspect;
        te[5] = f;
        te[10] = (far + near) * invDet;
        te[11] = -1;
        te[14] = (2 * far * near) * invDet;
        te[15] = 0;
        return m;
    }

    static lookAt(eye, target, up) {
        const z = new Vector3().copy(eye).sub(target).normalize();
        const x = new Vector3().copy(up).cross(z).normalize();
        const y = new Vector3().copy(z).cross(x).normalize();

        const m = new Matrix4();
        const te = m.elements;
        te[0] = x.x; te[4] = x.y; te[8] = x.z; te[12] = -x.dot(eye);
        te[1] = y.x; te[5] = y.y; te[9] = y.z; te[13] = -y.dot(eye);
        te[2] = z.x; te[6] = z.y; te[10] = z.z; te[14] = -z.dot(eye);
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;

        return m;
    }

    invert() {
        const te = this.elements;
        const n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3],
            n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7],
            n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11],
            n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15];

        const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
            t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
            t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
            t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

        const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
        if (det === 0) return this.identity();
        const invDet = 1 / det;

        te[0] = t11 * invDet;
        te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * invDet;
        te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * invDet;
        te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * invDet;

        te[4] = t12 * invDet;
        te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * invDet;
        te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * invDet;
        te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * invDet;

        te[8] = t13 * invDet;
        te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * invDet;
        te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * invDet;
        te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * invDet;

        te[12] = t14 * invDet;
        te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * invDet;
        te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * invDet;
        te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * invDet;

        return this;
    }
}

export class Quaternion {
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this._x = x; this._y = y; this._z = z; this._w = w;
    }

    setFromAxisAngle(axis, angle) {
        const halfAngle = angle / 2, s = Math.sin(halfAngle);
        this._x = axis.x * s;
        this._y = axis.y * s;
        this._z = axis.z * s;
        this._w = Math.cos(halfAngle);
        return this;
    }

    multiply(q) {
        const qax = this._x, qay = this._y, qaz = this._z, qaw = this._w;
        const qbx = q._x, qby = q._y, qbz = q._z, qbw = q._w;
        this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
        return this;
    }
}

export class Ray {
    constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) {
        this.origin = origin;
        this.direction = direction;
    }

    at(t, target = new Vector3()) {
        return target.copy(this.direction).multiplyScalar(t).add(this.origin);
    }

    intersectTriangle(a, b, c, backfaceCulling, target = new Vector3()) {
        const edge1 = new Vector3().copy(b).sub(a);
        const edge2 = new Vector3().copy(c).sub(a);
        const pvec = new Vector3().copy(this.direction).cross(edge2);
        const det = edge1.dot(pvec);
        if (backfaceCulling) { if (det < 0.000001) return null; }
        else { if (Math.abs(det) < 0.000001) return null; }
        const invDet = 1 / det;
        const tvec = new Vector3().copy(this.origin).sub(a);
        const u = tvec.dot(pvec) * invDet;
        if (u < 0 || u > 1) return null;
        const qvec = new Vector3().copy(tvec).cross(edge1);
        const v = this.direction.dot(qvec) * invDet;
        if (v < 0 || u + v > 1) return null;
        const t = edge2.dot(qvec) * invDet;
        return t > 0 ? t : null;
    }
}

export class Box3 {
    constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) {
        this.min = min; this.max = max;
    }

    expandByPoint(v) {
        this.min.x = Math.min(this.min.x, v.x); this.min.y = Math.min(this.min.y, v.y); this.min.z = Math.min(this.min.z, v.z);
        this.max.x = Math.max(this.max.x, v.x); this.max.y = Math.max(this.max.y, v.y); this.max.z = Math.max(this.max.z, v.z);
        return this;
    }

    intersectsRay(ray) {
        let tmin = (this.min.x - ray.origin.x) / ray.direction.x;
        let tmax = (this.max.x - ray.origin.x) / ray.direction.x;
        if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
        let tymin = (this.min.y - ray.origin.y) / ray.direction.y;
        let tymax = (this.max.y - ray.origin.y) / ray.direction.y;
        if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
        if ((tmin > tymax) || (tymin > tmax)) return null;
        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;
        let tzmin = (this.min.z - ray.origin.z) / ray.direction.z;
        let tzmax = (this.max.z - ray.origin.z) / ray.direction.z;
        if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
        if ((tmin > tzmax) || (tzmin > tmax)) return null;
        if (tzmin > tmin) tmin = tzmin;
        if (tzmax < tmax) tmax = tzmax;
        return tmax > 0 ? tmin : null;
    }

    getCenter(target = new Vector3()) {
        return target.set(
            (this.min.x + this.max.x) * 0.5,
            (this.min.y + this.max.y) * 0.5,
            (this.min.z + this.max.z) * 0.5
        );
    }

    getSize(target = new Vector3()) {
        return target.set(
            this.max.x - this.min.x,
            this.max.y - this.min.y,
            this.max.z - this.min.z
        );
    }
}
