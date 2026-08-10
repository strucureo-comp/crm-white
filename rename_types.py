import re
import os

with open('lib/db/types.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
in_user = False
for line in lines:
    if 'export interface User ' in line:
        in_user = True
    elif in_user and '}' in line:
        in_user = False
        
    if not in_user and 'company_id' in line and '// FK → Company' not in line and 'User' not in line and 'workspace_id' not in line:
        # We also want to leave company_id if it's explicitly a client company FK
        # Wait, the user said: "rename company_id to workspace_id on all entities that belong to a workspace... Note: User.company_id will remain unchanged"
        pass

