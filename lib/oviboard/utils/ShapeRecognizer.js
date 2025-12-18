/**
 * ShapeRecognizer
 * Uses Ramer-Douglas-Peucker (RDP) simplification to detect shapes.
 */
export default class ShapeRecognizer {
    static recognize(points, existingObjects = []) {
        if (points.length < 5) return null;

        const bounds = this.getBounds(points);
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxY - bounds.minY;
        const center = { x: bounds.minX + w / 2, y: bounds.minY + h / 2 };

        // --- 1. Connector Check ---
        if (existingObjects.length > 0) {
            const start = points[0];
            const end = points[points.length - 1];
            const startHit = this.findHitObject(start, existingObjects);
            const endHit = this.findHitObject(end, existingObjects);
            if (startHit && endHit && startHit !== endHit) {
                return { type: 'connector', from: startHit.id, to: endHit.id, color: points[0].color || 'black' };
            }
        }

        // --- 2. Closed Check ---
        const start = points[0];
        const end = points[points.length - 1];
        const distStartEnd = Math.hypot(end.x - start.x, end.y - start.y);
        const isClosed = distStartEnd < Math.max(w, h) * 0.35; // 35% of size tolerance

        // --- 3. Line Check ---
        if (!isClosed) {
            // Simple Line
            return {
                type: 'shape',
                shapeType: 'line',
                x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y,
                color: points[0].color || 'black',
                vertices: [start, end]
            };
        }

        // --- 4. Circle Check ---
        // (Variance from center)
        const avgRadius = (w + h) / 4;
        let error = 0;
        points.forEach(p => {
            error += Math.abs(Math.hypot(p.x - center.x, p.y - center.y) - avgRadius);
        });
        error /= points.length;

        if (error / avgRadius < 0.2) {
            const r = Math.max(w, h) / 2;
            return {
                type: 'shape',
                shapeType: 'circle',
                x: center.x - r, y: center.y - r, width: r * 2, height: r * 2,
                color: points[0].color || 'black',
                vertices: [] // Circles have no vertices
            };
        }

        // --- 5. Polygon Check (Triangle/Rectangle) ---
        // Use Ramer-Douglas-Peucker simplification
        // Epsilon: how much detail to ignore. ~5% of shape size is good.
        const epsilon = Math.max(w, h) * 0.08;
        const simplified = this.rdp(points, epsilon);

        // Remove the last point if it's the same as first (closed loop)
        if (Math.hypot(simplified[0].x - simplified[simplified.length - 1].x, simplified[0].y - simplified[simplified.length - 1].y) < epsilon) {
            simplified.pop();
        }

        // Check Vertex Count
        if (simplified.length === 3) {
            return {
                type: 'shape',
                shapeType: 'triangle',
                x: bounds.minX, y: bounds.minY, width: w, height: h,
                vertices: simplified,
                color: points[0].color || 'black'
            };
        }
        else if (simplified.length === 4) {
            return {
                type: 'shape',
                shapeType: 'rectangle', // Could be quad, but mapping to Rect
                x: bounds.minX, y: bounds.minY, width: w, height: h,
                vertices: simplified,
                color: points[0].color || 'black'
            };
        }
        else if (simplified.length > 4) {
            // Maybe a messy circle or polygon? Fallback to Rectangle Bounds
            return {
                type: 'shape',
                shapeType: 'rectangle',
                x: bounds.minX, y: bounds.minY, width: w, height: h,
                vertices: [
                    { x: bounds.minX, y: bounds.minY },
                    { x: bounds.maxX, y: bounds.minY },
                    { x: bounds.maxX, y: bounds.maxY },
                    { x: bounds.minX, y: bounds.maxY }
                ],
                color: points[0].color || 'black'
            };
        }

        // Fail safe
        return null;
    }

    // --- Ramer-Douglas-Peucker Algorithm ---
    static rdp(points, epsilon) {
        if (points.length < 3) return points;

        const first = points[0];
        const last = points[points.length - 1];

        let maxDist = 0;
        let index = 0;

        for (let i = 1; i < points.length - 1; i++) {
            const dist = this.perpendicularDistance(points[i], first, last);
            if (dist > maxDist) {
                maxDist = dist;
                index = i;
            }
        }

        if (maxDist > epsilon) {
            const left = this.rdp(points.slice(0, index + 1), epsilon);
            const right = this.rdp(points.slice(index), epsilon);
            return left.concat(right.slice(1));
        } else {
            return [first, last];
        }
    }

    static perpendicularDistance(p, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        if (dx === 0 && dy === 0) {
            return Math.hypot(p.x - lineStart.x, p.y - lineStart.y);
        }

        const num = Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
        const den = Math.sqrt(dx * dx + dy * dy);
        return num / den;
    }

    static getBounds(points) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        });
        return { minX, minY, maxX, maxY };
    }

    static getPathLength(points) {
        let len = 0;
        for (let i = 1; i < points.length; i++) {
            len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        }
        return len;
    }

    static findHitObject(point, objects) {
        const padding = 20;
        for (let obj of objects) {
            if (point.x >= obj.x - padding && point.x <= obj.x + obj.width + padding &&
                point.y >= obj.y - padding && point.y <= obj.y + obj.height + padding) {
                return obj;
            }
        }
        return null;
    }
}
