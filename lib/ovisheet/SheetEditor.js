export default class SheetEditor {
    constructor(engine) {
        this.engine = engine;
        this.rows = 20;
        this.cols = 10; // A-J
        this.data = {}; // { "A1": "Value", "B2": "123" }
        this.selectedCell = null;
    }

    create() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.background = '#ffffff';
        container.style.color = '#333';
        container.style.fontFamily = 'Arial, sans-serif';

        // 1. Toolbar
        const toolbar = document.createElement('div');
        toolbar.style.padding = '5px 10px';
        toolbar.style.background = '#f3f3f3';
        toolbar.style.borderBottom = '1px solid #ccc';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '10px';
        toolbar.innerHTML = `
            <div style="font-weight: bold; color: #217346;">OviSheet</div>
            <div style="width: 1px; background: #ccc;"></div>
            <button style="border: none; background: none; cursor: pointer;"><b>B</b></button>
            <button style="border: none; background: none; cursor: pointer;"><i>I</i></button>
            <div style="width: 1px; background: #ccc;"></div>
            <div id="formula-bar" contenteditable="true" style="flex: 1; background: white; border: 1px solid #ccc; padding: 2px 5px; font-family: monospace;"></div>
        `;

        // 2. Grid Container
        const gridContainer = document.createElement('div');
        gridContainer.style.flex = '1';
        gridContainer.style.overflow = 'auto';
        gridContainer.style.position = 'relative';

        // Table
        const table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.minWidth = '100%';

        // Header Row (A, B, C...)
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th style="background: #f3f3f3; border: 1px solid #ccc; width: 40px;"></th>'; // Corner
        for (let c = 0; c < this.cols; c++) {
            const colLabel = String.fromCharCode(65 + c);
            const th = document.createElement('th');
            th.innerText = colLabel;
            th.style.background = '#f3f3f3';
            th.style.border = '1px solid #ccc';
            th.style.minWidth = '80px';
            th.style.fontWeight = 'normal';
            th.style.color = '#666';
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        // Data Rows
        for (let r = 1; r <= this.rows; r++) {
            const tr = document.createElement('tr');

            // Row Number
            const rowHeader = document.createElement('td');
            rowHeader.innerText = r;
            rowHeader.style.background = '#f3f3f3';
            rowHeader.style.border = '1px solid #ccc';
            rowHeader.style.textAlign = 'center';
            rowHeader.style.color = '#666';
            tr.appendChild(rowHeader);

            // Cells
            for (let c = 0; c < this.cols; c++) {
                const colLabel = String.fromCharCode(65 + c);
                const cellId = `${colLabel}${r}`;

                const td = document.createElement('td');
                td.dataset.id = cellId;
                td.contentEditable = 'true';
                td.style.border = '1px solid #ccc';
                td.style.padding = '2px 5px';
                td.style.outline = 'none';

                // Event Listeners
                td.onfocus = () => this.selectCell(td, toolbar.querySelector('#formula-bar'));
                td.oninput = () => {
                    this.data[cellId] = td.innerText;
                    toolbar.querySelector('#formula-bar').innerText = td.innerText;
                };

                tr.appendChild(td);
            }
            table.appendChild(tr);
        }

        gridContainer.appendChild(table);
        container.appendChild(toolbar);
        container.appendChild(gridContainer);

        this.engine.tabManager.openTab('Untitled.csv', 'ovisheet', container);
    }

    selectCell(cell, formulaBar) {
        if (this.selectedCell) {
            this.selectedCell.style.border = '1px solid #ccc';
        }
        this.selectedCell = cell;
        this.selectedCell.style.border = '2px solid #217346';

        formulaBar.innerText = this.data[cell.dataset.id] || '';

        // Update Inspector
        this.engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Cell Properties</div>
                <div>ID: ${cell.dataset.id}</div>
                <div>Value: ${this.data[cell.dataset.id] || '(empty)'}</div>
            </div>
        `);
    }
    getData() {
        // Simple heuristic: 
        // Row 1 = Labels (A1, B1, ...)
        // Row 2 = Values (A2, B2, ...)
        // This simulates a simple dataset like:
        //      A       B       C
        // 1    Jan     Feb     Mar
        // 2    10      40      25

        const labels = [];
        const values = [];

        // Read up to Column J (10 columns)
        for (let c = 0; c < this.cols; c++) {
            const colLabel = String.fromCharCode(65 + c);
            const labelCellId = `${colLabel}1`;
            const valueCellId = `${colLabel}2`;

            const label = this.data[labelCellId];
            const value = this.data[valueCellId];

            if (label !== undefined || value !== undefined) {
                labels.push(label || colLabel);
                values.push(parseFloat(value) || 0);
            }
        }

        const dataset = { labels, values };

        // Publish to Central Data Store
        this.engine.dataManager.set('sheet_data', dataset);

        return dataset;
    }
}
