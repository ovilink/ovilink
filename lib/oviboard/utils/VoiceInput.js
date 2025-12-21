/**
 * VoiceInput.js
 * Wrapper for Web Speech API to enable "Speak-to-Math"
 */
export default class VoiceInput {
    constructor(onResult, onEnd) {
        this.onResult = onResult; // Callback(text, isFinal)
        this.onEnd = onEnd;       // Callback()
        this.recognition = null;
        this.isListening = false;

        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn("Voice API not supported in this browser.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false; // Single command mode (Spacebar hold)
        this.recognition.interimResults = true; // Show words as they are spoken
        this.recognition.lang = 'en-US'; // Default to English for now

        this.recognition.onresult = (event) => {
            let interimPreview = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimPreview += event.results[i][0].transcript;
                }
            }

            // Prioritize final, else show preview
            const text = finalTranscript || interimPreview;
            if (this.onResult) this.onResult(text, !!finalTranscript);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log("🎤 Voice Stopped");
            if (this.onEnd) this.onEnd();
        };

        this.recognition.onerror = (event) => {
            console.error("Voice Error:", event.error);
            this.isListening = false;
        };
    }

    setLanguage(lang) {
        this.lang = lang;
        this.recognition.lang = lang;
    }

    start() {
        if (!this.recognition) return;
        if (this.isListening) return;

        try {
            this.recognition.start();
            this.isListening = true;
            console.log("🎤 Voice Listening...");
        } catch (e) {
            console.warn("Voice start error (likely already started):", e);
        }
    }

    stop() {
        if (!this.recognition) return;
        this.recognition.stop();
        // isListening will be set to false in onend
    }
}
