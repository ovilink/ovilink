/**
 * Behavior Registry
 * Central registry for all behaviors with parameter definitions
 */

export default class BehaviorRegistry {
    constructor() {
        this.behaviors = new Map();
        this.categories = ['motion', 'transform', 'interactive', 'path', 'particle'];
    }

    /**
     * Register a behavior
     */
    register(id, config) {
        this.behaviors.set(id, {
            id,
            name: config.name,
            category: config.category,
            icon: config.icon || '●',
            description: config.description || '',
            parameters: config.parameters || {},
            init: config.init || (() => { }),
            update: config.update
        });
    }

    /**
     * Get behavior by ID
     */
    get(id) {
        return this.behaviors.get(id);
    }

    /**
     * Get all behaviors
     */
    getAll() {
        return Array.from(this.behaviors.values());
    }

    /**
     * Get behaviors by category
     */
    getByCategory(category) {
        return this.getAll().filter(b => b.category === category);
    }

    /**
     * Get parameter value with default
     */
    getParameter(obj, behaviorId, paramName) {
        // Check if object has custom value
        if (obj._behaviorParams && obj._behaviorParams[behaviorId] &&
            obj._behaviorParams[behaviorId][paramName] !== undefined) {
            return obj._behaviorParams[behaviorId][paramName];
        }

        const behavior = this.get(behaviorId);
        if (!behavior || !behavior.parameters[paramName]) return undefined;

        // Return default
        return behavior.parameters[paramName].default;
    }

    /**
     * Set parameter value
     */
    setParameter(obj, behaviorId, paramName, value) {
        if (!obj._behaviorParams) obj._behaviorParams = {};
        if (!obj._behaviorParams[behaviorId]) obj._behaviorParams[behaviorId] = {};
        obj._behaviorParams[behaviorId][paramName] = value;
    }
}
