import SliderWidget from '../widgets/SliderWidget.js';
import ButtonWidget from '../widgets/ButtonWidget.js';
import CheckboxWidget from '../widgets/CheckboxWidget.js';
import GraphWidget from '../widgets/GraphWidget.js';
import PhysicsEngine from '../runtime/PhysicsEngine.js';
import OviStateRuntime from '../runtime/Core.js';
import BehaviorSystem from '../runtime/BehaviorSystem.js';

/**
 * Enhanced Exporter for HTML5-exportable interactive animations
 * Embeds all widgets, physics, behaviors, and runtime code in a single HTML file
 */
export default class Exporter {
    static export(simulationData) {
        // Get embeddable code for all components
        const runtimeCode = this.getRuntimeCode();
        const widgetLibraryCode = this.getWidgetLibraryCode();
        const physicsEngineCode = this.getPhysicsEngineCode();
        const behaviorSystemCode = this.getBehaviorSystemCode();
        const graphWidgetCode = this.getGraphWidgetCode();

        // Generate HTML
        const html = this.generateHTML({
            title: simulationData.metadata?.title || 'Interactive Simulation',
            runtimeCode,
            widgetLibraryCode,
            physicsEngineCode,
            behaviorSystemCode,
            graphWidgetCode,
            simulationData: JSON.stringify(simulationData, null, 2)
        });

        // Download
        this.downloadHTML(html, 'simulation.html');
    }

    static getRuntimeCode() {
        return OviStateRuntime.toString().replace(/^export default /, '');
    }

    static getWidgetLibraryCode() {
        const slider = SliderWidget.toString().replace(/^export default /, '');
        const button = ButtonWidget.toString().replace(/^export default /, '');
        const checkbox = CheckboxWidget.toString().replace(/^export default /, '');

        return `
// ===== WIDGET LIBRARY =====
${slider}

${button}

${checkbox}

// Widget Factory
function createWidget(config) {
    switch(config.type) {
        case 'slider':
            return new SliderWidget(config);
        case 'button':
            return new ButtonWidget(config);
        case 'checkbox':
            return new CheckboxWidget(config);
        default:
            console.error('Unknown widget type:', config.type);
            return null;
    }
}
        `;
    }

    static getPhysicsEngineCode() {
        return PhysicsEngine.toString().replace(/^export default /, '');
    }

    static getBehaviorSystemCode() {
        return BehaviorSystem.toString().replace(/^export default /, '');
    }

    static getGraphWidgetCode() {
        return GraphWidget.toString().replace(/^export default /, '');
    }

    static generateHTML(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: #f0f0f0;
            overflow: hidden;
        }
        #app-container {
            display: flex;
            height: 100vh;
        }
        #controls-panel {
            width: 280px;
            background: #ffffff;
            border-right: 1px solid #ddd;
            overflow-y: auto;
            padding: 20px;
        }
        #controls-panel h2 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 8px;
        }
        #canvas-area {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e8e8e8;
        }
        #graphs-panel {
            width: 350px;
            background: #ffffff;
            border-left: 1px solid #ddd;
            overflow-y: auto;
            padding: 20px;
        }
        #graphs-panel h2 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #333;
            border-bottom: 2px solid #28a745;
            padding-bottom: 8px;
        }
        .panel-empty {
            color: #999;
            font-size: 13px;
            text-align: center;
            margin-top: 50px;
        }
    </style>
</head>
<body>
    <div id="app-container">
        <div id="controls-panel">
            <h2>Controls</h2>
            <div id="controls-container"></div>
        </div>
        <div id="canvas-area"></div>
        <div id="graphs-panel">
            <h2>Data Visualization</h2>
            <div id="graphs-container"></div>
        </div>
    </div>
    
    <script>
// ===== EMBEDDED RUNTIME ENGINE =====
${data.runtimeCode}

// ===== EMBEDDED WIDGET LIBRARY =====
${data.widgetLibraryCode}

// ===== EMBEDDED PHYSICS ENGINE =====
${data.physicsEngineCode}

// ===== EMBEDDED BEHAVIOR SYSTEM =====
${data.behaviorSystemCode}

// ===== EMBEDDED GRAPH WIDGET =====
${data.graphWidgetCode}

// ===== SIMULATION DATA =====
const simulationData = ${data.simulationData};

// ===== INITIALIZATION =====
(function() {
    const canvasArea = document.getElementById('canvas-area');
    const controlsContainer = document.getElementById('controls-container');
    const graphsContainer = document.getElementById('graphs-container');
    
    // Create runtime
    const runtime = new OviStateRuntime(canvasArea, simulationData.canvas || {});
    
    // Add physics engine if any object has physics enabled
    const hasPhysics = simulationData.objects?.some(obj => obj.physics?.enabled);
    if (hasPhysics) {
        const physics = new PhysicsEngine({
            gravity: simulationData.physics?.gravity || 9.8,
            friction: simulationData.physics?.friction || 0.1,
            bounds: { 
                width: runtime.width, 
                height: runtime.height 
            }
        });
        
        runtime.physics = physics; // Store reference
        
        // Add behavior system
        const behaviorSystem = new BehaviorSystem(runtime);
        
        // Track mouse position for behaviors
        runtime.canvas.addEventListener('mousemove', (e) => {
            const rect = runtime.canvas.getBoundingClientRect();
            runtime.mouseX = e.clientX - rect.left;
            runtime.mouseY = e.clientY - rect.top;
        });
        
        // Integrate physics and behaviors into runtime update loop
        const originalUpdate = runtime.update.bind(runtime);
        runtime.update = function(dt) {
            physics.update(this.objects, dt);
            behaviorSystem.executeAll(this.objects, dt);
            originalUpdate(dt);
        };
    }
    
    // Add objects
    if (simulationData.objects) {
        simulationData.objects.forEach(obj => runtime.addObject(obj));
    }
    
    // Add controls
    if (simulationData.controls && simulationData.controls.length > 0) {
        simulationData.controls.forEach(ctrl => {
            const widget = createWidget(ctrl);
            if (widget) {
                controlsContainer.appendChild(widget.element);
                runtime.addControl(widget);
                
                // Bind to property if specified
                if (ctrl.binding) {
                    if (ctrl.binding.target === 'physics' && runtime.physics) {
                        // Bind to physics engine
                        widget.onChange = (value) => {
                            runtime.physics[ctrl.binding.property] = value;
                        };
                    } else if (ctrl.binding.objectId) {
                        // Bind to object property
                        runtime.bindControlToProperty(ctrl.id, ctrl.binding.objectId, ctrl.binding.property);
                    }
                }
            }
        });
    } else {
        controlsContainer.innerHTML = '<div class="panel-empty">No controls available</div>';
    }
    
    // Add graphs
    if (simulationData.graphs && simulationData.graphs.length > 0) {
        simulationData.graphs.forEach(graphConfig => {
            const graph = new GraphWidget(graphConfig);
            graphsContainer.appendChild(graph.element);
            runtime.addGraph(graph);
        });
    } else {
        graphsContainer.innerHTML = '<div class="panel-empty">No graphs available</div>';
    }
    
    // Set global script
    if (simulationData.globalScript) {
        runtime.setGlobalScript(simulationData.globalScript);
    }
    
    // Start simulation
    runtime.start();
    
    console.log('Simulation started successfully!');
    console.log('Objects:', runtime.objects.length);
    console.log('Controls:', runtime.controls.length);
    console.log('Graphs:', runtime.graphs.length);
})();
    </script>
</body>
</html>`;
    }

    static downloadHTML(html, filename) {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
