/**
 * DiagramExporter
 * Handles exporting diagrams to various formats.
 */

export default class DiagramExporter {
    static toSVG(diagram) {
        const { width, height } = diagram.canvas;
        const nodes = diagram.graph.nodes;
        const links = diagram.graph.links;

        const escapeXml = (unsafe) => {
            if (unsafe === null || unsafe === undefined) return "";
            return unsafe.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        };

        const f = (n) => isNaN(n) ? "0" : Number(n).toFixed(2);

        let svg = `<?xml version="1.0" encoding="utf-8"?>\n`;
        svg += `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${f(width)}" height="${f(height)}" viewBox="0 0 ${f(width)} ${f(height)}" xml:space="preserve">`;

        // Background
        svg += `<rect width="${f(width)}" height="${f(height)}" fill="#f8f9fa" />`;

        // Draw Links
        links.forEach(link => {
            const s = nodes.find(n => n.id === link.sourceNodeId);
            const t = nodes.find(n => n.id === link.targetNodeId);
            if (!s || !t) return;

            const start = s.getConnectionPoints()[link.sourcePointIndex];
            const end = t.getConnectionPoints()[link.targetPointIndex];
            if (!start || !end) return;

            let d = `M ${f(start.x)} ${f(start.y)}`;
            if (link.style.type === 'orthogonal') {
                const mx = (start.x + end.x) / 2;
                d += ` L ${f(mx)} ${f(start.y)} L ${f(mx)} ${f(end.y)} L ${f(end.x)} ${f(end.y)}`;
            } else if (link.style.type === 'curve') {
                const cp1x = start.x + (end.x - start.x) * 0.5;
                const cp2x = end.x - (end.x - start.x) * 0.5;
                d += ` C ${f(cp1x)} ${f(start.y)} ${f(cp2x)} ${f(end.y)} ${f(end.x)} ${f(end.y)}`;
            } else {
                d += ` L ${f(end.x)} ${f(end.y)}`;
            }

            const color = link.style.color || "#5f6368";
            svg += `<path d="${d}" stroke="${color}" stroke-width="2" fill="none" `;
            if (s.behaviors && s.behaviors.includes('flow')) {
                svg += `stroke-dasharray="10,5" `;
            }
            svg += `/>`;

            // Arrowhead
            if (link.style.endHead === 'arrow') {
                let angle;
                if (link.style.type === 'orthogonal') {
                    const mx = (start.x + end.x) / 2;
                    angle = Math.atan2(0, end.x - mx);
                } else if (link.style.type === 'curve') {
                    const cp2x = end.x - (end.x - start.x) * 0.5;
                    angle = Math.atan2(0, end.x - cp2x);
                } else {
                    angle = Math.atan2(end.y - start.y, end.x - start.x);
                }
                const size = 10;
                const x1 = end.x - size * Math.cos(angle - Math.PI / 6);
                const y1 = end.y - size * Math.sin(angle - Math.PI / 6);
                const x2 = end.x - size * Math.cos(angle + Math.PI / 6);
                const y2 = end.y - size * Math.sin(angle + Math.PI / 6);
                svg += `<path d="M ${f(end.x)} ${f(end.y)} L ${f(x1)} ${f(y1)} L ${f(x2)} ${f(y2)} Z" fill="${color}" />`;
            }
        });

        // Draw Nodes
        nodes.forEach(node => {
            const x = node.x || 0;
            const y = node.y || 0;
            const w = node.width || 100;
            const h = node.height || 60;
            const stroke = node.strokeStyle || "#5f6368";
            const fill = node.contentFill || node.fillStyle || "#ffffff";
            const lw = node.lineWidth || 1.5;
            const style = `fill="${fill}" stroke="${stroke}" stroke-width="${f(lw)}"`;

            if (node.type === 'Flowchart::StartEnd' || node.type === 'Flowchart::Connector' || node.type.includes('Event')) {
                const r = Math.min(w, h) / 2;
                if (node.type === 'Flowchart::StartEnd') {
                    svg += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" ${style} />`;
                } else {
                    svg += `<circle cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" r="${f(w / 2)}" ${style} />`;
                }
            } else if (node.type === 'Flowchart::Decision' || node.type.includes('Gateway')) {
                svg += `<path d="M ${f(x + w / 2)} ${f(y)} L ${f(x + w)} ${f(y + h / 2)} L ${f(x + w / 2)} ${f(y + h)} L ${f(x)} ${f(y + h / 2)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::Document') {
                const wave = 8;
                const d = `M ${f(x)} ${f(y)} L ${f(x + w)} ${f(y)} L ${f(x + w)} ${f(y + h - 5)} Q ${f(x + w * 0.75)} ${f(y + h - wave - 5)} ${f(x + w * 0.5)} ${f(y + h - 5)} Q ${f(x + w * 0.25)} ${f(y + h + wave - 5)} ${f(x)} ${f(y + h - 5)} Z`;
                svg += `<path d="${d}" ${style} />`;
            } else if (node.type === 'Flowchart::InputOutput') {
                const skew = w * 0.2;
                svg += `<path d="M ${f(x + skew)} ${f(y)} L ${f(x + w)} ${f(y)} L ${f(x + w - skew)} ${f(y + h)} L ${f(x)} ${f(y + h)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::Preparation') {
                const indent = 20;
                svg += `<path d="M ${f(x)} ${f(y + h / 2)} L ${f(x + indent)} ${f(y)} L ${f(x + w - indent)} ${f(y)} L ${f(x + w)} ${f(y + h / 2)} L ${f(x + w - indent)} ${f(y + h)} L ${f(x + indent)} ${f(y + h)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::Database') {
                const ry = h * 0.15;
                const rx = w / 2;
                const topY = y + ry;
                const bottomY = y + h - ry;
                svg += `<path d="M ${f(x)} ${f(topY)} L ${f(x)} ${f(bottomY)} A ${f(rx)} ${f(ry)} 0 0 0 ${f(x + w)} ${f(bottomY)} L ${f(x + w)} ${f(topY)} A ${f(rx)} ${f(ry)} 0 0 1 ${f(x)} ${f(topY)} Z" ${style} />`;
                svg += `<ellipse cx="${f(x + rx)}" cy="${f(topY)}" rx="${f(rx)}" ry="${f(ry)}" ${style} />`;
            } else if (node.type === 'Flowchart::Delay') {
                const r = h / 2;
                svg += `<path d="M ${f(x)} ${f(y)} L ${f(x + w - r)} ${f(y)} A ${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)} L ${f(x)} ${f(y + h)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::ManualInput') {
                const slope = 20;
                svg += `<path d="M ${f(x)} ${f(y + slope)} L ${f(x + w)} ${f(y)} L ${f(x + w)} ${f(y + h)} L ${f(x)} ${f(y + h)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::ManualOperation') {
                const inset = 20;
                svg += `<path d="M ${f(x)} ${f(y)} L ${f(x + w)} ${f(y)} L ${f(x + w - inset)} ${f(y + h)} L ${f(x + inset)} ${f(y + h)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::PredefinedProcess') {
                const inset = 12;
                svg += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" ${style} />`;
                svg += `<line x1="${f(x + inset)}" y1="${f(y)}" x2="${f(x + inset)}" y2="${f(y + h)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
                svg += `<line x1="${f(x + w - inset)}" y1="${f(y)}" x2="${f(x + w - inset)}" y2="${f(y + h)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
            } else if (node.type === 'Flowchart::Display') {
                const pointerWidth = 20;
                svg += `<path d="M ${f(x + pointerWidth)} ${f(y)} L ${f(x + w)} ${f(y)} L ${f(x + w)} ${f(y + h)} L ${f(x + pointerWidth)} ${f(y + h)} L ${f(x)} ${f(y + h / 2)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::Merge') {
                svg += `<path d="M ${f(x)} ${f(y)} L ${f(x + w)} ${f(y)} L ${f(x + w / 2)} ${f(y + h)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::Annotation') {
                const foldSize = 15;
                svg += `<path d="M ${f(x)} ${f(y)} L ${f(x + w - foldSize)} ${f(y)} L ${f(x + w)} ${f(y + foldSize)} L ${f(x + w)} ${f(y + h)} L ${f(x)} ${f(y + h)} Z" ${style} />`;
                svg += `<path d="M ${f(x + w - foldSize)} ${f(y)} L ${f(x + w - foldSize)} ${f(y + foldSize)} L ${f(x + w)} ${f(y + foldSize)}" fill="none" stroke="${stroke}" stroke-width="${f(lw)}" />`;
            } else if (node.type === 'Flowchart::LoopLimit') {
                const cham = 15;
                svg += `<path d="M ${f(x + cham)} ${f(y)} L ${f(x + w - cham)} ${f(y)} L ${f(x + w)} ${f(y + cham)} L ${f(x + w)} ${f(y + h - cham)} L ${f(x + w - cham)} ${f(y + h)} L ${f(x + cham)} ${f(y + h)} L ${f(x)} ${f(y + h - cham)} L ${f(x)} ${f(y + cham)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::InternalStorage') {
                const offset = 15;
                svg += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" ${style} />`;
                svg += `<line x1="${f(x + offset)}" y1="${f(y)}" x2="${f(x + offset)}" y2="${f(y + h)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
                svg += `<line x1="${f(x)}" y1="${f(y + offset)}" x2="${f(x + w)}" y2="${f(y + offset)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
            } else if (node.type === 'Flowchart::SummingJunction' || node.type === 'Flowchart::Or') {
                const r = w / 2;
                svg += `<circle cx="${f(x + r)}" cy="${f(y + r)}" r="${f(r)}" ${style} />`;
                if (node.type === 'Flowchart::SummingJunction') {
                    const s = r * 0.6;
                    svg += `<line x1="${f(x + r)}" y1="${f(y + r - s)}" x2="${f(x + r)}" y2="${f(y + r + s)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
                    svg += `<line x1="${f(x + r - s)}" y1="${f(y + r)}" x2="${f(x + r + s)}" y2="${f(y + r)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
                } else {
                    const s = r * 0.6 * 0.707;
                    svg += `<line x1="${f(x + r - s)}" y1="${f(y + r - s)}" x2="${f(x + r + s)}" y2="${f(y + r + s)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
                    svg += `<line x1="${f(x + r + s)}" y1="${f(y + r - s)}" x2="${f(x + r - s)}" y2="${f(y + r + s)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
                }
            } else if (node.type === 'Flowchart::Collate') {
                svg += `<path d="M ${f(x)} ${f(y)} L ${f(x + w)} ${f(y)} L ${f(x)} ${f(y + h)} L ${f(x + w)} ${f(y + h)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::OffPageConnector') {
                svg += `<path d="M ${f(x)} ${f(y)} L ${f(x + w)} ${f(y)} L ${f(x + w)} ${f(y + h * 0.7)} L ${f(x + w / 2)} ${f(y + h)} L ${f(x)} ${f(y + h * 0.7)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::Sort') {
                svg += `<path d="M ${f(x + w / 2)} ${f(y)} L ${f(x + w)} ${f(y + h / 2)} L ${f(x + w / 2)} ${f(y + h)} L ${f(x)} ${f(y + h / 2)} Z" ${style} />`;
                svg += `<line x1="${f(x)}" y1="${f(y + h / 2)}" x2="${f(x + w)}" y2="${f(y + h / 2)}" stroke="${stroke}" stroke-width="${f(lw)}" />`;
            } else if (node.type === 'Flowchart::Extract') {
                svg += `<path d="M ${f(x + w / 2)} ${f(y)} L ${f(x + w)} ${f(y + h)} L ${f(x)} ${f(y + h)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::Card') {
                const clip = 20;
                svg += `<path d="M ${f(x + clip)} ${f(y)} L ${f(x + w)} ${f(y)} L ${f(x + w)} ${f(y + h)} L ${f(x)} ${f(y + h)} L ${f(x)} ${f(y + clip)} Z" ${style} />`;
            } else if (node.type === 'Flowchart::MultipleDocuments') {
                const offset = 8;
                const docW = w - (offset * 2);
                const docH = h - (offset * 2);
                const getDocD = (dx, dy) => `M ${f(dx)} ${f(dy)} L ${f(dx + docW)} ${f(dy)} L ${f(dx + docW)} ${f(dy + docH - 6)} C ${f(dx + docW / 2)} ${f(dy + docH + 6)} ${f(dx + docW / 2)} ${f(dy + docH - 12)} ${f(dx)} ${f(dy + docH - 6)} Z`;
                svg += `<path d="${getDocD(x + offset * 2, y)}" ${style} />`;
                svg += `<path d="${getDocD(x + offset, y + offset)}" ${style} />`;
                svg += `<path d="${getDocD(x, y + offset * 2)}" ${style} />`;
            } else {
                svg += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="4" ${style} />`;
            }

            // Label
            if (node.label) {
                const labelX = x + w / 2;
                const labelY = y + h / 2;

                // Font Mapping for Illustrator/Inkscape compatibility
                let fontFamily = node.fontFamily || "Arial";
                const fontMap = {
                    'Inter': 'Arial, Helvetica, sans-serif',
                    'Roboto': 'Arial, Helvetica, sans-serif',
                    'Open Sans': 'Arial, Helvetica, sans-serif',
                    'sans-serif': 'Arial, Helvetica, sans-serif'
                };

                if (fontMap[fontFamily]) {
                    fontFamily = fontMap[fontFamily];
                }

                const fontSize = node.fontSize || 14;
                const textColor = node.textColor || "#202124";
                svg += `<text x="${f(labelX)}" y="${f(labelY)}" fill="${textColor}" font-family="${escapeXml(fontFamily)}" font-size="${f(fontSize)}" text-anchor="middle" dy=".35em">${escapeXml(node.label)}</text>`;
            }
        });

        svg += `</svg>`;
        return svg;
    }

