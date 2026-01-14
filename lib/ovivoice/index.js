/**
 * OviVoice Plugin
 * Handles Text-to-Speech and voice narrations for Brimtale
 */
import engine from '../../js/core/OviEngine.js';
import Sidebar from './Sidebar.js';
import NeuralTTS from './NeuralTTS.js';

const OviVoicePlugin = {
    id: 'ovivoice',
    name: 'OviVoice',
    icon: 'Vo',
    neuralEngine: null,

    init(engine) {
        console.log("OviVoice: Initialized");
        this.engine = engine;
        this.synth = window.speechSynthesis;
        this.neuralEngine = new NeuralTTS(engine);
    },

    onActivate(engine) {
        console.log("OviVoice: Activated");
        Sidebar.render(engine, this);
    },

    /**
     * Speak a text message (Recordable version)
     */
    async speak(text, options = {}) {
        // Use Neural Engine (Test Tone for now, confirms recording)
        if (this.neuralEngine) {
            await this.neuralEngine.speak(text, options);
        } else {
            // Fallback (Not recordable)
            this.speakSystem(text, options);
        }
    },

    speakSystem(text, options = {}) {
        if (!this.synth) return;

        // Cancel existing speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;

        // Find a suitable voice
        const voices = this.synth.getVoices();
        let voice = null;

        if (options.lang === 'bn-BD') {
            // Priority: Google বাংলা (Standard on Chrome), then Microsoft ONLINE, then others
            voice = voices.find(v => v.name.includes('Google') && v.lang.includes('bn')) ||
                voices.find(v => v.name.includes('Bengali') || v.lang.includes('bn'));
        } else if (options.lang) {
            voice = voices.find(v => v.lang.includes(options.lang));
        }

        if (voice) utterance.voice = voice;

        if (options.onStart) utterance.onstart = options.onStart;
        if (options.onEnd) utterance.onend = options.onEnd;

        this.synth.speak(utterance);
    },

    stop() {
        if (this.synth) {
            this.synth.cancel();
            console.log("🗣️ OviVoice: Stopped.");
        }
    }
};

// Register plugin
engine.pluginManager.register(OviVoicePlugin);

export default OviVoicePlugin;
