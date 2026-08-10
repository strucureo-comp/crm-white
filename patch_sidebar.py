import re

with open('components/dashboard/app-sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace("import { subscribeToLeads } from '@/lib/firebase/database';", "import { subscribeToLeads } from '@/lib/firebase/database';\nimport { usePermissions } from '@/components/context/permissions-context';")

# Update getNavConfig signature
content = content.replace("function getNavConfig(leadCount: number): NavConfig {", "function getNavConfig(leadCount: number, hasPermission: (module: string, action: 'view' | 'edit' | 'delete') => boolean): NavConfig {")

# Update getNavConfig body to filter items
new_body = """
  // Filter items based on permissions
  const filterByPermission = (items: NavItem[], module: string) => 
    hasPermission(module, 'view') ? items : [];

  return {
    topItems: [
      { title: 'Dashboard', href: '/dashboard', icon: Hexagon },
      { title: 'Overview', href: '/overview', icon: LineChart },
      { title: 'Activity Feed', href: '/activity', icon: Bell },
    ],
    groups: [
      {
        title: 'CRM',
        items: [
          ...filterByPermission([{ title: 'Leads', href: '/leads', icon: Target, badge: leadCount || undefined }], 'leads'),
          ...filterByPermission([
            { title: 'Contacts', href: '/contacts', icon: Contact2 },
            { title: 'Pipelines', href: '/pipeline', icon: GitBranch },
            { title: 'Funnel', href: '/funnel', icon: Filter },
          ], 'contracts') // Reusing contracts perms for general CRM for now
        ],
      },
      {
        title: 'Revenue Hub',
        items: [
          ...filterByPermission([
            { title: 'Quotations', href: '/quotes', icon: FileText },
            { title: 'Invoices', href: '/invoices', icon: Receipt },
          ], 'contracts'),
          ...filterByPermission([
            { title: 'Payments', href: '/payments', icon: Wallet },
          ], 'payments')
        ],
      },
      {
        title: 'Workspace',
        items: filterByPermission([
          { title: 'Projects', href: '/projects', icon: Briefcase },
          { title: 'Tasks', href: '/tasks', icon: CheckSquare },
          { title: 'Calendar', href: '/calendar', icon: Calendar },
          { title: 'Team', href: '/team', icon: Users2 },
        ], 'workspace')
      },
      {
        title: 'Analytics',
        items: filterByPermission([
          { title: 'Analytics Dashboard', href: '/analytics', icon: BarChart3 },
          { title: 'Reports', href: '/reports', icon: FileText },
        ], 'analytics')
      },
      {
        title: 'Integration Hub',
        items: filterByPermission([
          { title: 'Connector Hub', href: '/integrations', icon: Puzzle },
          { title: 'WhatsApp', href: '/integrations/whatsapp', icon: MessageSquare },
          { title: 'WhatsApp Chats', href: '/whatsapp-chats', icon: MessageSquare },
          { title: 'Website Enquiries', href: '/integrations/website-enquiries', icon: Globe },
        ], 'workspace')
      },
    ].filter(g => g.items.length > 0)
  };
"""

content = re.sub(r"function getNavConfig\(leadCount: number.*?\{.*?return \{.*?\};\n\}", "function getNavConfig(leadCount: number, hasPermission: (module: string, action: 'view' | 'edit' | 'delete') => boolean): NavConfig {" + new_body + "}", content, flags=re.DOTALL)

# Update getNavConfig calls
content = content.replace("  const { topItems, groups: navGroups } = getNavConfig(leadCount);", "  const { hasPermission } = usePermissions();\n  const { topItems, groups: navGroups } = getNavConfig(leadCount, hasPermission);")

with open('components/dashboard/app-sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