    static async toPNG(diagram) {
        return new Promise((resolve) => {
            const dataUrl = diagram.canvas.toDataURL('image/png');
            resolve(dataUrl);
        });
    }

    static toJSON(diagram) {
        // Compatibility format for OviState
        return JSON.stringify({
            format: 'OviStateSimulation',
            version: '2.0',
            objects: diagram.graph.nodes.map(n => ({
                id: n.id,
                type: n.type || 'symbol',
                x: n.x + n.width / 2,
                y: n.y + n.height / 2,
                width: n.width,
                height: n.height,
                label: n.label,
                behaviors: n.behaviors || [],
                behaviorParams: n.behaviorParams || {},
                metadata: {
                    info: n.metadata?.info,
                    detail: n.metadata?.detail,
                    attachments: n.metadata?.attachments
                },
                status: n.status || 'pending',
                // Visual Styles
                fillStyle: n.fillStyle,
                strokeStyle: n.strokeStyle,
                lineWidth: n.lineWidth,
                textColor: n.textColor,
                fontSize: n.fontSize,
                fontFamily: n.fontFamily,
                labelPosition: n.labelPosition,
                textOffsetX: n.textOffsetX,
                textOffsetY: n.textOffsetY,
                opacity: n.opacity
            })),
            links: diagram.graph.links.map(l => ({
                source: l.sourceNodeId,
                target: l.targetNodeId,
                sourceIndex: l.sourcePointIndex,
                targetIndex: l.targetPointIndex,
                style: Object.assign({ type: 'angle', color: '#5f6368', endHead: 'arrow' }, l.style),
                label: l.label,
                labelStyle: l.labelStyle
            }))
        }, null, 2);
    }

