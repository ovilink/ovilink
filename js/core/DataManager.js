export default class DataManager {
    constructor(engine) {
        this.engine = engine;
        this.data = new Map(); // key -> value
        this.listeners = new Map(); // key -> [callbacks]
    }

    init() {
        console.log("DataManager: Initialized");
    }

    /**
     * Store data and notify listeners
     * @param {string} key Unique identifier (e.g., 'sheet_1:data')
     * @param {any} value The data
     */
    set(key, value) {
        this.data.set(key, value);
        this.notify(key, value);
    }

    /**
     * Retrieve data
     * @param {string} key 
     */
    get(key) {
        return this.data.get(key);
    }

    /**
     * Subscribe to changes for a specific key
     * @param {string} key 
     * @param {function} callback 
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }

    notify(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(cb => cb(value));
        }
    }
}
