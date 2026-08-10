import os
import re

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # 1. Update useAuth destructuring to include workspace
    # Matches const { user } = useAuth() or const { user, loading } = useAuth()
    # and adds workspace if not present
    def repl_use_auth(m):
        inner = m.group(1)
        if 'workspace' not in inner:
            return f"const {{ workspace, {inner.strip()} }} = useAuth()"
        return m.group(0)
    
    content = re.sub(r'const\s*{\s*([^}]+)\s*}\s*=\s*useAuth\(\)', repl_use_auth, content)
    
    # 2. Replace user?.company_id and user.company_id with workspace?.id
    content = content.replace('user?.company_id', 'workspace?.id')
    content = content.replace('user.company_id', 'workspace?.id')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Migrated {filepath}")

def main():
    app_dir = 'app'
    components_dir = 'components'
    
    for d in [app_dir, components_dir]:
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    migrate_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
