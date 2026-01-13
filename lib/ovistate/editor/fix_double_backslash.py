path = 'e:/Projects/brimtale/Project/OviPlatform/lib/ovistate/editor/EnhancedExporter.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix line 605 - it has double backslashes which is wrong
# It should be: item.innerHTML = \`...\`;
# NOT: item.innerHTML = \\`...\\`;

line_605 = lines[604]
print(f'Original line 605: {repr(line_605)}')

# Replace double backslash-backtick with single backslash-backtick
fixed_line = line_605.replace('\\\\`', '\\`')

if fixed_line != line_605:
    lines[604] = fixed_line
    print(f'Fixed line 605: {repr(fixed_line)}')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print('SUCCESS: Fixed double-backslash escaping')
else:
    print('No changes needed')
