export default class StudioInspector {
    constructor(editor) {
        this.editor = editor;
        this.container = document.createElement('div');
        this.container.id = 'studio-inspector-content';
        this.container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
            padding: 15px;
            color: #ccc;
            font-family: 'Segoe UI', sans-serif;
            font-size: 12px;
            overflow-y: auto;
            height: 100%;
        `;
    }

    render() {
        if (!this.editor.activeMode) {
            this.container.innerHTML = `<div style="padding: 20px; color: #666;">Initializing environment...</div>`;
            return this.container;
        }

        this.container.innerHTML = `
            <!-- SHARED PROJECT SETTINGS (Placeholder) -->
            <!-- <div style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 5px;">PROJECT SETTINGS</div> -->
            
            <!-- MODE SPECIFIC CONTROLS -->
            ${this.editor.activeMode.renderInspector()}

            <!-- GLOBAL FOOTER -->
            <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid #333; opacity: 0.5; font-size: 10px;">
                OviStudio v2.0 - ${this.editor.activeMode.name}
            </div>
        `;

        this.bindEvents();
        return this.container;
    }

    bindEvents() {
        // Delegate all events to the active mode
        if (this.editor.activeMode && this.editor.activeMode.bindEvents) {
            this.editor.activeMode.bindEvents(this.container);
        }
    }
}
