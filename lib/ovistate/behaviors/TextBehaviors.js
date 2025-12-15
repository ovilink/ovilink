/**
 * Text Behaviors
 * Effects for Text Objects (Typewriter, Pulse, etc.)
 */
export function registerTextBehaviors(registry) {

    // Typewriter
    registry.register('typewriter', {
        name: 'Typewriter',
        category: 'text',
        icon: '⌨️',
        description: 'Type text character by character',
        parameters: {
            speed: { type: 'number', min: 1, max: 50, default: 10, label: 'Speed (Chars/Sec)' },
            loop: { type: 'checkbox', default: false, label: 'Loop' },
            loopDelay: { type: 'number', min: 0, max: 5000, default: 1000, label: 'Loop Delay (ms)' },
            showCursor: { type: 'checkbox', default: true, label: 'Show Cursor' },
            cursorChar: { type: 'text', default: '|', label: 'Cursor Char' },
            delay: { type: 'number', min: 0, max: 5000, default: 0, label: 'Start Delay (ms)' }
        },
        init(obj, runtime, registry) {
            if (obj._typewriterInited && !obj._forceReset) return;

            // PRESERVE TEXT FIX: If resetting (e.g. delay changed), use the known full text.
            // converting obj.text here would take the *partial* text from the animation.
            if (obj._forceReset && obj._lastFullText) {
                obj._fullText = obj._lastFullText;
            } else {
                obj._fullText = obj.text || '';
                if (obj.text === '' || obj.text === undefined) obj._fullText = obj._lastFullText || 'New Text';
                obj._lastFullText = obj._fullText;
            }

            obj._forceReset = false;
            obj.text = '';
            const delay = registry.getParameter(obj, 'typewriter', 'delay') || 0;
            obj._lastDelay = delay;
            obj._typeStartTime = Date.now() + delay;
            obj._typewriterInited = true;
        },
        update(obj, dt, runtime, registry) {
            if (obj.type !== 'text') return;

            // NEW: Check if manual mode and not yet activated
            const actMode = registry.getParameter(obj, 'typewriter', 'activationMode') || 'on_enter';
            if (actMode === 'manual') {
                // Check if behavior state exists and is false (not activated yet)
                if (!obj._behaviorState || !obj._behaviorState['typewriter']) {
                    obj.text = ''; // Keep text hidden until activated
                    return;
                }
            }

            if (!obj._typewriterInited) this.init(obj, runtime, registry);

            // React to property changes
            const currentDelay = Number(registry.getParameter(obj, 'typewriter', 'delay') || 0);
            if (obj._lastDelay !== currentDelay) {
                obj._forceReset = true;
                this.init(obj, runtime, registry);
                return; // Init will reset text, skip this frame
            }

            const now = Date.now();
            if (now < obj._typeStartTime) {
                // Keep text cleared while waiting
                obj.text = '';
                return;
            }

            const speed = registry.getParameter(obj, 'typewriter', 'speed') || 10;
            const loop = registry.getParameter(obj, 'typewriter', 'loop');
            const loopDelayMs = registry.getParameter(obj, 'typewriter', 'loopDelay') || 1000;
            const showCursor = registry.getParameter(obj, 'typewriter', 'showCursor');
            const cursorChar = registry.getParameter(obj, 'typewriter', 'cursorChar') || '|';

            const elapsed = (now - obj._typeStartTime) / 1000;
            const totalChars = obj._fullText.length;
            let showCount = Math.floor(elapsed * speed);

            let isFinished = false;

            if (loop) {
                const loopPauseSec = loopDelayMs / 1000;
                const cycleDuration = (totalChars / speed) + loopPauseSec;
                const cycleTime = elapsed % cycleDuration;
                if (cycleTime > (totalChars / speed)) {
                    showCount = totalChars;
                    isFinished = true; // Pausing before loop
                } else {
                    showCount = Math.floor(cycleTime * speed);
                }
            } else {
                showCount = Math.min(showCount, totalChars);
                if (showCount === totalChars) isFinished = true;
            }

            let currentText = obj._fullText.substring(0, showCount);

            // Cursor Blinking
            if (showCursor) {
                // Blink every 0.5s
                if (Math.floor(elapsed * 2) % 2 === 0 || !isFinished) {
                    currentText += cursorChar;
                }
            }

            obj.text = currentText;
        }
    });

    // Pulse Text (Size)
    registry.register('pulse_text', {
        name: 'Pulse Text',
        category: 'text',
        icon: '💓',
        description: 'Pulsates font size',
        parameters: {
            speed: { type: 'number', min: 0.1, max: 10, default: 2, label: 'Speed' },
            scale: { type: 'number', min: 1.1, max: 3, default: 1.5, label: 'Max Scale' }
        },
        init(obj) {
            if (!obj._baseFontSize) obj._baseFontSize = obj.fontSize || 20;
            if (!obj._pulseTime) obj._pulseTime = 0;
        },
        update(obj, dt, runtime, registry) {
            if (!obj._baseFontSize) obj._baseFontSize = obj.fontSize;
            if (obj._pulseTime === undefined) this.init(obj);

            const speed = registry.getParameter(obj, 'pulse_text', 'speed') || 2;
            const maxScale = registry.getParameter(obj, 'pulse_text', 'scale') || 1.5;

            obj._pulseTime += dt;
            const sine = (Math.sin(obj._pulseTime * speed) + 1) / 2;
            const scale = 1 + (sine * (maxScale - 1));

            obj.fontSize = obj._baseFontSize * scale;
        }
    });

    // Rainbow Text
    registry.register('rainbow_text', {
        name: 'Rainbow',
        category: 'text',
        icon: '🌈',
        description: 'Cycles text color',
        parameters: {
            speed: { type: 'number', min: 1, max: 20, default: 5, label: 'Speed' }
        },
        init(obj) {
            if (obj._rainbowTime === undefined) obj._rainbowTime = 0;
        },
        update(obj, dt, runtime, registry) {
            if (obj._rainbowTime === undefined) this.init(obj);

            const speed = registry.getParameter(obj, 'rainbow_text', 'speed') || 5;
            obj._rainbowTime += dt * speed;
            const hue = Math.floor(obj._rainbowTime * 50) % 360;
            obj.fill = `hsl(${hue}, 100%, 50%)`;
        }
    });
}
