export default class VectorSidebar {
    static render(engine, editorInstance) {
        engine.layoutManager.setSidebarContent(`
            <style>
                .sidebar-section {
                    margin-bottom: 20px;
                }
                .sidebar-section h3 {
                    font-size: 12px;
                    color: var(--text-primary);
                    margin-bottom: 10px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid var(--border-color);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .vector-tool-btn {
                    padding: 10px;
                    margin-bottom: 6px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: var(--text-primary);
                }
                .vector-tool-btn:hover {
                    background: var(--bg-hover);
                    border-color: var(--text-accent);
                }
                .vector-tool-btn.active {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                }
            </style>

            <div class="sidebar-section">
                <h3>🛠️ Drawing Tools</h3>
                <div class="vector-tool-btn active" data-tool="select" id="tool-select">
                    <span>↖️</span>
                    <span>Select</span>
                </div>
                <div class="vector-tool-btn" data-tool="rect" id="tool-rect">
                    <span>⬜</span>
                    <span>Rectangle</span>
                </div>
                <div class="vector-tool-btn" data-tool="circle" id="tool-circle">
                    <span>⚪</span>
                    <span>Circle</span>
                </div>
                <!-- Star is removed as per user request to only show specific items, or kept? User said: Select, Rectangle, Circle, State, Text -->
                <!-- User didn't explicitly forbid star, but gave a list. I'll stick to the list + Star as extra if needed, but for now strict list -->
                <div class="vector-tool-btn" data-tool="text" id="tool-text">
                    <span>✍️</span>
                    <span>Text</span>
                </div>
            </div>

            <div class="sidebar-section">
                <h3>🔍 View</h3>
                 <div class="vector-tool-btn" id="tool-reset-view">
                    <span>🏠</span>
                    <span>Reset View</span>
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; padding-left: 5px;">
                    • <b>Ctrl + Scroll</b> to Zoom<br>
                    • <b>Space + Drag</b> to Pan
                </div>
            </div>

            <div class="sidebar-section">
                <h3>🚀 Actions</h3>
                 <div class="vector-tool-btn" id="tool-transfer" style="background: var(--accent-secondary); color: white;">
                    <span>➡️</span>
                    <span>Send to State</span>
                </div>
                 <div class="vector-tool-btn" id="tool-import" style="background: var(--bg-secondary); color: var(--text-primary);">
                    <span>📂</span>
                    <span>Import Vector</span>
                    <input type="file" id="vector-file-api" accept=".svg" style="display:none">
                </div>
            </div>

            <!-- Properties Removed, moved to Inspector -->
        `);

        // Bind Events
        setTimeout(() => {
            const tools = ['select', 'rect', 'circle', 'text'];

            tools.forEach(tool => {
                const btn = document.getElementById(`tool-${tool}`);
                if (btn) {
                    btn.onclick = () => {
                        // UI Update
                        document.querySelectorAll('.vector-tool-btn').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');

                        // Logic Update
                        if (editorInstance) {
                            if (tool === 'select') {
                                editorInstance.setMode('select');
                            } else {
                                editorInstance.addShape(tool);
                                setTimeout(() => {
                                    btn.classList.remove('active');
                                    const selBtn = document.getElementById('tool-select');
                                    if (selBtn) selBtn.classList.add('active');
                                }, 200);
                            }
                        }
                    };
                }
            });

            // Transfer Button
            const transferBtn = document.getElementById('tool-transfer');
            if (transferBtn) {
                transferBtn.onclick = () => {
                    if (editorInstance) editorInstance.sendToSimulation();
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
                        // Reset input
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

