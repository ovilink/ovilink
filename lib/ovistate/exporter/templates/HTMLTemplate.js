
export function generateHTMLTemplate(data, libs) {
    const {
        PARTICLES_LIB,
        SPRITES_LIB,
        CORE_LIB,
        UI_LIB,
        BEHAVIORS_LIB,
        OVI3D_LIB,
        OVI3D_BEHAVIORS_LIB
    } = libs;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.metadata.title || 'OviState Game'}</title>
    <style>
        body { margin: 0; overflow: hidden; background: #202020; font-family: system-ui, sans-serif; }
        #game-container { position: relative; width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }
        /* Use a wrapper that matches canvas size for correct UI positioning */
        #sim-wrapper { position: relative; width: ${data.canvas.width}px; height: ${data.canvas.height}px; background: ${data.canvas.background || 'white'}; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
        canvas { display: block; }
        #ui-overlay { position: absolute; top:0; left:0; width:100%; height:100%; pointer-events: none; z-index: 100; }
    </style>
</head>
<body>
    <!-- SMART RE-IMPORT DATA (Lossless Project State) -->
    <script id="ovi-project-data" type="application/json">
        ${JSON.stringify(data)}
    </script>

    <div id="game-container">
        <div id="sim-wrapper">
             <!-- Canvas injected by Runtime -->
             <div id="ui-overlay"></div>
        </div>
    </div>

    <script type="module">
        // 1. Inject Libraries
        ${PARTICLES_LIB}
        ${SPRITES_LIB}
        ${CORE_LIB}
        ${UI_LIB}
        ${BEHAVIORS_LIB}
        ${OVI3D_LIB}
        ${OVI3D_BEHAVIORS_LIB}

        // 2. Game Data
        const GAME_DATA = JSON.parse(document.getElementById('ovi-project-data').textContent);

        // 3. User & Default Scripts
        
        // 4. Initialization

        // --- Runtime Setup ---
        const container = document.getElementById('sim-wrapper');
        const overlay = document.getElementById('ui-overlay');
        
        // Initialize Runtime
                const runtime = new OviStateRuntime(container, {
                    width: ${data.canvas.width},
                    height: ${data.canvas.height},
                    background: '${data.canvas.background}',
                    gravity: ${data.physics.gravity !== undefined ? data.physics.gravity : 9.8},
                    gravityX: ${data.physics.gravityX || 0},
                    friction: ${data.physics.friction !== undefined ? data.physics.friction : 0.1},
                    timeScale: ${data.physics.timeScale !== undefined ? data.physics.timeScale : 1},
                    wallBounciness: ${data.physics.wallBounciness !== undefined ? data.physics.wallBounciness : 0.8},
                    enablePhysics: true
                });

        // Track Mouse
        runtime.canvas.addEventListener('mousemove', e => {
            const rect = runtime.canvas.getBoundingClientRect();
            runtime.mouseX = e.clientX - rect.left;
            runtime.mouseY = e.clientY - rect.top;
        });

        // Initialize Behaviors
        const registry = new BehaviorRegistry(runtime);
        registerPhysics(registry);
        registerMotion(registry);
        registerTransform(registry);
        registerInteractive(registry);
        registerText(registry);
        registerLogic(registry);

        // Load Objects & Controls BEFORE UI Init
        GAME_DATA.objects.forEach(obj => {
            obj.initialX = obj.x;
            obj.initialY = obj.y; // For Reset

            // Re-inflate physics if partial or missing
            if (!obj.physics) obj.physics = { enabled: true };
            if (!obj.physics.velocity) obj.physics.velocity = { x: 0, y: 0 };
            if (obj.physics.mass === undefined) obj.physics.mass = 1;
            if (obj.physics.bounciness === undefined) obj.physics.bounciness = 0.8;

            runtime.addObject(obj);
        });
        
        GAME_DATA.controls.forEach(c => runtime.addControl(c));

        // Initialize UI (Now it sees the controls)
        const ui = new RuntimeUI(runtime, overlay);
        runtime.attachUI(ui);
        ui.renderAll();

        // Start
        console.log("[START] Starting Game...");
        runtime.start();
        
    </script>
</body>
</html>`;
}
