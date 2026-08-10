import re

with open('lib/db/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

role_types = """
export interface ModulePermissions {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  is_system?: boolean;
  permissions: {
    [module: string]: ModulePermissions;
  };
  created_at: string;
  updated_at: string;
}

export type MemberStatus = 'active' | 'inactive' | 'invited';
"""

content = content.replace("export type MemberStatus = 'active' | 'inactive';", role_types)

with open('lib/db/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)
