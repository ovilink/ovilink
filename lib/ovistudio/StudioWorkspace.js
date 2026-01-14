export default class StudioWorkspace {
    constructor(editor) {
        this.editor = editor;
        this.engine = editor.engine;
    }

    get id() {
        return this.editor.id;
    }

    /**
     * Called when the mode is activated.
     * Setup any UI, overlays, or event listeners.
     */
    activate() { }

    /**
     * Called when the mode is deactivated.
     * Cleanup UI, stop streams, remove listeners.
     */
    deactivate() { }

    /**
     * Called during the main render pass of StudioEditor.
     * Should return HTML for effects/overlays.
     */
    renderOverlays() {
        return '';
    }

    /**
     * Called for inspector rendering.
     * Should return HTML for mode-specific controls.
     */
    renderInspector() {
        return '';
    }

    /**
     * Generic set of event bindings for the workspace.
     */
    bindEvents(container) { }

    /**
     * Called when a setting is updated.
     */
    onSettingUpdate(key, val) { }

    /**
     * Cleanup resources.
     */
    dispose() {
        this.deactivate();
    }
}
