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
        this.onChange = config.onChange || (() => { });

        // Create DOM element
        this.element = this.createDOM();
        this.bindEvents();
    }

    createDOM() {
        const container = document.createElement('div');
        container.className = 'ovi-slider-widget';
        container.setAttribute('data-widget-id', this.id);

        // Inline CSS
        const style = document.createElement('style');
        style.textContent = `
            .ovi-slider-widget {
                margin-bottom: 15px;
                padding: 10px;
                background: #fff;
                border-radius: 4px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .ovi-slider-label {
                display: block;
                margin-bottom: 8px;
                font-size: 13px;
                font-weight: 500;
                color: #333;
            }
            .ovi-slider-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .ovi-slider-input {
                flex: 1;
                -webkit-appearance: none;
                appearance: none;
                height: 6px;
                background: #ddd;
                border-radius: 3px;
                outline: none;
            }
            .ovi-slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                background: #007bff;
                border-radius: 50%;
                cursor: pointer;
                transition: background 0.2s;
            }
            .ovi-slider-input::-webkit-slider-thumb:hover {
                background: #0056b3;
            }
            .ovi-slider-input::-moz-range-thumb {
                width: 18px;
                height: 18px;
                background: #007bff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
                transition: background 0.2s;
            }
            .ovi-slider-input::-moz-range-thumb:hover {
                background: #0056b3;
            }
            .ovi-slider-value {
                min-width: 50px;
                text-align: right;
                font-size: 13px;
                font-weight: 600;
                color: #007bff;
            }
        `;
        container.appendChild(style);

        // Widget HTML
        const widgetHTML = `
            <label class="ovi-slider-label">${this.label}</label>
            <div class="ovi-slider-container">
                <input 
                    type="range" 
                    class="ovi-slider-input"
                    min="${this.min}" 
                    max="${this.max}" 
                    step="${this.step}"
                    value="${this.value}"
                >
                <span class="ovi-slider-value">${this.value}</span>
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
            this.onChange(this.value);
        });
    }

    setValue(newValue) {
        this.value = newValue;
        const input = this.element.querySelector('.ovi-slider-input');
        const valueDisplay = this.element.querySelector('.ovi-slider-value');
        if (input) input.value = newValue;
        if (valueDisplay) valueDisplay.textContent = newValue;
    }

    getValue() {
        return this.value;
    }

    // For HTML5 export - returns standalone code
    static getEmbeddableCode() {
        return this.toString();
    }
}
