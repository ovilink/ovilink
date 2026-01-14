/**
 * OviBoard Sidebar (Tool Palette)
 */
export default class Sidebar {
    static render(engine, board) {
        const sidebarContent = document.querySelector('#sidebar .sidebar-content');
        if (!sidebarContent) return;

        sidebarContent.innerHTML = '';
        sidebarContent.style.padding = '10px';

        // new board btn
        const newBoardBtn = document.createElement('button');
        newBoardBtn.innerHTML = 'New Board';
        newBoardBtn.style.width = '100%';
        newBoardBtn.style.padding = '8px';
        newBoardBtn.style.marginBottom = '15px';
        newBoardBtn.style.background = '#007acc';
        newBoardBtn.style.color = 'white';
        newBoardBtn.style.border = 'none';
        newBoardBtn.style.borderRadius = '4px';
        newBoardBtn.style.cursor = 'pointer';
        newBoardBtn.onclick = () => {
            if (board.createBoard) board.createBoard('New Board');
        };
        sidebarContent.appendChild(newBoardBtn);

        // Save Btn
        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = '💾 Save Board';
        saveBtn.style.width = '100%';
        saveBtn.style.padding = '8px';
        saveBtn.style.marginBottom = '5px';
        saveBtn.style.background = '#4caf50';
        saveBtn.style.color = 'white';
        saveBtn.style.border = 'none';
        saveBtn.style.borderRadius = '4px';
        saveBtn.style.cursor = 'pointer';
        saveBtn.onclick = () => {
            if (board.activeEditor) {
                const data = board.activeEditor.save();
                // Create download
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'board.json';
                a.click();
            }
        };
        sidebarContent.appendChild(saveBtn);

        // Export Image Btn
        const exportBtn = document.createElement('button');
        exportBtn.innerHTML = '📷 Export Image';
        exportBtn.style.width = '100%';
        exportBtn.style.padding = '8px';
        exportBtn.style.marginBottom = '15px';
        exportBtn.style.background = '#9c27b0';
        exportBtn.style.color = 'white';
        exportBtn.style.border = 'none';
        exportBtn.style.borderRadius = '4px';
        exportBtn.style.cursor = 'pointer';
        exportBtn.onclick = () => {
            if (board.activeEditor) {
                const url = board.activeEditor.exportImage();
                if (url) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'board.png';
                    a.click();
                }
            }
        };
        sidebarContent.appendChild(exportBtn);

        const title = document.createElement('div');
        title.innerText = 'TOOLS';
        title.style.fontSize = '12px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';
        title.style.color = '#666';
        sidebarContent.appendChild(title);

        const tools = [
            { id: 'select', label: '👆 Select' },
            { id: 'pen', label: '✏️ Pen' },
            { id: 'text', label: 'T Text' },
            { id: 'eraser', label: '🧹 Eraser' }
        ];

        tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.innerHTML = tool.label;
            btn.style.width = '100%';
            btn.style.padding = '8px';
            btn.style.marginBottom = '5px';
            btn.style.background = '#e0e0e0';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.style.textAlign = 'left';

            // Active State Logic
            if (board.activeEditor && board.activeEditor.toolManager.activeToolId === tool.id) {
                btn.style.background = '#d0e0ff';
                btn.style.borderLeft = '3px solid #007acc';
            }

            btn.onclick = () => {
                if (board.activeEditor) {
                    board.activeEditor.toolManager.setTool(tool.id);
                    // Re-render to show active state
                    Sidebar.render(engine, board);
                    // Also refresh Inspector as context might change
                    // Inspector.render(...)
                }
            };

            sidebarContent.appendChild(btn);
        });

        // --- Ecosystem Integration Section ---
        const smartTitle = document.createElement('div');
        smartTitle.innerText = 'SMART LIBRARY';
        smartTitle.style.fontSize = '12px';
        smartTitle.style.fontWeight = 'bold';
        smartTitle.style.marginTop = '20px';
        smartTitle.style.marginBottom = '10px';
        smartTitle.style.color = '#666';
        sidebarContent.appendChild(smartTitle);

        const comingSoon = document.createElement('div');
        const importBtn = document.createElement('button');
        importBtn.innerText = '📂 Import OviState JSON';
        importBtn.style.width = '100%';
        importBtn.style.padding = '8px';
        importBtn.style.marginTop = '5px';
        importBtn.style.background = '#4caf50';
        importBtn.style.color = 'white';
        importBtn.style.border = 'none';
        importBtn.style.borderRadius = '4px';
        importBtn.style.cursor = 'pointer';

        // Hidden File Input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const json = JSON.parse(evt.target.result);
                    if (json.objects || json.metadata) {
                        if (board.activeEditor) {
                            // Place in center of current view
                            const cam = board.activeEditor.camera;
                            // Visible Center = (CanvasWidth/2)/Zoom - CamX
                            const cx = (board.activeEditor.canvas.width / 2) / cam.zoom - cam.x;
                            const cy = (board.activeEditor.canvas.height / 2) / cam.zoom - cam.y;

                            // Need access to SmartObject class? Editor imports it.
                            // We should probably expose an 'addObject' method on Editor.
                            // But for now, we can replicate the logic if we have access to SmartObject class here? 
                            // Sidebar.js doesn't import SmartObject.
                            // Better Clean Code: Editor.loadOviState(json, x, y);

                            // Let's modify Editor to have that method.
                            if (board.activeEditor.addSmartObject) {
                                board.activeEditor.addSmartObject(json, cx - 100, cy - 100);
                            } else {
                                console.warn("Editor.addSmartObject not implemented yet");
                            }
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            };
            reader.readAsText(file);
        };

        importBtn.onclick = () => fileInput.click();

        sidebarContent.appendChild(importBtn);
        sidebarContent.appendChild(fileInput);

        // --- Magic Draw Toggle ---
        // Toggle for Shape Recognition
        const magicDiv = document.createElement('div');
        magicDiv.style.marginTop = '15px';
        magicDiv.style.display = 'flex';
        magicDiv.style.alignItems = 'center';

        const magicCheckbox = document.createElement('input');
        magicCheckbox.type = 'checkbox';
        if (board.activeEditor) {
            magicCheckbox.checked = board.activeEditor.magicDrawEnabled || false;
        }
        magicCheckbox.onchange = (e) => {
            if (board.activeEditor) {
                board.activeEditor.magicDrawEnabled = e.target.checked;
            }
        };

        const magicLabel = document.createElement('span');
        magicLabel.innerText = '✨ Magic Draw';
        magicLabel.style.marginLeft = '8px';
        magicLabel.style.fontSize = '14px';
        magicLabel.style.color = '#333';

        magicDiv.appendChild(magicCheckbox);
        magicDiv.appendChild(magicLabel);
        sidebarContent.appendChild(magicDiv);
    }
}
