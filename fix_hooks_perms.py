import sys

with open('hooks/use-permissions.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "if (user?.role === 'Admin' || user?.role === 'admin' || user?.role === 'owner') {",
    "if (user?.role === 'Admin' || user?.role === 'admin' || workspace?.owner_id === user?.id) {"
)

with open('hooks/use-permissions.ts', 'w') as f:
    f.write(content)

