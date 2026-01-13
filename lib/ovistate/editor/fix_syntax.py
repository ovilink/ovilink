
path = 'e:/Projects/brimtale/Project/OviPlatform/lib/ovistate/editor/EnhancedExporter.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

count = 0
for i in range(600, 900): # Scan sufficient range
    line = lines[i].rstrip()
    
    # Logic:
    # If line contains ` but no \` (unescaped backtick)
    # AND it looks like assignment or function call argument
    if '`' in line and '\\`' not in line:
        
        # 1. innerHTML assignment
        if 'innerHTML =' in line:
            print(f'Escaping L{i+1} innerHTML: {repr(line)}')
            lines[i] = lines[i].replace('`', '\\`')
            count += 1
            
        # 2. Closing backtick with semicolon: </div>`; or just `;
        elif line.strip().endswith('`;'):
            # This is tricky. </div>`; needs escaping.
            # But what if it is ``; (empty string)?
            print(f'Escaping L{i+1} closing: {repr(line)}')
            lines[i] = lines[i].replace('`;', '\\`;')
            count += 1

        # 3. updateHudInfo call
        elif 'updateHudInfo' in line:
             print(f'Escaping L{i+1} updateHudInfo: {repr(line)}')
             lines[i] = lines[i].replace('`', '\\`')
             count += 1
             
    # Special: Check for naked ` (without ;) if it's strictly ` (start of string)
    # But usually start is `innerHTML = \``
    
    # Check for unescaped ${ (template interpolation) inside LIBS
    # If we see ${, it MUST be escaped as \${
    if '${' in line and '\\${' not in line:
         print(f'Escaping L{i+1} interpolation: {repr(line)}')
         lines[i] = lines[i].replace('${', '\\${')
         count += 1

if count > 0:
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f'Fixed {count} lines')
else:
    print('No targets found')
