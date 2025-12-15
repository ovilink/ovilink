import engine from '../core/OviEngine.js';

export default class TabManager {
    constructor() {
        this.tabsContainer = document.getElementById('tabs-container');
        this.editorArea = document.getElementById('editor-area');
        this.tabs = new Map(); // id -> { tabEl, contentEl, pluginId, editorInstance }
        this.editors = new Map(); // NEW: Track editor instances per tab
        this.activeTabId = null;
        this.activeEditorInstance = null; // NEW: Currently active editor
        this.tabCounter = 0;
        this.filteredPluginId = null; // Track which plugin is filtered
    }

    init() {
        console.log("TabManager: Initialized");
        // Clear initial static tabs
        if (this.tabsContainer) this.tabsContainer.innerHTML = '';
        if (this.editorArea) this.editorArea.innerHTML = '';

        // Setup overflow detection
        this.setupOverflowDetection();
    }

    setupOverflowDetection() {
        if (!this.tabsContainer) return;

        // Check overflow on scroll and resize
        const checkOverflow = () => {
            const hasOverflow = this.tabsContainer.scrollWidth > this.tabsContainer.clientWidth;
            this.tabsContainer.classList.toggle('has-overflow', hasOverflow);
        };

        // Initial check
        checkOverflow();

        // Listen for changes
        this.tabsContainer.addEventListener('scroll', checkOverflow);
        window.addEventListener('resize', checkOverflow);

        // Create a MutationObserver to detect tab additions/removals
        const observer = new MutationObserver(checkOverflow);
        observer.observe(this.tabsContainer, { childList: true });
    }

    /**
     * Sets the active editor instance and manages editor lifecycle.
     * Based on Sample Project's implementation.
     * @param {Object} editorInstance - The editor instance to activate
     */
    setActiveEditor(editorInstance) {
        // 1. Cleanup old editor
        if (this.activeEditorInstance) {
            // Stop rendering loop if exists
            if (this.activeEditorInstance.oviCanvas?.stop) {
                this.activeEditorInstance.oviCanvas.stop();
            }
            // Unbind events
            if (typeof this.activeEditorInstance.unbindEvents === 'function') {
                this.activeEditorInstance.unbindEvents();
            }
        }

        // 2. Clear canvas to prevent artifacts
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        // 3. Set new active editor
        this.activeEditorInstance = editorInstance;

        // 4. Activate new editor
        if (this.activeEditorInstance) {
            // Bind events for new editor
            if (typeof this.activeEditorInstance.bindEvents === 'function') {
                this.activeEditorInstance.bindEvents();
            }

            // Resize canvas if method exists
            if (typeof this.activeEditorInstance.resizeCanvas === 'function') {
                this.activeEditorInstance.resizeCanvas();
            }

            // Start rendering loop if exists
            if (this.activeEditorInstance.oviCanvas?.start) {
                this.activeEditorInstance.oviCanvas.start();
            }
        }

        console.log('Active editor set:', editorInstance ? 'Editor instance' : 'null');
    }

