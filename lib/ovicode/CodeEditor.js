export default class CodeEditor {
    constructor(engine) {
        this.engine = engine;
    }

    create() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.background = '#1e1e1e';
        container.style.color = '#d4d4d4';
        container.style.fontFamily = "'Consolas', 'Monaco', monospace";
        container.style.fontSize = '14px';

        // 1. Line Numbers
        const lineNumbers = document.createElement('div');
        lineNumbers.style.width = '50px';
        lineNumbers.style.background = '#1e1e1e';
        lineNumbers.style.borderRight = '1px solid #333';
        lineNumbers.style.color = '#858585';
        lineNumbers.style.textAlign = 'right';
        lineNumbers.style.padding = '10px 5px';
        lineNumbers.style.lineHeight = '20px';
        lineNumbers.style.userSelect = 'none';
        lineNumbers.innerHTML = '1';

        // 2. Editor Area (ContentEditable)
        const editor = document.createElement('div');
        editor.style.flex = '1';
        editor.style.outline = 'none';
        editor.style.whiteSpace = 'pre';
        editor.style.overflow = 'auto';
        editor.style.padding = '10px';
        editor.style.lineHeight = '20px';
        editor.contentEditable = 'true';
        editor.spellcheck = false;

        // Initial Code
        editor.innerText = `update: function(dt, objects, runtime) {
    // 1. Control specific object by ID
    const player = runtime.getObject('player');
    if (player) {
        player.x += 50 * dt;
        player.rotation += 2 * dt;
        if(player.x > 800) player.x = 0;
    }

    // 2. Control all objects
    objects.forEach(obj => {
         if(obj.physics === 'dynamic') {
             // Gravity logic is handled by internal physics prop, 
             // but we can override or add here.
         }
    });
}`;

        // Sync Scroll & Line Numbers
        editor.oninput = () => {
            const lines = editor.innerText.split('\n').length;
            lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => i + 1).join('<br>');
            this.highlight(editor);
        };

        editor.onkeydown = (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                document.execCommand('insertText', false, '    ');
            }
        };

        // Run Button
        const runBtn = document.createElement('button');
        runBtn.innerText = '▶ Run Script';
        runBtn.style.position = 'absolute';
        runBtn.style.top = '10px';
        runBtn.style.right = '20px';
        runBtn.style.padding = '5px 15px';
        runBtn.style.background = '#4CAF50';
        runBtn.style.color = 'white';
        runBtn.style.border = 'none';
        runBtn.style.borderRadius = '4px';
        runBtn.style.cursor = 'pointer';
        runBtn.style.zIndex = '10';
        runBtn.onclick = () => {
            this.runScript(editor.innerText);
        };
        container.appendChild(runBtn);

        container.appendChild(lineNumbers);
        container.appendChild(editor);

        this.engine.tabManager.openTab('script.js', 'ovicode', container);

        // Initial Highlight
        this.highlight(editor);
    }

    highlight(editor) {
        // Very basic syntax highlighting (Proof of Concept)
        // Note: ContentEditable highlighting is tricky because of cursor position.
        // For a robust solution, we would need a library like Monaco or CodeMirror.
        // Since we are keeping it dependency-free, we will just colorize keywords 
        // but ONLY if we are not currently typing (to avoid cursor jumping issues).
        // A real implementation would use an overlay div for colors.

        // Skipping live highlighting for now to ensure usability.
        // We will just implement "Run" functionality next.
    }

    runScript(code) {
        // Find OviState Plugin
        const oviStatePlugin = this.engine.pluginManager.plugins.get('ovistate');

        if (oviStatePlugin && oviStatePlugin.activeEditor && oviStatePlugin.activeEditor.runtime) {
            oviStatePlugin.activeEditor.runtime.setGlobalScript(code);
            alert("Script Running!");
        } else {
            alert("No active simulation found. Please create a simulation in OviState first.");
        }
    }
}
