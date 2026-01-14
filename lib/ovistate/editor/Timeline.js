/**
 * Timeline UI Component
 * Handles the visual representation of the timeline, tracks, and keyframes.
 */

export default class Timeline {
    constructor(editor) {
        this.editor = editor;
        this.isVisible = false;
        this.height = 200; // Default height of the panel

        // DOM Elements
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        // State
        this.scrollX = 0;
        this.scrollY = 0;
        this.scaleX = 10; // Pixels per frame
        this.headerHeight = 30;
        this.trackHeight = 24;
        this.sidebarWidth = 200;

        this.isDraggingPlayhead = false;
        this.isDraggingKeyframe = false;
        this.draggedKeys = null;
        this.autoKey = false;

        // --- Selection State (Persistent via IDs) ---
        this.selection = null; // { objId, t, type: 'prop'|'action' }
    }

    init(parent) {
        // Create Container
        this.container = document.createElement('div');
        this.container.className = 'ovistate-timeline';
        this.container.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: ${this.height}px;
            background: #252526;
            border-top: 1px solid #3e3e42;
            display: none;
            z-index: 1000;
            overflow: hidden;
            font-family: 'Segoe UI', sans-serif;
            font-size: 11px;
            color: #ccc;
        `;

        // --- Toolbar ---
        const toolbar = document.createElement('div');
        toolbar.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 30px; display: flex; align-items: center; padding: 0 8px; z-index: 10; background: #2d2d30; border-bottom: 1px solid #3e3e42;";

        // Auto-Key Button
        const btnAutoKey = document.createElement('button');
        btnAutoKey.innerHTML = '●'; // Rec Icon
        btnAutoKey.title = "Toggle Auto-Key";
        btnAutoKey.style.cssText = "width: 20px; height: 20px; border: none; background: transparent; color: #555; cursor: pointer; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 14px;";

        btnAutoKey.onclick = () => {
            this.autoKey = !this.autoKey;
            btnAutoKey.style.color = this.autoKey ? '#ff4d4d' : '#555'; // Red when active
            if (this.autoKey) {
                console.log("🔴 Auto-Key Enabled");
            }
        };
        toolbar.appendChild(btnAutoKey);

        // Puppeteering Record Button
        const btnRecord = document.createElement('button');
        btnRecord.innerHTML = '🔴';
        btnRecord.title = "Start Live Motion Recording (Puppeteering)";
        btnRecord.style.cssText = "width: 24px; height: 24px; border: none; background: transparent; color: #555; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 14px; transition: all 0.2s;";

        btnRecord.onclick = () => {
            const system = this.editor.runtime.timelineSystem;
            if (system) {
                system.isRecording = !system.isRecording;
                btnRecord.style.color = system.isRecording ? '#ff0000' : '#555';
                btnRecord.style.background = system.isRecording ? 'rgba(255,0,0,0.1)' : 'transparent';

                if (system.isRecording) {
                    console.log("🔴 Puppeteering Recording Armed (Press Play to start)");
                } else {
                    console.log("⬛ Recording Stopped");
                }
            }
        };
        toolbar.appendChild(btnRecord);
        this.btnRecord = btnRecord; // Store for sync

        // Divider
        const divider = document.createElement('div');
        divider.style.cssText = "width: 1px; height: 16px; background: #3e3e42; margin: 0 8px;";
        toolbar.appendChild(divider);

        // Clip Selector Dropdown
        const clipLabel = document.createElement('span');
        clipLabel.textContent = "Clip:";
        clipLabel.style.marginRight = "6px";
        toolbar.appendChild(clipLabel);

        const clipSelector = document.createElement('select');
        clipSelector.style.cssText = "background: #1e1e1e; color: #ccc; border: 1px solid #3e3e42; border-radius: 3px; font-size: 11px; padding: 2px 4px; outline: none; margin-right: 8px;";
        clipSelector.onchange = () => {
            const obj = this.editor.selectedObject;
            if (obj && this.editor.runtime.timelineSystem) {
                this.editor.runtime.timelineSystem.activeClips.set(obj.id, clipSelector.value);
                this.draw();
            }
        };
        toolbar.appendChild(clipSelector);
        this.clipSelector = clipSelector;

        // New Clip Button
        const btnNewClip = document.createElement('button');
        btnNewClip.innerHTML = '+';
        btnNewClip.title = "Create New Animation Clip";
        btnNewClip.style.cssText = "width: 18px; height: 18px; border: none; background: #3e3e42; color: #ccc; cursor: pointer; border-radius: 3px; display: flex; align-items: center; justify-content: center; margin-right: 4px; font-size: 12px;";
        btnNewClip.onclick = () => {
            const obj = this.editor.selectedObject;
            if (!obj) return;
            const name = prompt("Enter Animation Clip Name:", "New Clip");
            if (name) {
                if (!obj.animations) obj.animations = {};
                if (!obj.animations[name]) {
                    obj.animations[name] = { keys: {} };
                    this.editor.runtime.timelineSystem.activeClips.set(obj.id, name);
                    this.editor.saveState(); // SAVE: New Clip
                    this.updateClipSelector();
                    this.draw();
                }
            }
        };
        toolbar.appendChild(btnNewClip);

        // Delete Clip Button
        const btnDeleteClip = document.createElement('button');
        btnDeleteClip.innerHTML = '🗑️';
        btnDeleteClip.title = "Delete Current Animation Clip";
        btnDeleteClip.style.cssText = "width: 22px; height: 18px; border: none; background: transparent; color: #888; cursor: pointer; border-radius: 3px; display: flex; align-items: center; justify-content: center; margin-right: 4px; font-size: 10px; transition: color 0.2s;";
        btnDeleteClip.onmouseover = () => btnDeleteClip.style.color = '#ff4d4d';
        btnDeleteClip.onmouseout = () => btnDeleteClip.style.color = '#888';
        btnDeleteClip.onclick = () => {
            const obj = this.editor.selectedObject;
            if (!obj || !obj.animations) return;
            const system = this.editor.runtime.timelineSystem;
            const clipName = system ? system.activeClipName(obj) : 'default';

            if (clipName === 'default') {
                alert("Cannot delete the 'default' clip.");
                return;
            }

            if (confirm(`Delete animation clip "${clipName}"? all keyframes in this clip will be lost.`)) {
                delete obj.animations[clipName];
                if (system) system.activeClips.set(obj.id, 'default');
                this.editor.saveState(); // SAVE: Delete Clip
                this.updateClipSelector();
                this.draw();
            }
        };
        toolbar.appendChild(btnDeleteClip);

        this.container.appendChild(toolbar);

        // --- Scrollbar ---
        const scrollbarTrack = document.createElement('div');
        scrollbarTrack.style.cssText = "position: absolute; bottom: 0; left: 200px; right: 0; height: 10px; background: #1e1e1e; border-top: 1px solid #3e3e42; z-index: 5;";

        const scrollbarThumb = document.createElement('div');
        scrollbarThumb.style.cssText = "position: absolute; top: 1px; bottom: 1px; left: 0; width: 50px; background: #454545; border-radius: 4px; cursor: pointer; transition: background 0.2s;";
        scrollbarThumb.onmouseover = () => scrollbarThumb.style.background = '#555';
        scrollbarThumb.onmouseout = () => scrollbarThumb.style.background = '#454545';

        scrollbarTrack.appendChild(scrollbarThumb);
        this.container.appendChild(scrollbarTrack);
        this.scrollbarThumb = scrollbarThumb;
        this.scrollbarTrack = scrollbarTrack;

        // Create Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.top = "30px"; // Push canvas down below toolbar
        this.canvas.style.cssText += `
            width: 100%;
            height: calc(100% - 40px);
            display: block;
            position: absolute;
            top: 30px;
            left: 0;
        `;
        this.container.appendChild(this.canvas);
        parent.appendChild(this.container);

        this.ctx = this.canvas.getContext('2d');

        // Event Listeners
        this.setupEvents();

        // Initial Resize
        this.resize();

        // Resize Observer
        new ResizeObserver(() => this.resize()).observe(this.container);
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';

        // Trigger resize on Editor to adjust viewport
        if (this.editor.onResize) this.editor.onResize();

        if (this.isVisible) {
            this.draw();
        }
    }

    resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }

    setupEvents() {
        // --- Scrollbar Dragging ---
        let isDraggingScroll = false;
        let startScrollX = 0;
        let startMouseX = 0;

        this.scrollbarThumb.addEventListener('mousedown', (e) => {
            isDraggingScroll = true;
            startScrollX = this.scrollX;
            startMouseX = e.clientX;
            e.stopPropagation();
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingScroll) {
                const trackWidth = this.scrollbarTrack.clientWidth;
                const thumbWidth = this.scrollbarThumb.clientWidth;
                const deltaX = e.clientX - startMouseX;

                // Convert pixels moved on track to scrollX change
                // Ratio: (trackWidth - thumbWidth) / (maxScroll)
                // Assuming max frames = 300, maxScroll = 300 * scaleX - (canvasWidth - sidebarWidth)
                const system = this.editor.runtime.timelineSystem;
                const totalWidth = (system ? system.totalFrames : 300) * this.scaleX;
                const viewWidth = this.canvas.width - this.sidebarWidth;
                const maxScroll = Math.max(0, totalWidth - viewWidth);

                const ratio = maxScroll / (trackWidth - thumbWidth);
                this.scrollX = Math.max(0, Math.min(maxScroll, startScrollX + deltaX * ratio));
                this.draw();
            }
        });

        window.addEventListener('mouseup', () => {
            isDraggingScroll = false;
        });

        // Global Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;

            // Spacebar: Toggle Play/Pause
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.editor.runtime.timelineSystem) {
                    if (this.editor.runtime.timelineSystem.isPlaying) {
                        this.editor.runtime.timelineSystem.pause();
                        console.log("⏸ Paused");
                    } else {
                        this.editor.runtime.timelineSystem.play();
                        console.log("▶ Playing");
                    }
                }
            }

            // Delete: Remove Selected Keyframes
            if (e.code === 'Delete' && this.selection) {
                e.preventDefault();
                const system = this.editor.runtime.timelineSystem;
                const obj = this.editor.runtime.getObject(this.selection.objId);
                if (!obj) return;

                const frame = this.selection.t;
                const activeClipName = system.activeClipName(obj);
                const timeline = obj.animations ? obj.animations[activeClipName] : obj.timeline;

                if (this.selection.type === 'prop') {
                    if (timeline && timeline.keys) {
                        for (const prop in timeline.keys) {
                            timeline.keys[prop] = timeline.keys[prop].filter(k => Math.abs(k.t - frame) > 0.1);
                        }
                    }
                } else {
                    if (timeline && timeline.actions) {
                        timeline.actions = timeline.actions.filter(k => Math.abs(k.t - frame) > 0.1);
                    }
                }

                console.log(`🗑️ Deleted selection at frame ${frame}`);
                this.editor.saveState(); // SAVE: Delete Keyframes (Shortcut)
                this.selection = null;
                this.draw();
            }

            // Checking modifiers
            const isCtrl = e.ctrlKey || e.metaKey;

            // Copy (Ctrl+C)
            if (isCtrl && e.code === 'KeyC' && this.selection) {
                e.preventDefault();
                const system = this.editor.runtime.timelineSystem;
                const obj = this.editor.runtime.getObject(this.selection.objId);
                if (!obj) return;

                const frame = this.selection.t;
                const activeClipName = system.activeClipName(obj);
                const timeline = obj.animations ? obj.animations[activeClipName] : obj.timeline;

                if (this.selection.type === 'prop' && timeline.keys) {
                    let keysToCopy = [];
                    for (const prop in timeline.keys) {
                        const k = timeline.keys[prop].find(k => Math.abs(k.t - frame) < 0.1);
                        if (k) keysToCopy.push({ prop: prop, v: k.v, e: k.e });
                    }
                    this.clipboard = { type: 'prop', keys: keysToCopy };
                    console.log(`📋 Copied ${keysToCopy.length} keys (Shortcut)`);
                } else if (this.selection.type === 'action' && timeline.actions) {
                    const k = timeline.actions.find(k => Math.abs(k.t - frame) < 0.1);
                    if (k) {
                        this.clipboard = { type: 'action', key: { id: k.id, v: k.v } };
                        console.log(`📋 Copied action key (Shortcut)`);
                    }
                }
            }

            // Paste (Ctrl+V)
            const targetObj = (this.selection ? this.editor.runtime.getObject(this.selection.objId) : null) || this.editor.selectedObject;
            if (isCtrl && e.code === 'KeyV' && this.clipboard && targetObj) {
                e.preventDefault();
                const system = this.editor.runtime.timelineSystem;
                const pasteFrame = system.currentTime;

                if (system) {
                    if (this.clipboard.type === 'prop') {
                        this.clipboard.keys.forEach(item => {
                            system.addKeyframe(targetObj, item.prop, item.v, pasteFrame);
                            // Restore easing
                            const activeClipName = system.activeClipName(targetObj);
                            const timeline = targetObj.animations ? targetObj.animations[activeClipName] : targetObj.timeline;
                            const track = timeline.keys[item.prop];
                            const newKey = track.find(k => k.t === pasteFrame);
                            if (newKey) newKey.e = item.e;
                        });
                    } else if (this.clipboard.type === 'action') {
                        system.addActionKeyframe(targetObj, this.clipboard.key.id, pasteFrame);
                    }

                    this.editor.saveState(); // SAVE: Paste Keyframes (Shortcut)
                    this.draw();
                    console.log(`📋 Pasted to frame ${pasteFrame} on ${targetObj.id}`);
                }
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            // Only Left Click scrubs
            if (e.button !== 0) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 1. Check Sidebar Clicks (Toggle Relative Mode)
            if (x < this.sidebarWidth && y > this.headerHeight) {
                const trackIndex = Math.floor((y - this.headerHeight + this.scrollY) / this.trackHeight);
                const objects = this.editor.runtime ? this.editor.runtime.objects : [];
                const obj = objects[trackIndex];

                if (obj) {
                    const hitAreaX = this.sidebarWidth - 40; // 40px from right edge of sidebar
                    if (x > hitAreaX) {
                        const system = this.editor.runtime.timelineSystem;
                        if (system) {
                            const clipName = system.activeClipName(obj);
                            // Auto-initialize clip if it doesn't exist (using getClip)
                            const timeline = system.getClip(obj, clipName);

                            if (timeline) {
                                timeline.isRelative = !timeline.isRelative;
                                console.log(`🔄 [${obj.id}] Toggle Relative: ${timeline.isRelative} (Clip: ${clipName})`);
                                this.editor.saveState(); // SAVE: Relative Toggle
                                this.draw();
                                return; // Stop event processing
                            }
                        }
                    }
                }
            }

            // 2. Check if clicking on a Keyframe (Transformation or Action)
            if (y > this.headerHeight && x > this.sidebarWidth) {
                const trackIndex = Math.floor((y - this.headerHeight + this.scrollY) / this.trackHeight);
                const objects = this.editor.runtime ? this.editor.runtime.objects : [];
                const obj = objects[trackIndex];

                if (obj) {
                    const timeX = x - this.sidebarWidth + this.scrollX;
                    const clickFrame = Math.round(timeX / this.scaleX);

                    const system = this.editor.runtime.timelineSystem;
                    const activeClipName = system.activeClipName(obj);
                    const timeline = obj.animations ? obj.animations[activeClipName] : obj.timeline;

                    // Check Object Keys (Group Drag)
                    if (timeline && timeline.keys) {
                        let hitKeys = [];

                        // Find ALL keys at this frame across ALL properties
                        for (const prop in timeline.keys) {
                            const found = timeline.keys[prop].find(k => Math.abs(k.t - clickFrame) <= 1);
                            if (found) {
                                hitKeys.push({ key: found, prop: prop });
                            }
                        }


                        if (hitKeys.length > 0) {
                            this.isDraggingKeyframe = true;
                            this.draggedKeys = hitKeys;
                            this.draggedKeyObj = obj;
                            this.draggedKeyType = 'prop';
                            this._startDragFrame = hitKeys[0].key.t;

                            // SELECTION LOGIC (Robust)
                            this.selection = {
                                objId: obj.id,
                                t: hitKeys[0].key.t,
                                type: 'prop'
                            };

                            this.draw();
                            return; // Stop scrubbing
                        }
                    }

                    // Check Action Keys
                    if (timeline && timeline.actions) {
                        const found = timeline.actions.find(k => Math.abs(k.t - clickFrame) <= 1);
                        if (found) {
                            this.isDraggingKeyframe = true;
                            this.draggedKeys = [{ key: found }];
                            this.draggedKeyObj = obj;
                            this.draggedKeyType = 'action';
                            this._startDragFrame = found.t;

                            // SELECTION LOGIC (Robust)
                            this.selection = {
                                objId: obj.id,
                                t: found.t,
                                type: 'action'
                            };

                            this.draw();
                            return; // Stop scrubbing
                        }
                    }
                }
            }

            // 2. Fallback to Scrubbing
            if (x > this.sidebarWidth) {
                this.isDraggingPlayhead = true;

                // Only deselect if clicking in the TRACK area (empty space), NOT the ruler
                if (y > this.headerHeight) {
                    this.selection = null;
                    console.log("☁️ Selection Cleared (Clicked empty track space)");
                }

                this.scrubTo(x);
                this.draw(); // Force refresh for selection change
            }
        });

        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;

            if (this.isDraggingKeyframe && this.draggedKeys) {
                const timeX = x - this.sidebarWidth + this.scrollX;
                let frame = Math.round(timeX / this.scaleX);
                if (frame < 0) frame = 0;

                // Update ALL dragged keys
                this.draggedKeys.forEach(item => {
                    item.key.t = frame;
                });

                // Force Redraw
                this.draw();
                return;
            }

            if (this.isDraggingPlayhead) {
                // Clamp x to sidebar
                if (x > this.sidebarWidth) {
                    this.scrubTo(x);
                }
            }

            // --- Cursor Feedback ---
            if (!this.isDraggingKeyframe && !this.isDraggingPlayhead) {
                const y = e.clientY - rect.top;
                const hitAreaX = this.sidebarWidth - 40;
                if (x < this.sidebarWidth && x > hitAreaX && y > this.headerHeight) {
                    this.canvas.style.cursor = 'pointer';
                } else {
                    this.canvas.style.cursor = 'default';
                }
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isDraggingKeyframe && this.draggedKeys) {
                const system = this.editor.runtime.timelineSystem;
                const activeClipName = system.activeClipName(this.draggedKeyObj);
                const timeline = this.draggedKeyObj.animations ? this.draggedKeyObj.animations[activeClipName] : this.draggedKeyObj.timeline;

                // Re-sort keys after move
                if (this.draggedKeyType === 'prop') {
                    const touchedProps = new Set(this.draggedKeys.map(k => k.prop));
                    touchedProps.forEach(prop => {
                        if (timeline.keys[prop]) {
                            timeline.keys[prop].sort((a, b) => a.t - b.t);
                        }
                    });
                } else if (this.draggedKeyType === 'action') {
                    timeline.actions.sort((a, b) => a.t - b.t);
                }

                // Update selection time to new position
                const newTime = this.draggedKeys[0].key.t;
                if (this.selection) this.selection.t = newTime;

                // SAVE: Only if it was a real move
                if (this._startDragFrame !== undefined && newTime !== this._startDragFrame) {
                    console.log(`📍 Keyframes moved from ${this._startDragFrame} to ${newTime}`);
                    this.editor.saveState();
                }
            }

            this.isDraggingPlayhead = false;
            this.isDraggingKeyframe = false;
            this.draggedKeys = null;
            this.draggedKeyObj = null;
            this.draggedKeyType = null;
            this._startDragFrame = undefined;
        });

        // Context Menu (Right-Click) to Add Action
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            console.log(`🖱️ Timeline Right-Click at ${x}, ${y}`);

            // 1. Identify Track
            if (y > this.headerHeight && x > this.sidebarWidth) {
                const trackIndex = Math.floor((y - this.headerHeight + this.scrollY) / this.trackHeight);
                const objects = this.editor.runtime ? this.editor.runtime.objects : [];
                const obj = objects[trackIndex];

                if (obj) {
                    const timeX = x - this.sidebarWidth + this.scrollX;
                    const clickFrame = Math.round(timeX / this.scaleX);

                    const system = this.editor.runtime.timelineSystem;
                    const activeClipName = system.activeClipName(obj);
                    const timeline = obj.animations ? obj.animations[activeClipName] : obj.timeline;

                    // Check if we clicked ON a keyframe (tolerance +/- 2 frames)
                    let clickedKey = null;
                    let clickedProp = null;

                    if (timeline && timeline.keys) {
                        for (const prop in timeline.keys) {
                            const found = timeline.keys[prop].find(k => Math.abs(k.t - clickFrame) <= 2);
                            if (found) {
                                clickedKey = found;
                                clickedProp = prop;
                                break;
                            }
                        }
                    }

                    setTimeout(() => {
                        const menuItems = [];

                        if (clickedKey) {
                            // --- Edit Keyframe Context ---
                            menuItems.push({ label: 'Set Easing:', icon: '📈', action: null }); // Header (Non-clickable ideally, but simplifies iteration)

                            const easings = ['linear', 'easeIn', 'easeOut', 'easeInOut'];

                            easings.forEach(eType => {
                                const isCurrent = (clickedKey.e || 'linear') === eType;
                                menuItems.push({
                                    label: eType.charAt(0).toUpperCase() + eType.slice(1) + (isCurrent ? ' (Current)' : ''),
                                    icon: isCurrent ? '✔️' : '◦',
                                    action: () => {
                                        clickedKey.e = eType;
                                        console.log(`Updated easing to ${eType}`);
                                        this.editor.saveState(); // SAVE: Easing Change
                                        this.draw();
                                    }
                                });
                            });

                            menuItems.push({ label: '----------------', icon: '', action: null });

                            menuItems.push({
                                label: 'Delete Keyframe',
                                icon: '🗑️',
                                action: () => {
                                    const frame = clickedKey.t;
                                    // Remove ALL keys at this frame for this object
                                    if (timeline.keys) {
                                        for (const prop in timeline.keys) {
                                            timeline.keys[prop] = timeline.keys[prop].filter(k => k.t !== frame);
                                        }
                                    }
                                    this.editor.saveState(); // SAVE: Delete Keyframe (Menu)
                                    this.draw();
                                    console.log(`🗑️ Deleted keyframe at ${frame}`);
                                }
                            });

                            menuItems.push({
                                label: 'Copy Keyframe',
                                icon: '📋',
                                action: () => {
                                    const frame = clickedKey.t;
                                    let keysToCopy = [];

                                    if (timeline.keys) {
                                        for (const prop in timeline.keys) {
                                            const k = timeline.keys[prop].find(k => k.t === frame);
                                            if (k) keysToCopy.push({ prop: prop, key: k });
                                        }
                                    }

                                    this.clipboard = {
                                        type: 'prop',
                                        keys: keysToCopy.map(k => ({
                                            prop: k.prop,
                                            val: k.key.v,
                                            e: k.key.e
                                        }))
                                    };
                                    console.log(`📋 Copied ${this.clipboard.keys.length} keys to clipboard`);
                                }
                            });

                        } else {
                            // --- Empty Track Context ---

                            // Paste Option (if clipboard exists)
                            if (this.clipboard) {
                                menuItems.push({
                                    label: `Paste Keyframe (at ${clickFrame})`,
                                    icon: '📋',
                                    action: () => {
                                        const system = this.editor.runtime.timelineSystem;
                                        if (system) {
                                            this.clipboard.keys.forEach(item => {
                                                system.addKeyframe(obj, item.prop, item.val, clickFrame);

                                                // Restore easing
                                                const activeClipName = system.activeClipName(obj);
                                                const currentTimeline = obj.animations ? obj.animations[activeClipName] : obj.timeline;
                                                const track = currentTimeline.keys[item.prop];
                                                const newKey = track.find(k => k.t === clickFrame);
                                                if (newKey) newKey.e = item.e;
                                            });
                                            this.editor.saveState(); // SAVE: Paste Keyframe (Menu)
                                            this.draw();
                                            console.log(`📋 Pasted keys at frame ${clickFrame}`);
                                        }
                                    }
                                });
                                menuItems.push({ label: '----------------', icon: '', action: null });
                            }

                            menuItems.push({
                                label: 'snapshot Keyframe (Pos/Rot/Scale)',
                                icon: '📷',
                                action: () => {
                                    if (this.editor.runtime.timelineSystem) {
                                        // Snapshot basic transform
                                        const props = ['x', 'y', 'rotation', 'scale', 'opacity'];
                                        props.forEach(p => {
                                            if (obj[p] !== undefined) {
                                                this.editor.runtime.timelineSystem.addKeyframe(obj, p, obj[p], clickFrame);
                                            }
                                        });
                                        this.editor.saveState(); // SAVE: Snapshot Keyframe (Menu)
                                        this.draw();
                                        console.log(`📸 Snapshot keyframe added for ${obj.id} at frame ${clickFrame}`);
                                    }
                                }
                            });

                            menuItems.push({
                                label: 'Add Action Trigger',
                                icon: '⚡',
                                action: () => {
                                    const actionId = prompt("Enter Action ID:", "my_action");
                                    if (actionId && this.editor.runtime.timelineSystem) {
                                        this.editor.runtime.timelineSystem.addActionKeyframe(obj, actionId, clickFrame);
                                        this.editor.saveState(); // SAVE: Add Action
                                        this.draw();
                                    }
                                }
                            });
                        }

                        // Use global screen coords for fixed menu
                        this.showContextMenu(e.clientX, e.clientY, menuItems);

                    }, 10);

                } else {
                    // Start soft warning, only if it looks like a track area but isn't
                    // Actually, clicking below tracks is common, just ignore.
                    // console.warn("⚠️ No object found at track index:", trackIndex);
                }
            } else {
                // console.log("Click outside track area");
            }
        });

        // Zoom & Pan (Wheel)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            // Zoom (Ctrl + Wheel)
            if (e.ctrlKey) {
                const zoomIntensity = 0.1;
                const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
                const oldScale = this.scaleX;

                // Calculate zoom focus (mouse X)
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - this.sidebarWidth;

                // Update Scale
                this.scaleX *= (1 + delta);

                // Clamp scale (Min 1px/frame, Max 200px/frame)
                if (this.scaleX < 1) this.scaleX = 1;
                if (this.scaleX > 200) this.scaleX = 200;

                // Adjust scroll to keep mouse focus
                // newTimeX = (timeX / oldScale) * newScale
                const timeAtMouse = (mouseX + this.scrollX) / oldScale;
                this.scrollX = (timeAtMouse * this.scaleX) - mouseX;

            } else {
                // Pan (Shift+Wheel or just Wheel for horizontal feel)
                // Use deltaY or deltaX
                const delta = e.deltaY + e.deltaX;
                this.scrollX += delta;
            }

            // Clamp Scroll
            if (this.scrollX < 0) this.scrollX = 0;

            this.draw();
        }, { passive: false });
    }

    updateClipSelector() {
        if (!this.clipSelector) return;
        const obj = this.editor.selectedObject;
        this.clipSelector.innerHTML = '';

        if (!obj) {
            this.clipSelector.innerHTML = '<option value="default">None Selected</option>';
            return;
        }

        const clips = ['default'];
        if (obj.animations) {
            Object.keys(obj.animations).forEach(name => {
                if (name !== 'default') clips.push(name);
            });
        }

        clips.forEach(clip => {
            const opt = document.createElement('option');
            opt.value = clip;
            opt.textContent = clip;
            if (this.editor.runtime.timelineSystem) {
                const current = this.editor.runtime.timelineSystem.activeClipName(obj);
                if (clip === current) opt.selected = true;
            }
            this.clipSelector.appendChild(opt);
        });
    }

    scrubTo(x) {
        const timeX = x - this.sidebarWidth + this.scrollX;
        let frame = Math.round(timeX / this.scaleX);
        if (frame < 0) frame = 0;

        // Update Runtime
        if (this.editor.runtime && this.editor.runtime.timelineSystem) {
            this.editor.runtime.timelineSystem.currentTime = frame;
            this.editor.runtime.timelineSystem.applyKeyframes();

            // Sync Inspector if object is selected
            if (this.editor.selectedObject) {
                // Assuming 'Inspector' is globally available or imported in Editor context
                // If not, we might need a reference or callback.
                // Editor.js usually has access.
                // Let's rely on global Inspector if avail, or check editor.
                if (typeof Inspector !== 'undefined' && Inspector.update) {
                    Inspector.update(this.editor.engine, this.editor.selectedObject);
                }
                // Or if Inspector is a module...
                // Editor.js uses `Inspector.update(this.engine, this.selectedObject);`
                // Let's assume Inspector is global (classic JS) or imported in Editor but not here.
                // If this fails, we need to pass Inspector ref.
                // Actually, Timeline is imported in Editor. Editor imports Inspector.
                // BUT Editor doesn't pass Inspector to Timeline.
                // Let's try simpler: Trigger a Custom Event on editor?
                // Or just try accessing it. OviPlatform usually has global namespaces.
            }
        }

        this.draw();
    }

    draw() {
        if (!this.isVisible) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, w, h);

        // --- NEW: Sync UI Elements ---
        if (this.editor.runtime && this.editor.runtime.timelineSystem) {
            const system = this.editor.runtime.timelineSystem;
            if (this.btnRecord) {
                this.btnRecord.style.color = system.isRecording ? '#ff4d4d' : '#555';
                this.btnRecord.style.background = system.isRecording ? 'rgba(255,0,0,0.1)' : 'transparent';
            }
        }

        // --- Sidebar (Tracks) ---
        ctx.fillStyle = '#252526';
        ctx.fillRect(0, 0, this.sidebarWidth, h);
        ctx.strokeStyle = '#3e3e42';
        ctx.beginPath();
        ctx.moveTo(this.sidebarWidth, 0);
        ctx.lineTo(this.sidebarWidth, h);
        ctx.stroke();

        // --- Timeline Area ---
        const startX = this.sidebarWidth;

        // Draw Time Ruler
        this.drawRuler(ctx, w, startX);

        // Draw Tracks
        this.drawTracks(ctx, w, startX);

        // Draw Playhead
        this.drawPlayhead(ctx, h, startX);

        // Update Scrollbar Thumb Position
        this.updateScrollbar();
    }

    updateScrollbar() {
        if (!this.scrollbarThumb || !this.scrollbarTrack) return;

        const system = this.editor.runtime.timelineSystem;
        const totalFrames = system ? system.totalFrames : 300;
        const totalWidth = totalFrames * this.scaleX;
        const viewWidth = this.canvas.width - this.sidebarWidth;
        const trackWidth = this.scrollbarTrack.clientWidth;

        if (totalWidth <= viewWidth) {
            this.scrollbarThumb.style.display = 'none';
            return;
        }

        this.scrollbarThumb.style.display = 'block';
        const thumbWidth = Math.max(20, (viewWidth / totalWidth) * trackWidth);
        const maxScroll = totalWidth - viewWidth;
        const scrollPercent = this.scrollX / maxScroll;
        const left = scrollPercent * (trackWidth - thumbWidth);

        this.scrollbarThumb.style.width = `${thumbWidth}px`;
        this.scrollbarThumb.style.left = `${left}px`;
    }

    drawRuler(ctx, w, startX) {
        ctx.fillStyle = '#2d2d30';
        ctx.fillRect(startX, 0, w - startX, this.headerHeight);
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(startX, this.headerHeight);
        ctx.lineTo(w, this.headerHeight);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';

        // Simple 10-frame markers
        const frameStart = Math.floor(this.scrollX / this.scaleX);
        const frameEnd = frameStart + Math.ceil((w - startX) / this.scaleX);

        for (let f = frameStart; f <= frameEnd; f++) {
            if (f % 5 === 0) { // Every 5 frames
                const x = startX + (f * this.scaleX) - this.scrollX;
                const height = (f % 10 === 0) ? 10 : 5;

                ctx.beginPath();
                ctx.moveTo(x, this.headerHeight);
                ctx.lineTo(x, this.headerHeight - height);
                ctx.stroke();

                if (f % 10 === 0) {
                    ctx.fillText(f.toString(), x, this.headerHeight - 12);
                }
            }
        }
    }

    drawTracks(ctx, w, startX) {
        const objects = this.editor.runtime ? this.editor.runtime.objects : [];
        const system = this.editor.runtime.timelineSystem;

        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            const clipName = system.activeClipName(obj);

            // Resolve timeline source (Migration support)
            let timeline = obj.animations ? obj.animations[clipName] : (clipName === 'default' ? obj.timeline : null);
            if (!timeline) timeline = { keys: {}, actions: [] }; // Ensure timeline object exists

            const isSelected = this.editor.selectedObject === obj;
            const y = this.headerHeight + (i * this.trackHeight) - this.scrollY;

            // Sidebar Item
            ctx.fillStyle = '#ccc';
            ctx.textAlign = 'left';
            const displayName = obj.name || obj.id;
            // Truncate if too long?
            let finalName = displayName;
            if (displayName.length > 20) finalName = displayName.substring(0, 17) + '...';

            ctx.fillText(finalName, 10, y + 16);

            // Relative Mode Toggle Icon
            const relX = this.sidebarWidth - 20;
            ctx.fillStyle = timeline.isRelative ? '#2196F3' : '#888';
            ctx.font = 'bold 12px monospace';
            ctx.fillText('Δ', relX, y + 16);
            ctx.font = '11px "Segoe UI", sans-serif'; // Reset font

            // Track Line
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(0, y + this.trackHeight);
            ctx.lineTo(w, y + this.trackHeight);
            ctx.stroke();

            // Draw Keyframes (Properties)
            if (timeline.keys) {
                for (const prop in timeline.keys) {
                    this.drawKeyframes(ctx, timeline.keys[prop], y, startX, obj);
                }
            }

            // Draw Action Keyframes
            if (timeline.actions) {
                this.drawActionKeys(ctx, timeline.actions, y, startX, obj);
            }
        }
    }

    drawKeyframes(ctx, keys, y, startX, obj) {
        ctx.fillStyle = '#4CAF50'; // Green keys
        const halfSize = 4;

        keys.forEach(k => {
            const x = startX + (k.t * this.scaleX) - this.scrollX;

            // Highlight if Selected
            let isSelected = false;
            if (this.selection && this.selection.type === 'prop' && this.selection.objId === obj.id) {
                isSelected = Math.abs(k.t - this.selection.t) < 0.1;
            }

            if (isSelected) {
                ctx.fillStyle = '#FFD700'; // Yellow
                this.drawDiamond(ctx, x, y + 12, halfSize + 2); // Larger background
                ctx.fillStyle = '#4CAF50'; // Restore green center
            } else {
                ctx.fillStyle = '#4CAF50';
            }

            // Diamond shape
            this.drawDiamond(ctx, x, y + 12, halfSize);

            // Outline for better visibility
            if (isSelected) {
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }

    drawActionKeys(ctx, actions, y, startX, obj) {
        ctx.fillStyle = '#2196F3'; // Blue keys
        const halfSize = 4;

        actions.forEach(k => {
            const x = startX + (k.t * this.scaleX) - this.scrollX;

            // Highlight if Selected
            let isSelected = false;
            if (this.selection && this.selection.type === 'action' && this.selection.objId === obj.id) {
                isSelected = Math.abs(k.t - this.selection.t) < 0.1;
            }

            // Circle shape for Actions
            ctx.beginPath();
            ctx.arc(x, y + 12, halfSize + 1, 0, Math.PI * 2);

            if (isSelected) {
                ctx.fillStyle = '#FFD700'; // Yellow fill for selection
                ctx.fill();
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = '#2196F3';
                ctx.fill();
            }
        });
    }

    drawDiamond(ctx, cx, cy, r) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.fill();
    }

    drawPlayhead(ctx, h, startX) {
        let currentTime = 0;
        if (this.editor.runtime && this.editor.runtime.timelineSystem) {
            currentTime = this.editor.runtime.timelineSystem.currentTime;
        }

        const x = startX + (currentTime * this.scaleX) - this.scrollX;

        ctx.strokeStyle = '#d32f2f'; // Red Playhead
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        // Head
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath();
        ctx.moveTo(x - 5, 0);
        ctx.lineTo(x + 5, 0);
        ctx.lineTo(x, 10);
        ctx.fill();
    }

    showContextMenu(x, y, items) {
        // Remove existing if any
        if (this.currentMenu) {
            document.body.removeChild(this.currentMenu);
            this.currentMenu = null;
        }

        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: #252526;
            border: 1px solid #454545;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 2000;
            padding: 4px 0;
            min-width: 150px;
            max-height: 250px;
            overflow-y: auto;
            border-radius: 4px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 13px;
        `;

        items.forEach(item => {
            const el = document.createElement('div');
            el.textContent = item.label;
            el.style.cssText = `
                padding: 6px 12px;
                cursor: pointer;
                color: #ccc;
                transition: background 0.1s;
                display: flex;
                align-items: center;
            `;

            if (item.icon) {
                el.innerHTML = `<span style="margin-right: 8px;">${item.icon}</span> ${item.label}`;
            }

            el.onmouseover = () => el.style.background = '#37373d';
            el.onmouseout = () => el.style.background = 'transparent';

            el.onclick = () => {
                if (item.action) item.action();
                document.body.removeChild(menu);
                this.currentMenu = null;
            };

            menu.appendChild(el);
        });

        document.body.appendChild(menu);
        this.currentMenu = menu;

        // --- Smart Positioning (Collision Detection) ---
        const rect = menu.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        // If runs off right edge, shift left
        if (rect.right > winW) {
            menu.style.left = `${winW - rect.width - 10}px`;
        }

        // If runs off bottom edge, flip upwards
        if (rect.bottom > winH) {
            const newTop = y - rect.height;
            // Ensure we don't flip it off the top edge either
            menu.style.top = `${Math.max(0, newTop)}px`;
        }

        // Click outside to close
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                if (document.body.contains(menu)) document.body.removeChild(menu);
                this.currentMenu = null;
                window.removeEventListener('mousedown', closeMenu);
            }
        };
        setTimeout(() => window.addEventListener('mousedown', closeMenu), 10);
    }
}
