'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getLeads } from '@/lib/firebase/database';
import { useSidebar } from './sidebar-context';
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Users,
  Contact2,
  DollarSign,
  FileText,
  FileSpreadsheet,
  FileSignature,
  Megaphone,
  Image,
  Calendar,
  Briefcase,
  CheckSquare,
  Users2,
  BarChart3,
  LineChart,
  Puzzle,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Receipt,
  X,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function getNavGroups(leadCount: number): NavGroup[] {
  return [
    {
      title: 'CRM',
      items: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Leads', href: '/leads', icon: Users, badge: leadCount || undefined },
        { title: 'Contacts', href: '/contacts', icon: Contact2 },
        { title: 'Deals', href: '/deals', icon: DollarSign },
        { title: 'Field Monitoring', href: '/field-monitoring', icon: MapPin },
      ],
    },
    {
      title: 'Revenue',
      items: [
        { title: 'Quotes', href: '/quotes', icon: FileText },
        { title: 'Invoices', href: '/invoices', icon: Receipt },
        { title: 'Proposals', href: '/proposals', icon: FileSpreadsheet },
        { title: 'Contracts', href: '/contracts', icon: FileSignature },
      ],
    },
    {
      title: 'Marketing',
      items: [
        { title: 'Content Hub', href: '/content-hub', icon: Megaphone },
        { title: 'Media Library', href: '/media-library', icon: Image },
        { title: 'Marketing Calendar', href: '/marketing-calendar', icon: Calendar },
      ],
    },
    {
      title: 'Collaboration',
      items: [
        { title: 'Projects', href: '/projects', icon: Briefcase },
        { title: 'Tasks', href: '/tasks', icon: CheckSquare },
        { title: 'Team', href: '/team', icon: Users2 },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { title: 'Analytics', href: '/analytics', icon: BarChart3 },
        { title: 'Reports', href: '/reports', icon: LineChart },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { title: 'Automation Hub', href: '/integrations', icon: Puzzle },
      ],
    },
  ];
}

function SidebarNav({ collapsed, onToggleGroup, expandedGroups, leadCount, pathname }: {
  collapsed: boolean;
  onToggleGroup: (title: string) => void;
  expandedGroups: Record<string, boolean>;
  leadCount: number;
  pathname: string;
}) {
  const navGroups = getNavGroups(leadCount);

  return (
    <>
      <div className="flex items-center gap-2 px-4 h-16 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">T</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg tracking-tight whitespace-nowrap">
              Tagverse
            </span>
          )}
        </div>
        <button
          onClick={() => onToggleGroup('__collapse__')}
          className="ml-auto p-1.5 rounded-md hover:bg-sidebar-muted text-sidebar-muted-foreground shrink-0 hidden lg:block"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-1">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <button
                onClick={() => onToggleGroup(group.title)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider w-full hover:text-foreground transition-colors"
              >
                <ChevronDown
                  size={12}
                  className={cn(
                    'transition-transform',
                    expandedGroups[group.title] && 'rotate-180'
                  )}
                />
                {group.title}
              </button>
            )}
            {(expandedGroups[group.title] || collapsed) && (
              <div className={cn('space-y-0.5', collapsed && 'space-y-1')}>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group relative',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-foreground'
                      )}
                    >
                      <item.icon size={18} className={cn('shrink-0', isActive && 'text-primary')} />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t p-2 space-y-0.5 shrink-0">
        <Link
          href="/ai-assistant"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === '/ai-assistant'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-foreground'
          )}
        >
          <Bot size={18} />
          {!collapsed && <span>AI Assistant</span>}
        </Link>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === '/settings'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-foreground'
          )}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const [leadCount, setLeadCount] = useState(0);

  useEffect(() => {
    getLeads().then((leads) => setLeadCount(leads.length)).catch(() => {});
  }, []);

  const navGroups = getNavGroups(leadCount);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map((g) => [g.title, true]))
  );

  const toggleGroup = (title: string) => {
    if (title === '__collapse__') {
      setCollapsed(!collapsed);
      return;
    }
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const navContent = (
    <SidebarNav
      collapsed={collapsed}
      onToggleGroup={toggleGroup}
      expandedGroups={expandedGroups}
      leadCount={leadCount}
      pathname={pathname}
    />
  );

  return (
    <>
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out h-screen sticky top-0 z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {navContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 [&>button]:hidden">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">T</span>
              </div>
              <SheetTitle className="font-semibold text-lg tracking-tight">Tagverse</SheetTitle>
            </div>
            <SheetDescription className="sr-only">Navigation menu</SheetDescription>
            <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1 h-[calc(100vh-4rem)]">
            {navGroups.map((group) => (
              <div key={group.title}>
                <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-foreground'
                          )}
                        >
                          <item.icon size={18} className={cn('shrink-0', isActive && 'text-primary')} />
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 space-y-0.5">
              <SheetClose asChild>
                <Link
                  href="/ai-assistant"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    pathname === '/ai-assistant'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-foreground'
                  )}
                >
                  <Bot size={18} />
                  <span>AI Assistant</span>
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/settings"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    pathname === '/settings'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-sidebar-muted-foreground hover:bg-sidebar-muted hover:text-foreground'
                  )}
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
