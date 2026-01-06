import StudioWorkspace from '../StudioWorkspace.js';
import KineticEngine from '../utils/KineticEngine.js';

export default class ModeAdMaker extends StudioWorkspace {
    constructor(editor) {
        super(editor);
        this.name = "Pro Ad Maker";
        this.kinetic = new KineticEngine();

        // --- Ad State ---
        this.scenes = []; // { id, start, end, text, background, kineticPreset }
        this.isSyncing = false;
        this.syncStartTime = 0;

        this.activeSceneIndex = -1;
    }

    activate() {
        console.log("🎬 Mode: Ad Maker Activated");
        if (this.scenes.length === 0) this.initDefaultScenes();
        if (this.activeSceneIndex === -1 && this.scenes.length > 0) this.activeSceneIndex = 0;
        this.editor.render();
    }

    initDefaultScenes() {
        if (this.editor.sentences.length > 0) {
            this.scenes = this.editor.sentences.map((s, i) => ({
                id: i,
                start: i * 5,
                end: (i + 1) * 5,
                text: s.text,
                bgType: 'color',
                bgValue: '#121212',
                kenBurns: false,
                kineticPreset: 'pop',
                transition: 'fade'
            }));
        }
    }

    renderOverlays() {
        // --- PREVIEW LOGIC ---
        // If audio is playing, follow timeline
        // If audio is paused, show the scene currently selected in timeline
        const isPlaying = !this.editor.audioElement.paused;
        let scene = null;

        if (isPlaying) {
            const currentTime = this.editor.audioElement.currentTime || 0;
            scene = this.scenes.find(s => currentTime >= s.start && currentTime < s.end);
        } else {
            scene = this.scenes[this.activeSceneIndex];
        }

        if (!scene) return '';

        let bgStyle = '';
        const hasImageUrl = scene.bgType === 'image' && scene.bgValue && (scene.bgValue.startsWith('blob:') || scene.bgValue.startsWith('data:'));

        if (hasImageUrl) {
            bgStyle = `background-image: url(${scene.bgValue}); background-size: cover; background-position: center;`;
        } else if (scene.bgType === 'color') {
            bgStyle = `background-color: ${scene.bgValue};`;
        } else {
            // Default Placeholder
            bgStyle = `background: linear-gradient(45deg, #1e1e1e, #2d2d2d);`;
        }

        const kbAnim = (scene.bgType === 'image' && scene.bgValue && scene.kenBurns) ? `animation: ovi-ken-burns ${scene.end - scene.start}s ease-in-out infinite alternate;` : '';

        // Find current scene index for indicator
        const sceneIdx = this.scenes.indexOf(scene);

        // Scene Indicator
        // Only apply transition class if audio is playing (real performance/recording mode)
        // This avoids transition flicker during manual editing/preview
        const transitionCls = (scene.transition && isPlaying) ? `ovi-transition-${scene.transition}` : '';

        return `
            <div id="active-scene-wrapper-${this.id}" class="${transitionCls}" key="${scene.id}" style="position: absolute; width: 100%; height: 100%; top:0; left:0;">
                <!-- BG Layer -->
                <div style="position: absolute; width: 100%; height: 100%; top:0; left:0; ${bgStyle} ${kbAnim} z-index: -1;">
                    ${(scene.bgType === 'image' && !scene.bgValue) ? `
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #444; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; text-align: center;">
                            🖼 No Image Selected<br>
                            <span style="font-size: 10px; opacity: 0.5;">Upload in Sidebar</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Kinetic Text Layer -->
                <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
                    <div style="max-width: 80%; text-align: center; color: white; font-size: 42px; font-weight: bold; text-shadow: 0 4px 20px rgba(0,0,0,0.8); line-height: 1.2;">
                        ${this.kinetic.wrap(scene.text, scene.kineticPreset)}
                    </div>
                </div>
            </div>

            <!-- Scene Indicator -->
            <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 4px; border: 1px solid #444; pointer-events: none; z-index: 100;">
               <span style="font-size: 9px; color: #3794ff; font-weight: bold;">SCENE ${sceneIdx + 1} ${!isPlaying ? '(PREVIEW)' : ''}</span>
            </div>
        `;
    }

    renderBottomPanel() {
        return `
            <div style="flex: 1; height: 100%; display: flex; flex-direction: column; background: #1e1e1e;">
                <!-- Timeline Header / Controls -->
                <div style="height: 30px; border-bottom: 1px solid #333; display: flex; align-items: center; padding: 0 10px; gap: 10px;">
                    <div style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase;">Timeline</div>
                    
                    <!-- Audio Control (NEW) -->
                    <div style="display: flex; align-items: center; gap: 5px; background: #252526; padding: 2px 8px; border-radius: 4px; border: 1px solid #333;">
                        ${this.editor.audioFileUrl ? `
                            <span style="font-size: 10px; color: #27ae60;">● Audio Ready</span>
                            <button id="btn-clear-audio-${this.id}" style="background: none; border: none; color: #e74c3c; font-size: 10px; cursor: pointer; padding: 0 2px;">✕</button>
                        ` : `
                            <button onclick="document.getElementById('audio-upload-${this.id}').click()" style="background: #3794ff; border: none; color: white; border-radius: 3px; font-size: 10px; cursor: pointer; padding: 2px 6px;">📂 Load Audio</button>
                            <input type="file" id="audio-upload-${this.id}" accept="audio/*" style="display: none;">
                        `}
                    </div>

                    <div style="width: 1px; height: 15px; background: #333;"></div>

                    <button class="action-btn" data-action="startSync" style="background: ${this.isSyncing ? '#e74c3c' : '#444'}; border: none; padding: 2px 8px; border-radius: 3px; color: white; font-size: 10px; cursor: pointer;">
                        ${this.isSyncing ? '🔴 TAP TO SYNC NEXT' : '⏱ TAP TO SYNC'}
                    </button>
                    <div style="flex: 1;"></div>
                    <div id="timeline-time" style="font-family: monospace; font-size: 11px; color: #3794ff;">00:00.00</div>
                </div>
                
                <!-- Scenes List (Horizontal) -->
                <div id="scene-timeline" style="flex: 1; display: flex; overflow-x: auto; padding: 10px; gap: 8px; align-items: center;">
                    ${this.scenes.map((s, i) => `
                        <div class="scene-block" data-id="${s.id}" style="
                            min-width: 150px; 
                            height: 60px; 
                            background: #2d2d2d; 
                            border: 1px solid ${this.activeSceneIndex === i ? '#3794ff' : '#444'}; 
                            border-radius: 4px; 
                            padding: 8px; 
                            cursor: pointer; 
                            position: relative;
                            flex-shrink: 0;
                            transition: transform 0.2s;
                            ${this.isSyncing && this.syncCurrentIndex === i ? 'box-shadow: 0 0 10px #e74c3c; border-color: #e74c3c;' : ''}
                        ">
                            <div style="font-size: 9px; color: #666; margin-bottom: 4px;">SCENE ${i + 1} (${(s.end - s.start).toFixed(1)}s)</div>
                            <div style="font-size: 10px; color: #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.text}</div>
                            ${this.isSyncing && this.syncCurrentIndex === i ? '<div style="position: absolute; top: -15px; left: 0; font-size: 8px; color: #e74c3c; font-weight: bold;">WAITING FOR TAP...</div>' : ''}
                        </div>
                    `).join('')}
                    <div id="btn-add-scene" style="min-width: 150px; height: 60px; border: 2px dashed #333; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #555; cursor: pointer; flex-shrink: 0;">+ Add Scene</div>
                </div>
            </div>
        `;
    }

    renderInspector() {
        const scene = this.scenes[this.activeSceneIndex];
        if (!scene) {
            return `<div style="padding: 20px; color: #666; text-align: center;">Select a scene on the timeline to edit properties.</div>`;
        }

        return `
            <div style="padding: 10px; color: #eee;">
                <div style="font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px;">Scene Properties</div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 5px;">Script Text</label>
                    <textarea class="scene-input" data-prop="text" style="width: 100%; background: #1e1e1e; border: 1px solid #444; color: white; padding: 5px; border-radius: 4px; font-size: 12px; height: 60px; resize: none;">${scene.text}</textarea>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 5px;">Background</label>
                    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                        <select class="scene-input" data-prop="bgType" style="flex: 1; background: #1e1e1e; border: 1px solid #444; color: white; padding: 4px; border-radius: 4px; font-size: 11px;">
                            <option value="color" ${scene.bgType === 'color' ? 'selected' : ''}>🎨 Color</option>
                            <option value="image" ${scene.bgType === 'image' ? 'selected' : ''}>🖼 Image</option>
                        </select>
                        ${scene.bgType === 'color' ? `
                            <input type="color" class="scene-input" data-prop="bgValue" value="${scene.bgValue}" style="width: 30px; height: 24px; border: none; background: none; cursor: pointer;">
                        ` : `
                            <button id="btn-upload-bg" style="background: #333; border: 1px solid #444; color: white; border-radius: 4px; font-size: 10px; padding: 0 8px; cursor: pointer;">Upload</button>
                            <input type="file" id="bg-file-input" accept="image/*" style="display: none;">
                        `}
                    </div>
                </div>

                <div style="margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
                    <label style="font-size: 11px; color: #888;">Cinematic Ken Burns</label>
                    <input type="checkbox" class="scene-input" data-prop="kenBurns" ${scene.kenBurns ? 'checked' : ''} style="cursor: pointer;">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 5px;">Kinetic Animation</label>
                    <select class="scene-input" data-prop="kineticPreset" style="width: 100%; background: #1e1e1e; border: 1px solid #444; color: white; padding: 5px; border-radius: 4px;">
                        <option value="pop" ${scene.kineticPreset === 'pop' ? 'selected' : ''}>Pop Intro</option>
                        <option value="glide" ${scene.kineticPreset === 'glide' ? 'selected' : ''}>Smooth Glide</option>
                        <option value="glow" ${scene.kineticPreset === 'glow' ? 'selected' : ''}>Focus Glow</option>
                    </select>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; color: #888; margin-bottom: 5px;">Scene Transition</label>
                    <select class="scene-input" data-prop="transition" style="width: 100%; background: #1e1e1e; border: 1px solid #444; color: white; padding: 5px; border-radius: 4px; font-size: 11px;">
                        <option value="none" ${scene.transition === 'none' ? 'selected' : ''}>None</option>
                        <option value="fade" ${scene.transition === 'fade' ? 'selected' : ''}>Smooth Fade</option>
                        <option value="zoom" ${scene.transition === 'zoom' ? 'selected' : ''}>Cinematic Zoom</option>
                    </select>
                </div>

                <div style="display: flex; gap: 10px; border-top: 1px solid #333; margin-top: 20px; padding-top: 15px;">
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 11px; color: #888; margin-bottom: 5px;">Duration (s)</label>
                        <input type="number" class="scene-input" data-prop="duration" step="0.1" value="${(scene.end - scene.start).toFixed(1)}" style="width: 100%; background: #1e1e1e; border: 1px solid #444; color: white; padding: 5px; border-radius: 4px; font-size: 11px;">
                    </div>
                </div>

                <!-- BGM Manager (Hidden inside Inspector footer for convenience) -->
                <div style="margin-top: 30px; border: 1px dashed #444; padding: 10px; border-radius: 6px; background: rgba(0,0,0,0.2);">
                    <div style="font-size: 10px; color: #666; font-weight: bold; margin-bottom: 8px; text-transform: uppercase;">Background Music (BGM)</div>
                    ${this.editor.bgmFileUrl ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 10px; color: #27ae60; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🎵 BGM Active</span>
                            <button id="btn-clear-bgm" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 10px;">✕</button>
                        </div>
                        <input type="range" id="bgm-volume" min="0" max="1" step="0.05" value="${this.editor.bgmVolume}" style="width: 100%; margin-top: 8px; height: 3px; cursor: pointer;">
                    ` : `
                        <button id="btn-upload-bgm" style="width: 100%; background: #333; border: 1px solid #444; color: #aaa; font-size: 10px; padding: 5px; border-radius: 4px; cursor: pointer;">+ Upload BGM</button>
                    `}
                    <input type="file" id="bgm-file-input" accept="audio/*" style="display: none;">
                </div>
            </div>
        `;
    }

    bindEvents(container) {
        // Timeline clicks
        container.querySelectorAll('.scene-block').forEach((block, idx) => {
            block.addEventListener('click', () => {
                this.activeSceneIndex = idx;
                this.editor.render();
            });
        });

        // Inspector inputs
        const inspector = container.id === 'studio-inspector-content' ? container : container.querySelector('#studio-inspector-content') || document.querySelector('#studio-inspector-content');
        if (inspector) {
            inspector.querySelectorAll('.scene-input').forEach(input => {
                const eventType = input.type === 'color' || input.type === 'range' ? 'input' : 'change';
                input.addEventListener(eventType, (e) => {
                    const prop = e.target.dataset.prop;
                    const val = e.target.value;
                    const scene = this.scenes[this.activeSceneIndex];
                    if (scene) {
                        if (prop === 'duration') {
                            scene.end = scene.start + parseFloat(val);
                        } else if (prop === 'kenBurns') {
                            scene.kenBurns = e.target.checked;
                        } else {
                            scene[prop] = val;
                        }
                        this.editor.render();

                        // Only refresh inspector if UI elements need to change (e.g. bgType selector)
                        if (prop === 'bgType' || prop === 'transition') {
                            this.editor.refreshInspector();
                        }
                    }
                });
            });

            // BG Image Upload Logic
            const uploadBtn = inspector.querySelector('#btn-upload-bg');
            const fileInput = inspector.querySelector('#bg-file-input');
            if (uploadBtn && fileInput) {
                uploadBtn.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const scene = this.scenes[this.activeSceneIndex];
                        if (scene) {
                            scene.bgValue = URL.createObjectURL(file);
                            this.editor.render();
                            this.editor.refreshInspector();
                        }
                    }
                });
            }

