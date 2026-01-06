/**
 * Template Browser UI
 * Modal dialog for browsing and selecting templates
 */

export default class TemplateBrowser {
    constructor(templateManager, editor) {
        this.templateManager = templateManager;
        this.editor = editor;
        this.modal = null;
        this.selectedTemplate = null;
    }

    /**
     * Show the template browser
     */
    async show() {
        // Load templates if not loaded
        if (this.templateManager.templates.length === 0) {
            await this.templateManager.loadBuiltInTemplates();
        }

        // Create modal
        this.createModal();
        this.renderTemplates();
    }

    /**
     * Create modal structure
     */
    createModal() {
        // Remove existing modal if any
        if (this.modal) {
            this.modal.remove();
        }

        this.modal = document.createElement('div');
        this.modal.className = 'template-browser-modal';
        this.modal.innerHTML = `
            <div class="template-browser-overlay"></div>
            <div class="template-browser-content">
                <div class="template-browser-header">
                    <h2>📋 Templates</h2>
                    <button class="close-btn" title="Close">×</button>
                </div>
                
                <div class="template-browser-categories">
                    <button class="category-btn active" data-category="all">All</button>
                    <button class="category-btn" data-category="physics">Physics</button>
                    <button class="category-btn" data-category="astronomy">Astronomy</button>
                    <button class="category-btn" data-category="motion">Motion</button>
                    <button class="category-btn" data-category="interactive">Interactive</button>
                </div>

                <div class="template-browser-grid"></div>

                <div class="template-browser-preview">
                    <div class="preview-placeholder">
                        Select a template to see details
                    </div>
                </div>

                <div class="template-browser-footer">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-apply" disabled>Use This Template</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Event listeners
        this.modal.querySelector('.close-btn').addEventListener('click', () => this.hide());
        this.modal.querySelector('.btn-cancel').addEventListener('click', () => this.hide());
        this.modal.querySelector('.btn-apply').addEventListener('click', () => this.applySelectedTemplate());
        this.modal.querySelector('.template-browser-overlay').addEventListener('click', () => this.hide());

        // Category buttons
        this.modal.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterByCategory(e.target.dataset.category));
        });
    }

    /**
     * Render template cards
     */
    renderTemplates(category = 'all') {
        const grid = this.modal.querySelector('.template-browser-grid');
        const templates = category === 'all'
            ? this.templateManager.getAllTemplates()
            : this.templateManager.getTemplatesByCategory(category);

        grid.innerHTML = templates.map(template => `
            <div class="template-card" data-id="${template.id}">
                <div class="template-thumbnail">
                    <img src="${this.templateManager.generateThumbnail(template)}" alt="${template.name}">
                </div>
                <div class="template-info">
                    <h3>${template.name}</h3>
                    <span class="template-category">${template.category}</span>
                </div>
            </div>
        `).join('');

        // Add click listeners to cards
        grid.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectTemplate(card.dataset.id);
            });
        });
    }

    /**
     * Filter templates by category
     */
    filterByCategory(category) {
        // Update active button
        this.modal.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // Re-render templates
        this.renderTemplates(category);
    }

    /**
     * Select a template
     */
    selectTemplate(templateId) {
        this.selectedTemplate = this.templateManager.getTemplate(templateId);

        // Update card selection
        this.modal.querySelectorAll('.template-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.id === templateId);
        });

        // Update preview
        this.showPreview(this.selectedTemplate);

        // Enable apply button
        this.modal.querySelector('.btn-apply').disabled = false;
    }

    /**
     * Show template preview
     */
    showPreview(template) {
        const preview = this.modal.querySelector('.template-browser-preview');
        preview.innerHTML = `
            <div class="preview-content">
                <h3>${template.name}</h3>
                <p>${template.description}</p>
                <div class="preview-stats">
                    <div class="stat">
                        <span class="stat-label">Objects:</span>
                        <span class="stat-value">${template.objects.length}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Physics:</span>
                        <span class="stat-value">${template.physics.enablePhysics ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Category:</span>
                        <span class="stat-value">${template.category}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Apply selected template
     */
    applySelectedTemplate() {
        if (!this.selectedTemplate) return;

        // Confirm if there are existing objects
        if (this.editor.runtime.objects.length > 0) {
            if (!confirm('This will replace your current work. Continue?')) {
                return;
            }
        }

        // Apply template
        const success = this.templateManager.applyTemplate(this.editor, this.selectedTemplate.id);

        if (success) {
            this.hide();
        }
    }

    /**
     * Hide the browser
     */
    hide() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        this.selectedTemplate = null;
    }
}
