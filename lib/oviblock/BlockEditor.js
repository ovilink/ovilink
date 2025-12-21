import SceneRegistry from '../../js/core/SceneRegistry.js';

export default class BlockEditor {
    constructor(engine) {
        this.engine = engine;
        this.blocks = [];
        this.draggedInternalBlock = null;

        // Visual "Puzzle Piece" CSS
        if (!document.getElementById('oviblock-styles')) {
            const style = document.createElement('style');
            style.id = 'oviblock-styles';
            style.innerHTML = `
                .logic-block {
                    position: relative;
                    padding: 0 !important;
                    margin: 0 !important;
                    overflow: visible !important;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    width: fit-content;
                    min-width: 140px; /* Base width on the container */
                    user-select: none;
                    box-sizing: border-box;
                    font-family: "Segoe UI", system-ui, sans-serif;
                    font-weight: 600;
                    font-size: 12px;
                    color: white;
                }

                .block-body {
                    position: relative;
                    width: 100%;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    box-sizing: border-box;
                }

                /* ACTION BLOCKS - Pixel-perfect width & alignment */
                .block-shape-action {
                    min-height: 32px;
                    width: 100%; /* Force fill */
                    clip-path: polygon(
                        0px 0px, 16px 0px, 24px 8px, 48px 8px, 56px 0px, 100% 0px, 
                        100% calc(100% - 8px), 56px calc(100% - 8px), 48px 100%, 24px 100%, 16px calc(100% - 8px), 0px calc(100% - 8px)
                    );
                    border: none !important;
                    filter: drop-shadow(0px 1px 0px rgba(0,0,0,0.3)); /* Thin border for separation */
                }
                .block-shape-action .block-content {
                    padding: 8px 12px 12px 12px;
                    width: 100%;
                    box-sizing: border-box;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                }

                /* Snapping alignment */
                .next-slot > .logic-block {
                    margin-top: -8px !important; 
                    z-index: 5;
                }
 Riverside: rgba(0,0,0,0.4);

                /* Visual Feedback */
                .logic-block.stack-hover > .block-body {
                    filter: brightness(1.2);
                    box-shadow: 0 0 10px rgba(255,255,255,0.2);
                }

                /* REPORTER BLOCKS (Pill) */
                .block-shape-reporter {
                    border-radius: 20px;
                    min-height: 24px;
                    min-width: 40px;
                }
                .block-shape-reporter .block-content {
                    padding: 0px 12px !important;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    height: 24px;
                }

                /* BOOLEAN BLOCKS (Hex) */
                .block-shape-boolean {
                    clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%);
                    min-height: 24px;
                    min-width: 50px;
                }
                .block-shape-boolean .block-content {
                    padding: 0px 15px !important;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    height: 24px;
                }

                .block-slot {
                    min-height: 16px;
                    display: inline-flex;
                    align-items: center;
                    background: rgba(0,0,0,0.1);
                    border: 1px solid rgba(255,255,255,0.1);
                    box-sizing: border-box;
                }
                
                /* Action Slots (Internal pockets & next-slot) must NEVER have borders that shrink children */
                .block-slot[data-slot-type="action"] {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    border: none !important;
                    background: rgba(0,0,0,0.05); /* Very subtle to show drop zone */
                }

                .block-slot.drag-over {
                    background: rgba(255,255,255,0.2) !important;
                    outline: 1px solid white; /* Use outline instead of border to avoid displacement */
                }
                
                .next-slot {
                    position: relative;
                    width: 100%;
                    min-height: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    background: none !important; /* next-slot is invisible until hover */
                }

                .slot-pill { border-radius: 20px; }
                .slot-hex { clip-path: polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%); }

                .block-val, .block-input, .block-target {
                    background: rgba(0,0,0,0.25);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: white;
                    font-size: 10px;
                    border-radius: 3px;
                    padding: 1px 4px;
                    outline: none;
                }
            `;
            document.head.appendChild(style);
        }
    }

    create() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.background = 'var(--bg-primary)';

        const workspace = document.createElement('div');
        workspace.id = 'block-workspace';
        workspace.style.flex = '1';
        workspace.style.padding = '30px';
        workspace.style.overflow = 'auto';
        workspace.style.position = 'relative';
        workspace.style.backgroundImage = 'radial-gradient(var(--border-color) 1px, transparent 1px)';
        workspace.style.backgroundSize = '20px 20px';

