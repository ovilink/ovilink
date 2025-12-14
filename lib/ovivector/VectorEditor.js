export default class VectorEditor {
    constructor(engine) {
        this.engine = engine;
        this.selectedElement = null;
        this.svgNs = "http://www.w3.org/2000/svg";
    }

    create() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.background = '#1e1e1e';
        container.style.color = '#fff';

        // 1. Toolbar (Left)
        const toolbar = document.createElement('div');
        toolbar.style.width = '50px';
        toolbar.style.background = '#252526';
        toolbar.style.borderRight = '1px solid #333';
        toolbar.style.display = 'flex';
        toolbar.style.flexDirection = 'column';
        toolbar.style.alignItems = 'center';
        toolbar.style.paddingTop = '10px';
        toolbar.innerHTML = `
            <div class="tool-btn" data-tool="select" title="Select (V)" style="cursor: pointer; margin-bottom: 10px; padding: 5px; background: #333; border-radius: 4px;">S</div>
            <div class="tool-btn" data-tool="rect" title="Rectangle (M)" style="cursor: pointer; margin-bottom: 10px; padding: 5px;">R</div>
            <div class="tool-btn" data-tool="circle" title="Circle (L)" style="cursor: pointer; margin-bottom: 10px; padding: 5px;">C</div>
            <div class="tool-btn" data-tool="star" title="Star" style="cursor: pointer; margin-bottom: 10px; padding: 5px;">★</div>
            <div class="tool-btn" data-tool="text" title="Text (T)" style="cursor: pointer; margin-bottom: 10px; padding: 5px;">T</div>
        `;

        // 2. Canvas Area (Center)
        const workspace = document.createElement('div');
        workspace.style.flex = '1';
        workspace.style.position = 'relative';
        workspace.style.overflow = 'hidden';
        workspace.style.display = 'flex';
        workspace.style.alignItems = 'center';
        workspace.style.justifyContent = 'center';
        workspace.style.background = '#1e1e1e';

        // The Artboard
        this.svg = document.createElementNS(this.svgNs, "svg");
        this.svg.setAttribute("width", "800");
        this.svg.setAttribute("height", "600");
        this.svg.style.background = '#ffffff';
        this.svg.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        workspace.appendChild(this.svg);

        // 3. Properties Panel (Right)
        const properties = document.createElement('div');
        properties.className = 'sidebar-section';
        properties.style.width = '250px';
        properties.style.background = '#252526';
        properties.style.borderLeft = '1px solid #333';

        properties.innerHTML = `
            <div class="sidebar-title" style="color: #ddd;">Properties</div>
            
            <div id="vec-props" style="display: none;">
                <div style="margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                     <label style="display: block; margin-bottom: 5px; font-size: 11px; color: #aaa;">Identity</label>
                     <input type="text" id="prop-id" placeholder="Object Name (ID)" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555; margin-bottom: 5px;">
                     
                     <label style="display: block; margin-bottom: 5px; font-size: 11px; color: #aaa;">Physics</label>
                     <select id="prop-physics" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555;">
                        <option value="static">Static (Fixed)</option>
                        <option value="dynamic">Dynamic (Gravity)</option>
                        <option value="kinematic">Kinematic (Scripted)</option>
                     </select>
                </div>

                <div id="prop-text-group" style="margin-bottom: 15px; display: none;">
                    <label>Text Content</label>
                    <input type="text" id="prop-text-content" style="width: 100%; padding: 5px; background: #333; color: white; border: 1px solid #555;">
                </div>

                <div style="margin-bottom: 15px;">
                    <label>Fill</label>
                    <input type="color" id="prop-fill" style="width: 100%;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label>Stroke</label>
                    <input type="color" id="prop-stroke" style="width: 100%;">
                </div>

                <div style="margin-bottom: 15px; border-top: 1px solid #333; padding-top: 10px;">
                    <div style="font-size: 12px; margin-bottom: 5px;">Align</div>
                    <div style="display: flex; gap: 5px;">
                        <button id="align-left" style="flex: 1;">L</button>
                        <button id="align-center" style="flex: 1;">C</button>
                        <button id="align-right" style="flex: 1;">R</button>
                    </div>
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <button id="align-top" style="flex: 1;">T</button>
                        <button id="align-middle" style="flex: 1;">M</button>
                        <button id="align-bottom" style="flex: 1;">B</button>
                    </div>
                </div>

                <div style="margin-bottom: 15px; border-top: 1px solid #333; padding-top: 10px;">
                    <div style="font-size: 12px; margin-bottom: 5px;">Arrange</div>
                    <div style="display: flex; gap: 5px;">
                        <button id="arrange-front" style="flex: 1;">Front</button>
                        <button id="arrange-back" style="flex: 1;">Back</button>
                    </div>
                </div>
            </div>
            
            <div id="vec-no-selection" style="color: #888; font-size: 12px;">Select an object to edit.</div>

            <button id="vec-send-btn" class="btn-full btn-primary" style="margin-top: 20px;">Send to Simulation</button>
        `;

        container.appendChild(toolbar);
        container.appendChild(workspace);
        container.appendChild(properties);

        this.engine.tabManager.openTab('Vector Design', 'ovivector', container);

        // Store reference for Serialization
        const plugin = this.engine.pluginManager.plugins.get('ovivector');
        if (plugin) plugin.activeEditor = this;

        this.bindEvents(toolbar, properties);
    }

    bindEvents(toolbar, properties) {
        // Tool Selection
        toolbar.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onclick = () => {
                const tool = btn.dataset.tool;
                if (tool === 'select') return;
                this.addShape(tool);
            };
        });

        // Interaction Logic (Selection & Dragging)
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.initialTransform = { x: 0, y: 0 };

        this.svg.addEventListener('mousedown', (e) => {
            if (e.target === this.svg) {
                this.deselect();
            } else {
                this.select(e.target);
                // Start Drag
                this.isDragging = true;
                this.dragStartPos = this.getMousePosition(e);

                // Get current transform
                const transform = this.selectedElement.getAttribute('transform');
                if (transform) {
                    const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                    if (match) {
                        this.initialTransform = {
                            x: parseFloat(match[1]),
                            y: parseFloat(match[2])
                        };
                    } else {
                        this.initialTransform = { x: 0, y: 0 };
                    }
                } else {
                    this.initialTransform = { x: 0, y: 0 };
                }
            }
        });

        this.svg.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.selectedElement) {
                const pt = this.getMousePosition(e);
                const dx = pt.x - this.dragStartPos.x;
                const dy = pt.y - this.dragStartPos.y;

                const newX = this.initialTransform.x + dx;
                const newY = this.initialTransform.y + dy;

                this.selectedElement.setAttribute('transform', `translate(${newX}, ${newY})`);
            }
        });

        this.svg.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.svg.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Property Changes
        const fillInput = properties.querySelector('#prop-fill');
        const strokeInput = properties.querySelector('#prop-stroke');
        const textInput = properties.querySelector('#prop-text-content');
        const idInput = properties.querySelector('#prop-id');
        const physicsInput = properties.querySelector('#prop-physics');

        fillInput.oninput = () => {
            if (this.selectedElement) this.selectedElement.setAttribute('fill', fillInput.value);
        };
        strokeInput.oninput = () => {
            if (this.selectedElement) this.selectedElement.setAttribute('stroke', strokeInput.value);
        };
        textInput.oninput = () => {
            if (this.selectedElement && this.selectedElement.tagName === 'text') {
                this.selectedElement.textContent = textInput.value;
            }
        };
        idInput.onchange = () => { // Use onchange for ID to avoid chaos
            if (this.selectedElement) this.selectedElement.setAttribute('data-id', idInput.value);
        };
        physicsInput.onchange = () => {
            if (this.selectedElement) this.selectedElement.setAttribute('data-physics', physicsInput.value);
        };

        // Align (Simplified - warning: only works well when transform is reset or accounted for)
        properties.querySelector('#align-left').onclick = () => this.align('left');
        properties.querySelector('#align-center').onclick = () => this.align('center');
        properties.querySelector('#align-right').onclick = () => this.align('right');
        properties.querySelector('#align-top').onclick = () => this.align('top');
        properties.querySelector('#align-middle').onclick = () => this.align('middle');
        properties.querySelector('#align-bottom').onclick = () => this.align('bottom');

        // Arrange
        properties.querySelector('#arrange-front').onclick = () => {
            if (this.selectedElement) this.svg.appendChild(this.selectedElement);
        };
        properties.querySelector('#arrange-back').onclick = () => {
            if (this.selectedElement) this.svg.insertBefore(this.selectedElement, this.svg.firstChild);
        };

        // Send
        properties.querySelector('#vec-send-btn').onclick = () => this.sendToSimulation();
    }

    addShape(type) {
        let el;
        // Default spawn at 400,300 (Center of 800x600)

        if (type === 'rect') {
            el = document.createElementNS(this.svgNs, "rect");
            // Centered rect 100x100
            el.setAttribute("x", "350"); // 400 - 50
            el.setAttribute("y", "250"); // 300 - 50
            el.setAttribute("width", "100");
            el.setAttribute("height", "100");
        } else if (type === 'circle') {
            el = document.createElementNS(this.svgNs, "circle");
            el.setAttribute("cx", "400");
            el.setAttribute("cy", "300");
            el.setAttribute("r", "50");
        } else if (type === 'star') {
            el = document.createElementNS(this.svgNs, "path");
            // Centered roughly at 400,300
            el.setAttribute("d", "M 400 250 L 414 285 L 452 285 L 423 310 L 434 348 L 400 325 L 366 348 L 377 310 L 348 285 L 386 285 Z");
        } else if (type === 'text') {
            el = document.createElementNS(this.svgNs, "text");
            el.setAttribute("x", "400");
            el.setAttribute("y", "300");
            el.textContent = "Text";
            el.setAttribute("fill", "#ffffff");
            el.setAttribute("font-family", "Arial");
            el.setAttribute("font-size", "24");
            el.setAttribute("text-anchor", "middle"); // Center text
        }

        if (el) {
            el.setAttribute("fill", "#00ff88");
            el.setAttribute("stroke", "#000000");
            el.setAttribute("stroke-width", "1");
            el.setAttribute("transform", "translate(0,0)"); // Init transform
            el.setAttribute("data-id", type + "_" + Date.now().toString().slice(-4)); // Default ID
            el.setAttribute("data-physics", "static");
            el.style.cursor = "move";
            this.svg.appendChild(el);
            this.select(el);
        }
    }

    select(el) {
        if (this.selectedElement) {
            this.selectedElement.setAttribute("stroke-dasharray", "");
        }
        this.selectedElement = el;
        el.setAttribute("stroke-dasharray", "5,5");

        document.getElementById('vec-props').style.display = 'block';
        document.getElementById('vec-no-selection').style.display = 'none';

        document.getElementById('prop-fill').value = el.getAttribute("fill") || "#000000";
        document.getElementById('prop-stroke').value = el.getAttribute("stroke") || "#000000";
        document.getElementById('prop-id').value = el.getAttribute("data-id") || "";
        document.getElementById('prop-physics').value = el.getAttribute("data-physics") || "static";

        const textGroup = document.getElementById('prop-text-group');
        const textInput = document.getElementById('prop-text-content');

        if (el.tagName === 'text') {
            textGroup.style.display = 'block';
            textInput.value = el.textContent;
        } else {
            textGroup.style.display = 'none';
        }
    }

    deselect() {
        if (this.selectedElement) {
            this.selectedElement.setAttribute("stroke-dasharray", "");
        }
        this.selectedElement = null;
        document.getElementById('vec-props').style.display = 'none';
        document.getElementById('vec-no-selection').style.display = 'block';
    }

    align(type) {
        // Alignment logic needs to account for transforms now. 
        // For quick prototype, we warn.
        console.log("Align " + type + " - may behave unexpectedly with transforms.");
    }

    sendToSimulation() {
        const children = Array.from(this.svg.children);
        const objects = children.map(el => {
            let pathData = "";
            let width = 50, height = 50;

            if (el.tagName === 'path') {
                pathData = el.getAttribute('d');
            } else if (el.tagName === 'rect') {
                const x = parseFloat(el.getAttribute('x'));
                const y = parseFloat(el.getAttribute('y'));
                const w = parseFloat(el.getAttribute('width'));
                const h = parseFloat(el.getAttribute('height'));
                pathData = `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
                width = w; height = h;
            } else if (el.tagName === 'circle') {
                const cx = parseFloat(el.getAttribute('cx'));
                const cy = parseFloat(el.getAttribute('cy'));
                const r = parseFloat(el.getAttribute('r'));
                pathData = `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy}`;
                width = r * 2; height = r * 2;
            }

            // Transform Offset
            let tx = 0, ty = 0;
            const transform = el.getAttribute('transform');
            if (transform) {
                const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                if (match) {
                    tx = parseFloat(match[1]);
                    ty = parseFloat(match[2]);
                }
            }

            return {
                type: el.tagName,
                path: pathData,
                text: el.tagName === 'text' ? el.textContent : null,
                fill: el.getAttribute('fill'),
                stroke: el.getAttribute('stroke'),
                strokeWidth: 2,
                x: tx,
                y: ty,
                // Pass base position for text to correct offset if needed
                baseX: el.getAttribute('x') ? parseFloat(el.getAttribute('x')) : 0,
                baseY: el.getAttribute('y') ? parseFloat(el.getAttribute('y')) : 0,

                // Identity & Physics
                id: el.getAttribute('data-id') || ("obj_" + Math.random().toString(36).substr(2, 5)),
                physics: el.getAttribute('data-physics') || "static",

                update(dt) {
                    // Simple logic placeholder
                    if (this.physics === 'dynamic') {
                        this.y = (this.y || 0) + 100 * dt; // Gravity demo
                        if (this.y > 500) this.y = 500; // Floor
                    }
                    if (this.type !== 'text' && this.physics === 'kinematic') this.rotation = (this.rotation || 0) + 1 * dt;
                }
            };
        });

        const oviStatePlugin = this.engine.pluginManager.plugins.get('ovistate');
        if (oviStatePlugin && oviStatePlugin.activeEditor && oviStatePlugin.activeEditor.runtime) {
            objects.forEach(obj => oviStatePlugin.activeEditor.runtime.addObject(obj));
            alert("Sent " + objects.length + " objects to Simulation!");
        } else {
            alert("No active simulation found.");
        }
    }

    getMousePosition(evt) {
        // Check if CTM is available
        const CTM = this.svg.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };

        if (evt.touches) evt = evt.touches[0];
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    }
}
