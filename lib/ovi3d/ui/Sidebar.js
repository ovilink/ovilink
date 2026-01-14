export default class Sidebar {
    static render(engine, pluginInstance) {
        engine.layoutManager.setSidebarContent(`
            <style>
                .ovi3d-sidebar {
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    color: var(--text-primary);
                }
                .ovi3d-section {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .ovi3d-section h3 {
                    font-size: 11px;
                    color: var(--text-secondary);
                    margin: 0;
                    padding-bottom: 6px;
                    border-bottom: 1px solid var(--border-color);
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .ovi3d-btn-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .ovi3d-primary-btn {
                    width: 100%;
                    padding: 10px;
                    background: var(--accent-primary, #1a73e8);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 12px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .ovi3d-primary-btn:hover {
                    background: var(--accent-hover, #1557b0);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }
                .ovi3d-secondary-btn {
                    width: 100%;
                    padding: 8px;
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .ovi3d-secondary-btn:hover {
                    background: var(--bg-hover);
                    border-color: var(--accent-primary);
                }
                .ovi3d-info-box {
                    font-size: 10px;
                    color: var(--text-secondary);
                    background: rgba(0,0,0,0.1);
                    padding: 8px;
                    border-radius: 4px;
                    line-height: 1.4;
                    border-left: 2px solid var(--border-color);
                }
                .ovi3d-tool-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }
                .ovi3d-tool-btn {
                    padding: 8px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s;
                }
                .ovi3d-tool-btn:hover {
                    border-color: var(--accent-primary);
                    background: var(--bg-hover);
                }
                .ovi3d-tool-btn.active {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                }
                .ovi3d-tool-btn svg {
                    width: 20px;
                    height: 20px;
                }
                .ovi3d-tool-label {
                    font-size: 10px;
                    font-weight: 500;
                }
            </style>

            <div class="ovi3d-sidebar">
                <!-- Models & Data Section -->
                <div class="ovi3d-section">
                    <h3><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5zM2 12l10 5 10-5-10-5-10 5z"/></svg> Models & Data</h3>
                    <div class="ovi3d-btn-group">
                        <button id="ovi3d-import-btn" class="ovi3d-primary-btn">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            Import GLB Model
                        </button>
                        <div class="ovi3d-info-box">
                            Drop a .glb file here or click to browse. Supports high-fidelity 3D models.
                        </div>
                        <button id="ovi3d-vector-btn" class="ovi3d-secondary-btn">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.09-4-4L2 15.08l1.5 1.41z"/></svg>
                            From OviVector Path
                        </button>
                    </div>
                </div>

                <!-- Scene Tools Section -->
                <div id="ovi3d-hotspot-controls" class="ovi3d-section" style="display: none;">
                    <h3><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> Scene Tools</h3>
                    <div class="ovi3d-tool-grid">
                        <button id="ovi3d-add-hotspot" class="ovi3d-tool-btn" title="Add interactive hotspot marker">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            <span class="ovi3d-tool-label">Add Hotspot</span>
                        </button>
                        <button id="ovi3d-measure-tool" class="ovi3d-tool-btn" title="Measure distance between points">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H5V5h8v2h2V5c0-1.1-.9-2-2-2zm4.17 10L14 10.83V13H8v2h6v2.17L17.17 14z"/></svg>
                            <span class="ovi3d-tool-label">Measure</span>
                        </button>
                    </div>
                </div>

                <!-- Actions & Export Section -->
                <div id="ovi3d-action-controls" class="ovi3d-section" style="display: none;">
                    <h3><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Actions & Export</h3>
                    <div class="ovi3d-btn-group">
                        <button id="ovi3d-transfer-btn" class="ovi3d-primary-btn" style="background: #1e8e3e;">
                            Transfer to OviState
                        </button>
                        <button id="ovi3d-export-btn" class="ovi3d-primary-btn">
                            Export Standalone HTML
                        </button>
                    </div>
                </div>

                <!-- Guidance Section -->
                <div class="ovi3d-section">
                    <h3><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg> Help</h3>
                    <div class="ovi3d-info-box" style="background: rgba(26, 115, 232, 0.05); border-left-color: var(--accent-primary);">
                        <strong>Pro Tip:</strong> Use Right-Click + Drag to rotate the light source in the preview for better visibility.
                    </div>
                </div>
            </div>
        `);

        // Bind Events (Standard IDs for delegation in Plugin)
        // No manual binding needed here as Ovi3D.js handles it via delegation
    }

    static setToolActive(toolId, active) {
        const btn = document.getElementById(`ovi3d-${toolId}`);
        if (btn) {
            if (active) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    }
}
