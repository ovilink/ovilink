path = 'e:/Projects/brimtale/Project/OviPlatform/lib/ovistate/editor/EnhancedExporter.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and fix all instances of \\`\\${ which should be \\`${
# These are template literals that need runtime interpolation

# Pattern: \\`\\${ should become \\`${
count = 0
original_content = content

# Replace the pattern
content = content.replace('\\`\\${', '\\`${')

if content != original_content:
    # Count how many replacements
    count = original_content.count('\\`\\${')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'SUCCESS: Fixed {count} over-escaped template literals')
else:
    print('No over-escaped template literals found')
