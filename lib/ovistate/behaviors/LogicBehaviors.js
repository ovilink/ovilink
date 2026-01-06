/**
 * Logic Behaviors
 * Behaviors for Logic Nodes and Generic Triggers
 */

export function registerLogicBehaviors(registry) {

    // Timer Events
    registry.register('timer_events', {
        name: 'Timer Events',
        category: 'logic',
        icon: '⏱️',
        description: 'Trigger actions when timer finishes',
        parameters: {
            onFinishAction: {
                type: 'select',
                options: ['none', 'destroy_self', 'reset_pos', 'shake', 'emit_action', 'stop'],
                default: 'none',
                label: 'On Finish Action'
            },
            emitActionId: { type: 'text', default: 'timer_finished', label: 'Action ID to Emit' }
        },
        update(obj, dt, runtime, registry) {
            if (obj.type !== 'timer') return;

            // Detect finish edge (isRunning became false due to time <= 0)
            // Note: UpdateLogicNodes runs BEFORE this.

            // We need to track previous running state to fire ONCE.
            if (obj._wasRunning === undefined) obj._wasRunning = obj.isRunning;

            if (obj._wasRunning && !obj.isRunning && obj.currentTime <= 0) {
                // Timer Just Finished!
                const action = registry.getParameter(obj, 'timer_events', 'onFinishAction');
                const emitId = registry.getParameter(obj, 'timer_events', 'emitActionId');

                if (action && action !== 'none') {
                    console.log(`⏰ Timer ${obj.id} Finished! Triggering: ${action}`);

                    // Dispatch Action
                    if (runtime.ui && runtime.ui.triggerAction) {
                        runtime.ui.triggerAction(action, obj, emitId);
                    } else if (runtime.triggerAction) {
                        runtime.triggerAction(action, obj, emitId);
                    }
                }
            }

            obj._wasRunning = obj.isRunning;
        }
    });

    // Value Threshold
    registry.register('value_threshold', {
        name: 'Value Threshold',
        category: 'logic',
        icon: '⚖️',
        description: 'Trigger when property meets condition',
        parameters: {
            property: { type: 'text', default: 'x', label: 'Property' },
            operator: { type: 'select', options: ['>', '<', '=', '!='], default: '>', label: 'Operator' },
            threshold: { type: 'number', default: 100, label: 'Value' },
            action: { type: 'select', options: ['destroy_self', 'stop', 'emit_action', 'jump', 'shake'], default: 'stop', label: 'Action' },
            actionId: { type: 'text', default: 'threshold_met', label: 'Action ID' }
        },
        update(obj, dt, runtime, registry) {
            const prop = registry.getParameter(obj, 'value_threshold', 'property');
            const op = registry.getParameter(obj, 'value_threshold', 'operator');
            const val = registry.getParameter(obj, 'value_threshold', 'threshold');

            // Get value (support nested)
            let currentVal = obj[prop];
            // Simple nested support
            if (prop && prop.includes('.')) {
                const parts = prop.split('.');
                let target = obj;
                for (let p of parts) {
                    if (target) target = target[p];
                    else break;
                }
                currentVal = target;
            }

            if (currentVal === undefined) return;

            let conditionMet = false;
            // Ensure numeric comparison if possible
            const numVal = parseFloat(val);
            const numCurr = parseFloat(currentVal);

            if (!isNaN(numVal) && !isNaN(numCurr)) {
                if (op === '>' && numCurr > numVal) conditionMet = true;
                if (op === '<' && numCurr < numVal) conditionMet = true;
                if (op === '=' && Math.abs(numCurr - numVal) < 0.001) conditionMet = true;
                if (op === '!=' && Math.abs(numCurr - numVal) > 0.001) conditionMet = true;
            } else {
                // String comparison
                if (op === '=' && currentVal == val) conditionMet = true;
                if (op === '!=' && currentVal != val) conditionMet = true;
            }

            if (conditionMet) {
                const action = registry.getParameter(obj, 'value_threshold', 'action');
                const actId = registry.getParameter(obj, 'value_threshold', 'actionId');

                // Rate limit / Debounce could be added here, but continuous firing is standard for "Conditions"

                if (runtime.ui && runtime.ui.triggerAction) {
                    runtime.ui.triggerAction(action, obj, actId);
                }
            }
        }
    });
}
