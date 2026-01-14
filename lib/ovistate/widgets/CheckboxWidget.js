/**
 * CheckboxWidget - Self-contained checkbox control with inline CSS
 * Designed for HTML5 export with no external dependencies
 */
export default class CheckboxWidget {
    constructor(config) {
        this.id = config.id || 'checkbox_' + Date.now();
        this.label = config.label || 'Option';
        this.checked = config.checked !== undefined ? config.checked : false;
        this.onChange = config.onChange || (() => { });

        // Create DOM element
        this.element = this.createDOM();
        this.bindEvents();
    }

    createDOM() {
        const container = document.createElement('div');
        container.className = 'ovi-checkbox-widget';
        container.setAttribute('data-widget-id', this.id);

        // Inline CSS
        const style = document.createElement('style');
        style.textContent = `
            .ovi-checkbox-widget {
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                cursor: pointer;
                user-select: none;
            }
            .ovi-checkbox-input {
                width: 18px;
                height: 18px;
                margin-right: 8px;
                cursor: pointer;
                accent-color: #007bff;
            }
            .ovi-checkbox-label {
                font-size: 13px;
                color: #333;
                cursor: pointer;
            }
            .ovi-checkbox-widget:hover .ovi-checkbox-label {
                color: #007bff;
            }
        `;
        container.appendChild(style);

        // Checkbox HTML
        const checkboxId = `checkbox-input-${this.id}`;
        const content = document.createElement('div');
        content.innerHTML = `
            <input 
                type="checkbox" 
                class="ovi-checkbox-input"
                id="${checkboxId}"
                ${this.checked ? 'checked' : ''}
            >
            <label class="ovi-checkbox-label" for="${checkboxId}">${this.label}</label>
        `;

        container.appendChild(content.firstElementChild);
        container.appendChild(content.lastElementChild);

        return container;
    }

    bindEvents() {
        const input = this.element.querySelector('.ovi-checkbox-input');
        input.addEventListener('change', (e) => {
            this.checked = e.target.checked;
            this.onChange(this.checked);
        });
    }

    setChecked(checked) {
        this.checked = checked;
        const input = this.element.querySelector('.ovi-checkbox-input');
        if (input) input.checked = checked;
    }

    isChecked() {
        return this.checked;
    }

    // For HTML5 export - returns standalone code
    static getEmbeddableCode() {
        return this.toString();
    }
}
