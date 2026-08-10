import re

with open('lib/db/types.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
last_line_was_workspace_id = False
last_line_was_discount = False

for i in range(len(lines)):
    line = lines[i]
    if 'workspace_id: string;' in line or 'workspace_id?: string;' in line:
        # Check if the previous non-empty line was also workspace_id
        prev = next((l for l in reversed(new_lines) if l.strip()), '')
        if 'workspace_id: string;' in prev or 'workspace_id?: string;' in prev:
            continue
    
    if 'discount?: number;' in line:
        prev = next((l for l in reversed(new_lines) if l.strip()), '')
        if 'discount?: number;' in prev:
            continue
            
    if "discount_type?: 'percentage' | 'fixed';" in line:
        prev = next((l for l in reversed(new_lines) if l.strip()), '')
        if "discount_type?: 'percentage' | 'fixed';" in prev:
            continue

    new_lines.append(line)

with open('lib/db/types.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

