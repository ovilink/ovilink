/**
 * AudioManager
 * Centralizes WebAudio API logic for OviPlatform.
 * Manages Master Gain, AudioNodes, and providing streams for recording.
 */
export default class AudioManager {
    constructor(engine) {
        this.engine = engine;
        this.ctx = null;
        this.masterGain = null;
        this.destination = null; // MediaStreamDestination for recording
    }

    init() {
        if (this.ctx) return;

        console.log("🔊 AudioManager: Initializing WebAudio Context...");
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // Setup recording node
        this.recordingDestination = this.ctx.createMediaStreamDestination();
        this.masterGain.connect(this.recordingDestination);
    }

    get masterGainNode() {
        this.init();
        return this.masterGain;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    getStream() {
        return this.recordingDestination?.stream;
    }
}
