import Exporter from './editor/Exporter.js';

/**
 * Test Simulation: Bouncing Ball
 * Demonstrates interactive controls, physics, and graphs
 */

const bouncingBallSimulation = {
    metadata: {
        title: "Bouncing Ball - Physics Simulation",
        description: "Interactive bouncing ball with gravity control",
        version: "1.0"
    },

    canvas: {
        width: 800,
        height: 600,
        background: "#f0f8ff"
    },

    physics: {
        gravity: 9.8,
        friction: 0.05
    },

    objects: [
        {
            id: "ball",
            type: "circle",
            x: 400,
            y: 100,
            radius: 30,
            fill: "#ff6b6b",
            stroke: "#c92a2a",
            strokeWidth: 2,
            physics: {
                enabled: true,
                velocity: { x: 50, y: 0 },
                mass: 1,
                bounciness: 0.85
            }
        }
    ],

    controls: [
        {
            id: "gravitySlider",
            type: "slider",
            label: "Gravity (m/s²)",
            min: 0,
            max: 20,
            value: 9.8,
            step: 0.1,
            binding: {
                target: "physics",
                property: "gravity"
            }
        },
        {
            id: "bouncinessSlider",
            type: "slider",
            label: "Bounciness",
            min: 0,
            max: 1,
            value: 0.85,
            step: 0.05,
            binding: {
                objectId: "ball",
                property: "physics.bounciness"
            }
        },
        {
            id: "resetBtn",
            type: "button",
            label: "Reset Ball",
            variant: "primary",
            onClick: function () {
                const ball = runtime.getObject('ball');
                if (ball) {
                    ball.x = 400;
                    ball.y = 100;
                    ball.physics.velocity = { x: 50, y: 0 };
                }
            }
        },
        {
            id: "physicsToggle",
            type: "checkbox",
            label: "Enable Physics",
            checked: true,
            onChange: function (checked) {
                const ball = runtime.getObject('ball');
                if (ball && ball.physics) {
                    ball.physics.enabled = checked;
                }
            }
        }
    ],

    graphs: [
        {
            id: "velocityGraph",
            type: "line",
            title: "Vertical Velocity vs Time",
            width: 310,
            height: 180,
            maxPoints: 100,
            min: -200,
            max: 200
        },
        {
            id: "heightGraph",
            type: "line",
            title: "Height vs Time",
            width: 310,
            height: 180,
            maxPoints: 100,
            min: 0,
            max: 600
        }
    ],

    globalScript: `
        update(dt, objects, runtime) {
            // Update graphs
            const ball = runtime.getObject('ball');
            if (ball) {
                const velocityGraph = runtime.getGraph('velocityGraph');
                const heightGraph = runtime.getGraph('heightGraph');
                
                if (velocityGraph) {
                    velocityGraph.addDataPoint(ball.physics.velocity.y);
                }
                
                if (heightGraph) {
                    heightGraph.addDataPoint(ball.y);
                }
            }
        }
    `
};

// Export the simulation
console.log('Exporting bouncing ball simulation...');
Exporter.export(bouncingBallSimulation);
console.log('Export complete! Check your downloads folder.');
