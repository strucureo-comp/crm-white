import re

with open('lib/db/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace block where workspace_id is defined twice
# E.g.
#  workspace_id: string;
#  event_id?: string;
#  workspace_id?: string;
# We will just remove any `workspace_id?: string;` if `workspace_id: string;` exists in the same interface block.

interfaces = content.split('export interface ')
new_interfaces = [interfaces[0]]

for i in range(1, len(interfaces)):
    block = interfaces[i]
    if 'workspace_id: string;' in block or 'workspace_id?: string;' in block:
        # Find all occurrences
        lines = block.split('\n')
        has_required = False
        new_lines = []
        for line in lines:
            if 'workspace_id: string;' in line:
                if has_required:
                    continue # duplicate required
                has_required = True
                new_lines.append(line)
            elif 'workspace_id?: string;' in line:
                if has_required:
                    continue # already has required, skip optional
                new_lines.append(line)
            else:
                new_lines.append(line)
        new_interfaces.append('\n'.join(new_lines))
    else:
        new_interfaces.append(block)

new_content = 'export interface '.join(new_interfaces)

with open('lib/db/types.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

