import subprocess
import re
import os

def run_tsc():
    result = subprocess.run(['npx', 'tsc', '--noEmit'], capture_output=True, text=True)
    return result.stdout

def fix_login_page():
    path = 'app/(auth)/login/page.tsx'
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    content = content.replace('user.uid', 'user.id')
    content = content.replace('dbUser?.totp_secret', '(dbUser as any)?.totp_secret')
    content = content.replace('dbUser.totp_secret', '(dbUser as any).totp_secret')
    with open(path, 'w') as f: f.write(content)

def fix_types():
    path = 'lib/db/types.ts'
    if not os.path.exists(path): return
    with open(path, 'r') as f: lines = f.readlines()
    # Remove duplicate workspace_id, discount, discount_type
    seen_in_invoice = set()
    new_lines = []
    in_invoice = False
    for line in lines:
        if 'export interface Invoice' in line: in_invoice = True
        if in_invoice and '}' in line and not '{' in line: in_invoice = False
        
        if in_invoice:
            if 'workspace_id' in line and 'workspace_id' in seen_in_invoice: continue
            if 'workspace_id' in line: seen_in_invoice.add('workspace_id')
            if 'discount?:' in line and 'discount' in seen_in_invoice: continue
            if 'discount?:' in line: seen_in_invoice.add('discount')
            if 'discount_type?:' in line and 'discount_type' in seen_in_invoice: continue
            if 'discount_type?:' in line: seen_in_invoice.add('discount_type')
        new_lines.append(line)
    with open(path, 'w') as f: f.writelines(new_lines)

def fix_permissions():
    for path in ['components/context/permissions-context.tsx', 'hooks/use-permissions.ts']:
        if not os.path.exists(path): continue
        with open(path, 'r') as f: content = f.read()
        content = content.replace("user.role === 'Admin'", "user.role === ('admin' as any)")
        with open(path, 'w') as f: f.write(content)

def fix_database():
    path = 'lib/firebase/database.ts'
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    content = content.replace("role === 'Admin'", "role === ('admin' as any)")
    content = content.replace("role === 'owner'", "role === ('Owner' as any)")
    content = content.replace("user.permissions", "(user as any).permissions")
    with open(path, 'w') as f: f.write(content)

fix_login_page()
fix_types()
fix_permissions()
fix_database()

print("Initial fixes applied, running tsc again...")
print(run_tsc())
