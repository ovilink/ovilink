export default class Inspector {
    static render(engine) {
        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Graph Properties</div>
                <div style="font-size: 12px;">Select a node to view properties.</div>
            </div>
        `);
    }

    static update(engine, data) {
        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Node Properties</div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px;">Type</label>
                    <input type="text" value="${data.type}" disabled style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 10px; margin-bottom: 4px;">Label</label>
                    <input type="text" value="${data.label}" style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                </div>

                <div style="display: flex; gap: 10px;">
                    <div>
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">X</label>
                        <input type="text" value="${Math.round(parseFloat(data.x))}" disabled style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 10px; margin-bottom: 4px;">Y</label>
                        <input type="text" value="${Math.round(parseFloat(data.y))}" disabled style="width: 100%; padding: 4px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 4px;">
                    </div>
                </div>
            </div>
        `);
    }
}
