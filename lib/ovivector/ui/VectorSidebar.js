export default class VectorSidebar {
    static render(engine, editorInstance) {
        engine.layoutManager.setSidebarContent(`
            <style>
                .sidebar-section {
                    margin-bottom: 20px;
                }
                .sidebar-section h3 {
                    font-size: 11px;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                    padding-bottom: 4px;
                    border-bottom: 1px solid var(--border-color);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                }
                /* Toolbar Grid Layout */
                .vector-tools-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 4px;
                }
                .tool-btn {
                    width: 100%;
                    aspect-ratio: 1;
                    padding: 6px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .tool-btn:hover {
                    background: var(--bg-hover);
                    border-color: var(--accent-primary);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    z-index: 10;
                }
                .tool-btn.active {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
                }
                .tool-btn img {
                    width: 20px;
                    height: 20px;
                    pointer-events: none;
                    filter: grayscale(100%) opacity(0.8);
                    transition: all 0.2s;
                }
                .tool-btn:hover img, .tool-btn.active img {
                    filter: brightness(0) invert(1);
                    transform: scale(1.1);
                }
                
                /* Tooltip implementation (simple) */
                .tool-btn::after {
                    content: attr(title);
                    position: absolute;
                    left: 50%;
                    bottom: 115%;
                    transform: translateX(-50%);
                    background: #222;
                    color: #fff;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 11px;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s, transform 0.2s;
                    z-index: 100;
                    display: none;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                /* Diamond arrow */
                .tool-btn::before {
                    content: "";
                    position: absolute;
                    left: 50%;
                    bottom: 108%;
                    transform: translateX(-50%) rotate(45deg);
                    width: 8px;
                    height: 8px;
                    background: #222;
                    border-right: 1px solid rgba(255,255,255,0.1);
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s;
                    z-index: 99;
                    display: none;
                }
                .tool-btn:hover::after, .tool-btn:hover::before {
                    display: block;
                    opacity: 1;
                }
                .tool-btn:hover::after {
                    transform: translateX(-50%) translateY(-2px);
                }
            </style>

            <div class="sidebar-section">
                <h3>Select</h3>
                <div class="vector-tools-grid">
                    <div class="tool-btn active" data-tool="select" title="Selection Tool (V)" id="tool-select">
                        <img src="icon/select.svg" alt="Select">
                    </div>
                    <div class="tool-btn" data-tool="direct_select" title="Direct Selection (A)" id="tool-direct_select">
                        <img src="icon/direct_select.svg" alt="Direct">
                    </div>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>Draw</h3>
                <div class="vector-tools-grid">
                    <div class="tool-btn" data-tool="pen" title="Pen Tool (P)" id="tool-pen">
                        <img src="icon/pen.svg" alt="Pen">
                    </div>
                    <div class="tool-btn" data-tool="text" title="Type Tool (T)" id="tool-text">
                        <img src="icon/text.svg" alt="Text">
                    </div>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>Shapes</h3>
                <div class="vector-tools-grid">
                    <div class="tool-btn" data-tool="rect" title="Rectangle Tool (M)" id="tool-rect">
                        <img src="icon/Rectangle.svg" alt="Rect">
                    </div>
                    <div class="tool-btn" data-tool="circle" title="Ellipse Tool (L)" id="tool-circle">
                        <img src="icon/circle.svg" alt="Circle">
                    </div>
                    <div class="tool-btn" data-tool="star" title="Star Tool" id="tool-star">
                        <img src="icon/star.svg" alt="Star">
                    </div>
                    <div class="tool-btn" data-tool="polygon" title="Polygon Tool" id="tool-polygon">
                        <img src="icon/polygon.svg" alt="Poly">
                    </div>
                    <div class="tool-btn" data-tool="gear" title="Gear Tool" id="tool-gear">
                        <img src="icon/gear.svg" alt="Gear">
                    </div>
                     <div class="tool-btn" data-tool="arrow" title="Arrow Tool" id="tool-arrow">
                        <img src="icon/arrow.svg" alt="Arrow">
                    </div>
                     <div class="tool-btn" data-tool="pie" title="Pie/Donut Tool" id="tool-pie">
                        <img src="icon/pie.svg" alt="Pie">
                    </div>
                     <div class="tool-btn" data-tool="flower" title="Flower Tool" id="tool-flower">
                        <img src="icon/flower.svg" alt="Flower">
                    </div>
                     <div class="tool-btn" data-tool="cross" title="Radial Cross Tool" id="tool-cross">
                        <img src="icon/radial_cross.svg" alt="Cross">
                    </div>
                     <div class="tool-btn" data-tool="crescent" title="Crescent Tool" id="tool-crescent">
                        <img src="icon/crescent.svg" alt="Moon">
                    </div>
                     <div class="tool-btn" data-tool="heart" title="Heart Tool" id="tool-heart">
                        <img src="icon/heart.svg" alt="Heart">
                    </div>
                     <div class="tool-btn" data-tool="blob" title="Blob Tool" id="tool-blob">
                        <img src="icon/blob.svg" alt="Blob">
                    </div>
                     <div class="tool-btn" data-tool="bubble" title="Speech Bubble Tool" id="tool-bubble">
                        <img src="icon/bubble.svg" alt="Msg">
                    </div>
                     <div class="tool-btn" data-tool="shield" title="Shield Tool" id="tool-shield">
                        <img src="icon/shield.svg" alt="Shield">
                    </div>
                     <div class="tool-btn" data-tool="cloud" title="Cloud Tool" id="tool-cloud">
                        <img src="icon/cloud.svg" alt="Cloud">
                    </div>
                     <div class="tool-btn" data-tool="drop" title="Drop Tool" id="tool-drop">
                        <img src="icon/drop.svg" alt="Drop">
                    </div>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>Paths</h3>
                <div class="vector-tools-grid">
                      <div class="tool-btn" data-tool="line" title="Line Segment (\)" id="tool-line">
                        <img src="icon/line.svg" alt="Line">
                    </div>
                      <div class="tool-btn" data-tool="spiral" title="Spiral Tool" id="tool-spiral">
                        <img src="icon/spiral.svg" alt="Spiral">
                    </div>
                     <div class="tool-btn" data-tool="wave" title="Wave Tool" id="tool-wave">
                        <img src="icon/wave.svg" alt="Wave">
                    </div>
                      <div class="tool-btn" data-tool="grid" title="Grid Tool" id="tool-grid">
                        <img src="icon/grid.svg" alt="Grid">
                    </div>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>Modify</h3>
                <div class="vector-tools-grid">
                     <div class="tool-btn" data-tool="eraser" title="Eraser Tool (Shift+E)" id="tool-eraser">
                        <img src="icon/eraser.svg" alt="Erase">
                    </div>
                    <div class="tool-btn" data-tool="picker" title="Eyedropper (I)" id="tool-picker">
                        <img src="icon/color_picker.svg" alt="Pick">
                    </div>
                    <div class="tool-btn" data-tool="shape_builder" title="Shape Builder (Shift+M)" id="tool-shape_builder">
                        <img src="icon/shape_builder.svg" alt="Build">
                    </div>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>Effects</h3>
                <div class="vector-tools-grid">
                     <div class="tool-btn" data-tool="warp" title="Warp Tool (W)" id="tool-warp">
                        <img src="icon/warp.png" alt="Warp">
                    </div>
                </div>
            </div>
            
            <div class="sidebar-section">
                <h3>Sync & IO</h3>
                 <button id="tool-transfer" class="btn-full" style="
                    width: 100%; 
                    padding: 8px; 
                    background: var(--accent-secondary); 
                    color: white; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 5px;
                ">
                    <span>➡️</span> Send to OviState
                </button>
                 <button id="tool-import" class="btn-full" style="
                    width: 100%; 
                    padding: 8px; 
                    background: var(--bg-secondary); 
                    color: var(--text-primary); 
                    border: 1px solid var(--border-color); 
                    border-radius: 4px; 
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                ">
                    <span>📂</span> Import SVG
                </button>
                <input type="file" id="vector-file-api" accept=".svg" style="display:none">
            </div>

            <div class="sidebar-section">
                <h3>View</h3>
                 <div class="vector-tools-grid">
                    <div class="tool-btn" id="tool-reset-view" title="Reset View (Ctrl+0)" style="width: 100%">
                         <span style="font-size:12px">🏠</span>
                    </div>
                 </div>
            </div>
        `);

        // Bind Events
        setTimeout(() => {
            const tools = ['select', 'direct_select', 'pen', 'line', 'text', 'rect', 'circle', 'star', 'polygon', 'gear', 'arrow', 'pie', 'spiral', 'wave', 'grid', 'flower', 'cross', 'crescent', 'heart', 'blob', 'bubble', 'shield', 'cloud', 'drop', 'eraser', 'picker', 'warp', 'shape_builder'];

            tools.forEach(tool => {
                const btn = document.getElementById(`tool-${tool}`);
                if (btn) {
                    btn.onclick = () => {
                        // UI Update
                        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        // Logic Update
                        if (editorInstance) {
                            // Unified setMode for all tools
                            // The editor will handle creation vs selection logic based on the mode
                            editorInstance.setMode(tool);
                        }
                    };
                }
            });

            // Transfer Button
            const transferBtn = document.getElementById('tool-transfer');
            if (transferBtn) {
                transferBtn.onclick = () => {
                    if (editorInstance && editorInstance.sendToOviState) {
                        editorInstance.sendToOviStateRobust();
                    } else if (editorInstance && editorInstance.sendToSimulation) {
                        editorInstance.sendToSimulation();
                    } else {
                        alert("Sync function not ready.");
                    }
                };
            }

            // Import Button
            const importBtn = document.getElementById('tool-import');
            const fileInput = document.getElementById('vector-file-api');

            if (importBtn && fileInput && editorInstance) {
                importBtn.onclick = () => {
                    fileInput.click();
                };

                fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            if (editorInstance.importSVG) {
                                editorInstance.importSVG(evt.target.result);
                            } else {
                                alert("Editor does not support SVG import yet.");
                            }
                        };
                        reader.readAsText(file);
                        fileInput.value = '';
                    }
                };
            }

            // Reset View
            const resetBtn = document.getElementById('tool-reset-view');
            if (resetBtn && editorInstance) {
                resetBtn.onclick = () => editorInstance.resetView();
            }

        }, 0);
    }
}
