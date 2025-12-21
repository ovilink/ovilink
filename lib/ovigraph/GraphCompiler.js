export default class GraphCompiler {
    static compile(nodes, connections) {
        const updateNode = nodes.find(n => n.dataset.type === 'event_update');
        if (!updateNode) return "onUpdate: function() {}";

        let code = "";
        code += "    onUpdate: function(dt, objects, brim) {\n";
        code += "        try {\n";
        code += this.compileNode(updateNode, nodes, connections, "            ");
        code += "        } catch(err) { console.error('onUpdate Error:', err); }\n";
        code += "    },\n";

        // Define global handlers for choices
        code += "    onChoice: function(choiceId, objects, brim) {\n";
        code += "        try {\n";
        const choiceNodes = nodes.filter(n => n.dataset.type === 'brim_choice');
        choiceNodes.forEach(node => {
            code += `            if (choiceId === "${node.dataset.label}") {\n`;
            const ports = node.querySelectorAll('.node-port[data-type="output"]');
            ports.forEach(port => {
                const conn = connections.find(c => c.sourcePort === port);
                if (conn) {
                    const nextNode = conn.targetPort.closest('.graph-node');
                    code += `                if (brim.getLastChoiceIndex() === ${port.dataset.index}) {\n`;
                    code += this.compileNode(nextNode, nodes, connections, "                    ");
                    code += "                }\n";
                }
            });
            code += "            }\n";
        });
        code += "        } catch(err) { console.error('onChoice Error:', err); }\n";
        code += "    }\n";

        return code;
    }

    static compileNode(node, nodes, connections, indent) {
        if (!node) return "";
        let code = "";
        const type = node.dataset.type;
        const targetId = node.dataset.targetEntityId;
        const nodeUid = (node.id || 'n' + Math.floor(Math.random() * 1000000)).replace(/-/g, '_');

        // Helper to wrap code in target check
        const wrapTarget = (innerCode) => {
            if (targetId) {
                return `${indent}var target_${nodeUid} = objects.find(function(o) { return o.id === "${targetId}" || o.name === "${targetId}"; });\n` +
                    `${indent}if (target_${nodeUid}) {\n` +
                    `${indent}    (function(obj) {\n` +
                    innerCode.split('\n').map(line => `${indent}        ${line.trim()}`).join('\n') +
                    `\n${indent}    })(target_${nodeUid});\n` +
                    `${indent}}\n`;
            } else {
                return `${indent}objects.forEach(function(obj) {\n` +
                    innerCode.split('\n').map(line => `${indent}    ${line.trim()}`).join('\n') +
                    `\n${indent}});\n`;
            }
        };

        switch (type) {
            case 'action_rotate':
                const rotSpeed = parseFloat(node.dataset.speed) || 2;
                const rotDir = parseFloat(node.dataset.direction) || 1;
                code += wrapTarget(`obj.rotation += ${rotSpeed * rotDir} * dt;`);
                break;
            case 'action_move':
                const moveSpeed = parseFloat(node.dataset.speed) || 100;
                const axis = node.dataset.axis || 'x';
                if (axis === 'x') code += wrapTarget(`obj.x += ${moveSpeed} * dt;`);
                else if (axis === 'y') code += wrapTarget(`obj.y += ${moveSpeed} * dt;`);
                break;
            case 'action_scale':
                const sMin = parseFloat(node.dataset.scaleMin) || 0.8;
                const sMax = parseFloat(node.dataset.scaleMax) || 1.2;
                const sSpeed = parseFloat(node.dataset.speed) || 5;
                code += wrapTarget(`
                    var base = (${sMax} + ${sMin}) / 2;
                    var range = (${sMax} - ${sMin}) / 2;
                    obj.scale = base + Math.sin(Date.now() * 0.001 * ${sSpeed}) * range;
                `);
                break;
            case 'action_opacity':
                const opTarget = parseFloat(node.dataset.target) || 0;
                const opSpd = parseFloat(node.dataset.speed) || 1;
                code += wrapTarget(`
                    if (obj.opacity === undefined) obj.opacity = 1;
                    var diff = ${opTarget} - obj.opacity;
                    if (Math.abs(diff) > 0.01) {
                        obj.opacity += diff * ${opSpd} * dt;
                    } else {
                        obj.opacity = ${opTarget};
                    }
                `);
                break;
            case 'action_move_to':
                const tx = parseFloat(node.dataset.targetX) || 0;
                const ty = parseFloat(node.dataset.targetY) || 0;
                const mvSpd = parseFloat(node.dataset.speed) || 200;
                code += wrapTarget(`
                    var dx = ${tx} - obj.x;
                    var dy = ${ty} - obj.y;
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 5) {
                        obj.x += (dx / dist) * ${mvSpd} * dt;
                        obj.y += (dy / dist) * ${mvSpd} * dt;
                    } else {
                        obj.x = ${tx};
                        obj.y = ${ty};
                    }
                `);
                break;
            case 'action_shake':
                const intensity = parseFloat(node.dataset.intensity) || 10;
                code += wrapTarget(`
                    if (!obj._shake) obj._shake = { x: 0, y: 0 };
                    obj.x -= obj._shake.x; obj.y -= obj._shake.y; 
                    obj._shake.x = (Math.random() - 0.5) * ${intensity};
                    obj._shake.y = (Math.random() - 0.5) * ${intensity};
                    obj.x += obj._shake.x; obj.y += obj._shake.y;
                `);
                break;
            case 'flow_delay':
                const waitTime = parseFloat(node.dataset.time) || 1.0;
                const timerState = `_timer_${nodeUid}`;
                code += wrapTarget(`
                    if (obj.${timerState} === undefined) obj.${timerState} = 0;
                    obj.${timerState} += dt;
                    if (obj.${timerState} >= ${waitTime}) {
                        // Delay Finished - Continue Flow
                        (function() {
                            ${this.compileNextNodes(node, nodes, connections, indent + "                            ")}
                        })();
                    }
                `);
                // Important: Delay node stops linear flow in the switch, 
                // because it encapsulates the "next" logic inside the timer check.
                return code;
            case 'action_visibility':
                const mode = node.dataset.mode || 'show';
                if (mode === 'show') code += wrapTarget(`obj.opacity = 1;`);
                else if (mode === 'hide') code += wrapTarget(`obj.opacity = 0;`);
                else if (mode === 'blink') {
                    code += wrapTarget(`obj.opacity = (Math.sin(Date.now() * 0.01) > 0) ? 1 : 0;`);
                }
                break;
            case 'action_color':
                code += wrapTarget(`obj.fill = 'hsl(' + (Date.now()/50)%360 + ', 70%, 50%)';`);
                break;
            case 'brim_fill_dna':
                code += `${indent}brim.updateDNA("${node.dataset.dnaType || 'logic'}", ${node.dataset.amount || 10});\n`;
                break;
            case 'brim_tale_pop':
                const msg = (node.dataset.message || 'New Discovery!').replace(/"/g, '\\"').replace(/\n/g, '\\n');
                code += `${indent}brim.showNarrative("${msg}");\n`;
                break;
            case 'brim_rewind':
                code += `${indent}brim.rewind();\n`;
                break;
        }

        // Linear flow (next node)
        if (type !== 'brim_choice' && type !== 'event_update') {
            code += this.compileNextNodes(node, nodes, connections, indent);
        } else if (type === 'event_update') {
            code += this.compileNextNodes(node, nodes, connections, indent);
        }

        return code;
    }

    static compileNextNodes(node, nodes, connections, indent) {
        let code = "";
        const conn = connections.find(c => c.sourcePort.closest('.graph-node') === node);
        if (conn) {
            const nextNode = conn.targetPort.closest('.graph-node');
            if (nextNode && nextNode !== node) {
                code += this.compileNode(nextNode, nodes, connections, indent);
            }
        }
        return code;
    }
}
