export default class Sidebar {
    static render(engine, pluginInstance) {
        engine.layoutManager.setSidebarContent(`
            <div style="padding: 15px;">
                <div style="margin-bottom: 20px;">
                    <h3 style="color: var(--text-primary); margin-bottom: 10px;">Narrative Voice</h3>
                    <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px;">
                        Convert story text to speech for Brimtale.
                    </p>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 5px;">TEXT TO SPEAK</label>
                    <textarea id="ovivoice-text" style="
                        width: 100%; 
                        height: 100px; 
                        background: var(--bg-input); 
                        color: white; 
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        padding: 8px;
                        font-family: inherit;
                        resize: vertical;
                    " placeholder="Enter narrative text..."></textarea>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button id="ovivoice-play-btn" style="
                        flex: 1;
                        padding: 10px;
                        background: var(--text-accent);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: bold;
                    ">▶ Play Voice</button>
                    <button id="ovivoice-stop-btn" style="
                        padding: 10px;
                        background: #f44336;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">⏹ Stop</button>
                </div>

                <div style="border-top: 1px solid var(--border-color); padding-top: 20px;">
                    <h4 style="color: var(--text-primary); font-size: 13px; margin-bottom: 10px;">Voice Settings</h4>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 11px; color: var(--text-secondary);">Pitch</label>
                        <input type="range" id="ovivoice-pitch" min="0.5" max="2" step="0.1" value="1" style="width: 100%;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 11px; color: var(--text-secondary);">Rate</label>
                        <input type="range" id="ovivoice-rate" min="0.5" max="3" step="0.1" value="1" style="width: 100%;">
                    </div>
                </div>
            </div>
        `);

        // Bind Events
        setTimeout(() => {
            const playBtn = document.getElementById('ovivoice-play-btn');
            const stopBtn = document.getElementById('ovivoice-stop-btn');
            const textArea = document.getElementById('ovivoice-text');
            const pitchInput = document.getElementById('ovivoice-pitch');
            const rateInput = document.getElementById('ovivoice-rate');

            if (playBtn) {
                playBtn.onclick = () => {
                    pluginInstance.speak(textArea.value, {
                        pitch: parseFloat(pitchInput.value),
                        rate: parseFloat(rateInput.value),
                        lang: 'bn-BD' // Default to Bangla for Brimtale context
                    });
                };
            }

            if (stopBtn) {
                stopBtn.onclick = () => {
                    pluginInstance.stop();
                };
            }
        }, 0);
    }
}
