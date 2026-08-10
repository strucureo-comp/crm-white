with open('components/context/permissions-context.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("m.email.toLowerCase()", "(m.email || '').toLowerCase()")
content = content.replace("setUserRoleId(member.role);", "setUserRoleId(member.role || null);")

with open('components/context/permissions-context.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
