import { registerMotionBehaviors } from './MotionBehaviors.js';
import { registerTransformBehaviors } from './TransformBehaviors.js';
import { registerInteractiveBehaviors } from './InteractiveBehaviors.js';
import { registerPathBehaviors } from './PathBehaviors.js';
import { registerPhysicsBehaviors } from './PhysicsBehaviors.js';
import { registerTextBehaviors } from './TextBehaviors.js';
import { registerLogicBehaviors } from './LogicBehaviors.js';
import { registerTriggerBehaviors } from './TriggerBehaviors.js';
import { registerBrimBehaviors } from './BrimBehaviors.js';

export default class BehaviorRegistry {
    constructor() {
        this.behaviors = new Map();
        this.categories = ['motion', 'transform', 'interactive', 'path', 'particle'];

        registerMotionBehaviors(this);
        registerTransformBehaviors(this);
        registerInteractiveBehaviors(this);
        registerPathBehaviors(this);
        registerPhysicsBehaviors(this);
        registerTextBehaviors(this);
        registerLogicBehaviors(this);
        registerTriggerBehaviors(this);
        registerBrimBehaviors(this);
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
