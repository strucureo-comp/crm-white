import os
import re

def migrate_types(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace company_id with workspace_id in all interfaces EXCEPT:
    # 1. export interface User (around line 87)
    # 2. Anywhere it says `// FK → Company` or `// Foreign key referencing the Company`
    
    lines = content.split('\n')
    new_lines = []
    
    in_user_interface = False
    in_company_interface = False
    in_normalized_activity = False
    
    for line in lines:
        if line.startswith('export interface User '):
            in_user_interface = True
        elif line.startswith('export interface Company '):
            in_company_interface = True
        elif line.startswith('export interface NormalizedActivity '):
            in_normalized_activity = True
            
        if line.startswith('}') and (in_user_interface or in_company_interface or in_normalized_activity):
            in_user_interface = False
            in_company_interface = False
            in_normalized_activity = False
            
        if 'company_id' in line and not (in_user_interface or in_company_interface or in_normalized_activity):
            # Check for explicitly marked foreign keys to actual Companies
            if 'FK' in line or 'Foreign key' in line or 'company_id: string; //' in line:
                pass # keep as company_id
            else:
                line = line.replace('company_id', 'workspace_id')
                
        new_lines.append(line)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
    print(f"Migrated {filepath}")

def migrate_project_files():
    # Replace .company_id with .workspace_id across the project
    # AND replace company_id: with workspace_id: in object literals
    for root, dirs, files in os.walk('app'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content.replace('.company_id', '.workspace_id')
                new_content = new_content.replace('company_id:', 'workspace_id:')
                # also handle `{ company_id }` destructuring
                new_content = re.sub(r'\bcompany_id\b', 'workspace_id', new_content)
                
                if content != new_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Migrated {filepath}")

    for root, dirs, files in os.walk('lib'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                if 'types.ts' in filepath or 'auth-context.tsx' in filepath or 'companies/api.ts' in filepath:
                    continue # handled separately or don't touch
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Careful not to blindly replace everything in lib
                new_content = re.sub(r'\bcompany_id\b', 'workspace_id', content)
                
                if content != new_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Migrated {filepath}")

    for root, dirs, files in os.walk('components'):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = re.sub(r'\bcompany_id\b', 'workspace_id', content)
                
                if content != new_content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Migrated {filepath}")


if __name__ == '__main__':
    migrate_types('lib/db/types.ts')
    migrate_project_files()
