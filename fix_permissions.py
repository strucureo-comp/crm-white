import sys

with open('components/context/permissions-context.tsx', 'r') as f:
    content = f.read()

new_has_permission = """
  const hasPermission = (module: string, action: 'view' | 'edit' | 'delete') => {
    // Admins and Workspace Owners always have full access, even if roles are missing
    if (user?.role === 'Admin' || user?.role === 'admin' || workspace?.owner_id === user?.id) {
      return true;
    }

    if (!permissions) return false;
    const modPerms = permissions[module];
    if (!modPerms) return false;
    return modPerms[action];
  };
"""

import re
content = re.sub(
    r"const hasPermission = \(module: string, action: 'view' \| 'edit' \| 'delete'\) => \{[\s\S]*?\n  \};",
    new_has_permission.strip(),
    content
)

with open('components/context/permissions-context.tsx', 'w') as f:
    f.write(content)
