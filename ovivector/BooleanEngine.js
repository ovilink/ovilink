/**
 * BooleanEngine handles SVG path boolean operations: Union, Subtract, Intersect, Exclude.
 * It uses a discretization-based approach for robustness.
 */
export default class BooleanEngine {
    /**
     * Combines multiple paths into a single union path.
     * @param {string[]} pathDatas - Array of SVG path data strings.
     * @param {string} operation - 'union', 'subtract', 'intersect', 'exclude'.
     * @returns {string} The resulting SVG path data string.
     */
    static perform(pathObjects, operation = 'union') {
        if (!pathObjects || pathObjects.length === 0) return "";

        // Filter out items with empty or missing path data
        const validPathObjects = pathObjects.filter(obj => {
            const d = typeof obj === 'string' ? obj : obj.d;
            return d && d.trim().length > 0 && d.trim() !== 'Z';
        });

        if (validPathObjects.length === 0) return "";
        if (validPathObjects.length === 1) return validPathObjects[0].d || validPathObjects[0];

        // Use filtered set for processing
        const currentPathObjects = validPathObjects;

        // 1. Convert everything to segment arrays
        const polySegments = currentPathObjects.map(obj => {
            const d = typeof obj === 'string' ? obj : obj.d;
            const matrix = obj.matrix || null;
            const points = this.pathToPolygon(d, matrix);
            const segs = [];
            for (let i = 0; i < points.length - 1; i++) {
                segs.push([points[i], points[i + 1]]);
            }
            return segs;
        });

        // 2. Iteratively merge segment lists
        let resultSegments = polySegments[0];
        for (let i = 1; i < polySegments.length; i++) {
            resultSegments = this.combineSegments(resultSegments, polySegments[i], operation);
        }

        // 3. Serialize to final path string
        return this.segmentsToPath(resultSegments);
    }

    static pathToPolygon(d, matrix = null, tolerance = 1) {
        if (!d || d.trim().length === 0 || d.trim() === 'Z') return [];
        // SVG measurements require the element to be in the DOM
        let hiddenSvg = document.getElementById('boolean-engine-hidden-svg');
        if (!hiddenSvg) {
            hiddenSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            hiddenSvg.id = 'boolean-engine-hidden-svg';
            hiddenSvg.style.position = 'absolute';
            hiddenSvg.style.width = '0';
            hiddenSvg.style.height = '0';
            hiddenSvg.style.pointerEvents = 'none';
            document.body.appendChild(hiddenSvg);
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        hiddenSvg.appendChild(path);

        const len = path.getTotalLength();
        const points = [];
        const numPoints = Math.max(20, Math.ceil(len / tolerance));

        for (let i = 0; i < numPoints; i++) {
            const p = path.getPointAtLength(len * (i / numPoints));
            let pt = { x: p.x, y: p.y };

            // Apply transformation matrix if provided
            if (matrix) {
                const nx = pt.x * matrix.a + pt.y * matrix.c + matrix.e;
                const ny = pt.x * matrix.b + pt.y * matrix.d + matrix.f;
                pt.x = nx; pt.y = ny;
            }
            points.push(pt);
        }

        // Ensure closed loop
        const pLast = path.getPointAtLength(len);
        let ptLast = { x: pLast.x, y: pLast.y };
        if (matrix) {
            const nx = ptLast.x * matrix.a + ptLast.y * matrix.c + matrix.e;
            const ny = ptLast.x * matrix.b + ptLast.y * matrix.d + matrix.f;
            ptLast.x = nx; ptLast.y = ny;
        }
        points.push(ptLast);

        hiddenSvg.removeChild(path);
        return points;
    }

    static polygonToPath(points) {
        if (!points || points.length === 0) return "";
        let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
        }
        d += " Z";
        return d;
    }

