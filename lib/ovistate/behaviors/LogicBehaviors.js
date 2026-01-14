/**
 * Logic Behaviors
 * Behaviors for Logic Nodes and Generic Triggers
 */

export function registerLogicBehaviors(registry) {

    // Adaptive Timer 2.0 - Event Sequencer
    registry.register('timer_events', {
        name: 'Adaptive Timer 2.0',
        category: 'logic',
        icon: '⏱️',
        description: 'Multi-stage sequencer with variable speed and intervals',
        parameters: {
            mode: { type: 'select', options: ['single', 'interval'], default: 'single', label: 'Mode' },
            onFinishAction: {
                type: 'select',
                options: ['none', 'destroy_self', 'reset_pos', 'shake', 'emit_action', 'stop'],
                default: 'emit_action',
                label: 'On Finish Action'
            },
            emitActionId: { type: 'text', default: 'timer_finished', label: 'Final Action ID' },

            // Milestones
            milestone1: { type: 'slider', min: 0, max: 100, default: 50, label: 'Milestone 1 (%)' },
            m1ActionId: { type: 'text', default: 'halfway_done', label: 'M1 Action ID' },

            milestone2: { type: 'slider', min: 0, max: 100, default: 10, label: 'Milestone 2 (%)' },
            m2ActionId: { type: 'text', default: 'warning_low', label: 'M2 Action ID' },

            // Speed & Loops
            speedVariable: { type: 'text', default: '', label: 'Speed Variable Name' },
            autoRestart: { type: 'toggle', default: false, label: 'Auto Restart (Loop)' }
        },
        init(obj) {
            obj._wasRunning = obj.isRunning;
            obj._m1Fired = false;
            obj._m2Fired = false;
            obj._initialTime = obj.duration || obj.currentTime || 5;
            obj._isTimerInit = true;
        },
        update(obj, dt, runtime, registry) {
            if (obj.type !== 'timer') return;
            if (!obj._isTimerInit) this.init(obj);

            const mode = registry.getParameter(obj, 'timer_events', 'mode');
            const speedVar = registry.getParameter(obj, 'timer_events', 'speedVariable');
            const autoRestart = registry.getParameter(obj, 'timer_events', 'autoRestart');

            // 1. Variable Speed logic
            // Note: TimelineSystem handles basic countdown, we can "force" extra dt if speedVar exists
            if (speedVar && runtime.variables && runtime.variables[speedVar] !== undefined) {
                const speedMult = runtime.variables[speedVar];
                if (speedMult !== 1 && obj.isRunning) {
                    // Adjust currentTime manually for extra speed (subtracting the extra delta)
                    // (Mult-1) * dt gives us the extra time to subtract
                    obj.currentTime -= dt * (speedMult - 1);
                }
            }

            const totalDuration = obj.duration || obj._initialTime || 1;
            const progress = (obj.currentTime / totalDuration) * 100;

            // 2. Milestone Logic
            const m1 = registry.getParameter(obj, 'timer_events', 'milestone1');
            const m1Id = registry.getParameter(obj, 'timer_events', 'm1ActionId');
            const m2 = registry.getParameter(obj, 'timer_events', 'milestone2');
            const m2Id = registry.getParameter(obj, 'timer_events', 'm2ActionId');

            if (obj.isRunning) {
                if (!obj._m1Fired && progress <= m1) {
                    runtime.triggerAction('emit_action', obj, m1Id);
                    obj._m1Fired = true;
                }
                if (!obj._m2Fired && progress <= m2) {
                    runtime.triggerAction('emit_action', obj, m2Id);
                    obj._m2Fired = true;
                }
            }

            // 3. Finish Edge Logic
            if (obj._wasRunning && !obj.isRunning && obj.currentTime <= 0) {
                const action = registry.getParameter(obj, 'timer_events', 'onFinishAction');
                const emitId = registry.getParameter(obj, 'timer_events', 'emitActionId');

                if (action && action !== 'none') {
                    runtime.triggerAction(action, obj, emitId);
                }

                // Handle Restart / Interval
                if (autoRestart || mode === 'interval') {
                    obj.currentTime = totalDuration;
                    obj.isRunning = true;
                    obj._m1Fired = false;
                    obj._m2Fired = false;
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

    // State Switcher - Toggle properties based on Actions
    registry.register('state_switcher', {
        name: 'State Switcher',
        category: 'logic',
        icon: '🔛',
        description: 'Switch properties between two states on Actions',
        parameters: {
            state1ID: { type: 'text', default: 'state1', label: 'Action 1 (ID)' },
            state2ID: { type: 'text', default: 'state2', label: 'Action 2 (ID)' },
            targetBehavior: { type: 'select', options: ['scroller', 'physics', 'opacity'], default: 'scroller', label: 'Target System' },
            state1Value: { type: 'number', default: 0, label: 'Value 1' },
            state2Value: { type: 'number', default: 100, label: 'Value 2' }
        },
        update(obj, dt, runtime, registry) {
            const lastAction = runtime.lastAction;
            if (!lastAction) return;

            const s1ID = registry.getParameter(obj, 'state_switcher', 'state1ID');
            const s2ID = registry.getParameter(obj, 'state_switcher', 'state2ID');
            const target = registry.getParameter(obj, 'state_switcher', 'targetBehavior');

            let newValue = null;
            if (lastAction === s1ID) newValue = registry.getParameter(obj, 'state_switcher', 'state1Value');
            else if (lastAction === s2ID) newValue = registry.getParameter(obj, 'state_switcher', 'state2Value');

            if (newValue !== null) {
                if (target === 'scroller') {
                    const params = obj._behaviorParams || obj.behaviorParams;
                    if (params && params.scroller) params.scroller.speedX = newValue;
                }
                else if (target === 'physics') {
                    if (!obj.physics) obj.physics = { enabled: true, velocity: { x: 0, y: 0 } };
                    obj.physics.velocity.x = newValue;
                }
                else if (target === 'opacity') {
                    obj.opacity = newValue;
                }
            }
        }
    });
}
