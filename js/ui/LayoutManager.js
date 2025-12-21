export default class LayoutManager {
    constructor() {
        this.activityBarContent = document.getElementById('activity-bar-content');
    }

    init() {
        console.log("LayoutManager: Initialized");
        // Clear existing static content if any (except if we want to keep some defaults)
        if (this.activityBarContent) {
            this.activityBarContent.innerHTML = '';
        }
    }

    /**
     * Adds an item to the Activity Bar.
     * @param {string} id - Unique ID.
     * @param {string} icon - Icon content.
     * @param {string} tooltip - Tooltip text.
     * @param {Function} onClick - Click handler.
     */
    addActivityItem(id, icon, tooltip, onClick) {
        if (!this.activityBarContent) return;

        const div = document.createElement('div');
        div.className = 'activity-item';
        div.setAttribute('data-id', id);
        div.setAttribute('data-tooltip', tooltip);
        div.innerHTML = icon; // Use innerHTML to support SVGs

        console.log(`Added activity item: ${id}, tooltip: ${tooltip}`);

        div.addEventListener('click', () => {
            if (onClick) onClick();
        });

        this.activityBarContent.appendChild(div);
    }

    setActiveActivity(id) {
        // Remove active class from all
        const items = document.querySelectorAll('.activity-item');
        items.forEach(el => el.classList.remove('active'));

        // Add to target
        const target = document.querySelector(`.activity-item[data-id="${id}"]`);
        if (target) {
            target.classList.add('active');
        }
    }

    setSidebarTitle(title) {
        const sidebarHeader = document.querySelector('#sidebar .sidebar-header');
        if (sidebarHeader) {
            // Only update the span, not the entire header (to preserve collapse button)
            const titleSpan = sidebarHeader.querySelector('span');
            if (titleSpan) {
                titleSpan.textContent = title;
            } else {
                // Fallback: if no span, update text but preserve button
                const button = sidebarHeader.querySelector('.panel-collapse-btn');
                sidebarHeader.textContent = title;
                if (button) sidebarHeader.appendChild(button);
            }
        }
    }

    setSidebarContent(htmlContent) {
        const sidebarContent = document.querySelector('.sidebar-content');
        if (sidebarContent) {
            sidebarContent.innerHTML = htmlContent;
        }
    }

    setInspectorContent(htmlContent) {
        const inspectorContent = document.querySelector('#inspector .sidebar-content');
        if (inspectorContent) {
            inspectorContent.innerHTML = htmlContent;
        }
    }
}