    /**
     * Opens a new tab or switches to an existing one.
     * @param {string} title - Tab title.
     * @param {string} pluginId - ID of the plugin that owns this tab.
     * @param {HTMLElement|string} content - The content to display (DOM element or HTML string).
     * @param {Object} editorInstance - Optional editor instance to track
     * @returns {string} The unique tab ID.
     */
    openTab(title, pluginId, content, editorInstance = null) {
        const id = `tab-${++this.tabCounter}`;

        // Get Plugin Icon
        let iconHtml = '';
        if (pluginId && engine.pluginManager) {
            const plugin = engine.pluginManager.getPlugin(pluginId);
            if (plugin && plugin.icon) {
                // If icon is just text (length <= 2), wrap it. If SVG, use as is.
                if (plugin.icon.length <= 3 && !plugin.icon.includes('<')) {
                    iconHtml = `<span style="
                        display: inline-flex; 
                        align-items: center; 
                        justify-content: center; 
                        width: 16px; 
                        height: 16px; 
                        background: var(--bg-hover); 
                        border-radius: 3px; 
                        font-size: 10px; 
                        margin-right: 6px;
                        color: var(--text-accent);
                    ">${plugin.icon}</span>`;
                } else {
                    iconHtml = `<span style="margin-right: 6px; display: flex; align-items: center;">${plugin.icon}</span>`;
                }
            }
        }

        // 1. Create Tab Element
        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.innerHTML = `
            ${iconHtml}
            <span>${title}</span>
            <span class="close-btn" style="font-size: 10px; margin-left: 8px; border-radius: 50%; padding: 2px 4px; cursor: pointer; opacity: 0.7;">✕</span>
        `;

        tabEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn')) {
                e.stopPropagation(); // Prevent activation when closing
                this.closeTab(id);
            } else {
                this.activateTab(id);
            }
        });

        this.tabsContainer.appendChild(tabEl);

        // 2. Create Content Element
        const contentEl = document.createElement('div');
        contentEl.className = 'tab-content';
        contentEl.style.display = 'none';
        contentEl.style.width = '100%';
        contentEl.style.height = '100%';

        if (typeof content === 'string') {
            contentEl.innerHTML = content;
        } else {
            contentEl.appendChild(content);
        }

        this.editorArea.appendChild(contentEl);

        // 3. Store State (including editor instance)
        this.tabs.set(id, { tabEl, contentEl, pluginId, editorInstance });

        // Store editor instance separately for easy access
        if (editorInstance) {
            this.editors.set(id, editorInstance);
        }

        // 4. Activate
        this.activateTab(id);

        // Update tab count badges
        this.updatePluginTabCounts();

        return id;
    }

    activateTab(id) {
        if (this.activeTabId === id) return;

        // Deactivate current
        if (this.activeTabId && this.tabs.has(this.activeTabId)) {
            const curr = this.tabs.get(this.activeTabId);
            curr.tabEl.classList.remove('active');
            curr.contentEl.style.display = 'none';
        }

        // Activate new
        const next = this.tabs.get(id);
        if (next) {
            // 1. Update visual state
            next.tabEl.classList.add('active');
            next.contentEl.style.display = 'block';
            this.activeTabId = id;

            // 2. Force a reflow to ensure content is rendered and visible
            next.contentEl.offsetHeight; // Trigger reflow

            // 3. CRITICAL: Set active editor BEFORE plugin activation
            // This ensures editor is ready when plugin's onActivate runs
            if (next.editorInstance) {
                this.setActiveEditor(next.editorInstance);
            }

            // 4. Activate plugin (without filtering to prevent tab hiding)
            if (next.pluginId && engine.pluginManager) {
                engine.pluginManager.activate(next.pluginId, true); // skipFiltering = true
            }

            console.log(`Tab activated: ${id}, plugin: ${next.pluginId}, editor:`, next.editorInstance ? 'Yes' : 'No');
        }
    }

    closeTab(id) {
        const tab = this.tabs.get(id);
        if (!tab) return;

        // Cleanup editor instance if it's the active one
        if (this.editors.has(id) && this.activeEditorInstance === this.editors.get(id)) {
            this.setActiveEditor(null); // Cleanup active editor
        }

        // Remove editor instance
        this.editors.delete(id);

        // Remove DOM elements
        tab.tabEl.remove();
        tab.contentEl.remove();

        // Remove from map
        this.tabs.delete(id);

        // If this was the active tab, activate another
        if (this.activeTabId === id) {
            const remaining = Array.from(this.tabs.keys());
            if (remaining.length > 0) {
                this.activateTab(remaining[remaining.length - 1]);
            } else {
                this.activeTabId = null;
            }
        }

        // Update tab count badges
        this.updatePluginTabCounts();
    }

    /**
     * Filter tabs by plugin ID
     * @param {string|null} pluginId - Plugin to filter, null shows all tabs
     */
    filterTabsByPlugin(pluginId) {
        this.filteredPluginId = pluginId;

        let firstVisibleTabId = null;

        // Show/hide tabs based on filter
        for (const [tabId, tabData] of this.tabs.entries()) {
            const shouldShow = !pluginId || tabData.pluginId === pluginId;

            if (shouldShow) {
                tabData.tabEl.style.display = 'flex';
                if (!firstVisibleTabId) firstVisibleTabId = tabId;
            } else {
                tabData.tabEl.style.display = 'none';
            }
        }

        // If active tab is now hidden, switch to first visible tab
        if (this.activeTabId && this.tabs.get(this.activeTabId)?.tabEl.style.display === 'none') {
            // CRITICAL FIX: Hide the content of the currently active tab since it's being filtered out
            const curr = this.tabs.get(this.activeTabId);
            if (curr) {
                curr.contentEl.style.display = 'none';
            }

            if (firstVisibleTabId) {
                this.activateTab(firstVisibleTabId);
            } else {
                // No visible tabs
                this.activeTabId = null;
                this.setActiveEditor(null); // Cleanup active editor
            }
        }

        console.log(`Tabs filtered by: ${pluginId || 'none (showing all)'}`);
    }

    /**
     * Get currently filtered plugin ID
     * @returns {string|null} The filtered plugin ID or null if showing all
     */
    getFilteredPlugin() {
        return this.filteredPluginId;
    }

    /**
     * Update tab count badges on activity icons
     */
    updatePluginTabCounts() {
        const tabCounts = {};

        // Count tabs per plugin
        for (const [tabId, tabData] of this.tabs.entries()) {
            const pluginId = tabData.pluginId;
            tabCounts[pluginId] = (tabCounts[pluginId] || 0) + 1;
        }

        // Update activity icons with tab counts
        for (const [pluginId, count] of Object.entries(tabCounts)) {
            const icon = document.querySelector(`.activity-item[data-id="${pluginId}"]`);
            if (icon) {
                icon.setAttribute('data-tab-count', count);
            }
        }

        // Clear counts for plugins with no tabs
        document.querySelectorAll('.activity-item[data-tab-count]').forEach(icon => {
            const pluginId = icon.getAttribute('data-id');
            if (!tabCounts[pluginId]) {
                icon.removeAttribute('data-tab-count');
            }
        });
    }
}
