/**
 * ButtonWidget - Self-contained button control with inline CSS
 * Designed for HTML5 export with no external dependencies
 */
export default class ButtonWidget {
    constructor(config) {
        this.id = config.id || 'button_' + Date.now();
        this.label = config.label || 'Click';
        this.variant = config.variant || 'primary'; // primary, secondary, danger
        this.onClick = config.onClick || (() => { });

        // Create DOM element
        this.element = this.createDOM();
        this.bindEvents();
    }

    createDOM() {
        const container = document.createElement('div');
        container.className = 'ovi-button-widget';
        container.setAttribute('data-widget-id', this.id);

        // Inline CSS
        const style = document.createElement('style');
        style.textContent = `
            .ovi-button-widget {
                margin-bottom: 10px;
            }
            .ovi-button {
                width: 100%;
                padding: 10px 16px;
                font-size: 14px;
                font-weight: 500;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                outline: none;
            }
            .ovi-button:active {
                transform: translateY(1px);
            }
            .ovi-button-primary {
                background: #007bff;
                color: white;
            }
            .ovi-button-primary:hover {
                background: #0056b3;
            }
            .ovi-button-secondary {
                background: #6c757d;
                color: white;
            }
            .ovi-button-secondary:hover {
                background: #545b62;
            }
            .ovi-button-danger {
                background: #dc3545;
                color: white;
            }
            .ovi-button-danger:hover {
                background: #c82333;
            }
        `;
        container.appendChild(style);

        // Button HTML
        const button = document.createElement('button');
        button.className = `ovi-button ovi-button-${this.variant}`;
        button.textContent = this.label;
        container.appendChild(button);

        return container;
    }

    bindEvents() {
        const button = this.element.querySelector('.ovi-button');
        button.addEventListener('click', () => {
            this.onClick();
        });
    }

    setLabel(newLabel) {
        this.label = newLabel;
        const button = this.element.querySelector('.ovi-button');
        if (button) button.textContent = newLabel;
    }

    setEnabled(enabled) {
        const button = this.element.querySelector('.ovi-button');
        if (button) button.disabled = !enabled;
    }

    // For HTML5 export - returns standalone code
    static getEmbeddableCode() {
        return this.toString();
    }
}
