import re

with open('app/(dashboard)/team/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace local types with imported types
content = content.replace("import { ActivityLog } from '@/lib/db/types';", "import { ActivityLog, Role, ModulePermissions } from '@/lib/db/types';")
content = content.replace("import { subscribeToProjectsData, createMember, updateMember, deleteMember } from '@/lib/db/projects/api';", "import { subscribeToProjectsData, createMember, updateMember, deleteMember } from '@/lib/db/projects/api';\nimport { subscribeToRoles, updateRole, createRole, deleteRole } from '@/lib/db/roles/api';")

# Remove local Role and ModulePermissions
content = re.sub(r"interface ModulePermissions \{.*?\n\}\n", "", content, flags=re.DOTALL)
content = re.sub(r"interface Role \{.*?\n\}\n", "", content, flags=re.DOTALL)

# Remove MOCK_ROLES completely
content = re.sub(r"const MOCK_ROLES: Role\[\] = \[.*?\];\n", "", content, flags=re.DOTALL)

# Update state initialization
content = content.replace("const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);", "const [roles, setRoles] = useState<Role[]>([]);")
content = content.replace("const [selectedRoleId, setSelectedRoleId] = useState<string>('r3');", "const [selectedRoleId, setSelectedRoleId] = useState<string>('');")

# Add subscribeToRoles
subscribe_roles = """  useEffect(() => {
    if (!workspace?.id) return;
    const unsub = subscribeToRoles(workspace.id, (data) => {
      setRoles(data);
      if (data.length > 0 && !selectedRoleId) {
        setSelectedRoleId(data[0].id);
      }
    });
    return () => unsub();
  }, [workspace?.id]);"""

content = content.replace("  useEffect(() => {\n    if (!workspace?.id) return;\n    getActivityLogs(workspace?.id).then(setActivityLogs).catch(console.error);\n  }, [user]);", "  useEffect(() => {\n    if (!workspace?.id) return;\n    getActivityLogs(workspace?.id).then(setActivityLogs).catch(console.error);\n  }, [user]);\n\n" + subscribe_roles)

# Update handleSaveRole
save_role = """  const handleSaveRole = async () => {
    if (!editedRole || !workspace?.id) return;
    setSaveState('saving');
    try {
      await updateRole(workspace.id, editedRole.id, {
        name: editedRole.name,
        description: editedRole.description,
        permissions: editedRole.permissions
      });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      toast.error('Failed to save role');
      setSaveState('idle');
    }
  };"""

content = re.sub(r"  const handleSaveRole = \(\) => \{.*?\n  \};\n", save_role + "\n", content, flags=re.DOTALL)

# Update module structure access since the new Role has `permissions` instead of `modules`
content = content.replace("newRole.modules[mod] = { v: false, e: false, d: false };", "newRole.permissions[mod] = { view: false, edit: false, delete: false };")
content = content.replace("newRole.modules[mod][perm] = true;", """if (perm === 'v') newRole.permissions[mod].view = true;
    if (perm === 'e') { newRole.permissions[mod].view = true; newRole.permissions[mod].edit = true; }
    if (perm === 'd') { newRole.permissions[mod].view = true; newRole.permissions[mod].edit = true; newRole.permissions[mod].delete = true; }""")

content = content.replace("editedRole.modules[mod]", "editedRole.permissions[mod]")
content = content.replace("m.v", "m.view")
content = content.replace("m.e", "m.edit")
content = content.replace("m.d", "m.delete")

# Fix missing description
content = content.replace("type ModuleKey = typeof MODULE_NAMES[number];", "type ModuleKey = typeof MODULE_NAMES[number];\nconst MODULE_LABELS: Record<string, string> = { contracts: 'Contracts', payments: 'Payments', marketing: 'Marketing', workspace: 'Workspace Settings', analytics: 'Analytics', leads: 'Leads' };")

with open('app/(dashboard)/team/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
