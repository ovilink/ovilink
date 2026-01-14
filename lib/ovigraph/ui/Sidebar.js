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
                    <div class="draggable-node" draggable="true" data-type="action_move" style="padding: 5px; background: #03a9f4; color: white; border-radius: 4px; cursor: grab;">🏃 Move Object</div>
                    <div class="draggable-node" draggable="true" data-type="action_scale" style="padding: 5px; background: #ff5722; color: white; border-radius: 4px; cursor: grab;">📈 Scale Effect</div>
                    <div class="draggable-node" draggable="true" data-type="action_opacity" style="padding: 5px; background: #607d8b; color: white; border-radius: 4px; cursor: grab;">👻 Fade Opacity</div>
                    <div class="draggable-node" draggable="true" data-type="action_visibility" style="padding: 5px; background: #795548; color: white; border-radius: 4px; cursor: grab;">👁️ Set Visibility</div>
                    <div class="draggable-node" draggable="true" data-type="action_move_to" style="padding: 5px; background: #3f51b5; color: white; border-radius: 4px; cursor: grab;">📍 Move To (XY)</div>
                    <div class="draggable-node" draggable="true" data-type="action_shake" style="padding: 5px; background: #ffc107; color: black; border-radius: 4px; cursor: grab;">📳 Shake Effect</div>
                    <div class="draggable-node" draggable="true" data-type="action_color" style="padding: 5px; background: #e91e63; color: white; border-radius: 4px; cursor: grab;">🎨 Set Color</div>
                </div>

                <div style="margin-top: 20px; margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Flow Control</div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div class="draggable-node" draggable="true" data-type="flow_delay" style="padding: 5px; background: #444; color: white; border-radius: 4px; cursor: grab;">⌛ Delay (Seconds)</div>
                </div>

                <div style="margin-top: 20px; margin-bottom: 10px; font-weight: bold; color: var(--text-accent);">Brimtale Logic</div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div class="draggable-node" draggable="true" data-type="brim_choice" style="padding: 5px; background: #673ab7; color: white; border-radius: 4px; cursor: grab;">🔘 Choice Node</div>
                    <div class="draggable-node" draggable="true" data-type="brim_fill_dna" style="padding: 5px; background: #4caf50; color: white; border-radius: 4px; cursor: grab;">🧬 Fill DNA</div>
                    <div class="draggable-node" draggable="true" data-type="brim_tale_pop" style="padding: 5px; background: #ff9800; color: white; border-radius: 4px; cursor: grab;">💬 Tale Pop</div>
                    <div class="draggable-node" draggable="true" data-type="brim_rewind" style="padding: 5px; background: #3f51b5; color: white; border-radius: 4px; cursor: grab;">⏳ Time Rewind</div>
                </div>
                
                <div style="margin-top: 20px; font-size: 11px; color: var(--text-secondary);">
                    Tip: Drag nodes to canvas. Connect nodes to define flow.
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
