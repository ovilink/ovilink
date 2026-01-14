export default class Director {
    constructor(engine, plugin) {
        this.engine = engine;
        this.plugin = plugin;
        this.isActive = false;
        this.currentIdx = 0;
    }

    start(sim) {
        if (this.isActive) return;
        this.isActive = true;
        this.activeSimulation = sim;
        this.currentIdx = 0;

        this.setupOverlay();
        this.playNextCue();
    }

    async playNextCue() {
        if (!this.isActive) return;

        const sentences = this.plugin.sentences;
        if (this.currentIdx >= sentences.length) {
            this.stop();
            return;
        }

        const cue = sentences[this.currentIdx];
        console.log(`🎬 Director: Playing Cue ${this.currentIdx + 1}: "${cue.text}"`);

        // 1. Update Teleprompter
        if (this.plugin.updateTeleprompter) {
            this.plugin.updateTeleprompter(this.currentIdx);
        } else if (this.plugin.render) {
            this.plugin.currentSentenceIndex = this.currentIdx;
            this.plugin.render();
        }

        // 2. Execute Sim Action
        if (cue.action) {
            this.executeAction(cue);
        }

        // 3. Speak the sentence (ONLY in TTS mode)
        const voicePlugin = this.engine.pluginManager.getPlugin('ovivoice');
        const isTTS = this.plugin.audioMode === 'tts';

        if (voicePlugin && isTTS) {
            await new Promise(resolve => {
                voicePlugin.speak(cue.text, {
                    lang: 'bn-BD',
                    rate: 0.95, // Base rate for engine
                    dspPitch: this.plugin.voicePitch || 0,   // Manual DSP Pitch
                    dspSpeed: this.plugin.voiceSpeed || 1.0, // Manual DSP Speed
                    onEnd: () => {
                        this.currentIdx++;
                        setTimeout(resolve, 500); // Small pause between sentences
                    }
                });
            });
            this.playNextCue();
        } else {
            // Fallback for Mic mode or no voice plugin
            // Stay on this cue for a bit, then move on (acting as a basic auto-prompter)
            // Or let the user manually advance? For now, we'll use a timer to keep it moving.
            const duration = Math.max(3000, cue.text.length * 100); // Estimate read time
            setTimeout(() => {
                this.currentIdx++;
                this.playNextCue();
            }, duration);
        }
    }

    executeAction(cue) {
        const runtime = this.activeSimulation?.runtime;
        if (!runtime) return;

        const actionType = cue.action;
        const targetId = cue.target;

        console.log(`🎬 Director Action: ${actionType} on ${targetId || 'global'}`);

        // Helper to find target position
        const getTargetPos = () => {
            if (!targetId || targetId === 'center') return { x: runtime.canvas.width / 2, y: runtime.canvas.height / 2 };
            // Find object in runtime
            const obj = runtime.objects?.find(o => o.id === targetId || o.name === targetId);
            if (obj) return { x: obj.x || 0, y: obj.y || 0 };
            return { x: runtime.canvas.width / 2, y: runtime.canvas.height / 2 };
        };

        const pos = getTargetPos();

        switch (actionType) {
            case 'play': runtime.start(); break;
            case 'pause': runtime.stop(); break;
            case 'reset': this.activeSimulation.reset(); break;
            case 'highlight':
                this.currentHighlight = { x: pos.x, y: pos.y, radius: 80, life: 3.5, maxRadius: 120 };
                break;
            case 'pointer':
                const startX = this.currentPointer ? this.currentPointer.tx : 0;
                const startY = this.currentPointer ? this.currentPointer.ty : 0;
                this.currentPointer = { x: startX, y: startY, tx: pos.x, ty: pos.y, progress: 0 };
                break;
        }
    }

    setupOverlay() {
        const sim = this.activeSimulation;
        if (!sim?.runtime?.canvas) return;

        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.width = sim.runtime.canvas.width;
        this.overlayCanvas.height = sim.runtime.canvas.height;
        this.octx = this.overlayCanvas.getContext('2d');

        this.renderLoop();
    }

    renderLoop() {
        if (!this.isActive) return;

        if (this.octx) {
            this.octx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

            // Render Highlight (Pulsing Effect)
            if (this.currentHighlight && this.currentHighlight.life > 0) {
                const pulse = Math.abs(Math.sin(performance.now() / 200)) * 20;
                this.octx.beginPath();
                this.octx.arc(this.currentHighlight.x, this.currentHighlight.y, this.currentHighlight.radius + pulse, 0, Math.PI * 2);
                this.octx.strokeStyle = `rgba(255, 255, 0, ${Math.min(1, this.currentHighlight.life)})`;
                this.octx.lineWidth = 4;
                this.octx.setLineDash([10, 5]); // Dashed line for professional look
                this.octx.stroke();
                this.octx.setLineDash([]);

                this.currentHighlight.life -= 0.016;
            }

            // Render Pointer
            if (this.currentPointer && this.currentPointer.progress < 1) {
                this.currentPointer.progress += 0.02;
                const x = this.currentPointer.x + (this.currentPointer.tx - this.currentPointer.x) * this.currentPointer.progress;
                const y = this.currentPointer.y + (this.currentPointer.ty - this.currentPointer.y) * this.currentPointer.progress;
                this.octx.font = '40px serif';
                this.octx.fillText('☝️', x, y);
            }
        }

        requestAnimationFrame(() => this.renderLoop());
    }

    stop() {
        this.isActive = false;
        // this.plugin.updateTeleprompter(-1); // Removed (Handled by StudioEditor)
        console.log("🎬 Director Mode: FINISHED");
    }
}