        const toolbar = document.createElement('div');
        toolbar.innerHTML = `
            <div style="position: absolute; top: 15px; right: 20px; display: flex; gap: 10px; z-index: 1000;">
                <button id="block-btn-run" style="background: var(--text-accent); color: white; border: none; padding: 6px 20px; border-radius: 20px; cursor: pointer; font-size: 11px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">▶ Run Blocks</button>
            </div>
        `;
        workspace.appendChild(toolbar);

        const placeholder = document.createElement('div');
        placeholder.id = 'block-placeholder';
        placeholder.innerHTML = `
            <div style="text-align: center; color: var(--text-dim); margin-top: 100px; pointer-events: none; user-select: none;">
                <div style="font-size: 40px; margin-bottom: 10px;">🛡️</div>
                <div style="font-size: 14px;">Drag and stack blocks.</div>
                <div style="font-size: 10px; margin-top: 5px; opacity: 0.6;">Blocks automatically expand to match the widest in the stack.</div>
            </div>
        `;
        workspace.appendChild(placeholder);

        container.appendChild(workspace);
        this.engine.tabManager.openTab('Visual Blocks', 'oviblock', container);
        this.setupInteractions(workspace, placeholder);
        this.workspace = workspace;
    }

    setupInteractions(workspace, placeholder) {
        workspace.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = this.draggedInternalBlock ? 'move' : 'copy';
        };

        workspace.ondrop = (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('blockType');
            const isNew = e.dataTransfer.getData('isNew') === 'true';

            if (type) {
                if (placeholder.parentNode) placeholder.remove();
                const rect = workspace.getBoundingClientRect();
                const x = e.clientX - rect.left + workspace.scrollLeft;
                const y = e.clientY - rect.top + workspace.scrollTop;

                if (isNew) {
                    this.addBlock(type, workspace, x, y);
                } else if (this.draggedInternalBlock) {
                    this.draggedInternalBlock.style.position = 'absolute';
                    this.draggedInternalBlock.style.left = `${x}px`;
                    this.draggedInternalBlock.style.top = `${y}px`;
                    this.draggedInternalBlock.style.margin = '0';
                    workspace.appendChild(this.draggedInternalBlock);
                }
            }
            this.draggedInternalBlock = null;
        };

        document.getElementById('block-btn-run').onclick = () => this.runBlocks();
    }

    addBlock(type, container, x = 0, y = 0) {
        const block = document.createElement('div');
        block.className = 'logic-block';
        block.dataset.type = type;
        block.setAttribute('draggable', 'true');

        const blockDef = {
            forever: { cat: 'control', shape: 'action' },
            if_else: { cat: 'control', shape: 'action' },
            wait: { cat: 'control', shape: 'action' },
            move_to: { cat: 'motion', shape: 'action' },
            rotate: { cat: 'motion', shape: 'action' },
            scale_pulse: { cat: 'motion', shape: 'action' },
            color_cycle: { cat: 'looks', shape: 'action' },
            opacity: { cat: 'looks', shape: 'action' },
            visibility: { cat: 'looks', shape: 'action' },
            compare: { cat: 'operator', shape: 'boolean' },
            touching: { cat: 'sensing', shape: 'boolean' },
            math: { cat: 'operator', shape: 'reporter' },
            random: { cat: 'operator', shape: 'reporter' },
            distance: { cat: 'sensing', shape: 'reporter' },
            prop: { cat: 'sensing', shape: 'reporter' }
        };

        const def = blockDef[type] || { cat: 'looks', shape: 'action' };
        block.dataset.shape = def.shape;

        const colors = {
            control: { bg: '#e69138', border: '#b45f06' },
            motion: { bg: '#4C97FF', border: '#3373CC' },
            operator: { bg: '#59C059', border: '#389438' },
            sensing: { bg: '#2CA5E2', border: '#1C8BC1' },
            looks: { bg: '#9966FF', border: '#774DCB' }
        };

        // Positioning
        if (container.id === 'block-workspace') {
            block.style.position = 'absolute';
            block.style.left = `${x}px`;
            block.style.top = `${y}px`;
        } else {
            block.style.position = 'relative';
        }

        const body = document.createElement('div');
        body.className = `block-body block-shape-${def.shape}`;
        body.style.background = colors[def.cat].bg;
        if (def.shape === 'action') body.style.borderLeft = `6px solid ${colors[def.cat].border}`;
        else body.style.border = `1px solid ${colors[def.cat].border}`;
        block.appendChild(body);

        const content = document.createElement('div');
        content.className = 'block-content';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.width = '100%';
        body.appendChild(content);

        const entities = SceneRegistry.getAllEntities();
        let entityOptions = `<option value="">-- Target --</option>`;
        entities.forEach(ent => entityOptions += `<option value="${ent.id}">${ent.name}</option>`);

        if (type === 'forever') {
            content.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px;">Forever</div>
                <div class="block-slot" data-slot-type="action" style="min-height: 40px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch;"></div>
            `;
            this.setupSlotInteractions(content.querySelector('.block-slot'));
        } else if (type === 'if_else') {
            content.innerHTML = `
                <div style="display: flex; align-items: center; font-weight: 600; margin-bottom: 4px;">
                    If 
                    <div class="block-slot slot-hex" data-slot-type="boolean" style="min-width: 40px; height: 20px; margin: 0 6px;"></div>
                    then
                </div>
                <div class="block-slot" data-slot-type="action" style="min-height: 30px; margin-bottom: 4px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch;"></div>
                <div style="font-weight: 600; margin-bottom: 4px;">Else</div>
                <div class="block-slot" data-slot-type="action" style="min-height: 30px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: stretch;"></div>
            `;
            content.querySelectorAll('.block-slot').forEach(slot => this.setupSlotInteractions(slot));
        } else if (type === 'wait') {
            content.innerHTML = `<div style="display: flex; align-items: center;">Wait <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 30px; margin: 0 6px;"></div> sec</div>`;
            this.setupSlotInteractions(content.querySelector('.block-slot'));
        } else if (type === 'compare') {
            content.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 20px;"></div>
                    <select class="block-input" style="margin: 0 4px; background: transparent; color: white; border: none;"><option>=</option><option>&gt;</option><option>&lt;</option></select>
                    <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 20px;"></div>
                </div>
            `;
            content.querySelectorAll('.block-slot').forEach(slot => this.setupSlotInteractions(slot));
        } else if (type === 'math') {
            content.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 20px;"></div>
                    <select class="block-input" style="margin: 0 4px; background: transparent; color: white; border: none;"><option>+</option><option>-</option><option>*</option><option>/</option></select>
                    <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 20px;"></div>
                </div>
            `;
            content.querySelectorAll('.block-slot').forEach(slot => this.setupSlotInteractions(slot));
        } else if (type === 'rotate') {
            content.innerHTML = `
                <div style="display: flex; align-items: center; width: 100%;">
                    <span>Rotate</span>
                    <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 25px; margin: 0 6px;"></div>
                    <span>deg</span>
                    <select class="block-target" style="margin-left: auto;">${entityOptions}</select>
                </div>`;
            this.setupSlotInteractions(content.querySelector('.block-slot'));
        } else if (type === 'move_to') {
            content.innerHTML = `
                <div style="display: flex; align-items: center; width: 100%;">
                    <span>Move X</span>
                    <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 25px; margin: 0 4px;"></div>
                    <span>Y</span>
                    <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 25px; margin: 0 4px;"></div>
                    <select class="block-target" style="margin-left: auto;">${entityOptions}</select>
                </div>`;
            content.querySelectorAll('.block-slot').forEach(slot => this.setupSlotInteractions(slot));
        } else if (type === 'opacity') {
            content.innerHTML = `
                <div style="display: flex; align-items: center; width: 100%;">
                    <span>Opacity</span>
                    <div class="block-slot slot-pill" data-slot-type="value" style="min-width: 25px; margin: 0 6px;"></div>
                    <select class="block-target" style="margin-left: auto;">${entityOptions}</select>
                </div>`;
            this.setupSlotInteractions(content.querySelector('.block-slot'));
        } else {
            let label = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            content.innerHTML = `<div style="display: flex; align-items: center; width: 100%;"><span>${label}</span> <select class="block-target" style="margin-left: auto;">${entityOptions}</select></div>`;
        }

        if (def.shape === 'action') {
            const nextSlot = document.createElement('div');
            nextSlot.className = 'block-slot next-slot';
            nextSlot.dataset.slotType = 'action';
            block.appendChild(nextSlot);
            this.setupSlotInteractions(nextSlot);

            body.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
                block.classList.add('stack-hover');
                e.dataTransfer.dropEffect = this.draggedInternalBlock ? 'move' : 'copy';
            };
            body.ondragleave = () => block.classList.remove('stack-hover');
            body.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                block.classList.remove('stack-hover');
                const draggedType = e.dataTransfer.getData('blockType');
                if (!['boolean', 'value'].includes(draggedType)) {
                    this.handleSlotDrop(nextSlot, e);
                }
            };
        }

        block.ondragstart = (e) => {
            e.stopPropagation();
            e.dataTransfer.setData('blockType', type);
            e.dataTransfer.setData('isNew', 'false');
            this.draggedInternalBlock = block;
            block.style.opacity = '0.5';
        };
        block.ondragend = () => block.style.opacity = '1';

        container.appendChild(block);
        return block;
    }

    setupSlotInteractions(slot) {
        slot.ondragover = (e) => {
            e.preventDefault();
            e.stopPropagation();
            slot.classList.add('drag-over');
            e.dataTransfer.dropEffect = this.draggedInternalBlock ? 'move' : 'copy';
        };
        slot.ondragleave = () => slot.classList.remove('drag-over');
        slot.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleSlotDrop(slot, e);
        };
    }

    handleSlotDrop(slot, e) {
        slot.classList.remove('drag-over');
        const type = e.dataTransfer.getData('blockType');
        const isNew = e.dataTransfer.getData('isNew') === 'true';

        if (!isNew && this.draggedInternalBlock && this.draggedInternalBlock.contains(slot)) {
            return;
        }

        if (isNew) {
            this.addBlock(type, slot);
        } else if (this.draggedInternalBlock) {
            this.draggedInternalBlock.style.position = 'relative';
            this.draggedInternalBlock.style.left = '';
            this.draggedInternalBlock.style.top = '';
            this.draggedInternalBlock.style.margin = '0';
            slot.appendChild(this.draggedInternalBlock);
        }
        this.draggedInternalBlock = null;
    }

    compile() {
        let js = "onUpdate: function(dt, objects, brim) {\n";
        js += "    try {\n";
        const rootBlocks = Array.from(this.workspace.children).filter(n => n.classList.contains('logic-block'));
        rootBlocks.forEach(node => {
            js += this.compileSequence(node, "        ");
        });
        js += "    } catch(err) { console.error('OviBlock Error:', err); }\n";
        js += "}\n";
        return js;
    }

    compileSequence(node, indent) {
        let code = "";
        let current = node;
        while (current) {
            code += this.compileNode(current, indent);
            const nextSlot = current.querySelector(':scope > .next-slot');
            current = (nextSlot && nextSlot.children.length > 0) ? nextSlot.children[0] : null;
        }
        return code;
    }

    compileNodeList(nodes, indent) {
        let code = "";
        Array.from(nodes).forEach(node => {
            code += this.compileSequence(node, indent);
        });
        return code;
    }

    compileNode(node, indent) {
        const type = node.dataset.type;
        const uid = 'b' + Math.floor(Math.random() * 1000000);
        let code = "";

        if (type === 'if_else') {
            const conditionSlot = node.querySelector('.slot-hex');
            const conditionCode = (conditionSlot && conditionSlot.children.length > 0) ? this.compileExpression(conditionSlot.children[0]) : "true";
            code += `${indent}if (${conditionCode}) {\n`;
            const slots = node.querySelectorAll('.block-body > .block-content > .block-slot[data-slot-type="action"]');
            code += this.compileNodeList(slots[0].children, indent + "    ");
            code += `${indent}} else {\n`;
            code += this.compileNodeList(slots[1].children, indent + "    ");
            code += `${indent}}\n`;
            return code;
        }

        if (type === 'wait') {
            const slot = node.querySelector('.block-slot');
            const waitTime = (slot && slot.children.length > 0) ? this.compileExpression(slot.children[0]) : 1;
            code += `${indent}if (obj) { if(!obj._wait_${uid}) obj._wait_${uid} = 0; obj._wait_${uid} += dt; if(obj._wait_${uid} < ${waitTime}) return; else obj._wait_${uid} = 0; }\n`;
            return code;
        }

        const targetId = node.querySelector('.block-target')?.value;
        const prefix = targetId ? `var obj_${uid} = objects.find(o => o.id === "${targetId}"); if(obj_${uid}) { (function(obj) { ` : `objects.forEach(function(obj) { `;
        const suffix = ` })(obj_${uid}); }`;

        if (type === 'rotate') {
            const slot = node.querySelector('.block-slot');
            const val = (slot && slot.children.length > 0) ? this.compileExpression(slot.children[0]) : "15";
            code += `${indent}${prefix} obj.rotation += (${val}) * dt; ${suffix}\n`;
        } else if (type === 'move_to') {
            const slots = node.querySelectorAll('.block-slot');
            const valX = (slots[0] && slots[0].children.length > 0) ? this.compileExpression(slots[0].children[0]) : "400";
            const valY = (slots[1] && slots[1].children.length > 0) ? this.compileExpression(slots[1].children[0]) : "300";
            code += `${indent}${prefix} obj.x += (${valX} - obj.x) * 0.1; obj.y += (${valY} - obj.y) * 0.1; ${suffix}\n`;
        } else if (type === 'scale_pulse') {
            code += `${indent}${prefix} obj.scale = 1 + Math.sin(Date.now() * 0.01) * 0.2; ${suffix}\n`;
        } else if (type === 'color_cycle') {
            code += `${indent}${prefix} obj.fill = 'hsl(' + (Date.now()/10)%360 + ', 70%, 50%)'; ${suffix}\n`;
        } else if (type === 'visibility') {
            code += `${indent}${prefix} obj.opacity = (Math.sin(Date.now() * 0.01) > 0) ? 1 : 0; ${suffix}\n`;
        } else if (type === 'opacity') {
            const slot = node.querySelector('.block-slot');
            const val = (slot && slot.children.length > 0) ? this.compileExpression(slot.children[0]) : "0.5";
            code += `${indent}${prefix} obj.opacity = ${val}; ${suffix}\n`;
        }

        return code;
    }

    compileExpression(node) {
        const type = node.dataset.type;
        if (type === 'compare') {
            const slots = node.querySelectorAll('.block-slot');
            const op = node.querySelector('select').value;
            const a = slots[0].children.length > 0 ? this.compileExpression(slots[0].children[0]) : "0";
            const b = slots[1].children.length > 0 ? this.compileExpression(slots[1].children[0]) : "0";
            return `(${a} ${op === '=' ? '===' : op} ${b})`;
        } else if (type === 'math') {
            const slots = node.querySelectorAll('.block-slot');
            const op = node.querySelector('select').value;
            const a = slots[0].children.length > 0 ? this.compileExpression(slots[0].children[0]) : "0";
            const b = slots[1].children.length > 0 ? this.compileExpression(slots[1].children[0]) : "0";
            return `(${a} ${op} ${b})`;
        } else if (type === 'random') {
            return `(Math.random() * 10)`;
        } else if (type === 'distance') {
            const targetId = node.querySelector('.block-target').value;
            return `(function(){ var target = objects.find(o => o.id === "${targetId}"); return target ? Math.sqrt(Math.pow(obj.x-target.x, 2) + Math.pow(obj.y-target.y, 2)) : 999; })()`;
        } else if (type === 'prop') {
            const prop = node.querySelector('.block-input').value;
            const targetId = node.querySelector('.block-target').value;
            return `(function(){ var target = objects.find(o => o.id === "${targetId}"); return target ? target.${prop} : (obj ? obj.${prop} : 0); })()`;
        } else if (type === 'touching') {
            const targetId = node.querySelector('.block-target').value;
            return `(function(){ var target = objects.find(o => o.id === "${targetId}"); return target ? (Math.sqrt(Math.pow(obj.x-target.x, 2) + Math.pow(obj.y-target.y, 2)) < 50) : false; })()`;
        }
        return "0";
    }

    runBlocks() {
        const code = this.compile();
        const oviStatePlugin = this.engine.pluginManager.plugins.get('ovistate');
        if (oviStatePlugin && oviStatePlugin.activeEditor && oviStatePlugin.activeEditor.runtime) {
            oviStatePlugin.activeEditor.runtime.setGlobalScript("{\n" + code + "\n}");
        }
    }
}
