/**
 * OviDiagram Plugin
 * For flowcharts and mind maps.
 */
import engine from '../js/core/OviEngine.js';
import { DiagramCanvas } from './OviDiagram/OviDiagramCore.js';
import FlowchartRenderer from './OviDiagram/renderers/FlowchartRenderer.js';
import BpmnRenderer from './OviDiagram/renderers/BpmnRenderer.js';
import DiagramExporter from './OviDiagram/DiagramExporter.js';

const OviDiagramPlugin = {

    id: 'ovidiagram',

    showNodePicker(engine, diagram, x, y, sourceNode) {
        // Remove existing picker
        const existing = document.getElementById('ovi-node-picker');
        if (existing) existing.remove();

        // Create Picker DOM
        const picker = document.createElement('div');
        picker.id = 'ovi-node-picker';
        picker.style.position = 'fixed';
        picker.style.left = `${x}px`;
        picker.style.top = `${y}px`;
        picker.style.background = '#fff';
        picker.style.borderRadius = '8px';
        picker.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        picker.style.padding = '8px';
        picker.style.display = 'flex';
        picker.style.gap = '8px';
        picker.style.zIndex = '1000';
        picker.style.transform = 'translate(-50%, -50%)'; // Center on mouse
        picker.style.animation = 'scaleIn 0.2s ease-out';

        // Styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scaleIn { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
            .picker-item { 
                cursor: pointer; padding: 6px; border-radius: 4px; transition: background 0.1s; display: flex; align-items: center; justify-content: center;
            }
            .picker-item:hover { background: #f1f3f4; }
        `;
        picker.appendChild(style);

        // Define Item Sets
        const bpmnItems = [
            { type: 'BPMN::Task', icon: '<svg width="24" height="24"><rect x="2" y="5" width="20" height="14" rx="3" fill="#e8f0fe" stroke="#1a73e8" stroke-width="2"/></svg>' },
            { type: 'BPMN::ExclusiveGateway', icon: '<svg width="24" height="24"><path d="M12 2L22 12L12 22L2 12Z" fill="#fef7e0" stroke="#ea8600" stroke-width="2"/></svg>' },
            { type: 'BPMN::IntermediateEvent', icon: '<svg width="24" height="24"><circle cx="12" cy="12" r="9" fill="#fef7e0" stroke="#e37400" stroke-width="1"/><circle cx="12" cy="12" r="6" fill="#fef7e0" stroke="#e37400" stroke-width="1"/></svg>' },
            { type: 'BPMN::EndEvent', icon: '<svg width="24" height="24"><circle cx="12" cy="12" r="9" fill="#fce8e6" stroke="#c5221f" stroke-width="3"/></svg>' }
        ];

        const flowchartItems = [
            { type: 'Flowchart::Process', icon: '<svg width="24" height="24"><rect x="2" y="6" width="20" height="12" fill="none" stroke="#5f6368" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Decision', icon: '<svg width="24" height="24"><path d="M12 2L22 12L12 22L2 12Z" fill="none" stroke="#fbbc04" stroke-width="2"/></svg>' },
            { type: 'Flowchart::InputOutput', icon: '<svg width="24" height="24"><path d="M4 18 L2 6 L20 6 L22 18 Z" fill="none" stroke="#188038" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Document', icon: '<svg width="24" height="24"><path d="M4 4 H20 V16 Q 16 12 12 16 Q 8 20 4 16 Z" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Database', icon: '<svg width="24" height="24"><ellipse cx="12" cy="5" rx="10" ry="3" fill="none" stroke="#546e7a" stroke-width="2"/><path d="M2 5 V19 C 2 22, 22 22, 22 19 V5" fill="none" stroke="#546e7a" stroke-width="2"/><path d="M2 19 C 2 22, 22 22, 22 19" stroke="#546e7a" stroke-width="2"/></svg>' },
            { type: 'Flowchart::ManualInput', icon: '<svg width="24" height="24" viewBox="0 0 34 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 8 L32 2 L32 20 L2 20 Z" fill="none" stroke="#0277bd" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Connector', icon: '<svg width="24" height="24"><circle cx="12" cy="12" r="9" fill="none" stroke="#5f6368" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Delay', icon: '<svg width="24" height="24"><path d="M2 4 H14 A 8 8 0 0 1 14 20 H2 Z" fill="none" stroke="#f9ab00" stroke-width="2"/></svg>' },
            { type: 'Flowchart::PredefinedProcess', icon: '<svg width="24" height="24"><rect x="2" y="6" width="20" height="12" fill="none" stroke="#5f6368" stroke-width="2"/><line x1="6" y1="6" x2="6" y2="18" stroke="#5f6368" stroke-width="2"/><line x1="18" y1="6" x2="18" y2="18" stroke="#5f6368" stroke-width="2"/></svg>' },
            { type: 'Flowchart::ManualOperation', icon: '<svg width="24" height="24"><path d="M2 5 H22 L18 19 H6 Z" fill="none" stroke="#8e24aa" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Display', icon: '<svg width="24" height="24"><path d="M22 6 H8 L4 12 L8 18 H22 Z" fill="none" stroke="#0277bd" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Merge', icon: '<svg width="24" height="24"><path d="M4 6 H20 L12 20 Z" fill="none" stroke="#5f6368" stroke-width="2"/></svg>' },

            // New Shapes
            { type: 'Flowchart::Annotation', icon: '<svg width="24" height="24"><path d="M4 4 H16 L20 8 V20 H4 Z" fill="#fffde7" stroke="#fbc02d" stroke-width="2"/><path d="M16 4 V8 H20" fill="none" stroke="#fbc02d" stroke-width="2"/></svg>' },
            { type: 'Flowchart::LoopLimit', icon: '<svg width="24" height="24"><path d="M6 4 L18 4 L22 8 L22 16 L18 20 L6 20 L2 16 L2 8 Z" fill="#e1f5fe" stroke="#0277bd" stroke-width="2"/></svg>' },
            { type: 'Flowchart::InternalStorage', icon: '<svg width="24" height="24"><rect x="2" y="4" width="20" height="16" fill="none" stroke="#5f6368" stroke-width="2"/><line x1="6" y1="4" x2="6" y2="20" stroke="#5f6368" stroke-width="2"/><line x1="2" y1="8" x2="22" y2="8" stroke="#5f6368" stroke-width="2"/></svg>' },
            { type: 'Flowchart::SummingJunction', icon: '<svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="none" stroke="#5f6368" stroke-width="2"/><path d="M12 6 V18 M6 12 H18" stroke="#5f6368" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Collate', icon: '<svg width="24" height="24"><path d="M4 4 L20 4 L4 20 L20 20 Z" fill="#ffe0b2" stroke="#ef6c00" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Or', icon: '<svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="none" stroke="#5f6368" stroke-width="2"/><path d="M7 7 L17 17 M17 7 L7 17" stroke="#5f6368" stroke-width="2"/></svg>' },

            // Final Batch
            { type: 'Flowchart::OffPageConnector', icon: '<svg width="24" height="24"><path d="M4 4 H20 L20 14 L12 20 L4 14 Z" fill="#fce8e6" stroke="#c5221f" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Sort', icon: '<svg width="24" height="24"><path d="M12 2 L22 12 L12 22 L2 12 Z" fill="#ffe0b2" stroke="#ef6c00" stroke-width="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="#ef6c00" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Extract', icon: '<svg width="24" height="24"><path d="M12 2 L22 22 H2 Z" fill="#fff9c4" stroke="#fbc02d" stroke-width="2"/></svg>' },
            { type: 'Flowchart::Card', icon: '<svg width="24" height="24"><path d="M8 4 L20 4 L20 20 L4 20 L4 8 Z" fill="#f3e5f5" stroke="#8e24aa" stroke-width="2"/></svg>' },
            { type: 'Flowchart::MultipleDocuments', icon: '<svg width="24" height="24"><path d="M8 8 H20 V18 H8 Z" fill="#fff" stroke="#0277bd" stroke-width="1"/><path d="M6 6 H18 V16 H6 Z" fill="#fff" stroke="#0277bd" stroke-width="1"/><path d="M4 4 H16 V14 Q 12 10 10 14 Q 8 18 4 14 Z" fill="#e1f5fe" stroke="#0277bd" stroke-width="2"/></svg>' }
        ];

        // Filter based on Source Node Type
        let items = [];
        if (sourceNode && sourceNode.type && sourceNode.type.startsWith('BPMN')) {
            items = bpmnItems;
        } else if (sourceNode && sourceNode.type && sourceNode.type.startsWith('Flowchart')) {
            items = flowchartItems;
        } else {
            // Fallback: Show a mix or default to Flowchart
            items = [...flowchartItems, ...bpmnItems];
        }

        items.forEach(item => {
            const btn = document.createElement('div');
            btn.className = 'picker-item';
            btn.innerHTML = item.icon;
            btn.title = item.type.split('::')[1];
            btn.onclick = () => {
                // Create Node logic
                const createPos = diagram.toGraphCoords(x, y);

                // Create Node
                const newNode = diagram.renderer.createNode({
                    type: item.type,
                    x: createPos.x - 50, // Center it roughly?
                    y: createPos.y - 30
                }, diagram.graph.nodes);

                if (newNode) {
                    diagram.graph.addNode(newNode);

                    // Link: Source Right -> Target Left
                    const link = diagram.graph.addLink(
                        sourceNode.id,
                        1,
                        newNode.id,
                        3,
                        diagram.connectionStyle
                    );

                    // Select new node
                    diagram.selectedNodeIds.clear();
                    diagram.selectedNodeIds.add(newNode.id);

                    // Trigger Auto Layout if it's a Mind Map / Org Chart
                    // Determine root
                    if (sourceNode.type.startsWith('MindMap') || sourceNode.type.startsWith('OrgChart')) {
                        const root = diagram.findRootNode(sourceNode); // Use DiagramCanvas method
                        if (root) {
                            diagram.applyMindMapLayout(root);
                        }
                    }

                    diagram.draw();
                }
                picker.remove();
            };
            picker.appendChild(btn);
        });

        document.body.appendChild(picker);

        // Close on click outside
        const closeHandler = (e) => {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('mousedown', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closeHandler), 0);
    },
    name: 'OviDiagram',
    icon: 'Di',

    init(engine) {
        console.log("OviDiagram: Initialized");
    },

    onActivate(engine) {
        console.log("OviDiagram: Activated");

        // 1. Set Sidebar Content
        engine.layoutManager.setSidebarContent(`
            <style>
                .ovidiagram-summary {
                    cursor: pointer; 
                    padding: 8px 5px; 
                    background: var(--bg-hover); 
                    border-radius: 4px; 
                    font-weight: 500; 
                    font-size: 12px; 
                    color: var(--text-primary); 
                    list-style: none; /* Hide default native marker */
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    user-select: none;
                    transition: background 0.1s;
                }
                .ovidiagram-summary:hover {
                    background: var(--bg-hover-strong, #e0e0e0);
                }
                .ovidiagram-summary::-webkit-details-marker {
                    display: none;
                }
                .arrow-icon {
                    display: inline-block; 
                    transition: transform 0.2s ease;
                    font-size: 10px;
                    color: var(--text-secondary);
                }
                details[open] > summary .arrow-icon {
                    transform: rotate(90deg);
                    color: var(--text-primary);
                }
            </style>
            
            <div class="ovidiagram-sidebar" style="padding: 10px; height: 100%; display: flex; flex-direction: column; gap: 15px;">
                
                <!-- Create New Section -->
                <div>
                    <button id="ovidiagram-new-btn" class="ovidiagram-create-btn" data-type="flowchart" style="
                        width: 100%; 
                        padding: 10px; 
                        background: var(--bg-active); 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer;
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        gap: 8px;
                        font-weight: 500;
                        transition: background 0.2s;
                    ">
                        <span style="font-size: 16px;">+</span>
                        <span>New Diagram</span>
                    </button>
                    
                     <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <button id="ovidiagram-layout-btn" class="ovidiagram-layout-btn" title="Auto Layout" style="
                            flex: 1; padding: 6px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;
                        ">
                            ✨ Auto Layout
                        </button>
                    </div>
                </div>

                <!-- Connectors Section -->
                <div style="background: var(--bg-secondary); padding: 8px; border-radius: 6px;">
                    <div style="font-size: 11px; font-weight: bold; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">Connection Style</div>
                    <div style="display: flex; gap: 4px;">
                        <button class="connector-style-btn active" data-style="angle" title="Right Angle" style="flex: 1; padding: 6px; border: 1px solid var(--border-color); background: #fff; border-radius: 4px; cursor: pointer;">
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20 L20 20 L20 4" /></svg>
                        </button>
                        <button class="connector-style-btn" data-style="curve" title="Curved" style="flex: 1; padding: 6px; border: 1px solid var(--border-color); background: #fff; border-radius: 4px; cursor: pointer;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20 C 12 20, 12 4, 20 4" /></svg>
                        </button>
                         <button class="connector-style-btn" data-style="straight" title="Straight" style="flex: 1; padding: 6px; border: 1px solid var(--border-color); background: #fff; border-radius: 4px; cursor: pointer;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="20" y2="4" /></svg>
                        </button>
                    </div>
                </div>

                <!-- Shapes Library Section -->
                <div style="flex: 1; overflow-y: auto;">
                    <div style="font-size: 11px; font-weight: bold; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px;">Shapes Library</div>
                    
                    <!-- Flowchart Shapes -->
                    <details style="margin-bottom: 10px;">
                        <summary class="ovidiagram-summary"><span class="arrow-icon">▶</span> Flowchart</summary>
                        <div style="padding: 10px 5px; display: flex; flex-wrap: wrap; gap: 10px;">
                            ${this.createDraggableItem('Flowchart::StartEnd', 'Start/End', 'border-radius: 12px; border-color: #1a73e8; height: 18px;')}
                            ${this.createDraggableItem('Flowchart::Process', 'Process', 'border-color: #5f6368;')}
                            ${this.createDraggableItem('Flowchart::Decision', 'Decision', 'width: 20px; height: 20px; transform: rotate(45deg); border-color: #c5221f; margin-top: 5px; margin-bottom: 5px;')}
                            ${this.createDraggableItem('Flowchart::InputOutput', 'Input/Output', 'transform: skewX(-15deg); border-color: #188038;')}
                            
                            <!-- Document: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Document',
            'Document',
            `<svg width="30" height="24" viewBox="0 0 44 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 2 H42 V26 Q 32 22 22 26 Q 12 30 2 26 Z" fill="#f3e5f5" stroke="#7b1fa2" stroke-width="2"/>
                                </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Preparation: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Preparation',
            'Preparation',
            `<svg width="32" height="20" viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 2L38 2L46 15L38 28L10 28L2 15L10 2Z" fill="#e0f2f1" stroke="#00897b" stroke-width="2"/>
                                </svg>`,
            'var(--text-secondary)'
        )}
        
                            <!-- Database: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Database',
            'Database',
            `<svg width="24" height="28" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <ellipse cx="12" cy="4" rx="10" ry="3" fill="#eceff1" stroke="#546e7a" stroke-width="2"/>
                                    <path d="M2 4 V20 C 2 23, 22 23, 22 20 V4" fill="#eceff1" stroke="#546e7a" stroke-width="2"/>
                                    <ellipse cx="12" cy="4" rx="10" ry="3" fill="none" stroke="#546e7a" stroke-width="2"/> 
                                    <path d="M2 20 C 2 23, 22 23, 22 20" stroke="#546e7a" stroke-width="2"/> 
                                </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Manual Input: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::ManualInput',
            'Manual Input',
            `<svg width="34" height="22" viewBox="0 0 34 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 8 L32 2 L32 20 L2 20 Z" fill="#e1f5fe" stroke="#0277bd" stroke-width="2"/>
                                </svg>`,
            'var(--text-secondary)'
        )}
        
                            <!-- Connector: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Connector',
            'Connector',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" fill="#fff" stroke="#5f6368" stroke-width="2"/>
                                    <text x="12" y="16" font-size="10" text-anchor="middle" fill="#5f6368" font-family="sans-serif">A</text>
                                </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Delay: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Delay',
            'Delay',
            `<svg width="34" height="24" viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 2 H20 A 10 10 0 0 1 20 22 H2 Z" fill="#fef7e0" stroke="#f9ab00" stroke-width="2"/>
                                </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Predefined Process: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::PredefinedProcess',
            'Subroutine',
            `<svg width="34" height="24" viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="2" y="2" width="30" height="20" fill="#f3f3f3" stroke="#5f6368" stroke-width="2"/>
                                    <line x1="8" y1="2" x2="8" y2="22" stroke="#5f6368" stroke-width="2"/>
                                    <line x1="26" y1="2" x2="26" y2="22" stroke="#5f6368" stroke-width="2"/>
                                </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Manual Operation: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::ManualOperation',
            'Manual Operation',
            `<svg width="34" height="24" viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 2 H32 L26 22 H8 L2 2 Z" fill="#f3e5f5" stroke="#8e24aa" stroke-width="2"/>
                                </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Display: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Display',
            'Display',
            `<svg width="34" height="24" viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M30 4 H10 L4 12 L10 20 H30 Z" fill="#e1f5fe" stroke="#0277bd" stroke-width="2"/>
                                </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Merge: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Merge',
            'Merge',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 4 H22 L12 20 Z" fill="#f3f3f3" stroke="#5f6368" stroke-width="2"/>
                                </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Annotation: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Annotation',
            'Note',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4 H16 L20 8 V20 H4 Z" fill="#fffde7" stroke="#fbc02d" stroke-width="2"/>
                <path d="M16 4 V8 H20" fill="none" stroke="#fbc02d" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Loop Limit: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::LoopLimit',
            'Loop Limit',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4 L18 4 L22 8 L22 16 L18 20 L6 20 L2 16 L2 8 Z" fill="#e1f5fe" stroke="#0277bd" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Internal Storage: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::InternalStorage',
            'Storage',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="20" height="16" fill="#f3f3f3" stroke="#5f6368" stroke-width="2"/>
                <line x1="6" y1="4" x2="6" y2="20" stroke="#5f6368" stroke-width="2"/>
                <line x1="2" y1="8" x2="22" y2="8" stroke="#5f6368" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Summing Junction: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::SummingJunction',
            'Summing',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#fff" stroke="#5f6368" stroke-width="2"/>
                <path d="M12 6 V18 M6 12 H18" stroke="#5f6368" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Collate: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Collate',
            'Collate',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4 L20 4 L4 20 L20 20 Z" fill="#ffe0b2" stroke="#ef6c00" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Or: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Or',
            'Or',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#fff" stroke="#5f6368" stroke-width="2"/>
                <path d="M7 7 L17 17 M17 7 L7 17" stroke="#5f6368" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}
        
                            <!-- Off-Page: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::OffPageConnector',
            'Off-Page',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4 H20 L20 14 L12 20 L4 14 Z" fill="#fce8e6" stroke="#c5221f" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Sort: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Sort',
            'Sort',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="#ffe0b2" stroke="#ef6c00" stroke-width="2"/>
                <line x1="2" y1="12" x2="22" y2="12" stroke="#ef6c00" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Extract: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Extract',
            'Extract',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2 L22 22 H2 Z" fill="#fff9c4" stroke="#fbc02d" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}

                            <!-- Card: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::Card',
            'Card',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 4 L20 4 L20 20 L4 20 L4 8 Z" fill="#f3e5f5" stroke="#8e24aa" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}
        
                            <!-- Multiple Documents: SVG Icon -->
                            ${this.createSvgDraggableItem(
            'Flowchart::MultipleDocuments',
            'Multi-Doc',
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 8 H20 V18 H8 Z" fill="#fff" stroke="#0277bd" stroke-width="1"/>
                <path d="M6 6 H18 V16 H6 Z" fill="#fff" stroke="#0277bd" stroke-width="1"/>
                <path d="M4 4 H16 V14 Q 12 10 10 14 Q 8 18 4 14 Z" fill="#e1f5fe" stroke="#0277bd" stroke-width="2"/>
            </svg>`,
            'var(--text-secondary)'
        )}        </div>
                    </details>

                    <!-- BPMN Shapes (Placeholder) -->
                    <details style="margin-bottom: 10px;">
                        <summary class="ovidiagram-summary"><span class="arrow-icon">▶</span> BPMN 2.0</summary>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; padding-top: 10px;">
                            ${this.createSvgDraggableItem('BPMN::StartEvent', 'Start',
            `<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="#e6f4ea" stroke="#137333" stroke-width="1"/></svg>`, '#137333')}
                            ${this.createSvgDraggableItem('BPMN::IntermediateEvent', 'Intermediate',
                `<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="14" fill="#fef7e0" stroke="#e37400" stroke-width="1"/><circle cx="15" cy="15" r="11" fill="none" stroke="#e37400" stroke-width="1"/></svg>`, '#e37400')}

                            ${this.createSvgDraggableItem('BPMN::EndEvent', 'End',
                    `<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="#fce8e6" stroke="#c5221f" stroke-width="3"/></svg>`, '#c5221f')}
                            
                            ${this.createSvgDraggableItem('BPMN::Task', 'Task',
                        `<svg width="40" height="30" viewBox="0 0 40 30"><rect x="1" y="1" width="38" height="28" rx="4" fill="#e8f0fe" stroke="#1a73e8" stroke-width="1"/></svg>`, '#1a73e8')}
                            
                            ${this.createSvgDraggableItem('BPMN::ExclusiveGateway', 'Gateway',
                            `<svg width="30" height="30" viewBox="0 0 30 30"><path d="M15 0 L30 15 L15 30 L0 15 Z" fill="#fef7e0" stroke="#ea8600" stroke-width="1"/><text x="15" y="20" font-size="20" text-anchor="middle" fill="#ea8600">×</text></svg>`, '#ea8600')}
                        </div>
                    </details>

                     <!-- Fishbone Shapes (Placeholder) -->
                    <details style="margin-bottom: 10px;">
                        <summary class="ovidiagram-summary"><span class="arrow-icon">▶</span> Fishbone</summary>
                         <div style="padding: 10px; font-size: 11px; color: var(--text-secondary); text-align: center;">Fishbone shapes coming soon...</div>
                    </details>

                    <!-- Mind Map Shapes -->
                    <details style="margin-bottom: 10px;">
                        <summary class="ovidiagram-summary"><span class="arrow-icon">▶</span> Mind Map</summary>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; padding-top: 10px;">
                            ${this.createSvgDraggableItem('MindMap::CentralTopic', 'Central Topic',
                                `<svg width="40" height="30" viewBox="0 0 40 30"><ellipse cx="20" cy="15" rx="18" ry="10" fill="#e1bee7" stroke="#8e24aa" stroke-width="2"/></svg>`, '#8e24aa')}
                            
                            ${this.createSvgDraggableItem('MindMap::MainTopic', 'Main Topic',
                                    `<svg width="36" height="24" viewBox="0 0 36 24"><path d="M2 12 Q 18 2, 34 12" fill="none" stroke="#ba68c8" stroke-width="2"/><rect x="18" y="2" width="16" height="20" rx="4" fill="#f3e5f5" stroke="#ba68c8" stroke-width="1"/></svg>`, '#7b1fa2')}
                            
                            ${this.createSvgDraggableItem('MindMap::SubTopic', 'Sub Topic',
                                        `<svg width="30" height="20" viewBox="0 0 30 20"><line x1="0" y1="10" x2="10" y2="10" stroke="#9e9e9e" stroke-width="1"/><rect x="10" y="4" width="20" height="12" rx="2" fill="#fff" stroke="#9e9e9e" stroke-width="1"/></svg>`, '#757575')}
                        </div>
                    </details>

                    <!-- Organization Chart Shapes -->
                    <details style="margin-bottom: 10px;">
                        <summary class="ovidiagram-summary"><span class="arrow-icon">▶</span> Org Chart</summary>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; padding-top: 10px;">
                            ${this.createSvgDraggableItem('OrgChart::Executive', 'Executive',
                                            `<svg width="40" height="30" viewBox="0 0 40 30">
                                    <rect x="2" y="2" width="36" height="26" fill="#e3f2fd" stroke="#1565c0" stroke-width="2"/>
                                    <path d="M12 28 V12 H28 V28" fill="none" stroke="#1565c0" stroke-width="1"/> 
                                    <circle cx="20" cy="10" r="4" fill="#bbdefb" stroke="#1565c0" stroke-width="1"/>
                                </svg>`, '#0d47a1')}
                            
                            ${this.createSvgDraggableItem('OrgChart::Manager', 'Manager',
                                                `<svg width="40" height="30" viewBox="0 0 40 30">
                                    <rect x="2" y="2" width="36" height="26" fill="#e0f2f1" stroke="#00695c" stroke-width="2"/>
                                    <rect x="2" y="2" width="10" height="26" fill="#b2dfdb"/>
                                </svg>`, '#004d40')}
                            
                            ${this.createSvgDraggableItem('OrgChart::Position', 'Position',
                                                    `<svg width="40" height="30" viewBox="0 0 40 30">
                                    <rect x="2" y="6" width="36" height="18" fill="#fff" stroke="#5f6368" stroke-width="1"/>
                                </svg>`, '#616161')}
                                
                            ${this.createSvgDraggableItem('OrgChart::Assistant', 'Assistant',
                                                        `<svg width="30" height="30" viewBox="0 0 30 30">
                                    <path d="M15 0 V10 H25" fill="none" stroke="#5f6368" stroke-width="1" stroke-dasharray="2,2"/>
                                    <rect x="2" y="10" width="22" height="16" fill="#f5f5f5" stroke="#757575" stroke-width="1"/>
                                </svg>`, '#757575')}
                        </div>
                    </details>

                    <!-- Export & Controls -->
                    <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                        <div style="font-size: 11px; font-weight: bold; color: var(--text-secondary); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Export & Simulation</div>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="ovidiagram-export-btn" data-format="png" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); border-radius: 4px; font-size: 12px; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px;">
                                <span>🖼️</span> Export as PNG
                            </button>
                            <button class="ovidiagram-export-btn" data-format="svg" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); border-radius: 4px; font-size: 12px; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px;">
                                <span>📐</span> Export as SVG
                            </button>
                            <button class="ovidiagram-export-btn" data-format="html" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); background: #1a73e8; color: #fff; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px;">
                                <span>🌐</span> Interactive HTML
                            </button>
                            <button class="ovidiagram-export-btn" data-format="json" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); border-radius: 4px; font-size: 12px; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px;">
                                <span>📦</span> OviState (JSON)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);


        // 2. Set Inspector Content (Placeholder)
        engine.layoutManager.setInspectorContent(`
            <div style="padding: 10px; color: var(--text-secondary);">
                <div style="margin-bottom: 10px; font-weight: bold; color: var(--text-primary);">Properties</div>
                <div style="font-size: 12px;">Select a shape to view properties.</div>
            </div>
        `);

        // 3. Event Binding (Delegation)
        this._bindSidebarEvents(engine);
    },

    /**
     * Binds events using delegation to handle dynamic content updates safely.
     */
    _bindSidebarEvents(engine) {
        // Remove existing listener if any to avoid duplicates (safeguard)
        if (this._sidebarClickHandler) {
            document.removeEventListener('click', this._sidebarClickHandler);
        }

        // Create Diagram Handler
        this._sidebarClickHandler = (e) => {
            // New Diagram
            const btn = e.target.closest('.ovidiagram-create-btn');
            if (btn) {
                const type = btn.dataset.type;
                this.createNewDiagram(engine, type);
                return;
            }

            // Export Handler
            const exportBtn = e.target.closest('.ovidiagram-export-btn');
            if (exportBtn) {
                const format = exportBtn.dataset.format;
                const activeTabId = engine.tabManager.activeTabId;
                const activeTab = engine.tabManager.tabs.get(activeTabId);
                if (activeTab && activeTab.contentEl) {
                    const canvas = activeTab.contentEl.querySelector('canvas');
                    if (canvas && canvas.diagram) {
                        this.handleExport(format, canvas.diagram);
                    }
                }
                return;
            }

            // Auto Layout
            const layoutBtn = e.target.closest('.ovidiagram-layout-btn');
            if (layoutBtn) {
                const activeTabId = engine.tabManager.activeTabId;
                const activeTab = engine.tabManager.tabs.get(activeTabId);
                if (activeTab && activeTab.contentEl) {
                    const canvas = activeTab.contentEl.querySelector('canvas');
                    if (canvas && canvas.diagram) {
                        // Find a root to layout.
                        // 1. Try selected node
                        let root = null;
                        if (canvas.diagram.selectedNodeIds.size > 0) {
                            const selId = canvas.diagram.selectedNodeIds.values().next().value;
                            const selNode = canvas.diagram.graph.nodes.find(n => n.id === selId);
                            if (selNode) {
                                root = canvas.diagram.findRootNode(selNode);
                            }
                        }
                        // 2. Fallback: First Node (simplistic)
                        if (!root && canvas.diagram.graph.nodes.length > 0) {
                            const first = canvas.diagram.graph.nodes[0];
                            root = canvas.diagram.findRootNode(first);
                        }

                        if (root) {
                            canvas.diagram.applyMindMapLayout(root);
                            canvas.diagram.draw();
                            console.log("Auto Layout Applied");
                        }
                    }
                }
                return;
            }

            // Connection Style
            const styleBtn = e.target.closest('.connector-style-btn');
            if (styleBtn) {
                // Update UI
                document.querySelectorAll('.connector-style-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = '#fff';
                    b.style.borderColor = 'var(--border-color)';
                });
                styleBtn.classList.add('active');
                styleBtn.style.background = '#e8f0fe';
                styleBtn.style.borderColor = '#1a73e8';

                const style = styleBtn.dataset.style;

                // Update Active Diagram
                const activeTabId = engine.tabManager.activeTabId;
                const activeTab = engine.tabManager.tabs.get(activeTabId);

                if (activeTab && activeTab.contentEl) {
                    const canvas = activeTab.contentEl.querySelector('canvas');
                    if (canvas && canvas.diagram) {
                        canvas.diagram.connectionStyle = style;
                        console.log("Updated connection style to:", style);
                    }
                }
            }
        };

        // We bind to the document for simplicity, checking if the target is within our sidebar
        // In a real app, we might bind to the sidebar container specifically if exposed by the engine
        document.addEventListener('click', this._sidebarClickHandler);

        // Handle Drag Start
        if (this._dragStartHandler) {
            document.removeEventListener('dragstart', this._dragStartHandler);
        }
        this._dragStartHandler = (e) => {
            if (e.target.closest('.diagram-draggable')) {
                const el = e.target.closest('.diagram-draggable');
                const type = el.dataset.type;
                e.dataTransfer.setData('application/json', JSON.stringify({ type }));
            }
        };
        document.addEventListener('dragstart', this._dragStartHandler);
    },

    createSvgDraggableItem(type, label, svgContent, textColor) {
        return `
            <div 
                class="diagram-draggable" 
                draggable="true" 
                data-type="${type}"
                title="${label}"
                style="
                    width: 55px; 
                    height: 55px; 
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    gap: 2px;
                "
            >
                <div>${svgContent}</div>
                <div style="font-size: 9px; font-weight: 600; color: ${textColor}; text-align: center; line-height: 1.1;">${label}</div>
            </div>
        `;
    },

    createDraggableItem(type, label, shapeStyle) {
        return `
            <div 
                class="diagram-draggable" 
                draggable="true" 
                data-type="${type}"
                title="${label}"
                style="
                    width: 55px; 
                    height: 55px; 
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    gap: 4px;
                "
            >
                <!-- Visual Shape Preview -->
                <div style="
                    width: 30px; 
                    height: 20px; 
                    border: 2px solid; 
                    display: grid; 
                    place-items: center; 
                    box-sizing: border-box;
                    background: #fff;
                    ${shapeStyle}
                "></div>
                
                <!-- Label Below -->
                <div style="font-size: 9px; font-weight: 600; color: var(--text-secondary); white-space: nowrap;">${label}</div>
            </div>
        `;
    },

    createNewDiagram(engine, type = 'flowchart') {
        const typeMap = {
            'flowchart': 'Flowchart',
            'bpmn': 'BPMN Diagram',
            'fishbone': 'Fishbone Diagram',
            'mindmap': 'Mind Map'
        };

        const title = typeMap[type] || 'Diagram';

        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        // Create Canvas
        const canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        container.appendChild(canvas);

        const tabId = `${type}_${Date.now()}`;
        engine.tabManager.openTab(title, 'ovidiagram', container);

        // Initialize Diagram Editor on this canvas
        // Initialize Diagram Editor on this canvas
        requestAnimationFrame(() => {
            const diagram = new DiagramCanvas(canvas);

            // Handle selection for Inspector
            diagram.onNodeSelected = (node) => {
                this.updateInspector(engine, diagram, node, 'node');
            };

            diagram.onLinkSelected = (link) => {
                this.updateInspector(engine, diagram, link, 'link');
            };

            // Switch Renderer based on type

            if (type === 'bpmn') {
                diagram.setRenderer(new BpmnRenderer(canvas.getContext('2d')));
            } else {
                diagram.setRenderer(new FlowchartRenderer(canvas.getContext('2d')));
            }

            console.log(`Diagram Canvas Created for ${type}`);
        });
    },

    updateInspector(engine, diagram, obj, type = 'node') {
        if (!obj) {
            engine.layoutManager.setInspectorContent(`
                <div class="ovidiagram-inspector" style="padding: 12px; display: flex; flex-direction: column; gap: 15px;">
                    <div style="font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Canvas Properties</div>
                    
                    <div>
                        <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">AUTO-THEME</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <button class="theme-btn" data-theme="default" style="padding: 8px; font-size: 11px; border: 1px solid var(--border-color); border-radius: 4px; background: #fff; cursor: pointer;">Classic</button>
                            <button class="theme-btn" data-theme="modern-blue" style="padding: 8px; font-size: 11px; border: 1px solid var(--border-color); border-radius: 4px; background: #e8f0fe; color: #1a73e8; cursor: pointer;">Modern Blue</button>
                            <button class="theme-btn" data-theme="professional-dark" style="padding: 8px; font-size: 11px; border: 1px solid var(--border-color); border-radius: 4px; background: #202124; color: #fff; cursor: pointer;">Pro Dark</button>
                            <button class="theme-btn" data-theme="forest" style="padding: 8px; font-size: 11px; border: 1px solid var(--border-color); border-radius: 4px; background: #e6f4ea; color: #1e8e3e; cursor: pointer;">Forest</button>
                        </div>
                    </div>

                    <div>
                        <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">LAYOUT TOOLS</label>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <select id="layout-direction" style="flex: 1; padding: 6px; font-size: 11px; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px;">
                                <option value="horizontal">Horizontal Layered</option>
                                <option value="vertical">Vertical Layered</option>
                            </select>
                        </div>
                        <button id="auto-layout-btn" style="width: 100%; padding: 8px; background: #1a73e8; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                            Rearrange Diagram
                        </button>
                    </div>

                    <div style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                        <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">PRESENTATION MODE 📽️</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                            <button id="pres-start" style="padding: 10px; background: #e6f4ea; color: #137333; border: 1px solid #1e8e3e; border-radius: 4px; cursor: pointer; font-weight: bold;">▶ Start</button>
                            <button id="pres-stop" style="padding: 10px; background: #fce8e6; color: #c5221f; border: 1px solid #c5221f; border-radius: 4px; cursor: pointer; font-weight: bold;">⏹ Stop</button>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button id="pres-prev" style="flex: 1; padding: 8px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">⬅ Prev</button>
                            <button id="pres-next" style="flex: 1; padding: 8px; background: #e8f0fe; color: #1a73e8; border: 1px solid #1a73e8; border-radius: 4px; cursor: pointer; font-weight: bold;">Next ➡</button>
                        </div>
                    </div>

                    <div style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                        <button id="clear-canvas-btn" style="width: 100%; padding: 8px; background: var(--bg-secondary); color: #c5221f; border: 1px solid #c5221f; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                            Clear Diagram
                        </button>
                    </div>
                </div>
            `);

            // Bind Canvas Actions
            const container = document.querySelector('.ovidiagram-inspector');
            if (container) {
                container.querySelectorAll('.theme-btn').forEach(btn => {
                    btn.onclick = () => {
                        diagram.applyTheme(btn.dataset.theme);
                    };
                });

                const autoLayoutBtn = container.querySelector('#auto-layout-btn');
                if (autoLayoutBtn) {
                    autoLayoutBtn.onclick = () => {
                        const dir = container.querySelector('#layout-direction').value;
                        diagram.autoLayout(dir);
                    };
                }

                // Presentation Controls
                const pStart = container.querySelector('#pres-start');
                const pStop = container.querySelector('#pres-stop');
                const pNext = container.querySelector('#pres-next');
                const pPrev = container.querySelector('#pres-prev');

                if (pStart) pStart.onclick = () => diagram.startPresentation();
                if (pStop) pStop.onclick = () => diagram.stopPresentation();
                if (pNext) pNext.onclick = () => diagram.nextSlide();
                if (pPrev) pPrev.onclick = () => diagram.prevSlide();

                const clearBtn = container.querySelector('#clear-canvas-btn');
                if (clearBtn) {
                    clearBtn.onclick = () => {
                        if (confirm('Clear the entire diagram?')) {
                            diagram.graph.nodes = [];
                            diagram.graph.links = [];
                            diagram.draw();
                        }
                    };
                }
            }
            return;
        }

        if (type === 'node') {
            this.updateNodeInspector(engine, diagram, obj);
        } else {
            this.updateLinkInspector(engine, diagram, obj);
        }
    },

    updateNodeInspector(engine, diagram, node) {
        const behaviors = ['flow', 'pulse', 'tooltip', 'chain'];
        const behaviorLabels = {
            'flow': 'Flow Animation',
            'pulse': 'Pulse Status',
            'tooltip': 'Info Tooltip',
            'chain': 'Highlight Chain'
        };

        let behaviorsHtml = behaviors.map(bid => {
            const isActive = node.behaviors && node.behaviors.includes(bid);
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <label style="font-size: 12px;">${behaviorLabels[bid]}</label>
                    <input type="checkbox" class="behavior-toggle" data-bid="${bid}" ${isActive ? 'checked' : ''}>
                </div>
            `;
        }).join('');

        engine.layoutManager.setInspectorContent(`
            <div class="ovidiagram-inspector" style="padding: 12px; display: flex; flex-direction: column; gap: 15px;">
                <div style="font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Shape Properties</div>
                
                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">LABEL</label>
                    <input type="text" id="inspector-label" value="${node.label || ''}" style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
                </div>

                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">PROCESS STATUS</label>
                    <select id="inspector-status" style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
                        <option value="pending" ${(!node.status || node.status === 'pending') ? 'selected' : ''}>Pending (Default)</option>
                        <option value="active" ${node.status === 'active' ? 'selected' : ''}>In Progress (Active)</option>
                        <option value="done" ${node.status === 'done' ? 'selected' : ''}>Done (Completed)</option>
                        <option value="error" ${node.status === 'error' ? 'selected' : ''}>Error / Blocked</option>
                    </select>
                </div>

                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">RICH DETAILS</label>
                    <textarea id="inspector-detail" placeholder="Markdown supported..." style="width: 100%; height: 80px; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary); font-family: monospace; font-size: 12px;">${node.metadata?.detail || ''}</textarea>
                </div>

                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">MEDIA & LINKS</label>
                    <div id="inspector-attachments-list" style="margin-bottom: 8px;">
                        ${(node.metadata?.attachments || []).map((att, i) => `
                            <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 4px; background: var(--bg-secondary); padding: 4px; border-radius: 4px;">
                                <span style="font-size: 10px; font-weight: bold; width: 40px; text-transform: uppercase;">${att.type}</span>
                                <input class="att-label-edit" data-index="${i}" value="${att.label || ''}" placeholder="Label" style="width: 60px; font-size: 11px; border: none; background: transparent;">
                                <span style="flex:1; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0.7;">${att.url}</span>
                                <button class="att-remove" data-index="${i}" style="border: none; background: none; cursor: pointer; color: var(--text-secondary);">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <select id="inspector-att-type" style="width: 70px; padding: 4px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); font-size: 11px;">
                           <option value="link">Link</option>
                           <option value="video">Video</option>
                           <option value="audio">Audio</option>
                           <option value="image">Image</option>
                        </select>
                        <input id="inspector-att-url" placeholder="URL..." style="flex: 1; padding: 4px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); font-size: 11px;">
                        <button id="inspector-att-add" style="padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-secondary); cursor: pointer;">+</button>
                    </div>
                </div>

                <div style="font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px; margin-top: 10px;">Interactivity</div>
                ${behaviorsHtml}

                ${node.behaviors && node.behaviors.includes('tooltip') ? `
                    <div>
                        <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">TOOLTIP INFO</label>
                        <textarea id="inspector-info" style="width: 100%; height: 60px; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">${node.metadata?.info || ''}</textarea>
                    </div>
                ` : ''}
            </div>
        `);

        // Bind Inspector Events
        const container = document.querySelector('.ovidiagram-inspector');
        if (!container) return;

        // Label Change
        const labelInput = container.querySelector('#inspector-label');
        if (labelInput) {
            labelInput.oninput = (e) => {
                node.label = e.target.value;
                diagram.draw();
            };
        }

        // Status Change
        const statusInput = container.querySelector('#inspector-status');
        if (statusInput) {
            statusInput.onchange = (e) => {
                node.status = e.target.value;
                diagram.draw();
            };
        }

        // Rich Detail Change
        const detailInput = container.querySelector('#inspector-detail');
        if (detailInput) {
            detailInput.oninput = (e) => {
                if (!node.metadata) node.metadata = {};
                node.metadata.detail = e.target.value;
                diagram.draw(); // To update the 'i' indicator
            };
        }

        // Media Attachments Logic
        const attAddBtn = container.querySelector('#inspector-att-add');
        if (attAddBtn) {
            attAddBtn.onclick = () => {
                const type = container.querySelector('#inspector-att-type').value;
                const url = container.querySelector('#inspector-att-url').value;
                if (!url) return;

                if (!node.metadata) node.metadata = {};
                if (!node.metadata.attachments) node.metadata.attachments = [];

                node.metadata.attachments.push({ type, url, label: type === 'link' ? 'Link' : '' });
                diagram.draw();
                this.updateInspector(engine, diagram, node, 'node'); // Refresh UI
            };
        }

        // Remove Attachment
        container.querySelectorAll('.att-remove').forEach(btn => {
            btn.onclick = (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (node.metadata?.attachments) {
                    node.metadata.attachments.splice(idx, 1);
                    diagram.draw();
                    this.updateInspector(engine, diagram, node, 'node');
                }
            };
        });

        // Edit Label
        container.querySelectorAll('.att-label-edit').forEach(inp => {
            inp.onchange = (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (node.metadata?.attachments && node.metadata.attachments[idx]) {
                    node.metadata.attachments[idx].label = e.target.value;
                }
            };
        });

        // Tooltip Info Change
        const infoInput = container.querySelector('#inspector-info');
        if (infoInput) {
            infoInput.oninput = (e) => {
                if (!node.metadata) node.metadata = {};
                node.metadata.info = e.target.value;
            };
        }

        // Behavior Toggles
        container.querySelectorAll('.behavior-toggle').forEach(chk => {
            chk.onchange = (e) => {
                const bid = e.target.dataset.bid;
                if (!node.behaviors) node.behaviors = [];
                if (e.target.checked) {
                    if (!node.behaviors.includes(bid)) node.behaviors.push(bid);
                } else {
                    node.behaviors = node.behaviors.filter(id => id !== bid);
                }
                // Refresh for dependent fields
                this.updateInspector(engine, diagram, node, 'node');
                diagram.draw();
            };
        });
    },

    updateLinkInspector(engine, diagram, link) {
        engine.layoutManager.setInspectorContent(`
            <div class="ovidiagram-inspector" style="padding: 12px; display: flex; flex-direction: column; gap: 15px;">
                <div style="font-weight: bold; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Link Properties</div>
                
                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">LABEL</label>
                    <input type="text" id="inspector-link-label" value="${link.label || ''}" style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
                </div>

                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">STYLE</label>
                    <select id="inspector-link-type" style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
                        <option value="straight" ${link.style.type === 'straight' ? 'selected' : ''}>Straight</option>
                        <option value="angle" ${link.style.type === 'angle' ? 'selected' : ''}>Orthogonal (Angle)</option>
                        <option value="curve" ${link.style.type === 'curve' ? 'selected' : ''}>Curved</option>
                    </select>
                </div>

                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">COLOR</label>
                    <input type="color" id="inspector-link-color" value="${link.style.color || '#5f6368'}" style="width: 100%; height: 30px; padding: 2px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary);">
                </div>

                <div>
                    <label style="display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">ARROW HEAD</label>
                    <select id="inspector-link-head" style="width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary);">
                        <option value="none" ${link.style.endHead === 'none' ? 'selected' : ''}>None</option>
                        <option value="arrow" ${link.style.endHead === 'arrow' ? 'selected' : ''}>Arrow</option>
                    </select>
                </div>
            </div>
        `);

        // Bind Link Events
        const container = document.querySelector('.ovidiagram-inspector');
        if (!container) return;

        const labelInput = container.querySelector('#inspector-link-label');
        if (labelInput) {
            labelInput.oninput = () => {
                link.label = labelInput.value;
                diagram.draw();
            };
        }

        const typeSelect = container.querySelector('#inspector-link-type');
        if (typeSelect) {
            typeSelect.onchange = () => {
                link.style.type = typeSelect.value;
                diagram.draw();
            };
        }

        const colorInput = container.querySelector('#inspector-link-color');
        if (colorInput) {
            colorInput.oninput = () => {
                link.style.color = colorInput.value;
                diagram.draw();
            };
        }

        const headSelect = container.querySelector('#inspector-link-head');
        if (headSelect) {
            headSelect.onchange = () => {
                link.style.endHead = headSelect.value;
                diagram.draw();
            };
        }
    },

    async handleExport(format, diagram) {
        let content = '';
        let fileName = `diagram_${Date.now()}`;
        let mimeType = 'text/plain';

        switch (format) {
            case 'svg':
                content = DiagramExporter.toSVG(diagram);
                fileName += '.svg';
                mimeType = 'image/svg+xml';
                break;
            case 'png':
                content = await DiagramExporter.toPNG(diagram);
                this.downloadDataUrl(content, `${fileName}.png`);
                return;
            case 'json':
                content = DiagramExporter.toJSON(diagram);
                fileName += '.json';
                break;
            case 'html':
                content = DiagramExporter.toHTML(diagram);
                fileName += '.html';
                mimeType = 'text/html';
                break;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        this.downloadDataUrl(url, fileName);
    },

    downloadDataUrl(url, fileName) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    onDeactivate() {

        console.log("OviDiagram: Deactivated");
        if (this._sidebarClickHandler) {
            document.removeEventListener('click', this._sidebarClickHandler);
            this._sidebarClickHandler = null;
        }
        if (this._dragStartHandler) {
            document.removeEventListener('dragstart', this._dragStartHandler);
            this._dragStartHandler = null;
        }
    }
};

// Register the plugin
engine.pluginManager.register(OviDiagramPlugin);
