import engine from './OviEngine.js';

export default class PluginManager {
    constructor(engine) {
        this.engine = engine;
        this.plugins = new Map(); // id -> plugin
        this.activePluginId = null;
    }

    init() {
        console.log("PluginManager: Initialized");
    }

    /**
     * Registers a new plugin.
     * @param {Object} plugin - The plugin definition.
     * @param {string} plugin.id - Unique ID (e.g., 'ovigraph').
     * @param {string} plugin.name - Display name.
     * @param {string} plugin.icon - Icon character or SVG.
     * @param {Function} plugin.init - Called when plugin is registered.
     * @param {Function} plugin.onActivate - Called when plugin is selected in Activity Bar.
     */
    register(plugin) {
        if (this.plugins.has(plugin.id)) {
            console.warn(`Plugin ${plugin.id} is already registered.`);
            return;
        }

        console.log(`PluginManager: Registering ${plugin.name}`);
        this.plugins.set(plugin.id, plugin);

        // Initialize the plugin
        if (plugin.init) {
            plugin.init(this.engine);
        }

        // Add to Activity Bar
        this.engine.layoutManager.addActivityItem(
            plugin.id,
            plugin.icon || '?',
            plugin.name,
            () => this.activate(plugin.id)
        );
    }

    getPlugin(id) {
        return this.plugins.get(id);
    }

    activate(pluginId, skipFiltering = false) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return;

        // Toggle logic: Check if clicking the same active plugin
        const isAlreadyActive = this.activePluginId === pluginId;
        const currentFilter = this.engine.tabManager.getFilteredPlugin();

        // Only apply filtering if NOT skipping (i.e., clicked from activity bar)
        if (!skipFiltering) {
            if (isAlreadyActive && currentFilter === pluginId) {
                // 2nd click on same plugin: Show all tabs (clear filter)
                this.engine.tabManager.filterTabsByPlugin(null);
                // Keep plugin active but remove visual filter indicator
                console.log(`Showing all tabs (filter cleared)`);
            } else {
                // 1st click or different plugin: Filter to this plugin's tabs
                this.engine.tabManager.filterTabsByPlugin(pluginId);

                // Deactivate previous plugin if different
                if (this.activePluginId && this.activePluginId !== pluginId) {
                    const prev = this.plugins.get(this.activePluginId);
                    if (prev && prev.onDeactivate) prev.onDeactivate();
                }

                this.activePluginId = pluginId;

                // Update UI via LayoutManager
                this.engine.layoutManager.setActiveActivity(pluginId);
                this.engine.layoutManager.setSidebarTitle(plugin.name.toUpperCase());

                // Activate new plugin
                if (plugin.onActivate) {
                    plugin.onActivate(this.engine);
                }

                console.log(`Activated plugin: ${pluginId} with tab filter`);
            }
        } else {
            // Skip filtering - just activate the plugin (from tab click)
            if (this.activePluginId && this.activePluginId !== pluginId) {
                const prev = this.plugins.get(this.activePluginId);
                if (prev && prev.onDeactivate) prev.onDeactivate();
            }

            this.activePluginId = pluginId;

            // Update UI
            this.engine.layoutManager.setActiveActivity(pluginId);
            this.engine.layoutManager.setSidebarTitle(plugin.name.toUpperCase());

            // Activate plugin
            if (plugin.onActivate) {
                plugin.onActivate(this.engine);
            }

            console.log(`Activated plugin: ${pluginId} (no filtering - from tab click)`);
        }
    }
}
