/**
 * BpmnRenderer
 * Renders BPMN diagrams.
 */
import BaseRenderer from './BaseRenderer.js';
import { BpmnEvent, BpmnTask, BpmnGateway } from '../shapes/BpmnShapes.js';

export default class BpmnRenderer extends BaseRenderer {
    constructor(ctx) {
        super(ctx);
    }

    /**
     * Creates a specific shape instance based on the type.
     */
    createNode(nodeData, existingNodes = []) {
        let label = nodeData.label || '';
        const options = { ...nodeData, label };

        switch (nodeData.type) {
            case 'BPMN::StartEvent':
                return new BpmnEvent({ ...options, eventType: 'start' });
            case 'BPMN::EndEvent':
                return new BpmnEvent({ ...options, eventType: 'end' });
            case 'BPMN::IntermediateEvent':
                return new BpmnEvent({ ...options, eventType: 'intermediate' });

            case 'BPMN::Task':
                return new BpmnTask({ ...options, taskType: 'none', label: label || 'Task' });
            case 'BPMN::UserTask':
                return new BpmnTask({ ...options, taskType: 'user', label: label || 'User Task' });
            case 'BPMN::ServiceTask':
                return new BpmnTask({ ...options, taskType: 'service', label: label || 'Service Task' });

            case 'BPMN::Gateway':
            case 'BPMN::ExclusiveGateway':
                return new BpmnGateway({ ...options, gatewayType: 'exclusive' });
            case 'BPMN::ParallelGateway':
                return new BpmnGateway({ ...options, gatewayType: 'parallel' });
            case 'BPMN::InclusiveGateway':
                return new BpmnGateway({ ...options, gatewayType: 'inclusive' });

            default:
                console.warn(`Unknown BPMN shape type: ${nodeData.type}`);
                return new BpmnTask(options);
        }
    }
}