    static combineSegments(segsA, segsB, op) {
        const contoursA = this.segmentsToContours(segsA);
        const contoursB = this.segmentsToContours(segsB);
        const splitA = this.getSplitSegmentsFromSegs(segsA, contoursB);
        const splitB = this.getSplitSegmentsFromSegs(segsB, contoursA);
        const resultSegments = [];
        const isInsideA = (p) => this.isPointInContours(p, contoursA);
        const isInsideB = (p) => this.isPointInContours(p, contoursB);

        if (op === 'union') {
            splitA.forEach(s => { if (!isInsideB(this.getMidPoint(s))) resultSegments.push(s); });
            splitB.forEach(s => { if (!isInsideA(this.getMidPoint(s))) resultSegments.push(s); });
        } else if (op === 'subtract') {
            splitA.forEach(s => { if (!isInsideB(this.getMidPoint(s))) resultSegments.push(s); });
            splitB.forEach(s => { if (isInsideA(this.getMidPoint(s))) resultSegments.push([s[1], s[0]]); });
        } else if (op === 'intersect') {
            splitA.forEach(s => { if (isInsideB(this.getMidPoint(s))) resultSegments.push(s); });
            splitB.forEach(s => { if (isInsideA(this.getMidPoint(s))) resultSegments.push(s); });
        } else if (op === 'exclude') {
            splitA.forEach(s => {
                if (!isInsideB(this.getMidPoint(s))) resultSegments.push(s);
                else resultSegments.push([s[1], s[0]]);
            });
            splitB.forEach(s => {
                if (!isInsideA(this.getMidPoint(s))) resultSegments.push(s);
                else resultSegments.push([s[1], s[0]]);
            });
        }
        return resultSegments;
    }


    static getSplitSegmentsFromSegs(segments, otherContours) {
        const split = [];
        segments.forEach(s => {
            const p1 = s[0], p2 = s[1];
            let points = [p1, p2];
            otherContours.forEach(otherPoly => {
                for (let j = 0; j < otherPoly.length - 1; j++) {
                    const q1 = otherPoly[j], q2 = otherPoly[j + 1];
                    const inter = this.intersect(p1.x, p1.y, p2.x, p2.y, q1.x, q1.y, q2.x, q2.y);
                    if (inter) points.push(inter);
                }
            });
            points.sort((a, b) => Math.sqrt((a.x - p1.x) ** 2 + (a.y - p1.y) ** 2) - Math.sqrt((b.x - p1.x) ** 2 + (b.y - p1.y) ** 2));
            for (let k = 0; k < points.length - 1; k++) {
                if (Math.abs(points[k].x - points[k + 1].x) > 0.001 || Math.abs(points[k].y - points[k + 1].y) > 0.001) {
                    split.push([points[k], points[k + 1]]);
                }
            }
        });
        return split;
    }

    static segmentsToPath(segments) {
        if (!segments || segments.length === 0) return "";

        // Link segments into contours
        const contours = [];
        const remaining = [...segments];

        while (remaining.length > 0) {
            let currentPath = [remaining.shift()];
            let changed = true;

            while (changed) {
                changed = false;
                const lastPoint = currentPath[currentPath.length - 1][1];

                for (let i = 0; i < remaining.length; i++) {
                    const s = remaining[i];
                    // Check if segment starts where we ended
                    if (Math.abs(s[0].x - lastPoint.x) < 0.1 && Math.abs(s[0].y - lastPoint.y) < 0.1) {
                        currentPath.push(remaining.splice(i, 1)[0]);
                        changed = true;
                        break;
                    }
                    // Check if segment ends where we ended (reverse it)
                    if (Math.abs(s[1].x - lastPoint.x) < 0.1 && Math.abs(s[1].y - lastPoint.y) < 0.1) {
                        currentPath.push([s[1], s[0]]);
                        remaining.splice(i, 1);
                        changed = true;
                        break;
                    }
                }
            }
            contours.push(currentPath);
        }

        let d = "";
        contours.forEach(c => {
            d += `M ${c[0][0].x.toFixed(2)} ${c[0][0].y.toFixed(2)}`;
            c.forEach(s => {
                d += ` L ${s[1].x.toFixed(2)} ${s[1].y.toFixed(2)}`;
            });
            d += " Z ";
        });

        return d.trim();
    }

