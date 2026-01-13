/**
 * PanelManager - Handles panel resizing and collapse functionality
 */
export default class PanelManager {
    constructor(engine) {
        this.engine = engine;
        this.isResizing = false;
        this.currentPanel = null;
        this.startX = 0;
        this.startWidth = 0;

        // Panel constraints
        this.minWidth = 150;
        this.maxWidth = 500;

        // Default widths
        this.defaultWidths = {
            sidebar: 250,
            inspector: 300
        };

        // Panel elements
        this.sidebar = null;
        this.inspector = null;
        this.appContainer = null;
    }

    init() {
        console.log("PanelManager: Initialized");

        // Get panel elements
        this.sidebar = document.getElementById('sidebar');
        this.inspector = document.getElementById('inspector');
        this.appContainer = document.getElementById('app-container');

        // Load saved state
        this.loadPanelState();

        // Setup resize handles
        this.initResizablePanels();

        // Setup collapse buttons
        this.initCollapseButtons();
    }

    initResizablePanels() {
        // Create resize handles
        this.createResizeHandle('sidebar', this.sidebar);
        this.createResizeHandle('inspector', this.inspector);
    }

    createResizeHandle(panelId, panelElement) {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.setAttribute('data-target', panelId);

        // Insert handle after the panel
        if (panelId === 'sidebar') {
            // Insert between sidebar and workspace
            panelElement.insertAdjacentElement('afterend', handle);
        } else if (panelId === 'inspector') {
            // Insert before inspector
            panelElement.insertAdjacentElement('beforebegin', handle);
        }

        // Add event listeners
        handle.addEventListener('mousedown', (e) => this.startResize(panelId, e));
        handle.addEventListener('dblclick', () => this.resetPanelWidth(panelId));
    }

    startResize(panelId, event) {
        event.preventDefault();

        this.isResizing = true;
        this.currentPanel = panelId;
        this.startX = event.clientX;

        const panel = panelId === 'sidebar' ? this.sidebar : this.inspector;
        this.startWidth = panel.offsetWidth;

        // Add resizing class to handle
        const handle = document.querySelector(`.resize-handle[data-target="${panelId}"]`);
        if (handle) handle.classList.add('resizing');

        // Add global event listeners
        document.addEventListener('mousemove', this.doResize);
        document.addEventListener('mouseup', this.stopResize);

        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
    }

    doResize = (event) => {
        if (!this.isResizing) return;

        const panel = this.currentPanel === 'sidebar' ? this.sidebar : this.inspector;
        let newWidth;

        if (this.currentPanel === 'sidebar') {
            // Sidebar: drag right to increase
            newWidth = this.startWidth + (event.clientX - this.startX);
        } else {
            // Inspector: drag left to increase
            newWidth = this.startWidth - (event.clientX - this.startX);
        }

        // Apply constraints
        newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));

        // Update CSS custom property
        const varName = this.currentPanel === 'sidebar' ? '--sidebar-width' : '--inspector-width';
        document.documentElement.style.setProperty(varName, `${newWidth}px`);
    }

    stopResize = () => {
        if (!this.isResizing) return;

        this.isResizing = false;

        // Remove resizing class
        const handle = document.querySelector(`.resize-handle[data-target="${this.currentPanel}"]`);
        if (handle) handle.classList.remove('resizing');

        // Remove global event listeners
        document.removeEventListener('mousemove', this.doResize);
        document.removeEventListener('mouseup', this.stopResize);

        // Restore user selection
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        // Save state
        this.savePanelState();

        this.currentPanel = null;
    }

    resetPanelWidth(panelId) {
        const varName = panelId === 'sidebar' ? '--sidebar-width' : '--inspector-width';
        const defaultWidth = this.defaultWidths[panelId];

        document.documentElement.style.setProperty(varName, `${defaultWidth}px`);
        this.savePanelState();
    }

    initCollapseButtons() {
        // Add collapse button to sidebar header
        this.addCollapseButton('sidebar');

        // Add collapse button to inspector header
        this.addCollapseButton('inspector');
    }

    addCollapseButton(panelId) {
        const button = document.querySelector(`.panel-collapse-btn[data-panel="${panelId}"]`);

        if (!button) {
            console.warn(`Collapse button for ${panelId} not found in HTML`);
            return;
        }

        console.log(`Attaching click listener to ${panelId} button`);

        // Attach click event listener with stopPropagation
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling to header
            console.log(`${panelId} BUTTON clicked!`);
            this.togglePanel(panelId);
        });

        // Also add listener to entire header for collapsed state (backup)
        const panel = panelId === 'sidebar' ? this.sidebar : this.inspector;
        const header = panel.querySelector('.sidebar-header');

        if (header) {
            header.addEventListener('click', (e) => {
                // Only trigger if panel is collapsed AND click is not on button
                if (panel.classList.contains('collapsed') &&
                    e.target !== button &&
                    !button.contains(e.target)) {
                    console.log(`${panelId} header clicked while collapsed`);
                    this.togglePanel(panelId);
                }
            });
        }
    }

    togglePanel(panelId) {
        const panel = panelId === 'sidebar' ? this.sidebar : this.inspector;
        const button = document.querySelector(`.panel-collapse-btn[data-panel="${panelId}"]`);

        const isCollapsed = panel.classList.toggle('collapsed');

        console.log(`Toggling ${panelId}: isCollapsed = ${isCollapsed}`);

        // Update button icon and title
        if (button) {
            if (isCollapsed) {
                button.innerHTML = panelId === 'sidebar' ? '▶' : '◀';
                button.title = `Expand ${panelId === 'sidebar' ? 'Sidebar' : 'Inspector'}`;
            } else {
                button.innerHTML = panelId === 'sidebar' ? '◀' : '▶';
                button.title = `Collapse ${panelId === 'sidebar' ? 'Sidebar' : 'Inspector'}`;
            }
        }

        // Save state
        this.savePanelState();
    }

    savePanelState() {
        const state = {
            sidebarWidth: getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim(),
            inspectorWidth: getComputedStyle(document.documentElement).getPropertyValue('--inspector-width').trim(),
            sidebarCollapsed: this.sidebar?.classList.contains('collapsed') || false,
            inspectorCollapsed: this.inspector?.classList.contains('collapsed') || false
        };

        localStorage.setItem('oviplatform-panel-state', JSON.stringify(state));
    }

    loadPanelState() {
        const savedState = localStorage.getItem('oviplatform-panel-state');

        if (!savedState) return;

        try {
            const state = JSON.parse(savedState);

            // Restore widths
            if (state.sidebarWidth) {
                document.documentElement.style.setProperty('--sidebar-width', state.sidebarWidth);
            }
            if (state.inspectorWidth) {
                document.documentElement.style.setProperty('--inspector-width', state.inspectorWidth);
            }

            // Restore collapse states (will be applied after DOM is ready)
            setTimeout(() => {
                if (state.sidebarCollapsed && this.sidebar) {
                    this.sidebar.classList.add('collapsed');
                    const button = document.querySelector('.panel-collapse-btn[data-panel="sidebar"]');
                    if (button) {
                        button.innerHTML = '▶';
                        button.title = 'Expand Sidebar';
                    }
                }

                if (state.inspectorCollapsed && this.inspector) {
                    this.inspector.classList.add('collapsed');
                    const button = document.querySelector('.panel-collapse-btn[data-panel="inspector"]');
                    if (button) {
                        button.innerHTML = '◀';
                        button.title = 'Expand Inspector';
                    }
                }
            }, 100);

        } catch (e) {
            console.error("Failed to load panel state:", e);
        }
    }
}
