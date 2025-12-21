/**
 * OviVoice Plugin
 * Handles Text-to-Speech and voice narrations for Brimtale
 */
import engine from '../../js/core/OviEngine.js';
import Sidebar from './Sidebar.js';

const OviVoicePlugin = {
    id: 'ovivoice',
    name: 'OviVoice',
    icon: 'Vo',

    init(engine) {
        console.log("OviVoice: Initialized");
        this.synth = window.speechSynthesis;
    },

    onActivate(engine) {
        console.log("OviVoice: Activated");
        Sidebar.render(engine, this);
    },

    /**
     * Speak a text message
     * @param {string} text 
     * @param {object} options { rate, pitch, voice }
     */
    speak(text, options = {}) {
        if (!this.synth) return;

        // Cancel existing speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;

        // Find a suitable voice (prefer English/Bangla based on context)
        const voices = this.synth.getVoices();
        if (options.lang) {
            const voice = voices.find(v => v.lang.includes(options.lang));
            if (voice) utterance.voice = voice;
        }

        this.synth.speak(utterance);
    },

    stop() {
        if (this.synth) this.synth.cancel();
    }
};

// Register plugin
engine.pluginManager.register(OviVoicePlugin);

export default OviVoicePlugin;
