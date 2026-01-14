path = 'e:/Projects/brimtale/Project/OviPlatform/lib/ovistate/editor/EnhancedExporter.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the ovi3d property boundaries
start_line = -1
end_line = -1
backtick = '`'

for i, line in enumerate(lines):
    if 'ovi3d:' in line and backtick in line:
        start_line = i
        print(f'Found ovi3d start at line {i+1}')
    elif start_line > 0 and end_line < 0:
        stripped = line.strip()
        if stripped == backtick + ',':
            end_line = i
            print(f'Found ovi3d end at line {i+1}')
            break

if start_line > 0 and end_line > 0:
    print(f'Processing lines {start_line+2} to {end_line}')
    
    count = 0
    for i in range(start_line + 1, end_line):
        original = lines[i]
        
        # Skip lines that don't have backticks
        if backtick not in original:
            continue
        
        # Skip lines where backticks are already properly escaped
        if '\\' + backtick in original:
            continue
        
        # Escape unescaped backticks
        fixed = original.replace(backtick, '\\' + backtick)
        if fixed != original:
            lines[i] = fixed
            count += 1
            if count <= 10:
                print(f'L{i+1}')
    
    if count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f'SUCCESS: Fixed {count} lines with unescaped backticks')
    else:
        print('No unescaped backticks found')
else:
    print('ERROR: Could not find ovi3d boundaries')
