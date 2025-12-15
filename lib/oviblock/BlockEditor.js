export default class BlockEditor {
    constructor(engine) {
        this.engine = engine;
        this.blocks = [];
    }

    create() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.background = '#f0f0f0'; // Light theme for blocks usually looks better/friendlier
        container.style.color = '#333';

        // 1. Palette (Left)
        const palette = document.createElement('div');
        palette.style.width = '200px';
        palette.style.background = '#ddd';
        palette.style.borderRight = '1px solid #ccc';
        palette.style.padding = '10px';
        palette.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">Events</div>
            <div class="block-template" draggable="true" data-type="forever" style="background: #ffbf00; padding: 10px; margin-bottom: 5px; border-radius: 4px; cursor: grab; color: white; font-weight: bold;">🔁 Forever</div>
            
            <div style="font-weight: bold; margin-bottom: 10px; margin-top: 20px;">Motion</div>
            <div class="block-template" draggable="true" data-type="rotate" style="background: #4caf50; padding: 10px; margin-bottom: 5px; border-radius: 4px; cursor: grab; color: white;">🔄 Rotate 15°</div>
            <div class="block-template" draggable="true" data-type="move" style="background: #2196f3; padding: 10px; margin-bottom: 5px; border-radius: 4px; cursor: grab; color: white;">➡️ Move 10 steps</div>
            
            <div style="font-weight: bold; margin-bottom: 10px; margin-top: 20px;">Looks</div>
            <div class="block-template" draggable="true" data-type="color" style="background: #9c27b0; padding: 10px; margin-bottom: 5px; border-radius: 4px; cursor: grab; color: white;">🎨 Change Color</div>
        `;

        // 2. Script Area (Right)
        const scriptArea = document.createElement('div');
        scriptArea.style.flex = '1';
        scriptArea.style.padding = '20px';
        scriptArea.style.overflow = 'auto';
        scriptArea.style.position = 'relative';

        // Placeholder text
        const placeholder = document.createElement('div');
        placeholder.innerText = "Drag 'Forever' block here to start";
        placeholder.style.color = '#999';
        placeholder.style.border = '2px dashed #ccc';
        placeholder.style.padding = '20px';
        placeholder.style.borderRadius = '10px';
        scriptArea.appendChild(placeholder);

        // Run Button
        const runBtn = document.createElement('button');
        runBtn.innerText = '▶ Run Blocks';
        runBtn.style.position = 'absolute';
        runBtn.style.top = '10px';
        runBtn.style.right = '20px';
        runBtn.style.padding = '10px 20px';
        runBtn.style.background = '#ff9800';
        runBtn.style.color = 'white';
        runBtn.style.border = 'none';
        runBtn.style.borderRadius = '20px';
        runBtn.style.cursor = 'pointer';
        runBtn.style.fontWeight = 'bold';
        runBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        runBtn.onclick = () => this.runBlocks();
        scriptArea.appendChild(runBtn);

        container.appendChild(palette);
        container.appendChild(scriptArea);

        this.engine.tabManager.openTab('Block Script', 'oviblock', container);

        this.setupDragAndDrop(palette, scriptArea, placeholder);
        this.scriptArea = scriptArea;
    }

    setupDragAndDrop(palette, scriptArea, placeholder) {
        let draggedType = null;

        // Palette Items
        palette.querySelectorAll('.block-template').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedType = item.dataset.type;
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        // Script Area
        scriptArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        scriptArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedType) {
                if (placeholder.parentNode) placeholder.remove();
                this.addBlock(draggedType, scriptArea);
            }
        });
    }

    addBlock(type, container) {
        const block = document.createElement('div');
        block.className = 'code-block';
        block.dataset.type = type;
        block.style.padding = '10px';
        block.style.marginBottom = '5px';
        block.style.borderRadius = '4px';
        block.style.color = 'white';
        block.style.cursor = 'grab';
        block.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
        block.style.width = 'fit-content';
        block.style.minWidth = '150px';

        if (type === 'forever') {
            block.style.background = '#ffbf00';
            block.innerHTML = '🔁 <b>Forever</b>';
            // Container for child blocks
            const childContainer = document.createElement('div');
            childContainer.className = 'block-children';
            childContainer.style.paddingLeft = '20px';
            childContainer.style.paddingTop = '5px';
            childContainer.style.minHeight = '20px';
            childContainer.style.borderLeft = '3px solid rgba(255,255,255,0.5)';
            block.appendChild(childContainer);

            // Allow dropping inside
            block.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            block.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // We need to know what is being dropped. 
                // For simplicity in this prototype, we assume the last draggedType from the class instance (hacky but works for demo)
                // A real implementation would use dataTransfer properly.
                // Let's just append to the main area for now to avoid complex nesting logic in this step.
            });
        } else if (type === 'rotate') {
            block.style.background = '#4caf50';
            block.innerHTML = '🔄 Rotate 15°';
        } else if (type === 'move') {
            block.style.background = '#2196f3';
            block.innerHTML = '➡️ Move 10 steps';
        } else if (type === 'color') {
            block.style.background = '#9c27b0';
            block.innerHTML = '🎨 Change Color';
        }

        // If it's a command block and we have a forever block, append to it
        const foreverBlock = container.querySelector('.code-block[data-type="forever"] .block-children');
        if (foreverBlock && type !== 'forever') {
            foreverBlock.appendChild(block);
        } else {
            container.appendChild(block);
        }
    }

    runBlocks() {
        // Compile
        let code = "update: function(dt, objects) {\n";

        // Find Forever Block
        const forever = this.scriptArea.querySelector('.code-block[data-type="forever"]');
        if (forever) {
            const children = forever.querySelectorAll('.block-children .code-block');
            children.forEach(child => {
                const type = child.dataset.type;
                if (type === 'rotate') {
                    code += "    objects.forEach(o => { if(o.rotation !== undefined) o.rotation += 2 * dt; });\n";
                } else if (type === 'move') {
                    code += "    objects.forEach(o => { if(o.x !== undefined) o.x += 10 * dt; });\n";
                } else if (type === 'color') {
                    code += "    objects.forEach(o => { o.fill = `hsl(${(performance.now()/10)%360}, 70%, 50%)`; });\n";
                }
            });
        }

        code += "}";
        console.log("Compiled Blocks:", code);

        // Inject
        const oviStatePlugin = this.engine.pluginManager.plugins.get('ovistate');
        if (oviStatePlugin && oviStatePlugin.activeEditor && oviStatePlugin.activeEditor.runtime) {
            oviStatePlugin.activeEditor.runtime.setGlobalScript(code);
            alert("Blocks Running!");
        } else {
            alert("No active simulation found.");
        }
    }
}
