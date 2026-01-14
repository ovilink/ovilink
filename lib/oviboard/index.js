/**
 * OviBoard Plugin Entry Point
 * Intelligent Interactive Smart Board for Online Education
 */
import engine from '../../js/core/OviEngine.js';
import OviBoard from './OviBoard.js';

const OviBoardPlugin = {
    id: 'oviboard',
    name: 'OviBoard',
    icon: 'Bd', // Board

    init(engine) {
        console.log("OviBoard Plugin Initialized");
        this.board = new OviBoard(engine);
    },

    onActivate(engine) {
        console.log("OviBoard Activated");
        if (this.board) {
            this.board.activate();
        }
    },

    onDeactivate(engine) {
        console.log("OviBoard Deactivated");
        if (this.board) {
            this.board.deactivate();
        }
    },

    // Optional: Serialize/Deserialize board state (canvas content)
    serialize() {
        return this.board ? this.board.serialize() : null;
    },

    deserialize(data) {
        if (this.board) {
            this.board.deserialize(data);
        }
    }
};

// Register
engine.pluginManager.register(OviBoardPlugin);

export default OviBoardPlugin;