            // BGM Logic
            const uploadBgmBtn = inspector.querySelector('#btn-upload-bgm');
            const fileBgmInput = inspector.querySelector('#bgm-file-input');
            const clearBgmBtn = inspector.querySelector('#btn-clear-bgm');
            const volBgm = inspector.querySelector('#bgm-volume');

            if (uploadBgmBtn && fileBgmInput) {
                uploadBgmBtn.addEventListener('click', () => fileBgmInput.click());
                fileBgmInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        this.editor.bgmFileUrl = URL.createObjectURL(file);
                        this.editor.bgmElement.src = this.editor.bgmFileUrl;
                        this.editor.bgmElement.volume = this.editor.bgmVolume;
                        this.editor.bgmElement.play();
                        this.editor.render();
                        this.editor.refreshInspector();
                    }
                });
            }

            if (clearBgmBtn) {
                clearBgmBtn.addEventListener('click', () => {
                    this.editor.bgmFileUrl = null;
                    this.editor.bgmElement.src = "";
                    this.editor.render();
                    this.editor.refreshInspector();
                });
            }

            if (volBgm) {
                volBgm.addEventListener('input', (e) => {
                    this.editor.bgmVolume = parseFloat(e.target.value);
                    this.editor.bgmElement.volume = this.editor.bgmVolume;
                });
            }
        }

        // Audio Logic
        const audioInput = container.querySelector(`#audio-upload-${this.id}`);
        if (audioInput) {
            audioInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.editor.audioFileUrl = URL.createObjectURL(file);
                    this.editor.audioElement.src = this.editor.audioFileUrl;
                    this.editor.render();
                }
            });
        }

        const clearAudioBtn = container.querySelector(`#btn-clear-audio-${this.id}`);
        if (clearAudioBtn) {
            clearAudioBtn.addEventListener('click', () => {
                this.editor.audioFileUrl = null;
                this.editor.audioElement.src = "";
                this.editor.render();
            });
        }

        // Sync Trigger
        const syncBtn = container.querySelector('[data-action="startSync"]');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                if (!this.isSyncing) {
                    this.isSyncing = true;
                    this.syncCurrentIndex = 0;
                    this.editor.audioElement.currentTime = 0;
                    this.editor.audioElement.play();
                } else {
                    this.performSyncTap();
                }
                this.editor.render();
            });
        }

        const addBtn = container.querySelector('#btn-add-scene');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addScene());
        }
    }

    addScene() {
        const lastScene = this.scenes[this.scenes.length - 1];
        const start = lastScene ? lastScene.end : 0;
        const newScene = {
            id: Date.now(),
            start: start,
            end: start + 5,
            text: "New Scene Content",
            bgType: 'color',
            bgValue: '#121212',
            kenBurns: false,
            kineticPreset: 'pop',
            transition: 'fade'
        };
        this.scenes.push(newScene);
        this.activeSceneIndex = this.scenes.length - 1;
        this.editor.render();
    }

    performSyncTap() {
        const time = this.editor.audioElement.currentTime;
        if (this.syncCurrentIndex < this.scenes.length) {
            // Set end of previous scene to now, start of next to now
            if (this.syncCurrentIndex > 0) {
                this.scenes[this.syncCurrentIndex - 1].end = time;
            }
            this.scenes[this.syncCurrentIndex].start = time;

            this.syncCurrentIndex++;

            if (this.syncCurrentIndex === this.scenes.length) {
                // Last scene end remains open or set to audio end
                this.isSyncing = false;
                this.editor.audioElement.pause();
                console.log("✅ Sync Complete!");
            }
        }
    }
}
