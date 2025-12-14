/**
 * Template Manager
 * Handles loading, applying, and exporting animation templates
 */

export default class TemplateManager {
    constructor() {
        this.templates = [];
        this.categories = ['physics', 'astronomy', 'motion', 'interactive', 'demo'];
    }

    /**
     * Load all built-in templates
     */
    async loadBuiltInTemplates() {
        const templateFiles = [
            'solar-system.json',
            'collision-lab.json',
            'double-pendulum.json',
            'wave-interference.json'
        ];

        for (const file of templateFiles) {
            try {
                const response = await fetch(`lib/ovistate/templates/built-in/${file}`);
                const template = await response.json();
                this.templates.push(template);
                console.log(`✅ Loaded template: ${template.name}`);
            } catch (error) {
                console.error(`Failed to load template ${file}:`, error);
            }
        }

        return this.templates;
    }

    /**
     * Get all templates
     */
    getAllTemplates() {
        return this.templates;
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category) {
        return this.templates.filter(t => t.category === category);
    }

    /**
     * Get template by ID
     */
    getTemplate(id) {
        return this.templates.find(t => t.id === id);
    }

    /**
     * Apply template to editor
     */
    applyTemplate(editor, templateId) {
        const template = this.getTemplate(templateId);
        if (!template) {
            console.error('Template not found:', templateId);
            return false;
        }

        console.log('📋 Applying template:', template.name);

        // Clear existing objects
        editor.runtime.objects = [];

        // Apply canvas settings
        if (template.canvas) {
            editor.runtime.width = template.canvas.width;
            editor.runtime.height = template.canvas.height;
            editor.runtimeCanvas.width = template.canvas.width;
            editor.runtimeCanvas.height = template.canvas.height;
            editor.runtimeCanvas.style.background = template.canvas.background;
        }

        // Apply physics settings
        if (template.physics) {
            editor.runtime.gravity = template.physics.gravity;
            editor.runtime.enablePhysics = template.physics.enablePhysics;
            editor.physics.gravity = template.physics.gravity;
        }

        // Create objects
        if (template.objects) {
            template.objects.forEach(objData => {
                const obj = { ...objData };

                // Ensure physics object exists
                if (!obj.physics) {
                    obj.physics = {
                        enabled: false,
                        velocity: { x: 0, y: 0 },
                        mass: 1,
                        bounciness: 0.8
                    };
                }

                // Add to runtime
                editor.runtime.addObject(obj);

                // Attach behaviors
                if (obj.behaviors && obj.behaviors.length > 0) {
                    obj.behaviors.forEach(behaviorId => {
                        editor.attachBehavior(obj, behaviorId);
                    });
                }
            });
        }

        // UPDATE SIMULATION DATA FOR EXPORT
        editor.simulationData.canvas = {
            width: template.canvas.width,
            height: template.canvas.height,
            background: template.canvas.background
        };

        editor.simulationData.physics = {
            gravity: template.physics.gravity,
            friction: template.physics.friction || 0.01,
            enablePhysics: template.physics.enablePhysics
        };

        editor.simulationData.objects = template.objects.map(obj => ({ ...obj }));

        editor.simulationData.metadata = {
            title: template.name,
            version: '1.0'
        };

        // Deselect any selected object
        editor.deselectObject();

        console.log('✅ Template applied successfully');
        console.log('📊 Export data ready:', editor.simulationData.objects.length, 'objects');
        return true;
    }

    /**
     * Export current state as template
     */
    exportAsTemplate(editor, metadata) {
        const template = {
            id: metadata.id || `custom-${Date.now()}`,
            name: metadata.name || 'Custom Template',
            description: metadata.description || '',
            category: metadata.category || 'custom',
            canvas: {
                width: editor.runtime.width,
                height: editor.runtime.height,
                background: editor.runtimeCanvas.style.background || '#1a1a2e'
            },
            objects: editor.runtime.objects.map(obj => ({
                id: obj.id,
                type: obj.type,
                x: obj.x,
                y: obj.y,
                radius: obj.radius,
                width: obj.width,
                height: obj.height,
                fill: obj.fill,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth,
                opacity: obj.opacity,
                rotation: obj.rotation || 0,
                physics: obj.physics || {
                    enabled: false,
                    velocity: { x: 0, y: 0 },
                    mass: 1,
                    bounciness: 0.8
                },
                behaviors: obj.behaviors || []
            })),
            physics: {
                gravity: editor.runtime.gravity,
                friction: editor.physics.friction || 0.01,
                enablePhysics: editor.runtime.enablePhysics
            }
        };

        return template;
    }

    /**
     * Generate SVG thumbnail for template
     */
    generateThumbnail(template) {
        const width = 100;
        const height = 100;
        const scaleX = width / template.canvas.width;
        const scaleY = height / template.canvas.height;

        let objectsSvg = '';
        template.objects.forEach(obj => {
            const x = obj.x * scaleX;
            const y = obj.y * scaleY;

            if (obj.type === 'circle') {
                const r = obj.radius * Math.min(scaleX, scaleY);
                objectsSvg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${obj.fill}" stroke="${obj.stroke || 'none'}" stroke-width="${obj.strokeWidth || 0}"/>`;
            } else if (obj.type === 'rect') {
                const w = obj.width * scaleX;
                const h = obj.height * scaleY;
                const rectX = x - w / 2;
                const rectY = y - h / 2;
                objectsSvg += `<rect x="${rectX}" y="${rectY}" width="${w}" height="${h}" fill="${obj.fill}" stroke="${obj.stroke || 'none'}" stroke-width="${obj.strokeWidth || 0}"/>`;
            }
        });

        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${width}" height="${height}" fill="${template.canvas.background}"/>
                ${objectsSvg}
            </svg>
        `;

        return 'data:image/svg+xml;base64,' + btoa(svg);
    }
}
