/**
 * KineticEngine: High-impact CSS animation utility for OviStudio.
 */
export default class KineticEngine {
    constructor() {
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('ovi-kinetic-styles')) return;

        const style = document.createElement('style');
        style.id = 'ovi-kinetic-styles';
        style.textContent = `
            @keyframes ovi-pop-intro {
                0% { transform: scale(0.5); opacity: 0; }
                70% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
            }

            @keyframes ovi-slide-glide {
                0% { transform: translateX(-50px); opacity: 0; filter: blur(5px); }
                100% { transform: translateX(0); opacity: 1; filter: blur(0); }
            }

            @keyframes ovi-focus-glow {
                0% { text-shadow: 0 0 5px rgba(255,255,255,0); }
                50% { text-shadow: 0 0 20px rgba(55, 148, 255, 0.8); }
                100% { text-shadow: 0 0 5px rgba(255,255,255,0); }
            }

            @keyframes ovi-ken-burns {
                0% { transform: scale(1) translate(0, 0); }
                100% { transform: scale(1.2) translate(-2%, -2%); }
            }

            @keyframes ovi-shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px) rotate(-1deg); }
                75% { transform: translateX(5px) rotate(1deg); }
            }

            .ovi-kinetic-text {
                display: inline-block;
                animation-fill-mode: both;
                word-wrap: break-word;
            }

            .ovi-anim-pop { animation: ovi-pop-intro 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .ovi-anim-glide { animation: ovi-slide-glide 0.8s ease-out; }
            .ovi-anim-glow { animation: ovi-focus-glow 2s infinite ease-in-out; }

            /* Emphasis Styles */
            .ovi-emphasize-highlight {
                color: #3794ff;
                font-weight: 800;
                display: inline-block;
                text-shadow: 0 0 10px rgba(55, 148, 255, 0.3);
            }

            .ovi-emphasize-shake {
                display: inline-block;
                animation: ovi-shake 0.3s infinite;
                color: #ff4757;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Wrap text into an animated container.
     */
    wrap(text, preset = 'pop', duration = 0.6) {
        if (!text) return '';

        // --- Smart Parsing ---
        // 1. Highlight: *text*
        let processed = text.replace(/\*(.*?)\*/g, '<span class="ovi-emphasize-highlight">$1</span>');

        // 2. Shake/Strong: !text!
        processed = processed.replace(/!(.*?)!/g, '<span class="ovi-emphasize-shake">$1</span>');

        const cls = `ovi-anim-${preset}`;
        return `<div class="ovi-kinetic-text ${cls}" style="animation-duration: ${duration}s;">${processed}</div>`;
    }

    /**
     * Typewriter effect helper.
     */
    getTypewriterHTML(text, duration) {
        // Simple CSS typewriter simulation
        const charCount = text.length;
        const style = `
            display: inline-block;
            overflow: hidden;
            white-space: nowrap;
            border-right: 2px solid;
            width: 0;
            animation: ovi-typewriter ${duration}s steps(${charCount}) forwards, ovi-blink 0.75s step-end infinite;
        `;

        if (!document.getElementById('ovi-typewriter-kf')) {
            const kf = document.createElement('style');
            kf.id = 'ovi-typewriter-kf';
            kf.textContent = `
                @keyframes ovi-typewriter { from { width: 0; } to { width: 100%; } }
                @keyframes ovi-blink { from, to { border-color: transparent; } 50% { border-color: orange; } }
            `;
            document.head.appendChild(kf);
        }

        return `<div style="${style}">${text}</div>`;
    }
}
