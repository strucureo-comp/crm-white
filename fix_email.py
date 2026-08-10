with open('app/(dashboard)/team/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("m.editmail", "m.email")

with open('app/(dashboard)/team/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
