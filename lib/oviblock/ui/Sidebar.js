import BlockEditor from '../BlockEditor.js';

export default class Sidebar {
    static render(engine, pluginInstance) {
        engine.layoutManager.setSidebarContent(`
            <div style="padding: 10px; height: 100%; overflow-y: auto;">
                <!-- New Script Button -->
                <div style="padding: 5px; margin-bottom: 20px;">
                    <button id="oviblock-new-btn" style="
                        width: 100%; padding: 10px; background: var(--text-accent); 
                        color: white; border: none; border-radius: 4px; cursor: pointer;
                        font-weight: bold; font-size: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                    ">New Block Script</button>
                </div>

                <div style="padding: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 13px; color: var(--text-accent); letter-spacing: 0.5px;">BLOCK PALETTE</div>
                    <div style="font-size: 10px; color: var(--text-dim); margin-top: 3px;">Shapes define how blocks connect.</div>
                </div>
                
                <!-- ACTION BLOCKS Group -->
                <div style="padding: 10px 10px 5px 10px; font-size: 10px; font-weight: bold; color: var(--text-accent); text-transform: uppercase; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 10px;">
                    ⚡ Action Blocks
                </div>
                <div style="font-size: 9px; color: var(--text-dim); margin-bottom: 10px; padding: 0 10px;">Stack these vertically.</div>

                <div class="palette-group" style="padding: 0 10px;">
                    <!-- Control -->
                    <div class="block-template" draggable="true" data-type="forever" style="margin-bottom: 15px; cursor: grab; color: white;">
                        <div class="block-body block-shape-action" style="background: #FFAB19; border-left: 6px solid #CF8B17;">
                            <div class="block-content" style="font-weight: bold; font-size: 11px;">🔁 Forever</div>
                        </div>
                    </div>
                    <div class="block-template" draggable="true" data-type="if_else" style="margin-bottom: 15px; cursor: grab; color: white;">
                        <div class="block-body block-shape-action" style="background: #FFAB19; border-left: 6px solid #CF8B17;">
                            <div class="block-content" style="font-weight: bold; font-size: 11px;">❓ If / Else</div>
                        </div>
                    </div>
                    <div class="block-template" draggable="true" data-type="wait" style="margin-bottom: 15px; cursor: grab; color: white;">
                        <div class="block-body block-shape-action" style="background: #FFAB19; border-left: 6px solid #CF8B17;">
                            <div class="block-content" style="display: flex; align-items: center; font-weight: bold; font-size: 11px;">
                                ⌛ Wait <div style="width: 20px; height: 10px; background: rgba(0,0,0,0.2); border-radius: 10px; margin: 0 4px;"></div> Sec
                            </div>
                        </div>
                    </div>
                    
                    <!-- Motion -->
                    <div class="block-template" draggable="true" data-type="move_to" style="margin-bottom: 15px; cursor: grab; color: white;">
                        <div class="block-body block-shape-action" style="background: #4C97FF; border-left: 6px solid #3373CC;">
                            <div class="block-content" style="display: flex; align-items: center; font-size: 11px;">
                                📍 Move X:<div style="width: 15px; height: 10px; background: rgba(0,0,0,0.2); border-radius: 10px; margin: 0 2px;"></div> Y:<div style="width: 15px; height: 10px; background: rgba(0,0,0,0.2); border-radius: 10px; margin: 0 2px;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="block-template" draggable="true" data-type="rotate" style="margin-bottom: 15px; cursor: grab; color: white;">
                        <div class="block-body block-shape-action" style="background: #4C97FF; border-left: 6px solid #3373CC;">
                            <div class="block-content" style="display: flex; align-items: center; font-size: 11px;">
                                🔄 Rotate <div style="width: 20px; height: 10px; background: rgba(0,0,0,0.2); border-radius: 10px; margin: 0 4px;"></div> °
                            </div>
                        </div>
                    </div>
                </div>

                <!-- REPORTER BLOCKS Group -->
                <div style="padding: 15px 10px 5px 10px; font-size: 10px; font-weight: bold; color: #59C059; text-transform: uppercase; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 10px;">
                    🧩 Reporter Blocks
                </div>
                <div style="font-size: 9px; color: var(--text-dim); margin-bottom: 10px; padding: 0 10px;">Drop these into circular or hex slots.</div>

                <div class="palette-group" style="padding: 0 10px; display: flex; flex-wrap: wrap; gap: 8px;">
                    <!-- Boolean -->
                    <div class="block-template" draggable="true" data-type="touching" style="cursor: grab; color: white;">
                         <div class="block-body block-shape-boolean" style="background: #2CA5E2; border: 1px solid #1C8BC1;">
                            <div class="block-content" style="font-size: 10px;">🤝 Touching?</div>
                         </div>
                    </div>
                    <div class="block-template" draggable="true" data-type="compare" style="cursor: grab; color: white;">
                         <div class="block-body block-shape-boolean" style="background: #59C059; border: 1px solid #389438;">
                            <div class="block-content" style="font-size: 10px;">⚖️ [A] = [B]</div>
                         </div>
                    </div>
                    
                    <!-- Value -->
                    <div class="block-template" draggable="true" data-type="math" style="cursor: grab; color: white;">
                         <div class="block-body block-shape-reporter" style="background: #59C059; border: 1px solid #389438;">
                            <div class="block-content" style="font-size: 10px;">➕ Math</div>
                         </div>
                    </div>
                    <div class="block-template" draggable="true" data-type="random" style="cursor: grab; color: white;">
                         <div class="block-body block-shape-reporter" style="background: #59C059; border: 1px solid #389438;">
                            <div class="block-content" style="font-size: 10px;">🎲 Random</div>
                         </div>
                    </div>
                    <div class="block-template" draggable="true" data-type="distance" style="cursor: grab; color: white;">
                         <div class="block-body block-shape-reporter" style="background: #2CA5E2; border: 1px solid #1C8BC1;">
                            <div class="block-content" style="font-size: 10px;">📏 Distance</div>
                         </div>
                    </div>
                    <div class="block-template" draggable="true" data-type="prop" style="cursor: grab; color: white;">
                         <div class="block-body block-shape-reporter" style="background: #2CA5E2; border: 1px solid #1C8BC1;">
                            <div class="block-content" style="font-size: 10px;">🏷️ Property</div>
                         </div>
                    </div>
                </div>
                
                <div style="margin-top: 30px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 10px; color: var(--text-dim); line-height: 1.4;">
                    <b>💡 Pro-Tip:</b><br>
                    - Block top <b>hole</b> and bottom <b>bump</b> show where Action blocks fit.<br>
                    - Round/Hex reporters only fit in matching input slots.
                </div>
            </div>
        `);

        // Bind Events
        setTimeout(() => {
            const newBtn = document.getElementById('oviblock-new-btn');
            if (newBtn) {
                newBtn.onclick = () => {
                    pluginInstance.activeEditor = new BlockEditor(engine);
                    pluginInstance.activeEditor.create();
                };
            }

            const templates = document.querySelectorAll('.block-template');
            templates.forEach(el => {
                el.ondragstart = (e) => {
                    e.dataTransfer.setData('blockType', el.dataset.type);
                    e.dataTransfer.setData('isNew', 'true');
                    e.dataTransfer.effectAllowed = 'copy';
                };
            });
        }, 0);
    }
}
