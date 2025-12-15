/**
 * GraphWidget - Canvas-based real-time graph visualization
 * Designed for HTML5 export with no external dependencies
 */
export default class GraphWidget {
    constructor(config) {
        this.id = config.id || 'graph_' + Date.now();
        this.title = config.title || 'Graph';
        this.type = config.type || 'line'; // line, bar
        this.width = config.width || 300;
        this.height = config.height || 200;
        this.maxPoints = config.maxPoints || 100;
        this.data = [];
        this.min = config.min;
        this.max = config.max;

        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.border = '1px solid #ddd';
        this.canvas.style.borderRadius = '4px';
        this.canvas.style.background = '#fff';
        this.ctx = this.canvas.getContext('2d');

        // Container
        this.element = this.createDOM();
    }

    createDOM() {
        const container = document.createElement('div');
        container.className = 'ovi-graph-widget';
        container.setAttribute('data-widget-id', this.id);

        // Inline CSS
        const style = document.createElement('style');
        style.textContent = `
            .ovi-graph-widget {
                margin-bottom: 15px;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 4px;
            }
            .ovi-graph-title {
                font-size: 13px;
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
            }
        `;
        container.appendChild(style);

        // Title
        const titleEl = document.createElement('div');
        titleEl.className = 'ovi-graph-title';
        titleEl.textContent = this.title;
        container.appendChild(titleEl);

        // Canvas
        container.appendChild(this.canvas);

        return container;
    }

    addDataPoint(value) {
        this.data.push(value);
        if (this.data.length > this.maxPoints) {
            this.data.shift();
        }
        this.render();
    }

    clear() {
        this.data = [];
        this.render();
    }

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        // Draw grid
        this.drawGrid();

        // Draw data
        if (this.data.length > 0) {
            if (this.type === 'line') {
                this.drawLineChart();
            } else if (this.type === 'bar') {
                this.drawBarChart();
            }
        }

        // Draw axes
        this.drawAxes();
    }

    drawGrid() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        // Horizontal lines
        for (let i = 0; i <= 5; i++) {
            const y = (h / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = (w / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
    }

    drawAxes() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        // X-axis
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w, h);
        ctx.stroke();

        // Y-axis
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h);
        ctx.stroke();
    }

    drawLineChart() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Auto-scale if min/max not provided
        let min = this.min;
        let max = this.max;
        if (min === undefined || max === undefined) {
            min = Math.min(...this.data);
            max = Math.max(...this.data);
            const range = max - min;
            min -= range * 0.1;
            max += range * 0.1;
        }

        const range = max - min || 1;

        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.beginPath();

        this.data.forEach((value, index) => {
            const x = (index / (this.maxPoints - 1)) * w;
            const y = h - ((value - min) / range) * h;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw points
        ctx.fillStyle = '#007bff';
        this.data.forEach((value, index) => {
            const x = (index / (this.maxPoints - 1)) * w;
            const y = h - ((value - min) / range) * h;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawBarChart() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Auto-scale
        let min = this.min !== undefined ? this.min : 0;
        let max = this.max !== undefined ? this.max : Math.max(...this.data);
        const range = max - min || 1;

        const barWidth = w / this.maxPoints;

        ctx.fillStyle = '#007bff';
        this.data.forEach((value, index) => {
            const barHeight = ((value - min) / range) * h;
            const x = index * barWidth;
            const y = h - barHeight;
            ctx.fillRect(x, y, barWidth - 2, barHeight);
        });
    }

    // For HTML5 export - returns standalone code
    static getEmbeddableCode() {
        return this.toString();
    }
}
