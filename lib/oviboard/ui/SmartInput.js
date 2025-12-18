/**
 * SmartInput.js
 * The "Invisible" Voice Math Engine.
 * Handles Direct-to-Canvas writing, Auto-Newline, and Text Replacement.
 */
import VoiceInput from '../utils/VoiceInput.js';

export default class SmartInput {
    constructor(editor) {
        this.editor = editor;

        // State
        this.isActive = false;
        this.subject = 'math'; // 'math' or 'general'
        this.language = 'en-US'; // 'en-US' or 'bn-BD'
        this.alignMode = 'left'; // 'left' or 'smart'
        this.isEditing = false;

        // The object currently being written to
        this.activeObject = null;

        this.voiceEngine = new VoiceInput(
            (text, isFinal) => this.onVoiceResult(text, isFinal),
            () => this.onVoiceEnd()
        );

        this.createStatusBar();
        this.setupGlobalKeys();
    }

    createStatusBar() {
        this.statusBar = document.createElement('div');
        Object.assign(this.statusBar.style, {
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            display: 'flex',
            gap: '20px',
            fontSize: '14px',
            fontFamily: 'Segoe UI, sans-serif',
            zIndex: '1000',
            userSelect: 'none',
            border: '1px solid #e0e0e0'
        });

        // 1. Mic Status
        this.micIndicator = document.createElement('span');
        this.micIndicator.innerText = '🎙️ OFF';
        this.micIndicator.style.color = '#999';
        this.micIndicator.style.fontWeight = '600';

        // 2. Language Toggle
        this.langToggle = document.createElement('span');
        this.langToggle.innerText = '🇺🇸 ENG';
        this.langToggle.style.cursor = 'pointer';
        this.langToggle.style.fontWeight = 'bold';
        this.langToggle.style.color = '#555';
        this.langToggle.title = "Switch Language";

        this.langToggle.onclick = () => {
            if (this.language === 'en-US') {
                this.language = 'bn-BD';
                this.langToggle.innerText = '🇧🇩 BAN';
                this.voiceEngine.setLanguage('bn-BD');
            } else {
                this.language = 'en-US';
                this.langToggle.innerText = '🇺🇸 ENG';
                this.voiceEngine.setLanguage('en-US');
            }
        };

        // 3. Mode Toggle
        this.modeToggle = document.createElement('span');
        this.modeToggle.innerText = '📐 MATH';
        this.modeToggle.style.fontWeight = 'bold';
        this.modeToggle.style.cursor = 'pointer';
        this.modeToggle.style.color = '#0277bd';
        this.modeToggle.title = "Toggle Subject Mode";

        this.modeToggle.onclick = () => {
            if (this.subject === 'math') {
                this.subject = 'general';
                this.modeToggle.innerText = '📝 TEXT';
                this.modeToggle.style.color = '#555';
            } else {
                this.subject = 'math';
                this.modeToggle.innerText = '📐 MATH';
                this.modeToggle.style.color = '#0277bd';
            }
        };

        // 4. Align Toggle
        this.alignToggle = document.createElement('span');
        this.alignToggle.innerText = '⬅️ LEFT';
        this.alignToggle.style.fontWeight = 'bold';
        this.alignToggle.style.cursor = 'pointer';
        this.alignToggle.style.color = '#555';
        this.alignToggle.title = "Toggle Alignment Mode";

        this.alignToggle.onclick = () => {
            if (this.alignMode === 'left') {
                this.alignMode = 'smart';
                this.alignToggle.innerText = '🧱 SMART';
                this.alignToggle.style.color = '#e67e22'; // Orange for Smart
            } else {
                this.alignMode = 'left';
                this.alignToggle.innerText = '⬅️ LEFT';
                this.alignToggle.style.color = '#555';
            }
        };

        this.statusBar.appendChild(this.micIndicator);
        this.statusBar.appendChild(this.langToggle);
        this.statusBar.appendChild(this.modeToggle);
        this.statusBar.appendChild(this.alignToggle); // Added

        if (this.editor.parentElement) {
            this.editor.parentElement.appendChild(this.statusBar);
        } else {
            document.body.appendChild(this.statusBar);
        }
    }

