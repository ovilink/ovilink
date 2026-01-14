/**
 * SliderWidget - Self-contained slider control with inline CSS
 * Designed for HTML5 export with no external dependencies
 */
export default class SliderWidget {
    constructor(config) {
        this.id = config.id || 'slider_' + Date.now();
        this.label = config.label || 'Value';
        this.min = config.min !== undefined ? config.min : 0;
        this.max = config.max !== undefined ? config.max : 100;
        this.value = config.value !== undefined ? config.value : 50;
        this.step = config.step !== undefined ? config.step : 1;
        this.accentColor = config.accentColor || '#007acc';
        this.onChange = config.onChange || (() => { });

        // Create DOM element
        this.element = this.createDOM();
        this.bindEvents();
    }

    createDOM() {
        const container = document.createElement('div');
        container.className = 'ovi-slider-widget';
        container.setAttribute('data-widget-id', this.id);

        const pct = ((this.value - this.min) / (this.max - this.min)) * 100;

        // Inline CSS
        const style = document.createElement('style');
        style.textContent = `
            .ovi-slider-widget {
                margin-bottom: 20px;
                padding: 12px;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid rgba(0,0,0,0.05);
                font-family: 'Inter', -apple-system, sans-serif;
            }
            .ovi-slider-label-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .ovi-slider-label {
                font-size: 11px;
                font-weight: 700;
                color: #555;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .ovi-slider-value {
                font-size: 12px;
                font-weight: 700;
                color: ${this.accentColor};
                background: rgba(0, 122, 204, 0.08);
                padding: 2px 8px;
                border-radius: 4px;
                min-width: 30px;
                text-align: center;
            }
            .ovi-slider-container {
                display: flex;
                align-items: center;
            }
            .ovi-slider-input {
                flex: 1;
                -webkit-appearance: none;
                appearance: none;
                height: 6px;
                background: rgba(0,0,0,0.05); /* Adaptive light gray */
                border-radius: 3px;
                outline: none;
                background-image: linear-gradient(${this.accentColor}, ${this.accentColor});
                background-size: ${pct}% 100%;
                background-repeat: no-repeat;
                cursor: pointer;
            }
            .ovi-slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                background: #ffffff;
                border: 2px solid ${this.accentColor};
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .ovi-slider-input::-webkit-slider-thumb:hover {
                transform: scale(var(--hover-scale, 1.15));
                box-shadow: var(--hover-glow, 0 0 0 4px rgba(0, 122, 204, 0.1));
            }
            .ovi-slider-input::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #ffffff;
                border: 2px solid ${this.accentColor};
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                transition: all 0.2s;
            }
        `;
        container.appendChild(style);

        // Widget HTML
        const widgetHTML = `
            <div class="ovi-slider-label-row">
                <label class="ovi-slider-label">${this.label}</label>
                <span class="ovi-slider-value">${this.value}</span>
            </div>
            <div class="ovi-slider-container">
                <input 
                    type="range" 
                    class="ovi-slider-input"
                    min="${this.min}" 
                    max="${this.max}" 
                    step="${this.step}"
                    value="${this.value}"
                    style="--hover-scale: ${this.hoverScale || 1.15}; --hover-glow: ${this.showHoverGlow !== false ? `0 0 0 4px ${this.accentColor}1A` : 'none'};"
                >
            </div>
        `;

        const content = document.createElement('div');
        content.innerHTML = widgetHTML;
        container.appendChild(content);

        return container;
    }

    bindEvents() {
        const input = this.element.querySelector('.ovi-slider-input');
        const valueDisplay = this.element.querySelector('.ovi-slider-value');

        input.addEventListener('input', (e) => {
            this.value = parseFloat(e.target.value);
            valueDisplay.textContent = this.value;

            // Update Fill Percentage
            const pct = ((this.value - this.min) / (this.max - this.min)) * 100;
            input.style.backgroundSize = pct + '% 100%';

            this.onChange(this.value);
        });
    }

    setValue(newValue) {
        this.value = newValue;
        const input = this.element.querySelector('.ovi-slider-input');
        const valueDisplay = this.element.querySelector('.ovi-slider-value');
        if (input) {
            input.value = newValue;
            const pct = ((this.value - this.min) / (this.max - this.min)) * 100;
            input.style.backgroundSize = pct + '% 100%';
        }
        if (valueDisplay) valueDisplay.textContent = newValue;
    }

    getValue() {
        return this.value;
    }

    static getEmbeddableCode() {
        return this.toString();
    }
}
