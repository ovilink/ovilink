import engine from '../core/OviEngine.js';

export default class TabManager {
    constructor() {
        this.tabsContainer = document.getElementById('tabs-container');
        this.editorArea = document.getElementById('editor-area');
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.tabs = new Map(); // id -> { tabEl, contentEl, pluginId, editorInstance }
        this.editors = new Map(); // Track editor instances per tab
        this.activeTabId = null;
        this.activeEditorInstance = null;
        this.tabCounter = 0;
        this.filteredPluginId = null;
    }

    init() {
        console.log("TabManager: Initialized");
        if (this.tabsContainer) this.tabsContainer.innerHTML = '';
        if (this.editorArea) {
            Array.from(this.editorArea.children).forEach(child => {
                if (child.id !== 'welcome-screen') child.remove();
            });
        }
        this.setupOverflowDetection();
        this.updateWelcomeScreen();
    }

    updateWelcomeScreen() {
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = this.tabs.size === 0 ? 'block' : 'none';
        }
    }

    getFilteredPlugin() {
        return this.filteredPluginId;
    }

    openTab(title, pluginId, content, editorInstance = null) {
        const id = `tab-${++this.tabCounter}`;

        // Get Plugin Icon
        let iconHtml = '';
        if (pluginId && engine.pluginManager) {
            const plugin = engine.pluginManager.getPlugin(pluginId);
            if (plugin && plugin.icon) {
                if (plugin.icon.length <= 3 && !plugin.icon.includes('<')) {
                    iconHtml = `<span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background: var(--bg-hover); border-radius: 3px; font-size: 10px; margin-right: 6px; color: var(--text-accent);">${plugin.icon}</span>`;
                } else {
                    iconHtml = `<span style="margin-right: 6px; display: flex; align-items: center;">${plugin.icon}</span>`;
                }
            }
        }

        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.innerHTML = `${iconHtml}<span>${title}</span><span class="close-btn" style="font-size: 10px; margin-left: 8px; border-radius: 50%; padding: 2px 4px; cursor: pointer; opacity: 0.7;">✕</span>`;

        tabEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn')) {
                e.stopPropagation();
                this.closeTab(id);
            } else {
                this.activateTab(id);
            }
        });

        this.tabsContainer.appendChild(tabEl);

        const contentEl = document.createElement('div');
        contentEl.className = 'tab-content';
        contentEl.style.display = 'none';
        contentEl.style.width = '100%';
        contentEl.style.height = '100%';

        if (typeof content === 'string') contentEl.innerHTML = content;
        else contentEl.appendChild(content);

        this.editorArea.appendChild(contentEl);
        this.tabs.set(id, { tabEl, contentEl, pluginId, editorInstance });
        if (editorInstance) this.editors.set(id, editorInstance);

        this.activateTab(id);
        this.updatePluginTabCounts();
        this.updateWelcomeScreen();

        return id;
    }

    activateTab(id) {
        if (this.activeTabId === id) return;

        if (this.activeTabId && this.tabs.has(this.activeTabId)) {
            const curr = this.tabs.get(this.activeTabId);
            curr.tabEl.classList.remove('active');
            curr.contentEl.style.display = 'none';
        }

        const next = this.tabs.get(id);
        if (next) {
            next.tabEl.classList.add('active');
            next.contentEl.style.display = 'block';
            this.activeTabId = id;
            next.contentEl.offsetHeight;

            if (next.editorInstance) {
                this.setActiveEditor(next.editorInstance);
            }

            if (next.pluginId && engine.pluginManager) {
                engine.pluginManager.activate(next.pluginId, true);
            }
        }
    }

    focusTabByTitle(title) {
        for (const [id, tab] of this.tabs.entries()) {
            const tabTitle = tab.tabEl.querySelector('span').innerText;
            if (tabTitle === title) {
                this.activateTab(id);
                return true;
            }
        }
        return false;
    }

    closeTab(id) {
        const tab = this.tabs.get(id);
        if (!tab) return;

        if (this.editors.has(id) && this.activeEditorInstance === this.editors.get(id)) {
            this.setActiveEditor(null);
        }

        this.editors.delete(id);
        tab.tabEl.remove();
        tab.contentEl.remove();
        this.tabs.delete(id);

        if (this.activeTabId === id) {
            const remaining = Array.from(this.tabs.keys());
            if (remaining.length > 0) this.activateTab(remaining[remaining.length - 1]);
            else this.activeTabId = null;
        }

        this.updatePluginTabCounts();
        this.updateWelcomeScreen();
    }

    setActiveEditor(editorInstance) {
        if (this.activeEditorInstance) {
            if (this.activeEditorInstance.oviCanvas?.stop) this.activeEditorInstance.oviCanvas.stop();
            if (typeof this.activeEditorInstance.unbindEvents === 'function') this.activeEditorInstance.unbindEvents();
        }

        const canvas = document.querySelector('canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        this.activeEditorInstance = editorInstance;

        if (this.activeEditorInstance) {
            if (typeof this.activeEditorInstance.bindEvents === 'function') this.activeEditorInstance.bindEvents();
            if (typeof this.activeEditorInstance.resizeCanvas === 'function') this.activeEditorInstance.resizeCanvas();
            if (this.activeEditorInstance.oviCanvas?.start) this.activeEditorInstance.oviCanvas.start();
        }
    }

    setupOverflowDetection() {
        if (!this.tabsContainer) return;
        const checkOverflow = () => {
            const hasOverflow = this.tabsContainer.scrollWidth > this.tabsContainer.clientWidth;
            this.tabsContainer.classList.toggle('has-overflow', hasOverflow);
        };
        checkOverflow();
        this.tabsContainer.addEventListener('scroll', checkOverflow);
        window.addEventListener('resize', checkOverflow);
        const observer = new MutationObserver(checkOverflow);
        observer.observe(this.tabsContainer, { childList: true });
    }

    filterTabsByPlugin(pluginId) {
        this.filteredPluginId = pluginId;
        let firstVisibleTabId = null;

        for (const [tabId, tabData] of this.tabs.entries()) {
            const shouldShow = !pluginId || tabData.pluginId === pluginId;
            if (shouldShow) {
                tabData.tabEl.style.display = 'flex';
                if (!firstVisibleTabId) firstVisibleTabId = tabId;
            } else {
                tabData.tabEl.style.display = 'none';
            }
        }

        if (this.activeTabId && this.tabs.get(this.activeTabId)?.tabEl.style.display === 'none') {
            const curr = this.tabs.get(this.activeTabId);
            if (curr) curr.contentEl.style.display = 'none';
            if (firstVisibleTabId) this.activateTab(firstVisibleTabId);
            else {
                this.activeTabId = null;
                this.setActiveEditor(null);
            }
        }
    }

    updatePluginTabCounts() {
        const tabCounts = {};
        for (const [tabId, tabData] of this.tabs.entries()) {
            const pluginId = tabData.pluginId;
            tabCounts[pluginId] = (tabCounts[pluginId] || 0) + 1;
        }
        for (const [pluginId, count] of Object.entries(tabCounts)) {
            const icon = document.querySelector(`.activity-item[data-id="${pluginId}"]`);
            if (icon) icon.setAttribute('data-tab-count', count);
        }
        document.querySelectorAll('.activity-item[data-tab-count]').forEach(icon => {
            const pluginId = icon.getAttribute('data-id');
            if (!tabCounts[pluginId]) icon.removeAttribute('data-tab-count');
        });
    }
}
