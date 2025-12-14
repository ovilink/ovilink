export default class ChartEditor {
    constructor(engine) {
        this.engine = engine;
        this.data = [10, 45, 30, 60, 25]; // Default data
        this.labels = ["A", "B", "C", "D", "E"];
        this.type = 'bar'; // bar, line
    }

    create() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.background = '#ffffff';

        // 1. Toolbar
        const toolbar = document.createElement('div');
        toolbar.style.padding = '10px';
        toolbar.style.background = '#f3f3f3';
        toolbar.style.borderBottom = '1px solid #ccc';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '10px';
        toolbar.innerHTML = `
            <button id="chart-bar-btn" style="cursor: pointer;">Bar Chart</button>
            <button id="chart-line-btn" style="cursor: pointer;">Line Chart</button>
            <div style="width: 1px; background: #ccc;"></div>
            <button id="chart-load-btn" style="cursor: pointer; font-weight: bold; color: #2196f3;">Load Data from Sheet</button>
        `;

        // 2. Canvas Area
        const canvasContainer = document.createElement('div');
        canvasContainer.style.flex = '1';
        canvasContainer.style.display = 'flex';
        canvasContainer.style.alignItems = 'center';
        canvasContainer.style.justifyContent = 'center';
        canvasContainer.style.padding = '20px';

        this.canvas = document.createElement('canvas');
        this.canvas.width = 600;
        this.canvas.height = 400;
        this.canvas.style.border = '1px solid #eee';
        this.canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
        canvasContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        container.appendChild(toolbar);
        container.appendChild(canvasContainer);

        this.engine.tabManager.openTab('Chart 1', 'ovichart', container);

        // Bind Events
        toolbar.querySelector('#chart-bar-btn').onclick = () => { this.type = 'bar'; this.render(); };
        toolbar.querySelector('#chart-line-btn').onclick = () => { this.type = 'line'; this.render(); };
        toolbar.querySelector('#chart-load-btn').onclick = () => this.loadFromSheet();

        // Initial Render
        this.render();
    }

    loadFromSheet() {
        // New Method: Fetch from Central Data Store
        const data = this.engine.dataManager.get('sheet_data');

        if (data && data.values && data.values.length > 0) {
            this.updateData(data);
            alert(`Data loaded via Central Store: ${data.values.length} points.`);
        } else {
            // Fallback: Try to trigger a save from Sheet if it exists
            const sheetPlugin = this.engine.pluginManager.plugins.get('ovisheet');
            if (sheetPlugin && sheetPlugin.activeEditor) {
                const refreshedData = sheetPlugin.activeEditor.getData(); // This also sets it to store
                this.updateData(refreshedData);
                alert(`Data loaded via Direct Access: ${refreshedData.values.length} points.`);
            } else {
                alert("No data found in Central Store. Please create a Sheet first.");
            }
        }

        // Subscribe to future updates
        this.engine.dataManager.subscribe('sheet_data', (newData) => {
            console.log("Chart received update from Store");
            this.updateData(newData);
        });
    }

    updateData(data) {
        this.data = data.values;
        this.labels = data.labels;
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 40;

        // Clear
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);

        // Axis
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        if (this.data.length === 0) return;

        // Data
        const maxVal = Math.max(...this.data) || 1;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        const stepX = chartWidth / this.data.length;

        if (this.type === 'bar') {
            const barWidth = stepX * 0.6;
            this.data.forEach((val, i) => {
                const barHeight = (val / maxVal) * chartHeight;
                const x = padding + (i * stepX) + (stepX - barWidth) / 2;
                const y = height - padding - barHeight;

                ctx.fillStyle = '#2196f3';
                ctx.fillRect(x, y, barWidth, barHeight);

                // Label
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.labels[i] || i, x + barWidth / 2, height - padding + 15);
            });
        } else if (this.type === 'line') {
            ctx.beginPath();
            ctx.strokeStyle = '#e91e63';
            ctx.lineWidth = 2;

            this.data.forEach((val, i) => {
                const h = (val / maxVal) * chartHeight;
                const x = padding + (i * stepX) + stepX / 2;
                const y = height - padding - h;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Labels
            this.data.forEach((val, i) => {
                const x = padding + (i * stepX) + stepX / 2;
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.labels[i] || i, x, height - padding + 15);
            });
        }
    }
}
