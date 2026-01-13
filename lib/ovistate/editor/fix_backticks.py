import re

path = 'e:/Projects/brimtale/Project/OviPlatform/lib/ovistate/editor/EnhancedExporter.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find all lines with unescaped backticks within the LIBS.ovi3d section
# LIBS.ovi3d starts around line 56 and ends around line 1200

in_ovi3d = False
ovi3d_start = -1
ovi3d_end = -1

for i, line in enumerate(lines):
    if 'ovi3d: `' in line:
        in_ovi3d = True
        ovi3d_start = i
        print(f'Found LIBS.ovi3d start at line {i+1}')
    elif in_ovi3d and line.strip() == '`,' or line.strip() == '`,':
        ovi3d_end = i
        print(f'Found LIBS.ovi3d end at line {i+1}')
        break

if ovi3d_start > 0 and ovi3d_end > 0:
    print(f'Processing lines {ovi3d_start+1} to {ovi3d_end+1}')
    
    count = 0
    for i in range(ovi3d_start + 1, ovi3d_end):
        line = lines[i]
        
        # Skip if line already has escaped backticks
        if '\\`' in line:
            continue
            
        # Check for unescaped backticks
        if '`' in line:
            # Escape them
            lines[i] = line.replace('`', '\\`')
            count += 1
            print(f'Fixed line {i+1}')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print(f'SUCCESS: Fixed {count} lines with unescaped backticks')
else:
    print('ERROR: Could not locate LIBS.ovi3d boundaries')
