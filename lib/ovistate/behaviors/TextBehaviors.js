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
            speed: { type: 'number', min: 1, max: 100, default: 20, label: 'Speed (Chars/Sec)' },
            variability: { type: 'number', min: 0, max: 1, default: 0.2, step: 0.1, label: 'Speed Variability' },
            textList: { type: 'text', default: '', label: 'Multi-Text (Comma sep.)' },
            autoErase: { type: 'checkbox', default: false, label: 'Auto Erase' },
            eraseSpeed: { type: 'number', min: 1, max: 200, default: 50, label: 'Erase Speed' },
            eraseDelay: { type: 'number', min: 0, max: 5000, default: 1500, label: 'Wait before Erase (ms)' },
            loop: { type: 'checkbox', default: false, label: 'Loop Messages' },
            punctuationPause: { type: 'number', min: 0, max: 2000, default: 500, label: 'Punctuation Pause (ms)' },
            scramble: { type: 'checkbox', default: false, label: 'Scramble Effect' },
            scrambleDuration: { type: 'number', min: 0, max: 1000, default: 300, label: 'Scramble Duration (ms)' },
            tapToSkip: { type: 'checkbox', default: true, label: 'Tap to Skip' },
            soundEffect: { type: 'checkbox', default: false, label: 'Type Sound' },
            showCursor: { type: 'checkbox', default: true, label: 'Show Cursor' },
            cursorChar: { type: 'text', default: '|', label: 'Cursor Char' },
            onFinishAction: { type: 'dropdown', options: ['none', 'reset_pos', 'stop', 'jump', 'emit_action', 'set_variable'], default: 'none', label: 'On Finish' },
            onFinishID: { type: 'text', default: '', label: 'On Finish ID' },
            delay: { type: 'number', min: 0, max: 5000, default: 0, label: 'Start Delay (ms)' }
        },
        init(obj, runtime, registry) {
            if (obj._typewriterInited && !obj._forceReset) return;

            // State Tracking
            obj._twState = 'WAITING'; // WAITING, TYPING, SCRAMBLING, PAUSING, ERASING
            obj._twTextIndex = 0;
            obj._twCharIndex = 0;
            obj._twTimer = 0;
            obj._twCharTimer = 0;
            obj._twCurrentFull = '';
            obj._twQueue = [];
            obj._twFinishedCount = 0;

            const list = registry.getParameter(obj, 'typewriter', 'textList') || '';
            if (list.trim()) {
                obj._twQueue = list.split(',').map(s => s.trim());
            } else {
                obj._twQueue = [obj.text || 'New Text'];
            }

            obj._twCurrentFull = obj._twQueue[0] || '';
            obj._lastFullText = obj._twCurrentFull;

            obj.text = '';
            const delay = registry.getParameter(obj, 'typewriter', 'delay') || 0;
            obj._twTimer = delay / 1000;
            obj._typewriterInited = true;
            obj._forceReset = false;
        },
        update(obj, dt, runtime, registry) {
            if (obj.type !== 'text') return;

            const actMode = registry.getParameter(obj, 'typewriter', 'activationMode') || 'on_enter';
            if (actMode === 'manual') {
                if (!obj._behaviorState || !obj._behaviorState['typewriter']) {
                    obj.text = '';
                    return;
                }
            }

            if (!obj._typewriterInited) this.init(obj, runtime, registry);

            // Handle Reset on Parameter Change
            const currentList = registry.getParameter(obj, 'typewriter', 'textList') || '';
            if (obj._lastListParam !== currentList) {
                obj._lastListParam = currentList;
                obj._forceReset = true;
                this.init(obj, runtime, registry);
            }

            const speed = registry.getParameter(obj, 'typewriter', 'speed') || 20;
            const variability = registry.getParameter(obj, 'typewriter', 'variability') || 0;
            const puncPause = (registry.getParameter(obj, 'typewriter', 'punctuationPause') || 0) / 1000;
            const scramble = registry.getParameter(obj, 'typewriter', 'scramble');
            const scrambleDur = (registry.getParameter(obj, 'typewriter', 'scrambleDuration') || 300) / 1000;
            const loop = registry.getParameter(obj, 'typewriter', 'loop');
            const autoErase = registry.getParameter(obj, 'typewriter', 'autoErase');
            const eraseSpeed = registry.getParameter(obj, 'typewriter', 'eraseSpeed') || 50;
            const eraseDelay = (registry.getParameter(obj, 'typewriter', 'eraseDelay') || 1500) / 1000;
            const tapToSkip = registry.getParameter(obj, 'typewriter', 'tapToSkip');
            const soundEnabled = registry.getParameter(obj, 'typewriter', 'soundEffect');
            const showCursor = registry.getParameter(obj, 'typewriter', 'showCursor');
            const cursorChar = registry.getParameter(obj, 'typewriter', 'cursorChar') || '|';

            obj._twTimer -= dt;

            // Skip Logic
            if (tapToSkip && (runtime.isMouseDown || runtime._justClicked || obj._justClicked)) {
                if (obj._twState === 'TYPING' || obj._twState === 'SCRAMBLE_RUN' || obj._twState === 'WAITING') {
                    obj._twCharIndex = obj._twCurrentFull.length;
                    obj.text = obj._twCurrentFull;
                    obj._twState = 'PAUSING';
                    obj._twTimer = eraseDelay;
                    return;
                }
            }

            if (obj._twTimer > 0) return;

            if (obj._twState === 'WAITING') {
                obj._twState = scramble ? 'SCRAMBLING' : 'TYPING';
                obj._twTimer = 0;
            }

            if (obj._twState === 'SCRAMBLING') {
                obj._twTimer = scrambleDur;
                obj._twState = 'SCRAMBLE_RUN';
            }

            if (obj._twState === 'SCRAMBLE_RUN') {
                if (obj._twTimer <= 0) {
                    obj._twState = 'TYPING';
                } else {
                    const glyphs = '$%#*+=-_&^@!<>?';
                    let scrambled = '';
                    for (let n = 0; n < obj._twCurrentFull.length; n++) {
                        scrambled += glyphs[Math.floor(Math.random() * glyphs.length)];
                    }
                    obj.text = scrambled;
                    return;
                }
            }

            if (obj._twState === 'TYPING') {
                obj._twCharTimer -= dt;
                if (obj._twCharTimer <= 0) {
                    obj._twCharIndex++;

                    if (obj._twCharIndex > obj._twCurrentFull.length) {
                        // Finished this message
                        obj._twState = 'PAUSING';
                        obj._twTimer = eraseDelay;

                        // On Finish Logic
                        const finishAct = registry.getParameter(obj, 'typewriter', 'onFinishAction');
                        const finishID = registry.getParameter(obj, 'typewriter', 'onFinishID');
                        if (finishAct && finishAct !== 'none') {
                            if (runtime.triggerAction) runtime.triggerAction(finishAct, obj, finishID);
                        }
                    } else {
                        // Type next char
                        const char = obj._twCurrentFull[obj._twCharIndex - 1];
                        let nextDelay = (1 / speed);

                        // variability
                        if (variability > 0) {
                            nextDelay *= (1 + (Math.random() - 0.5) * variability * 2);
                        }

                        // Punctuation Pause
                        if (['.', ',', '?', '!', ':'].includes(char)) {
                            nextDelay += puncPause;
                        }

                        obj._twCharTimer = nextDelay;
                        obj.text = obj._twCurrentFull.substring(0, obj._twCharIndex);
                        if (showCursor) obj.text += cursorChar;
                        if (soundEnabled) this.playTypeSound(runtime);
                    }
                }
            } else if (obj._twState === 'PAUSING') {
                if (obj._twTimer <= 0) {
                    if (autoErase) {
                        obj._twState = 'ERASING';
                    } else if (obj._twQueue.length > 1) {
                        // Move to next message directly if not erasing
                        this.typewriterNextMessage(obj, scramble);
                    } else if (loop) {
                        obj._forceReset = true;
                        this.init(obj, runtime, registry);
                    }
                }
            } else if (obj._twState === 'ERASING') {
                obj._twCharTimer -= dt;
                if (obj._twCharTimer <= 0) {
                    obj._twCharIndex--;
                    if (obj._twCharIndex < 0) {
                        this.typewriterNextMessage(obj, scramble);
                    } else {
                        obj._twCharTimer = (1 / eraseSpeed);
                        obj.text = obj._twCurrentFull.substring(0, obj._twCharIndex);
                        if (showCursor) obj.text += cursorChar;
                        if (soundEnabled) this.playTypeSound(runtime);
                    }
                }
            }

            // Blinking cursor when idle/finished
            if ((obj._twState === 'PAUSING' || (obj._twState === 'TYPING' && obj._twCharIndex === obj._twCurrentFull.length)) && showCursor) {
                if (Math.floor(Date.now() / 500) % 2 === 0) {
                    obj.text = obj._twCurrentFull.substring(0, obj._twCharIndex) + cursorChar;
                } else {
                    obj.text = obj._twCurrentFull.substring(0, obj._twCharIndex);
                }
            }
        },

        typewriterNextMessage(obj, scramble) {
            obj._twTextIndex++;
            if (obj._twTextIndex >= obj._twQueue.length) {
                obj._twTextIndex = 0;
            }
            obj._twCurrentFull = obj._twQueue[obj._twTextIndex];
            obj._twCharIndex = 0;
            obj._twState = scramble ? 'SCRAMBLING' : 'TYPING';
        },

        playTypeSound(rt) {
            if (!rt || !rt.getAudioContext) return;
            const ctx = rt.getAudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.05);

            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.05);
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
