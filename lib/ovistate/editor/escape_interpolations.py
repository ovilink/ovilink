path = 'e:/Projects/brimtale/Project/OviPlatform/lib/ovistate/editor/EnhancedExporter.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the ovi3d block (lines 56 to ~863)
start_line = -1
end_line = -1

for i, line in enumerate(lines):
    if 'ovi3d: `' in line:
        start_line = i
        print(f'Found ovi3d start at line {i+1}')
    elif start_line > 0 and end_line < 0 and line.strip() == '`,':
        end_line = i
        print(f'Found ovi3d end at line {i+1}')
        break

if start_line > 0 and end_line > 0:
    count = 0
    for i in range(start_line + 1, end_line):
        original = lines[i]
        
        # Look for ${...} that are NOT already escaped
        # We need to escape them as \${...}
        if '${' in original and '\\${' not in original:
            # Replace ${ with \${
            fixed = original.replace('${', '\\${')
            lines[i] = fixed
            count += 1
            print(f'L{i+1}: Escaped template interpolation')
    
    if count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f'SUCCESS: Escaped {count} template interpolations')
    else:
        print('No unescaped interpolations found')
else:
    print('ERROR: Could not find ovi3d boundaries')
