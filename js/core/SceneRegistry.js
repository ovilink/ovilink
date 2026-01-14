/**
 * SceneRegistry: The Central Broker for all entities in OviPlatform.
 * Allows visual plugins to register objects and logic plugins to discover them.
 */
class SceneRegistry {
    constructor() {
        this.entities = new Map(); // id -> { id, name, type, originPlugin }
        this.listeners = [];
    }

    /**
     * Register or update an entity
     * @param {Object} entity { id, name, type, originPlugin }
     */
    register(entity) {
        if (!entity.id) return;

        // Ensure name exists
        if (!entity.name) entity.name = entity.id;

        this.entities.set(entity.id, {
            id: entity.id,
            name: entity.name,
            type: entity.type,
            originPlugin: entity.originPlugin,
            lastUpdated: Date.now()
        });

        this.notify();
    }

    /**
     * Remove an entity from the registry
     * @param {string} id 
     */
    unregister(id) {
        if (this.entities.has(id)) {
            this.entities.delete(id);
            this.notify();
        }
    }

    /**
     * Get all registered entities
     * @returns {Array}
     */
    getAllEntities() {
        return Array.from(this.entities.values());
    }

    /**
     * Find an entity by its display name
     * @param {string} name 
     */
    findByName(name) {
        return this.getAllEntities().find(e => e.name === name);
    }

    /**
     * Subscribe to registry changes
     * @param {Function} callback 
     */
    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        const entities = this.getAllEntities();
        this.listeners.forEach(cb => cb(entities));

        // Also sync to DataManager for global visibility if available
        if (this.engine && this.engine.dataManager) {
            this.engine.dataManager.set('scene:entities', entities);
        }
    }

    attachToEngine(engine) {
        this.engine = engine;
        console.log("SceneRegistry: Attached to Engine");
    }
}

const instance = new SceneRegistry();
export default instance;
