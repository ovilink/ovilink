
path = r'e:\Projects\brimtale\Project\OviPlatform\lib\ovistate\editor\EnhancedExporter.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find start of ovi3d
start_marker = 'ovi3d: `'
start_idx = content.find(start_marker)

if start_idx == -1:
    print("Could not find ovi3d start")
    exit()

print(f"Found ovi3d start at index {start_idx}")

# Scan forward, considering escapes
current_idx = start_idx + len(start_marker)
in_string = True
line_num = content[:start_idx].count('\n') + 1

while current_idx < len(content):
    char = content[current_idx]
    
    if char == '\\':
        # Skip next char (escape)
        current_idx += 2
        continue
        
    if char == '`':
        # Found END of string
        print(f"Found END of ovi3d string at index {current_idx}")
        # Calculate line number
        line_num = content[:current_idx].count('\n') + 1
        print(f"Terminating line number: {line_num}")
        
        # Print context
        context_start = max(0, current_idx - 50)
        context_end = min(len(content), current_idx + 50)
        print(f"Context: ...{content[context_start:context_end]}...")
        break
    
    current_idx += 1

# Check if this termination looks premature
# We expect ovi3d to end near the end of the huge block, probably followed by `,` or `}`
# Let's see what follows
if current_idx < len(content):
    next_char = content[current_idx+1:].strip()
    if next_char.startswith(','):
        print("Termination looks OK (followed by comma)")
    elif next_char.startswith('}'):
        print("Termination looks OK (followed by brace)")
    else:
        print("WARNNG: Termination might be PREMATURE! Followed by unexpected content.")
