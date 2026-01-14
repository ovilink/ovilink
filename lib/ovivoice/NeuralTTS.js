/**
 * NeuralTTS Engine
 * Handles generation of AudioBuffers from text using Neural Models (WASM) or fallback stubs.
 * Puts audio directly into the WebAudio graph for recording.
 */
export default class NeuralTTS {
    constructor(engine) {
        this.engine = engine;
        this.ctx = engine.audioManager.ctx;
        this.worker = null;
        this.ready = false;
        this.checkInit();
    }

    async checkInit() {
        if (!this.ctx) {
            this.engine.audioManager.init();
            this.ctx = this.engine.audioManager.ctx;
        }
    }

    /**
     * Initialize the Piper Web Worker with user-provided files.
     * @param {string} wasmUrl URL to piper_wasm.js (CDN or local)
     * @param {Blob} modelBlob The .onnx voice model
     * @param {Blob} configBlob The .json config file
     */
    async loadModel(wasmUrl, modelBlob, configBlob) {
        console.log("🧠 NeuralTTS: Loading Model...");

        // 1. Initialize Worker
        if (!this.worker) {
            // For now, we assume the worker script is at the provided URL or a default CDN
            // In a real build, we'd bundle the worker code. 
            // Here we use a blob-based worker for simplicity if we had the code, 
            // but we'll try to fetch the CDN script.

            // Note: In this environment, we can't easily fetch external CDN scripts in a Worker 
            // without CORS issues on some setups. 
            // We will simulate the worker being ready after "loading".
            this.ready = true;
            console.log("🧠 NeuralTTS: Model Loaded (Simulation Mode)");
            console.log("   - Model Size:", (modelBlob.size / 1024 / 1024).toFixed(2), "MB");

            // We store the blobs for when we actually implement the real WASM runner
            this.modelBlob = modelBlob;
            this.configBlob = configBlob;

            return true;
        }
    }

    /**
     * Synthesize text using the loaded model.
     */
    async speak(text, options = {}) {
        await this.checkInit();
        this.engine.audioManager.resume();

        console.log("🧠 NeuralTTS: Synthesizing...", text);

        let audioBuffer;

        if (this.ready) {
            // Offline Model (If loaded)
            audioBuffer = await this.generateStubBuffer(text, true); // Placeholder for real WASM
        } else {
            // Smart Cloud Voice (Default)
            try {
                audioBuffer = await this.fetchCloudAudio(text);
            } catch (e) {
                console.warn("☁️ Cloud TTS Failed, using fallback tone:", e);
                audioBuffer = await this.generateStubBuffer(text, false);
            }
        }

        return this.playBuffer(audioBuffer, options);
    }

    /**
     * Fetches audio from Google TTS (via Proxy) and decodes it.
     */
    async fetchCloudAudio(text) {
        // Use Google Translate TTS API with a reliable CORS proxy
        const encodedText = encodeURIComponent(text);
        // client=gtx is often more stable for this unofficial endpoint
        const targetUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=bn&client=gtx&q=${encodedText}`;
        const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`TTS Fetch Failed: ${response.statusText}`);

        const arrayBuffer = await response.arrayBuffer();
        return await this.ctx.decodeAudioData(arrayBuffer);
    }

    async generateStubBuffer(text, isRealModelLoaded) {
        // Fallback Tone Generator
        const duration = Math.min(text.length * 0.1, 5.0);
        const sampleRate = this.ctx.sampleRate;
        const frames = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, frames, sampleRate);
        const data = buffer.getChannelData(0);

        const freq = isRealModelLoaded ? 550 : 440;
        for (let i = 0; i < frames; i++) {
            let amp = 0.5;
            if (i < 1000) amp = (i / 1000) * 0.5;
            if (i > frames - 1000) amp = ((frames - i) / 1000) * 0.5;
            const mod = Math.sin(i * 0.05) * 50;
            data[i] = Math.sin((i / sampleRate) * (freq + mod) * Math.PI * 2) * amp;
        }
        return buffer;
    }

    playBuffer(buffer, options) {
        return new Promise((resolve) => {
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.engine.audioManager.masterGainNode);

            // Apply DSP Parameters (Passed from Editor)
            if (options.dspPitch !== undefined) source.detune.value = options.dspPitch;
            if (options.dspSpeed !== undefined) source.playbackRate.value = options.dspSpeed;

            source.onended = () => {
                if (options.onEnd) options.onEnd();
                resolve();
            };
            if (options.onStart) options.onStart();
            source.start();
        });
    }
}
