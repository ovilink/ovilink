path = 'e:/Projects/brimtale/Project/OviPlatform/lib/ovistate/editor/EnhancedExporter.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The issue is that we have \\` (double backslash + backtick) 
# when we should have \` (single backslash + backtick)

# Count occurrences
double_backslash_count = content.count('\\\\`')
print(f'Found {double_backslash_count} instances of double-backslash-backtick')

if double_backslash_count > 0:
    # Replace all \\` with \`
    # In Python strings: '\\\\`' is double-backslash + backtick
    # We want: '\\`' which is single-backslash + backtick
    fixed_content = content.replace('\\\\`', '\\`')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f'SUCCESS: Fixed {double_backslash_count} double-backslash patterns')
else:
    print('No double-backslash patterns found')
