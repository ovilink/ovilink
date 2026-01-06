/**
 * FlowchartRenderer
 * Renders flowchart diagrams.
 */
import BaseRenderer from './BaseRenderer.js';
import {
    FlowchartProcess,
    FlowchartStartEnd,
    FlowchartDecision,
    FlowchartInputOutput,
    FlowchartDocument,
    FlowchartPreparation,
    FlowchartDatabase,
    FlowchartManualInput,
    FlowchartConnector,
    FlowchartDelay,
    FlowchartPredefinedProcess,
    FlowchartManualOperation,
    FlowchartDisplay,
    FlowchartMerge,
    FlowchartAnnotation,
    FlowchartLoopLimit,
    FlowchartInternalStorage,
    FlowchartSummingJunction,
    FlowchartCollate,
    FlowchartOr,
    FlowchartOffPageConnector,
    FlowchartSort,
    FlowchartMultipleDocuments,
    FlowchartExtract,
    FlowchartCard
} from '../shapes/FlowchartShapes.js';
import { BpmnEvent, BpmnTask, BpmnGateway } from '../shapes/BpmnShapes.js';

export default class FlowchartRenderer extends BaseRenderer {
    constructor(ctx) {
        super(ctx);
    }

    drawNodes(nodes) {
        nodes.forEach(node => {
            node.draw(this.ctx);
        });
    }

    /**
     * Creates a specific shape instance based on the type.
     */
    createNode(nodeData, existingNodes = []) {
        // Default label if not provided
        let label = nodeData.label || nodeData.type.split('::')[1] || 'Node';
        let subtype = null;

        if (nodeData.type === 'Flowchart::StartEnd') {
            // Smart Logic: Check if there is already a Start node
            const hasStart = existingNodes.some(n => n.type === 'Flowchart::StartEnd' && n.subtype === 'start');

            if (!hasStart) {
                label = 'Start';
                subtype = 'start';
            } else {
                label = 'End';
                subtype = 'end';
            }
        }

        const options = { ...nodeData, label, subtype };

        switch (nodeData.type) {
            case 'Flowchart::StartEnd':
                return new FlowchartStartEnd(options);
            case 'Flowchart::Process':
                return new FlowchartProcess(options);
            case 'Flowchart::Decision':
                return new FlowchartDecision(options);
            case 'Flowchart::InputOutput':
                return new FlowchartInputOutput(options);
            case 'Flowchart::Document':
                return new FlowchartDocument(options);
            case 'Flowchart::Preparation':
                return new FlowchartPreparation(options);
            case 'Flowchart::Database':
                return new FlowchartDatabase(options);
            case 'Flowchart::ManualInput':
                return new FlowchartManualInput(options);
            case 'Flowchart::Connector':
                return new FlowchartConnector(options);
            case 'Flowchart::Delay':
                return new FlowchartDelay(options);
            case 'Flowchart::PredefinedProcess':
                return new FlowchartPredefinedProcess(options);
            case 'Flowchart::ManualOperation':
                return new FlowchartManualOperation(options);
            case 'Flowchart::Display':
                return new FlowchartDisplay(options);
            case 'Flowchart::Merge':
                return new FlowchartMerge(options);

            // New Shapes
            case 'Flowchart::Annotation':
                return new FlowchartAnnotation(options);
            case 'Flowchart::LoopLimit':
                return new FlowchartLoopLimit(options);
            case 'Flowchart::InternalStorage':
                return new FlowchartInternalStorage(options);
            case 'Flowchart::SummingJunction':
                return new FlowchartSummingJunction(options);
            case 'Flowchart::Collate':
                return new FlowchartCollate(options);
            case 'Flowchart::Or':
                return new FlowchartOr(options);

            // Final Batch
            case 'Flowchart::OffPageConnector':
                return new FlowchartOffPageConnector(options);
            case 'Flowchart::Sort':
                return new FlowchartSort(options);
            case 'Flowchart::MultipleDocuments':
                // Force override if the label is the auto-generated type name
                const multiLabels = ['MultipleDocuments', 'Multiple Documents'];
                const effectiveLabel = (options.label && !multiLabels.includes(options.label)) ? options.label : 'Multiple\nDocuments';
                return new FlowchartMultipleDocuments({ ...options, label: effectiveLabel });
            case 'Flowchart::Extract':
                return new FlowchartExtract(options);
            case 'Flowchart::Card':
                return new FlowchartCard(options);

            // BPMN Support in Default Renderer
            case 'BPMN::StartEvent':
                return new BpmnEvent({ ...options, eventType: 'start' });
            case 'BPMN::EndEvent':
                return new BpmnEvent({ ...options, eventType: 'end' });
            case 'BPMN::IntermediateEvent':
                return new BpmnEvent({ ...options, eventType: 'intermediate' });

            case 'BPMN::Task':
                return new BpmnTask({ ...options, taskType: 'none', label: label || 'Task' });

            case 'BPMN::ExclusiveGateway':
            case 'BPMN::Gateway':
                return new BpmnGateway({ ...options, gatewayType: 'exclusive' });

            default:
                console.warn(`Unknown flowchart shape type: ${nodeData.type}`);
                return new FlowchartProcess(options);
        }
    }
}