    static intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
        if (det === 0) return null;
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / det;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / det;
        if (ua > 0 && ua < 1 && ub > 0 && ub < 1) {
            return {
                x: x1 + ua * (x2 - x1),
                y: y1 + ua * (y2 - y1)
            };
        }
        return null;
    }

    static isPointInPolygon(p, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            const intersect = ((yi > p.y) !== (yj > p.y)) &&
                (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    static getMidPoint(segment) {
        return {
            x: (segment[0].x + segment[1].x) / 2,
            y: (segment[0].y + segment[1].y) / 2
        };
    }

    static getPolygonArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    }

    static isPointInContours(p, contours) {
        let inside = false;
        contours.forEach(poly => {
            for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i].x, yi = poly[i].y;
                const xj = poly[j].x, yj = poly[j].y;
                const intersect = ((yi > p.y) !== (yj > p.y)) &&
                    (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
        });
        return inside;
    }

    static segmentsToContours(segments) {
        if (!segments || segments.length === 0) return [];
        const chains = [];
        const remaining = [...segments];
        while (remaining.length > 0) {
            let chain = [remaining.shift()];
            let changed = true;
            while (changed) {
                changed = false;
                const lastPoint = chain[chain.length - 1][1];
                for (let i = 0; i < remaining.length; i++) {
                    const s = remaining[i];
                    if (Math.abs(s[0].x - lastPoint.x) < 0.1 && Math.abs(s[0].y - lastPoint.y) < 0.1) {
                        chain.push(remaining.splice(i, 1)[0]);
                        changed = true; break;
                    }
                    if (Math.abs(s[1].x - lastPoint.x) < 0.1 && Math.abs(s[1].y - lastPoint.y) < 0.1) {
                        chain.push([s[1], s[0]]);
                        remaining.splice(i, 1);
                        changed = true; break;
                    }
                }
            }
            const points = chain.map(s => s[0]);
            points.push(chain[chain.length - 1][1]);
            chains.push(points);
        }
        return chains;
    }

    /**
     * Detects sub-regions (atomic intersections) of multiple shapes.
     * Used for the interactive Shape Builder tool.
     */
    static getRegions(elements) {
        if (!elements || elements.length === 0) return [];

        const pathObjects = elements.map(el => {
            let d = el.getAttribute('d');
            if (!d) {
                const bbox = el.getBBox();
                if (el.tagName === 'rect') {
                    const x = bbox.x, y = bbox.y, w = bbox.width, h = bbox.height;
                    const rx = parseFloat(el.getAttribute('rx')) || 0;
                    if (rx > 0) {
                        d = `M ${x + rx} ${y} H ${x + w - rx} Q ${x + w} ${y} ${x + w} ${y + rx} V ${y + h - rx} Q ${x + w} ${y + h} ${x + w - rx} ${y + h} H ${x + rx} Q ${x} ${y + h} ${x} ${y + h - rx} V ${y + rx} Q ${x} ${y} ${x + rx} ${y} Z`;
                    } else {
                        d = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
                    }
                } else if (el.tagName === 'circle' || el.tagName === 'ellipse') {
                    const cx = (el.tagName === 'circle' ? parseFloat(el.getAttribute('cx')) : bbox.x + bbox.width / 2) || 0;
                    const cy = (el.tagName === 'circle' ? parseFloat(el.getAttribute('cy')) : bbox.y + bbox.height / 2) || 0;
                    const rx = (el.tagName === 'circle' ? parseFloat(el.getAttribute('r')) : bbox.width / 2) || 0;
                    const ry = (el.tagName === 'circle' ? rx : bbox.height / 2) || 0;
                    d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
                } else if (el.tagName === 'star' || el.tagName === 'polygon' || el.tagName === 'polyline') {
                    const points = el.getAttribute('points');
                    if (points) {
                        d = 'M ' + points.trim().split(/\s+/).join(' L ') + (el.tagName === 'polyline' ? '' : ' Z');
                    }
                }
            }
            return { d, matrix: el.getCTM(), original: el };
        }).filter(obj => obj.d);

        if (pathObjects.length === 0) return [];

        // Atomic Fragmentation
        const polygons = pathObjects.map(obj => this.pathToPolygon(obj.d, obj.matrix));
        let atomicRegions = []; // Array of { segs, mask }

        polygons.forEach((poly, polyIdx) => {
            const polySegs = [];
            for (let i = 0; i < poly.length - 1; i++) polySegs.push([poly[i], poly[i + 1]]);

            const nextAtomicRegions = [];
            let currentRemaining = polySegs;

            // Bitmask representing only this current polygon
            const currentMask = (1 << polyIdx);

            atomicRegions.forEach(existing => {
                const intersection = this.combineSegments(currentRemaining, existing.segs, 'intersect');
                const onlyCurrent = this.combineSegments(currentRemaining, existing.segs, 'subtract');
                const onlyExisting = this.combineSegments(existing.segs, currentRemaining, 'subtract');

                if (intersection.length > 0) {
                    nextAtomicRegions.push({ segs: intersection, mask: existing.mask | currentMask });
                }
                if (onlyExisting.length > 0) {
                    nextAtomicRegions.push({ segs: onlyExisting, mask: existing.mask });
                }
                currentRemaining = onlyCurrent;
            });

            if (currentRemaining.length > 0) {
                nextAtomicRegions.push({ segs: currentRemaining, mask: currentMask });
            }
            atomicRegions = nextAtomicRegions;
        });

        return atomicRegions.map(region => ({
            d: this.segmentsToPath(region.segs),
            mask: region.mask,
            // Original elements that contain this region
            parents: pathObjects.filter((obj, i) => (region.mask & (1 << i))).map(obj => obj.original)
        }));
    }
}