    setupGlobalKeys() {
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                if (this.voiceEngine.isListening) {
                    this.stopVoice();
                } else {
                    this.startVoice();
                }
            }
        });
    }

    // --- Voice Logic ---

    startVoice() {
        if (this.voiceEngine.isListening) return;

        if (this.micIndicator) {
            this.micIndicator.innerText = '🎙️ LISTENING...';
            this.micIndicator.style.color = '#e74c3c';
        }

        this.createActiveObject();
        this.voiceEngine.start();
        this.isActive = true;
    }

    stopVoice() {
        this.voiceEngine.stop();
    }

    createActiveObject() {
        // Replace existing logic
        if (this.editor.activeSmartObject && this.editor.activeSmartObject.type === 'text') {
            this.activeObject = this.editor.activeSmartObject;
            this.isEditing = true;
            return;
        }

        this.isEditing = false;

        // Position Logic
        if (this.editor.cursorPos.x === 0 && this.editor.cursorPos.y === 0) {
            const cx = (this.editor.width || 800) / 2;
            const cy = (this.editor.height || 600) / 2;
            this.editor.cursorPos.x = (cx / this.editor.camera.zoom) - this.editor.camera.x - 200;
            this.editor.cursorPos.y = (cy / this.editor.camera.zoom) - this.editor.camera.y - 100;
        }

        const x = this.editor.cursorPos.x;
        const y = this.editor.cursorPos.y;

        // BENGALI FONT SUPPORT
        // If Bangla mode, we might want a Bengali font (e.g. Kalpurush if available, or system default)
        // For now, system default usually handles Bangla.

        let style = {};
        if (this.subject === 'math') {
            style = {
                fontFamily: 'Times New Roman',
                fontStyle: 'italic',
                fontSize: 40,
                color: '#2c3e50'
            };
        } else {
            style = {
                fontFamily: 'Arial',
                fontStyle: 'normal',
                fontSize: 32,
                color: '#333'
            };
        }

        // Pass center: false to prevent drift
        this.activeObject = this.editor.addTextObject("...", x, y, style, { center: false });
    }

    onVoiceResult(text, isFinal) {
        if (!this.activeObject) return;

        let processedText = text;

        if (this.subject === 'math') {
            processedText = this.processMath(text);
        } else {
            // Text Mode: Minimal cleanup
            processedText = text.charAt(0).toUpperCase() + text.slice(1);
        }

        this.activeObject.content.text = processedText;
        this.editor.render();
    }

    onVoiceEnd() {
        this.isActive = false;

        if (this.micIndicator) {
            this.micIndicator.innerText = '🎙️ OFF';
            this.micIndicator.style.color = '#999';
        }

        if (this.activeObject) {
            // SMART ALIGNMENT LOGIC
            if (this.subject === 'math') {
                const text = this.activeObject.content.text.trim();
                const currentIndex = this.editor.objects.indexOf(this.activeObject);

                if (currentIndex > 0) {
                    const prevObj = this.editor.objects[currentIndex - 1];

                    // 1. SMART MODE: Align '=' with previous '='
                    if (this.alignMode === 'smart' && text.startsWith('=')) {
                        if (prevObj.type === 'text') {
                            const ctx = document.createElement('canvas').getContext('2d');
                            const fontStyle = prevObj.content.fontStyle || 'normal';
                            const fontSize = prevObj.content.fontSize || 32;
                            const fontFamily = prevObj.content.fontFamily || 'Arial';
                            ctx.font = `${fontStyle} ${fontSize}px ${fontFamily}`;

                            const prevText = prevObj.content.text;
                            const eqIndex = prevText.indexOf('=');

                            if (eqIndex !== -1) {
                                // Found '=' in previous line
                                const preEqText = prevText.substring(0, eqIndex);
                                const widthBefore = ctx.measureText(preEqText).width;

                                // Align current logic:
                                // Previous: [   2x + 5   ] = ...
                                // Current:                 = ...
                                // X should be: prevObj.x + widthBefore
                                // Adjust for padding/spacing if needed (approx +10px for ' ' before =)
                                this.activeObject.x = prevObj.x + widthBefore;
                            }
                        }
                    }
                    // 2. LEFT MODE (Default): Just ensure IT MATCHES previous X (Snap to grid/indent)
                    else if (this.alignMode === 'left') {
                        // Already handled by initial placement?
                        // Let's force snap to be sure
                        if (prevObj.type === 'text') {
                            this.activeObject.x = prevObj.x;
                        }
                    }
                }
            }

            if (this.isEditing) {
                this.activeObject.selected = true;
            } else {
                this.editor.cursorPos.y += 60; // Line Height
                this.editor.cursorPos.x = this.activeObject.x; // Indent Memory
                this.activeObject.selected = false;
            }

            this.activeObject = null;
            this.editor.render();
        }
    }

    // --- Math Processing Logic ---

    processMath(rawText) {
        let mathStr = rawText.toLowerCase();

        // --- GREEK ALPHABET (Science/Math Support) ---
        const greekMap = {
            'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ',
            'theta': 'θ', 'pi': 'π', 'sigma': 'σ', 'omega': 'ω',
            'lambda': 'λ', 'mu': 'μ', 'phi': 'φ', 'rho': 'ρ'
        };

        // Replace full words with Greek symbols
        Object.keys(greekMap).forEach(key => {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            mathStr = mathStr.replace(regex, greekMap[key]);
        });

        // --- BENGALI MATH ---
        mathStr = mathStr.replace(/যোগ/g, '+');
        mathStr = mathStr.replace(/বিয়োগ/g, '-');
        mathStr = mathStr.replace(/গুণ/g, '×');
        mathStr = mathStr.replace(/ভাগ/g, '/');
        mathStr = mathStr.replace(/সমান/g, '=');

        // Algebra (Bengali)
        mathStr = mathStr.replace(/স্কয়ার/g, '²');
        mathStr = mathStr.replace(/কিউব/g, '³');
        mathStr = mathStr.replace(/রুট/g, '√');
        mathStr = mathStr.replace(/পাই/g, 'π');

        // Brackets (Bengali Spoken)
        mathStr = mathStr.replace(/ব্র্যাকেট/g, '(');
        mathStr = mathStr.replace(/ফাস্ট ব্র্যাকেট/g, '(');
        mathStr = mathStr.replace(/ক্লোজ ব্র্যাকেট/g, ')');
        mathStr = mathStr.replace(/সেকেন্ড ব্র্যাকেট/g, '{');
        mathStr = mathStr.replace(/থার্ড ব্র্যাকেট/g, '[');

        // --- ENGLISH MATH ---
        mathStr = mathStr.replace(/\bplus\b/g, '+');
        mathStr = mathStr.replace(/\bminus\b/g, '-');
        mathStr = mathStr.replace(/\btimes\b/g, '×');
        mathStr = mathStr.replace(/\binto\b/g, '×');
        mathStr = mathStr.replace(/multiplied by/g, '×');
        mathStr = mathStr.replace(/divided by/g, '/');
        mathStr = mathStr.replace(/(\w+)\s+by\s+(\w+)/g, '$1/$2'); // "x by y" -> x/y

        mathStr = mathStr.replace(/equals/g, '=');
        mathStr = mathStr.replace(/equal to/g, '=');
        mathStr = mathStr.replace(/equal/g, '=');

        // Advanced Powers
        mathStr = mathStr.replace(/to the power of 2/g, '²');
        mathStr = mathStr.replace(/to the power of 3/g, '³');
        // Generic power notation for lazy teachers? maybe "^" visual
        mathStr = mathStr.replace(/to the power of/g, '^');

        // Roots
        mathStr = mathStr.replace(/square root of/g, '√');
        mathStr = mathStr.replace(/root under/g, '√'); // "Root under x"
        mathStr = mathStr.replace(/\broot\b/g, '√');

        // Brackets
        mathStr = mathStr.replace(/(open|start|first) bracket/g, '(');
        mathStr = mathStr.replace(/(close|end) bracket/g, ')');

        // Smart Grouping: (a+b)^2 - RESTORED & IMPROVED
        // Capture "A plus B whole square" pattern
        const wholeSquareRegex = /([a-z0-9]+(?:\s*[+\-]\s*[a-z0-9]+)+)\s*whole\s*square(?:d)?/g;
        if (wholeSquareRegex.test(mathStr)) {
            mathStr = mathStr.replace(wholeSquareRegex, '($1)²');
        }

        mathStr = mathStr.replace(/whole square(?:d)?/g, '²');
        mathStr = mathStr.replace(/squared/g, '²');
        mathStr = mathStr.replace(/cubed/g, '³');
        // Generic square must be after whole square check
        mathStr = mathStr.replace(/square/g, '²');
        mathStr = mathStr.replace(/cube/g, '³');

        // Implicit Multiplication / Variable Joining
        // "2 a b" -> "2ab"
        // Cycle a few times to catch all (a b c)
        mathStr = mathStr.replace(/([0-9])\s+([a-z])/g, '$1$2');
        mathStr = mathStr.replace(/([a-z])\s+([a-z])/g, '$1$2');
        mathStr = mathStr.replace(/([a-z])\s+([a-z])/g, '$1$2'); // Repeat for "a b c" -> "ab c" -> "abc"

        // Cleanup extra spaces around operators
        mathStr = mathStr.replace(/\s*([+\-=×/])\s*/g, ' $1 ');

        return mathStr.trim();
    }
}
