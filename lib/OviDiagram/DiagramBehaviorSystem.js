/**
 * DiagramBehaviorSystem
 * Manages specialized behaviors for OviDiagram.
 */

export class DiagramBehaviorRegistry {
    constructor() {
        this.behaviors = new Map();
    }

    register(id, config) {
        this.behaviors.set(id, {
            id,
            name: config.name,
            parameters: config.parameters || {},
            update: config.update
        });
    }

    get(id) {
        return this.behaviors.get(id);
    }

    getParameter(obj, behaviorId, paramName) {
        if (obj.behaviorParams && obj.behaviorParams[behaviorId] &&
            obj.behaviorParams[behaviorId][paramName] !== undefined) {
            return obj.behaviorParams[behaviorId][paramName];
        }
        const b = this.get(behaviorId);
        return b && b.parameters[paramName] ? b.parameters[paramName].default : undefined;
    }
}

export default class DiagramBehaviorSystem {
    constructor(diagram) {
        this.diagram = diagram;
        this.registry = new DiagramBehaviorRegistry();
        this.registerDefaultBehaviors();
    }

    registerDefaultBehaviors() {
        // 1. Flow Animation (Ants marching on links)
        this.registry.register('flow', {
            name: 'Flow Animation',
            parameters: {
                speed: { default: 20 },
                color: { default: '#1a73e8' }
            },
            update: (obj, dt, diagram, registry) => {
                // This behavior can be applied to Links too if we modify the loop.
                // For now, let's assume it's a node property that affects outgoing links.
                if (obj.type.startsWith('Flowchart') || obj.type.startsWith('BPMN')) {
                    // Logic will be handled in drawLinks if node has 'flow' behavior
                }
            }
        });

        // 2. Pulse Status
        this.registry.register('pulse', {
            name: 'Pulse Status',
            parameters: {
                speed: { default: 5 },
                intensity: { default: 0.1 }
            },
            update: (obj, dt, diagram, registry) => {
                if (!obj._pulseTime) obj._pulseTime = 0;
                obj._pulseTime += dt * registry.getParameter(obj, 'pulse', 'speed');
                const intensity = registry.getParameter(obj, 'pulse', 'intensity');
                obj.opacity = 0.9 + Math.sin(obj._pulseTime) * intensity;
            }
        });

        // 3. Info Tooltip (Hover effect managed in update loop)
        this.registry.register('tooltip', {
            name: 'Info Tooltip',
            parameters: {
                delay: { default: 0.5 }
            },
            update: (obj, dt, diagram, registry) => {
                // Handled via hover state in DiagramCanvas.render
            }
        });

        // 4. Highlight Chain
        this.registry.register('chain', {
            name: 'Highlight Chain',
            parameters: {
                direction: { default: 'both' } // 'up', 'down', 'both'
            },
            update: (obj, dt, diagram, registry) => {
                // Handled via hover state in DiagramCanvas.drawLinks
            }
        });
    }

    update(dt) {
        if (!this.diagram || !this.diagram.graph) return;
        const nodes = this.diagram.graph.nodes || [];

        nodes.forEach(node => {
            if (node.behaviors) {
                node.behaviors.forEach(bid => {
                    const b = this.registry.get(bid);
                    if (b && b.update) b.update(node, dt, this.diagram, this.registry);
                });
            }
        });
    }
}