    static toHTML(diagram) {
        const dataJson = this.toJSON(diagram).replace(/<\/script>/g, '<\\/script>');

        return `
<!DOCTYPE html>
<html>
<head>
    <title>OviDiagram Interactive Export</title>
    <style>
        body { margin: 0; background: #f8f9fa; font-family: sans-serif; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
        canvas { background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 8px; }
        .tooltip { 
            position: absolute; background: rgba(32,33,36,0.9); color: #fff; padding: 6px 12px; 
            border-radius: 4px; font-size: 13px; pointer-events: none; opacity: 0; transition: opacity 0.2s;
            z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <div id="tooltip" class="tooltip"></div>
    <!-- Data Storage -->
    <script id="ovi-data" type="application/json">${dataJson}</script>
    
    <script>
        const data = JSON.parse(document.getElementById('ovi-data').textContent);
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const tooltip = document.getElementById('tooltip');
        
        canvas.width = window.innerWidth * 0.95;
        canvas.height = window.innerHeight * 0.95;

        let lastTime = performance.now();
        let hoveredNode = null;

        function getConnectionPoint(node, index) {
            const x = node.x - node.width/2;
            const y = node.y - node.height/2;
            const w = node.width;
            const h = node.height;
            
            // Standard indices: 0:Top, 1:Right, 2:Bottom, 3:Left
            switch(index) {
                case 0: return { x: node.x, y: y };
                case 1: return { x: x + w, y: node.y };
                case 2: return { x: node.x, y: y + h };
                case 3: return { x: x, y: node.y };
                default: return { x: node.x, y: node.y };
            }
        }

        function getBezierPoint(t, start, end) {
            const cp1x = start.x + (end.x - start.x) * 0.5;
            const cp1y = start.y;
            const cp2x = end.x - (end.x - start.x) * 0.5;
            const cp2y = end.y;
            const cx = 3 * (cp1x - start.x);
            const bx = 3 * (cp2x - cp1x) - cx;
            const ax = end.x - start.x - cx - bx;
            const cy = 3 * (cp1y - start.y);
            const by = 3 * (cp2y - cp1y) - cy;
            const ay = end.y - start.y - cy - by;
            const x = (ax * (t ** 3)) + (bx * (t ** 2)) + (cx * t) + start.x;
            const y = (ay * (t ** 3)) + (by * (t ** 2)) + (cy * t) + start.y;
            return { x, y };
        }

        function getMidpoint(start, end, type) {
            if (type === 'angle') {
                const midX = start.x + (end.x - start.x) / 2;
                return { x: midX, y: start.y + (end.y - start.y) / 2 };
            } else if (type === 'curve') {
                return getBezierPoint(0.5, start, end);
            } else {
                return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
            }
        }

        function drawLinkLabel(pos, text, style) {
            if (!text) return;
            ctx.save();
            ctx.font = \`\${style?.fontSize || 12}px sans-serif\`;
            const metrics = ctx.measureText(text);
            const padding = 4;
            const w = metrics.width + padding * 2;
            const h = (style?.fontSize || 12) + padding * 2;
            ctx.fillStyle = style?.background || '#fff';
            ctx.fillRect(pos.x - w / 2, pos.y - h / 2, w, h);
            ctx.fillStyle = style?.color || '#202124';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, pos.x, pos.y);
            ctx.restore();
        }

        function drawShape(node) {
            ctx.save();
            ctx.globalAlpha = node.opacity || 1.0;
            ctx.fillStyle = node.fillStyle || '#fff';
            ctx.strokeStyle = node.isHovered ? '#1a73e8' : (node.strokeStyle || '#5f6368');
            ctx.lineWidth = node.isHovered ? 3 : (node.lineWidth || 1.5);

            const x = node.x - node.width/2;
            const y = node.y - node.height/2;
            const w = node.width;
            const h = node.height;

            ctx.beginPath();
            if (node.type === 'Flowchart::StartEnd') {
                const r = Math.min(w, h) / 2;
                if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
                else ctx.rect(x, y, w, h);
            } else if (node.type === 'Flowchart::Decision' || node.type.includes('Gateway')) {
                ctx.moveTo(x + w/2, y);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w/2, y + h);
                ctx.lineTo(x, y + h/2);
                ctx.closePath();
                
                // Gateway markers (simplified)
                if (node.type.includes('Gateway')) {
                    ctx.save();
                    ctx.fillStyle = '#000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '20px sans-serif';
                    ctx.fillText('×', node.x, node.y);
                    ctx.restore();
                }
            } else if (node.type === 'Flowchart::Document') {
                const wave = 8;
                ctx.moveTo(x, y);
                ctx.lineTo(x + w, y);
                ctx.lineTo(x + w, y + h - 5);
                ctx.quadraticCurveTo(x + w * 0.75, y + h - wave - 5, x + w * 0.5, y + h - 5);
                ctx.quadraticCurveTo(x + w * 0.25, y + h + wave - 5, x, y + h - 5);
                ctx.closePath();
            } else if (node.type === 'Flowchart::InputOutput') {
                const skew = w * 0.2;
                ctx.moveTo(x + skew, y);
                ctx.lineTo(x + w, y);
                ctx.lineTo(x + w - skew, y + h);
                ctx.lineTo(x, y + h);
                ctx.closePath();
            } else if (node.type === 'Flowchart::Preparation') {
                const indent = 20;
                ctx.moveTo(x, y + h/2);
                ctx.lineTo(x + indent, y);
                ctx.lineTo(x + w - indent, y);
                ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w - indent, y + h);
                ctx.lineTo(x + indent, y + h);
                ctx.closePath();
            } else if (node.type === 'Flowchart::Database') {
                const rx = w / 2;
                const ry = h * 0.15;
                const topY = y + ry;
                const bottomY = y + h - ry;
                
                // Body
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
                ctx.ellipse(x + rx, bottomY, rx, ry, 0, Math.PI, 0, true);
                ctx.lineTo(x + w, topY);
                ctx.ellipse(x + rx, topY, rx, ry, 0, 0, Math.PI, true);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Top Cap
                ctx.beginPath();
                ctx.ellipse(x + rx, topY, rx, ry, 0, 0, 2 * Math.PI);
            } else if (node.type === 'Flowchart::Delay') {
                const r = h / 2;
                ctx.moveTo(x, y);
                ctx.lineTo(x + w - r, y);
                ctx.arc(x + w - r, y + r, r, -Math.PI/2, Math.PI/2);
                ctx.lineTo(x, y + h);
                ctx.closePath();
            } else if (node.type === 'Flowchart::ManualInput') {
                const slope = 20;
                ctx.moveTo(x, y + slope);
                ctx.lineTo(x + w, y);
                ctx.lineTo(x + w, y + h);
                ctx.lineTo(x, y + h);
                ctx.closePath();
            } else if (node.type === 'Flowchart::ManualOperation') {
                const inset = 20;
                ctx.moveTo(x, y);
                ctx.lineTo(x + w, y);
                ctx.lineTo(x + w - inset, y + h);
                ctx.lineTo(x + inset, y + h);
                ctx.closePath();
            } else if (node.type === 'Flowchart::PredefinedProcess') {
                const inset = 12;
                ctx.rect(x, y, w, h);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + inset, y);
                ctx.lineTo(x + inset, y + h);
                ctx.moveTo(x + w - inset, y);
                ctx.lineTo(x + w - inset, y + h);
            } else if (node.type === 'Flowchart::Display') {
                const pointerWidth = 20;
                ctx.moveTo(x + pointerWidth, y);
                ctx.lineTo(x + w, y);
                ctx.lineTo(x + w, y + h);
                ctx.lineTo(x + pointerWidth, y + h);
                ctx.lineTo(x, y + h/2);
                ctx.closePath();
            } else if (node.type === 'Flowchart::Merge') {
                ctx.moveTo(x, y);
                ctx.lineTo(x + w, y);
                ctx.lineTo(x + w/2, y + h);
                ctx.closePath();
            } else if (node.type === 'Flowchart::Annotation') {
                const foldSize = 15;
                ctx.moveTo(x, y);
                ctx.lineTo(x + w - foldSize, y);
                ctx.lineTo(x + w, y + foldSize);
                ctx.lineTo(x + w, y + h);
                ctx.lineTo(x, y + h);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Fold
                ctx.beginPath();
                ctx.moveTo(x + w - foldSize, y);
                ctx.lineTo(x + w - foldSize, y + foldSize);
                ctx.lineTo(x + w, y + foldSize);
            } else if (node.type === 'Flowchart::LoopLimit') {
                const chamfer = 15;
                ctx.moveTo(x + chamfer, y);
                ctx.lineTo(x + w - chamfer, y);
                ctx.lineTo(x + w, y + chamfer);
                ctx.lineTo(x + w, y + h - chamfer);
                ctx.lineTo(x + w - chamfer, y + h);
                ctx.lineTo(x + chamfer, y + h);
                ctx.lineTo(x, y + h - chamfer);
                ctx.lineTo(x, y + chamfer);
                ctx.closePath();
            } else if (node.type === 'Flowchart::InternalStorage') {
                ctx.rect(x, y, w, h);
                ctx.stroke();
                const offset = 15;
                ctx.beginPath();
                ctx.moveTo(x + offset, y); ctx.lineTo(x + offset, y + h);
                ctx.moveTo(x, y + offset); ctx.lineTo(x + w, y + offset);
            } else if (node.type === 'Flowchart::SummingJunction' || node.type === 'Flowchart::Or') {
                const r = w / 2;
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                if (node.type === 'Flowchart::SummingJunction') {
                    const size = r * 0.6;
                    ctx.moveTo(node.x, node.y - size); ctx.lineTo(node.x, node.y + size);
                    ctx.moveTo(node.x - size, node.y); ctx.lineTo(node.x + size, node.y);
                } else {
                    const size = r * 0.6 * 0.707;
                    ctx.moveTo(node.x - size, node.y - size); ctx.lineTo(node.x + size, node.y + size);
                    ctx.moveTo(node.x + size, node.y - size); ctx.lineTo(node.x - size, node.y + size);
                }
            } else if (node.type === 'Flowchart::Collate') {
                ctx.moveTo(x, y); ctx.lineTo(x + w, y);
                ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h);
                ctx.closePath();
            } else if (node.type === 'Flowchart::OffPageConnector') {
                ctx.moveTo(x, y); ctx.lineTo(x + w, y);
                ctx.lineTo(x + w, y + h * 0.7); ctx.lineTo(x + w/2, y + h);
                ctx.lineTo(x, y + h * 0.7); ctx.closePath();
            } else if (node.type === 'Flowchart::Sort') {
                ctx.moveTo(x + w/2, y); ctx.lineTo(x + w, y + h/2);
                ctx.lineTo(x + w/2, y + h); ctx.lineTo(x, y + h/2);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y + h/2); ctx.lineTo(x + w, y + h/2);
            } else if (node.type === 'Flowchart::Extract') {
                ctx.moveTo(x + w/2, y); ctx.lineTo(x + w, y + h);
                ctx.lineTo(x, y + h); ctx.closePath();
            } else if (node.type === 'Flowchart::Card') {
                const clip = 20;
                ctx.moveTo(x + clip, y); ctx.lineTo(x + w, y);
                ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
                ctx.lineTo(x, y + clip); ctx.closePath();
            } else if (node.type === 'Flowchart::MultipleDocuments') {
                const offset = 8;
                const docW = w - (offset * 2);
                const docH = h - (offset * 2);
                const drawDoc = (dx, dy) => {
                   ctx.beginPath();
                   ctx.moveTo(dx, dy); ctx.lineTo(dx + docW, dy);
                   ctx.lineTo(dx + docW, dy + docH - 6);
                   ctx.bezierCurveTo(dx + docW/2, dy + docH + 6, dx + docW/2, dy + docH - 12, dx, dy + docH - 6);
                   ctx.closePath(); ctx.fill(); ctx.stroke();
                };
                drawDoc(x + offset * 2, y);
                drawDoc(x + offset, y + offset);
                drawDoc(x, y + offset * 2);
                ctx.beginPath(); // Reset for label
            } else if (node.type === 'Flowchart::Connector' || node.type.includes('Event')) {
                const r = w / 2;
                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                if (node.type.includes('Intermediate')) {
                   ctx.stroke(); // Double stroke for intermediate
                   ctx.beginPath();
                   ctx.arc(node.x, node.y, r - 4, 0, 2 * Math.PI);
                }
            } else {
                if (ctx.roundRect) ctx.roundRect(x, y, w, h, 4);
                else ctx.rect(x, y, w, h);
            }
            
            ctx.fill();
            ctx.stroke();

            if (node.label) {
                ctx.fillStyle = node.textColor || '#202124';
                ctx.font = \`\${node.fontSize || 14}px \${node.fontFamily || 'sans-serif'}\`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                let lx = node.x + (node.textOffsetX || 0);
                let ly = node.y + (node.textOffsetY || 0);
                
                if (node.labelPosition === 'bottom') {
                    ly = y + h + 15;
                    ctx.textBaseline = 'top';
                }
                
                // Simple multiline support
                const lines = node.label.split('\\n');
                const lineHeight = (node.fontSize || 14) * 1.2;
                const startOff = ly - ((lines.length - 1) * lineHeight) / 2;
                
                lines.forEach((line, i) => {
                    ctx.fillText(line, lx, startOff + (i * lineHeight));
                });
            }
            ctx.restore();
        }

        function drawStatusIndicator(node) {
            if (!node.status || node.status === 'pending') return;

            const cx = node.x + node.width / 2;
            const cy = node.y - node.height / 2;

            ctx.save();
            if (node.status === 'done') {
                ctx.fillStyle = '#1e8e3e';
                ctx.beginPath();
                ctx.arc(cx, cy, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - 5, cy);
                ctx.lineTo(cx - 1, cy + 4);
                ctx.lineTo(cx + 5, cy - 4);
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (node.status === 'active') {
                const pulse = (Math.sin(performance.now() / 200) + 1) / 2;
                ctx.shadowColor = '#1a73e8';
                ctx.shadowBlur = 10 + pulse * 10;
                ctx.fillStyle = '#1a73e8';
                ctx.beginPath();
                ctx.arc(cx, cy, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const angle = (performance.now() / 1000 * Math.PI * 2) % (Math.PI * 2);
                ctx.arc(cx, cy, 6, angle, angle + Math.PI * 1.5);
                ctx.stroke();
            } else if (node.status === 'error') {
                ctx.fillStyle = '#d93025';
                ctx.beginPath();
                ctx.arc(cx, cy, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText('!', cx, cy);
            }
            ctx.restore();
        }

        function drawDetailIndicator(node) {
            const hasDetail = node.metadata && node.metadata.detail;
            const attachments = node.metadata?.attachments || [];
            if (!hasDetail && attachments.length === 0) return;

            const cx = node.x - node.width / 2; 
            const cy = node.y - node.height / 2;

            // Determine Icon Type
            let iconChar = 'i';
            let bg = '#fbbc04';
            
            const hasMedia = attachments.some(a => a.type === 'video' || a.type === 'audio');
            if (hasMedia) {
                iconChar = '▶'; 
                bg = '#ff0000'; 
            }

            ctx.save();
            ctx.fillStyle = bg; 
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            if (bg === '#fbbc04') ctx.fillStyle = '#202124';

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 10px sans-serif'; 
            ctx.fillText(iconChar, cx, cy);
            ctx.restore();

            node._detailHit = { x: cx - 8, y: cy - 8, w: 16, h: 16 };
        }

        let activePopover = null;
        function showDetailPopover(node) {
            if (activePopover) activePopover.remove();
            
            const hasDetail = node.metadata && node.metadata.detail;
            const attachments = node.metadata?.attachments || [];
            if (!hasDetail && attachments.length === 0) return;

            const canvasRect = canvas.getBoundingClientRect();
            
            const popover = document.createElement('div');
            popover.style.position = 'absolute';
            popover.style.left = \`\${canvasRect.left + node.x + node.width / 2 + 15}px\`;
            popover.style.top = \`\${canvasRect.top + node.y - node.height / 2}px\`;
            popover.style.width = '320px';
            popover.style.maxHeight = '500px';
            popover.style.overflowY = 'auto';
            popover.style.background = '#fff';
            popover.style.border = '1px solid #dadce0';
            popover.style.borderRadius = '8px';
            popover.style.boxShadow = '0 6px 16px rgba(0,0,0,0.18)';
            popover.style.padding = '15px';
            popover.style.fontFamily = 'sans-serif';
            popover.style.fontSize = '12px';
            popover.style.lineHeight = '1.5';
            popover.style.color = '#333';
            popover.style.zIndex = '1000';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.marginBottom = '10px';
            header.style.borderBottom = '1px solid #f1f3f4';
            header.style.paddingBottom = '8px';
            header.innerHTML = \`<strong>\${node.label || 'Details'}</strong>\`;
            
            const closeBtn = document.createElement('span');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = () => popover.remove();
            header.appendChild(closeBtn);
            popover.appendChild(header);

            if (node.metadata.detail) {
                const content = document.createElement('div');
                let formatted = node.metadata.detail
                    .replace(/\\n/g, '<br>')
                    .replace(/- (.*?)<br>/g, '<li>$1</li>');
                content.innerHTML = formatted;
                content.style.marginBottom = '10px';
                popover.appendChild(content);
            }

            if (attachments.length > 0) {
                const mediaContainer = document.createElement('div');
                mediaContainer.style.borderTop = '1px solid #f1f3f4';
                mediaContainer.style.paddingTop = '10px';
                mediaContainer.style.display = 'flex';
                mediaContainer.style.flexDirection = 'column';
                mediaContainer.style.gap = '10px';

                attachments.forEach(att => {
                    const wrapper = document.createElement('div');
                    
                    if (att.label) {
                        const label = document.createElement('div');
                        label.textContent = att.label;
                        label.style.fontWeight = 'bold';
                        label.style.color = '#5f6368';
                        label.style.marginBottom = '4px';
                        wrapper.appendChild(label);
                    }

                    if (att.type === 'video') {
                        let embedUrl = att.url;
                        let isEmbed = false;

                        if (att.url.includes('youtube.com') || att.url.includes('youtu.be')) {
                            const regExp = /^.*(?:youtu\.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|\\&v=|shorts\\/|live\\/)([^#\\&\\?]*).*/;
                            const match = att.url.match(regExp);
                            const vidId = (match && match[1] && match[1].length >= 11) ? match[1].substring(0, 11) : null;
                            
                            if (vidId) {
                                isEmbed = true;
                                embedUrl = \`https://www.youtube.com/embed/\${vidId}\`;
                            }
                        } else if (att.url.includes('drive.google.com')) {
                            isEmbed = true;
                            embedUrl = att.url.replace('/view', '/preview');
                        }

                        if (isEmbed) {
                            const iframe = document.createElement('iframe');
                            iframe.src = embedUrl;
                            iframe.style.width = '100%';
                            iframe.style.aspectRatio = '16/9';
                            iframe.style.border = 'none';
                            iframe.style.borderRadius = '4px';
                            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                            iframe.allowFullscreen = true;
                            wrapper.appendChild(iframe);

                            // Fallback link in case of "Error 153" or restricted playback
                            const fallback = document.createElement('a');
                            fallback.href = att.url;
                            fallback.target = '_blank';
                            fallback.textContent = 'Watch on YouTube ↗';
                            fallback.style.display = 'block';
                            fallback.style.marginTop = '8px';
                            fallback.style.fontSize = '11px';
                            fallback.style.color = '#1a73e8';
                            fallback.style.textDecoration = 'none';
                            wrapper.appendChild(fallback);
                        } else {
                            const vid = document.createElement('video');
                            vid.src = att.url;
                            vid.controls = true;
                            vid.style.width = '100%';
                            vid.style.borderRadius = '4px';
                            wrapper.appendChild(vid);
                        }
                    } else if (att.type === 'audio') {
                        const audio = document.createElement('audio');
                        audio.src = att.url;
                        audio.controls = true;
                        audio.style.width = '100%';
                        wrapper.appendChild(audio);
                    } else if (att.type === 'image') {
                        const img = document.createElement('img');
                        img.src = att.url;
                        img.style.width = '100%';
                        img.style.borderRadius = '4px';
                        wrapper.appendChild(img);
                    } else { 
                        const link = document.createElement('a');
                        link.href = att.url;
                        link.target = '_blank';
                        link.textContent = att.label || 'Open Link ↗';
                        link.style.display = 'inline-block';
                        link.style.padding = '8px 12px';
                        link.style.background = '#e8f0fe';
                        link.style.color = '#1a73e8';
                        link.style.textDecoration = 'none';
                        link.style.borderRadius = '4px';
                        link.style.fontWeight = '500';
                        wrapper.appendChild(link);
                    }
                    mediaContainer.appendChild(wrapper);
                });
                popover.appendChild(mediaContainer);
            }

            document.body.appendChild(popover);
            activePopover = popover;
        }

        function drawPath(sPos, tPos, type) {
            if (type === 'angle') {
                const midX = sPos.x + (tPos.x - sPos.x) / 2;
                ctx.moveTo(sPos.x, sPos.y);
                ctx.lineTo(midX, sPos.y);
                ctx.lineTo(midX, tPos.y);
                ctx.lineTo(tPos.x, tPos.y);
            } else if (type === 'curve') {
                const cp1x = sPos.x + (tPos.x - sPos.x) * 0.5;
                const cp1y = sPos.y;
                const cp2x = tPos.x - (tPos.x - sPos.x) * 0.5;
                const cp2y = tPos.y;
                ctx.moveTo(sPos.x, sPos.y);
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tPos.x, tPos.y);
            } else {
                ctx.moveTo(sPos.x, sPos.y);
                ctx.lineTo(tPos.x, tPos.y);
            }
        }

        function drawArrowHead(sPos, tPos, type) {
            const headLength = 10;
            let angle;
            if (type === 'angle') {
                const midX = sPos.x + (tPos.x - sPos.x) / 2;
                angle = Math.atan2(tPos.y - sPos.y, tPos.x - midX);
            } else if (type === 'curve') {
                const cp2x = tPos.x - (tPos.x - sPos.x) * 0.5;
                const cp2y = tPos.y;
                angle = Math.atan2(tPos.y - cp2y, tPos.x - cp2x);
            } else {
                angle = Math.atan2(tPos.y - sPos.y, tPos.x - sPos.x);
            }

            ctx.beginPath();
            ctx.moveTo(tPos.x, tPos.y);
            ctx.lineTo(tPos.x - headLength * Math.cos(angle - Math.PI / 6), tPos.y - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(tPos.x, tPos.y);
            ctx.lineTo(tPos.x - headLength * Math.cos(angle + Math.PI / 6), tPos.y - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
        }

        function drawLinks() {
            data.links.forEach(link => {
                const s = data.objects.find(o => o.id === link.source);
                const t = data.objects.find(o => o.id === link.target);
                if (!s || !t) return;

                const sPos = getConnectionPoint(s, link.sourceIndex);
                const tPos = getConnectionPoint(t, link.targetIndex);

                const hasFlow = s.behaviors.includes('flow');
                const isChain = (s.isHovered || t.isHovered) && (s.behaviors.includes('chain') || t.behaviors.includes('chain'));
                
                // Status Flow
                const isCompletedPath = s.status === 'done' && t.status === 'done';
                const isActivePath = s.status === 'active';

                ctx.save();
                
                if (isCompletedPath) {
                    ctx.strokeStyle = '#1e8e3e';
                    const offset = (performance.now() / 1000 * 40) % 40;
                    ctx.setLineDash([10, 5]);
                    ctx.lineDashOffset = -offset;
                    ctx.lineWidth = 3;
                } else if (isActivePath) {
                    const pulse = (Math.sin(performance.now() / 300) + 1) / 2;
                    ctx.strokeStyle = \`rgba(26, 115, 232, \${0.5 + pulse * 0.5})\`;
                    ctx.lineWidth = 3;
                } else if (hasFlow) {
                    ctx.strokeStyle = '#1a73e8';
                    const offset = (performance.now() / 1000 * 30) % 40;
                    ctx.setLineDash([10, 5]);
                    ctx.lineDashOffset = -offset;
                    ctx.lineWidth = 3;
                } else {
                    ctx.strokeStyle = isChain ? '#1a73e8' : (link.style.color || '#5f6368');
                    ctx.lineWidth = isChain || hasFlow ? 3 : 2;
                }

                ctx.beginPath();
                drawPath(sPos, tPos, link.style.type);
                ctx.stroke();
                
                if (link.style.endHead === 'arrow') {
                    ctx.setLineDash([]);
                    drawArrowHead(sPos, tPos, link.style.type);
                }

                if (link.label) {
                    const mid = getMidpoint(sPos, tPos, link.style.type);
                    drawLinkLabel(mid, link.label, link.labelStyle);
                }
                ctx.restore();
            });
        }

        function update(dt) {
            data.objects.forEach(node => {
                if (node.behaviors.includes('pulse')) {
                    if (!node._pulseTime) node._pulseTime = 0;
                    node._pulseTime += dt * 5;
                    node.opacity = 0.8 + Math.sin(node._pulseTime) * 0.2;
                }
            });
        }

        function render() {
            const now = performance.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            update(dt);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawLinks();
            data.objects.forEach(node => {
                drawShape(node);
                drawStatusIndicator(node);
                drawDetailIndicator(node);
            });
            requestAnimationFrame(render);
        }

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            hoveredNode = null;
            let tooltipText = null;

            for (let i = data.objects.length - 1; i >= 0; i--) {
                const n = data.objects[i];
                if (x >= n.x - n.width/2 && x <= n.x + n.width/2 &&
                    y >= n.y - n.height/2 && y <= n.y + n.height/2) {
                    hoveredNode = n;
                    n.isHovered = true;
                    if (n.metadata && n.metadata.info) {
                        tooltipText = n.metadata.info;
                    }
                } else {
                    n.isHovered = false;
                }
            }
            
            if (tooltipText) {
                tooltip.style.opacity = 1;
                tooltip.style.left = (e.clientX + 10) + 'px';
                tooltip.style.top = (e.clientY + 10) + 'px';
                tooltip.textContent = tooltipText;
            } else {
                tooltip.style.opacity = 0;
            }
        });

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            let clickedDetail = null;
            for (let i = data.objects.length - 1; i >= 0; i--) {
                const n = data.objects[i];
                if (n._detailHit && 
                    x >= n._detailHit.x && x <= n._detailHit.x + n._detailHit.w &&
                    y >= n._detailHit.y && y <= n._detailHit.y + n._detailHit.h) {
                    clickedDetail = n;
                    break;
                }
            }

            if (clickedDetail) {
                showDetailPopover(clickedDetail);
            } else if (activePopover) {
                activePopover.remove();
                activePopover = null;
            }
        });

        render();
    </script>
</body>
</html>`;
    }
}
