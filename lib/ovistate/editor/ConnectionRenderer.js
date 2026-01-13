export default class ConnectionRenderer {
    constructor(editor) {
        this.editor = editor;
    }

    render() {
        if (!this.editor.canvas) return;

        // Clear previous frame's connections
        this.editor.canvas.clearConnections();

        // Use live runtime objects as they contain the active bindings
        const objects = this.editor.runtime ? this.editor.runtime.objects : [];
        if (!objects) return;

        // 1. Render Data Bindings (Blue/Cyan)
        objects.forEach(obj => {
            if (obj.bindings) {
                // console.log('Found bindings for', obj.id, obj.bindings);
                Object.values(obj.bindings).forEach(bindingValue => {
                    // format: "sourceId.propName"
                    const sourceId = bindingValue.split('.')[0];
                    const sourceObj = objects.find(o => o.id === sourceId);
                    if (sourceObj) {
                        // console.log('Drawing curve from', sourceObj.id, 'to', obj.id);
                        this.drawCurve(sourceObj, obj, '#00bcd4', 'dashed'); // Cyan for data
                    } else {
                        // console.warn('Source object not found:', sourceId);
                    }
                });
            }

            // 2. Render Logic Events (Orange/Gold)
            // Check behavior params for target IDs
            if (obj.behaviors) {
                obj.behaviors.forEach(bId => {
                    // Specific behaviors known to have targets
                    // (This could be made more generic by scanning params for "targetId" keys)
                    const params = (obj.behaviorParams && obj.behaviorParams[bId]) ? obj.behaviorParams[bId] : {};

                    // Look for any parameter ending in 'Id' or named 'target'
                    Object.keys(params).forEach(key => {
                        if (key === 'targetId' || key.endsWith('ID') || key === 'target') {
                            const targetId = params[key];
                            if (typeof targetId === 'string') {
                                const targetObj = objects.find(o => o.id === targetId);
                                if (targetObj) {
                                    this.drawCurve(obj, targetObj, '#ff9800', 'solid'); // Orange for logic
                                }
                            }
                        }
                        // Handle array targets (e.g. from multi-select)
                        if (key === 'targets' && Array.isArray(params[key])) {
                            params[key].forEach(tid => {
                                const tObj = objects.find(o => o.id === tid);
                                if (tObj) this.drawCurve(obj, tObj, '#ff9800', 'solid');
                            });
                        }
                    });

                    // Special Case for Timer Events acting on "Self" (no line needed)
                    // unless we want to show it pointing to itself? (Skip for now)
                });
            }
        });
    }

    drawCurve(startObj, endObj, color, style) {
        // Calculate center points
        const getCenter = (o) => {
            // If parented, calculations get complex. 
            // For now, use simple x/y (local) - TODO: Support global transforms if needed for lines
            // Actually, objects in editor list are usually flat or we use their stored x,y.
            // If groups exist, x/y is relative. 
            // editor.runtime.getWorldTransform equivalent might be needed if visual looks off.
            // But Editor usually renders flat list processing? 
            // Let's stick to obj.x/obj.y for V1.
            return { x: o.x, y: o.y };
        };

        const p1 = getCenter(startObj);
        const p2 = getCenter(endObj);

        const path = this.editor.canvas.drawConnection(p1.x, p1.y, p2.x, p2.y, color);

        if (style === 'dashed') {
            path.setAttribute("stroke-dasharray", "5,5");
            path.setAttribute("opacity", "0.6");
        } else {
            path.setAttribute("opacity", "0.8");
        }
    }
}
