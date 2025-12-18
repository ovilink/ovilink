/**
 * Symbol Picker Component
 * Modal popup for selecting emojis/symbols to add to canvas
 */

import { SYMBOL_CATEGORIES } from '../../templates/SymbolCategories.js';

export default class SymbolPicker {
    constructor(engine) {
        this.engine = engine;
        this.currentCategory = 'smileys';
        this.modal = null;
        this.onSelect = null; // Callback when symbol is selected
    }

    /**
     * Open the symbol picker modal
     * @param {Function} callback - Called with selected symbol
     */
    open(callback) {
        this.onSelect = callback;
        this.render();
        this.modal.style.display = 'flex';

        // Focus management
        setTimeout(() => {
            const firstSymbol = this.modal.querySelector('.symbol-item');
            if (firstSymbol) firstSymbol.focus();
        }, 100);
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    /**
     * Render the modal (creates on first call)
     */
    render() {
        // Create modal if it doesn't exist
        if (!this.modal) {
            this.createModal();
        }
        // Update content
        this.updateContent();
    }

    /**
     * Create the modal structure
     */
    createModal() {
        // Create overlay
        this.modal = document.createElement('div');
        this.modal.className = 'symbol-picker-overlay';
        this.modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;

        // Create modal content
        const content = document.createElement('div');
        content.className = 'symbol-picker-content';
        content.style.cssText = `
            background: #2a2a2a;
            border-radius: 12px;
            width: 500px;
            max-width: 90%;
            max-height: 600px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <h3 style="margin: 0; color: #fff; font-size: 18px;">Select Symbol</h3>
            <button class="close-btn" style="background: none; border: none; color: #999; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;">&times;</button>
        `;

        // Category tabs
        const tabs = document.createElement('div');
        tabs.className = 'category-tabs';
        tabs.style.cssText = `
            display: flex;
            padding: 10px 20px;
            gap: 8px;
            border-bottom: 1px solid #444;
            overflow-x: auto;
            scrollbar-width: thin;
        `;

        // Symbol grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'symbol-grid-container';
        gridContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        `;

        // Custom input section
        const customSection = document.createElement('div');
        customSection.style.cssText = `
            padding: 15px 20px;
            border-top: 1px solid #444;
            background: #222;
        `;
        customSection.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center;">
                <label style="color: #999; font-size: 13px; white-space: nowrap;">Custom:</label>
                <input 
                    type="text" 
                    class="custom-symbol-input" 
                    placeholder="Paste emoji here..." 
                    maxlength="2"
                    style="flex: 1; padding: 8px 12px; background: #333; border: 1px solid #555; border-radius: 6px; color: #fff; font-size: 24px; text-align: center;"
                />
                <button 
                    class="add-custom-btn"
                    style="padding: 8px 16px; background: #007acc; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;"
                >Add</button>
            </div>
        `;

        // Assemble modal
        content.appendChild(header);
        content.appendChild(tabs);
        content.appendChild(gridContainer);
        content.appendChild(customSection);
        this.modal.appendChild(content);
        document.body.appendChild(this.modal);

        // Event listeners
        header.querySelector('.close-btn').onclick = () => this.close();
        this.modal.onclick = (e) => {
            if (e.target === this.modal) this.close();
        };

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.close();
            }
        });

        // Custom symbol add
        const addBtn = customSection.querySelector('.add-custom-btn');
        const customInput = customSection.querySelector('.custom-symbol-input');
        addBtn.onclick = () => {
            const symbol = customInput.value.trim();
            if (symbol) {
                this.selectSymbol(symbol);
                customInput.value = '';
            }
        };
        customInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                addBtn.click();
            }
        };

        // Store references
        this.tabsContainer = tabs;
        this.gridContainer = gridContainer;
    }

    /**
     * Update modal content with current category
     */
    updateContent() {
        // Render category tabs
        this.tabsContainer.innerHTML = '';
        Object.keys(SYMBOL_CATEGORIES).forEach(categoryKey => {
            const cat = SYMBOL_CATEGORIES[categoryKey];
            const tab = document.createElement('button');
            tab.className = 'category-tab';
            tab.style.cssText = `
                padding: 8px 12px;
                background: ${categoryKey === this.currentCategory ? '#007acc' : '#333'};
                color: ${categoryKey === this.currentCategory ? '#fff' : '#999'};
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                white-space: nowrap;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
                justify-content: center;
            `;
            tab.innerHTML = `${cat.icon} ${cat.name}`;
            tab.onclick = () => {
                this.currentCategory = categoryKey;
                this.updateContent();
            };
            this.tabsContainer.appendChild(tab);
        });

        // Render symbol grid
        const category = SYMBOL_CATEGORIES[this.currentCategory];
        this.gridContainer.innerHTML = '';

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
            gap: 8px;
        `;

        category.symbols.forEach(symbol => {
            const item = document.createElement('button');
            item.className = 'symbol-item';
            item.textContent = symbol;
            item.style.cssText = `
                width: 50px;
                height: 50px;
                background: #333;
                border: 2px solid transparent;
                border-radius: 8px;
                font-size: 28px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            item.onclick = () => {
                // Set as custom input value
                const customInput = this.modal.querySelector('.custom-symbol-input');
                if (customInput) {
                    customInput.value = symbol;
                    customInput.focus();
                }

                // Visual update
                this.gridContainer.querySelectorAll('.symbol-item').forEach(btn => {
                    btn.style.background = '#333';
                    btn.style.borderColor = 'transparent';
                    btn.style.transform = 'scale(1)';
                    btn.classList.remove('selected');
                });

                item.classList.add('selected');
                item.style.background = '#444';
                item.style.borderColor = '#007acc';
                item.style.transform = 'scale(1.1)';
            };

            // Improved hover logic that respects selection
            item.onmouseenter = () => {
                if (!item.classList.contains('selected')) {
                    item.style.background = '#444';
                    item.style.transform = 'scale(1.1)';
                }
            };
            item.onmouseleave = () => {
                if (!item.classList.contains('selected')) {
                    item.style.background = '#333';
                    item.style.borderColor = 'transparent';
                    item.style.transform = 'scale(1)';
                }
            };
            grid.appendChild(item);
        });

        this.gridContainer.appendChild(grid);
    }

    /**
     * Handle symbol selection
     * @param {string} symbol - Selected symbol
     */
    selectSymbol(symbol) {
        if (this.onSelect) {
            this.onSelect(symbol);
        }
        this.close();
    }
}
