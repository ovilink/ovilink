export default class Sidebar {
    static render(engine, pluginInstance) {
        engine.layoutManager.setSidebarContent(`
            <div style="padding: 10px;">
                <button id="ovigraph-new-btn" style="
                    width: 100%; 
                    padding: 8px; 
                    background: var(--bg-active); 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer;
                    margin-bottom: 15px;
                ">New Workflow</button>

                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Logic Nodes</div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div class="draggable-node" draggable="true" data-type="event_update" style="padding: 5px; background: #9c27b0; color: white; border-radius: 4px; cursor: grab;">⚡ On Update</div>
                    <div class="draggable-node" draggable="true" data-type="action_rotate" style="padding: 5px; background: #2196f3; color: white; border-radius: 4px; cursor: grab;">🔄 Rotate Object</div>
                    <div class="draggable-node" draggable="true" data-type="action_color" style="padding: 5px; background: #e91e63; color: white; border-radius: 4px; cursor: grab;">🎨 Set Color</div>
                </div>
                
                <div style="margin-top: 20px; font-size: 11px; color: var(--text-secondary);">
                    Tip: Drag nodes to canvas. Alt+Drag to pan.
                </div>
            </div>
        `);

        // Bind Events
        setTimeout(() => {
            const btn = document.getElementById('ovigraph-new-btn');
            if (btn) {
                btn.onclick = () => {
                    pluginInstance.createNewWorkflow(engine);
                };
            }

            // Setup Drag Events for Palette Items
            const draggables = document.querySelectorAll('.draggable-node');
            draggables.forEach(el => {
                el.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('nodeType', el.getAttribute('data-type'));
                    e.dataTransfer.setData('nodeLabel', el.textContent);
                    e.dataTransfer.effectAllowed = 'copy';
                });
            });
        }, 0);
    }
}
