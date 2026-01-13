
path = r'e:\Projects\brimtale\Project\OviPlatform\lib\ovistate\editor\EnhancedExporter.js'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_ovi3d = False
start_line = 0

for i, line in enumerate(lines):
    # Detect start of ovi3d block (simple detection)
    if 'ovi3d: `' in line:
        in_ovi3d = True
        start_line = i
        print(f"Found ovi3d start at line {i+1}")
        continue
    
    if in_ovi3d:
        # Check for unescaped backticks
        # We need to ignoring the very last backtick of the block which might be on a line by itself or after code
        # But any unescaped backtick in the MIDDLE is a problem.
        
        # Simple scan: find `
        # Check if preceded by \
        
        for char_idx, char in enumerate(line):
            if char == '`':
                # Check previous char
                if char_idx > 0 and line[char_idx-1] == '\\':
                    continue # It is escaped
                
                # If we are here, found unescaped backtick
                # It COULD be the end of the block.
                # If it's the end, we should exit 'in_ovi3d'.
                # But if we find MORE lines after this, then it was a premature close.
                
                # Heuristic: verify if it looks like the end of the entry
                # e.g. `,\n or `\n or ` }
                
                print(f"Found unescaped backtick at line {i+1} col {char_idx+1}")
                print(f"Line content: {line.strip()}")
                
                # Assume it's the end?
                # If we continue scanning and see more code that looks like part of ovi3d, then this backtick was wrong.
                
                # Let's just list ALL unescaped backticks.
                # User can judge.
    
    # Check for triple backslashes
    if '\\\\\\`' in line: # \\\` in python string is \\\\\\`
        print(f"Found TRIPLE backslash at line {i+1}: {line.strip()}")
    
    elif '\\\\`' in line: # \\` in python string is \\\\`
         # This means double backslash + backtick.
         # This produces \` in output.
         # This is BAD if it is start of string: x = \`foo\`
         print(f"Found DOUBLE backslash at line {i+1}: {line.strip()}")
         print(f"Found DOUBLE backslash at line {i+1}: {line.strip()}")

    # Check for escaped interpolations
    if '\\${' in line:
        # We found \${
        # This is ONLY valid if it is inside a template literal in the OUTPUT code.
        # How to detect if it is inside template literal?
        # We can try to see if it is surrounded by ` (escaped backticks).
        print(f"Found ESCAPED INTERPOLATION at line {i+1}: {line.strip()}")
