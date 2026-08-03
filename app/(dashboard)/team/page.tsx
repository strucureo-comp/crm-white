'use client';

import React, { useState, useEffect } from 'react';
import { Users, Shield, Activity, Search, Plus, Edit2, X, Check, Clock, Filter, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { useAuth } from '@/lib/firebase/auth-context';
import { subscribeToProjectsData, createMember, updateMember, deleteMember } from '@/lib/db/projects/api';

type PermissionType = 'v' | 'e' | 'd';

interface ModulePermissions {
  v: boolean;
  e: boolean;
  d: boolean;
}

interface Role {
  id: string;
  name: string;
  modules: {
    contracts: ModulePermissions;
    payments: ModulePermissions;
    marketing: ModulePermissions;
    workspace: ModulePermissions;
    analytics: ModulePermissions;
  };
}

interface UIMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Invited' | 'Inactive';
  lastActive: string;
  initials: string;
  color: string;
}

interface ActivityItem {
  id: string;
  repId: string;
  action: string;
  target: string;
  time: string;
}

const MOCK_ROLES: Role[] = [
  {
    id: 'r1', name: 'Admin',
    modules: {
      contracts: { v: false, e: true, d: false },
      payments: { v: false, e: true, d: false },
      marketing: { v: false, e: true, d: false },
      workspace: { v: false, e: true, d: false },
      analytics: { v: false, e: true, d: false },
    }
  },
  {
    id: 'r2', name: 'Manager',
    modules: {
      contracts: { v: false, e: true, d: false },
      payments: { v: true, e: false, d: false },
      marketing: { v: false, e: true, d: false },
      workspace: { v: true, e: false, d: false },
      analytics: { v: false, e: true, d: false },
    }
  },
  {
    id: 'r3', name: 'Sales Rep',
    modules: {
      contracts: { v: false, e: true, d: false },
      payments: { v: false, e: false, d: true },
      marketing: { v: false, e: false, d: true },
      workspace: { v: true, e: false, d: false },
      analytics: { v: true, e: false, d: false },
    }
  },
  {
    id: 'r4', name: 'Viewer',
    modules: {
      contracts: { v: true, e: false, d: false },
      payments: { v: true, e: false, d: false },
      marketing: { v: true, e: false, d: false },
      workspace: { v: true, e: false, d: false },
      analytics: { v: true, e: false, d: false },
    }
  },
  {
    id: 'r5', name: 'Member',
    modules: {
      contracts: { v: true, e: false, d: false },
      payments: { v: true, e: false, d: false },
      marketing: { v: true, e: false, d: false },
      workspace: { v: true, e: false, d: false },
      analytics: { v: true, e: false, d: false },
    }
  }
];

const MOCK_MEMBERS: UIMember[] = [];

const MOCK_ACTIVITY: ActivityItem[] = [];

const MODULE_NAMES = ['contracts', 'payments', 'marketing', 'workspace', 'analytics'] as const;
type ModuleKey = typeof MODULE_NAMES[number];

const AVATAR_COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState('members');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [editingMember, setEditingMember] = useState<UIMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [members, setMembers] = useState<UIMember[]>([]);
  const { user } = useAuth();
  const [searchMember, setSearchMember] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('r3');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editedRole, setEditedRole] = useState<Role | null>(null);
  const [filterAction, setFilterAction] = useState('All');

  useEffect(() => {
    if (!user?.company_id) return;
    const unsub = subscribeToProjectsData(user.company_id, (data) => {
      const mapped: UIMember[] = (data.members || []).map((m, i) => {
        const initials = m.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        return {
          id: m.id,
          name: m.name,
          email: m.email || '',
          role: m.role || 'Viewer',
          status: 'Active' as const,
          lastActive: 'Recently',
          initials,
          color: AVATAR_COLORS[i % AVATAR_COLORS.length]
        };
      });
      setMembers(mapped);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const role = roles.find(r => r.id === selectedRoleId);
    if (role) setEditedRole(JSON.parse(JSON.stringify(role)));
    setSaveState('idle');
  }, [selectedRoleId, roles]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!user?.company_id) return;
    try { await updateMember(user.company_id, memberId, { role: newRole }); } catch(err) { console.error(err); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user?.company_id) return;
    try { await deleteMember(user.company_id, memberId); } catch(err) { console.error(err); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !user?.company_id || !editName.trim()) return;
    try {
      await updateMember(user.company_id, editingMember.id, { name: editName.trim(), email: editEmail.trim() });
      setEditingMember(null);
    } catch (err) { console.error('Failed to update member:', err); }
  };

  const togglePermission = (mod: ModuleKey, perm: PermissionType) => {
    if (!editedRole) return;
    const newRole = { ...editedRole };
    newRole.modules[mod] = { v: false, e: false, d: false };
    newRole.modules[mod][perm] = true;
    setEditedRole(newRole);
    setSaveState('idle');
  };

  const handleSaveRole = () => {
    if (!editedRole) return;
    setSaveState('saving');
    setTimeout(() => {
      setRoles(prev => prev.map(r => r.id === editedRole.id ? editedRole : r));
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 800);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchMember.toLowerCase()) || m.email.toLowerCase().includes(searchMember.toLowerCase());
    const matchesRole = filterRole === 'All' || m.role === filterRole;
    const matchesStatus = filterStatus === 'All' || m.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredActivity = MOCK_ACTIVITY.filter(a => filterAction === 'All' || a.action.includes(filterAction));

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !user?.company_id) return;
    try {
      await createMember(user.company_id, { name: inviteName, email: inviteEmail, role: inviteRole, avatar: '', projectIds: [] });
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Viewer');
    } catch(err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Team</h2>
          <p className="text-sm text-muted-foreground">Manage members, roles, and permissions</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members" className="gap-2"><Users size={14} /> Members</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Shield size={14} /> Roles & Permissions</TabsTrigger>
          <TabsTrigger value="activity" className="gap-2"><Activity size={14} /> Activity Log</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                className="pl-9"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Roles</SelectItem>
                {roles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Invited">Invited</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="p-4 text-xs font-medium text-muted-foreground">Member</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground">Role</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground">Last Active</th>
                      <th className="p-4 text-xs font-medium text-muted-foreground text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredMembers.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No members found.</td></tr>
                    )}
                    {filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-muted/50 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs text-white" style={{ backgroundColor: m.color }}>{m.initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Select value={m.role} onValueChange={(val) => handleRoleChange(m.id, val)}>
                            <SelectTrigger className="h-8 text-xs border-none shadow-none bg-transparent hover:bg-muted w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(r => <SelectItem key={r.id} value={r.name} className="text-xs">{r.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
                            m.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                            m.status === 'Invited' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                          }`}>
                            {m.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">{m.lastActive}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => { setEditName(m.name); setEditEmail(m.email); setEditingMember(m); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMember(m.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="flex flex-col lg:flex-row gap-6">
            <Card className="w-full lg:w-72 shrink-0 self-start">
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                <h3 className="text-sm font-semibold">Roles</h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Plus className="h-3 w-3" /> Add</Button>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {roles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center justify-between ${
                      selectedRoleId === r.id ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {r.name}
                    {selectedRoleId === r.id && <Check className="h-4 w-4 text-foreground" />}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="flex-1">
              <CardHeader className="p-4 border-b flex flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">{editedRole?.name} Permissions</h3>
                  <p className="text-xs text-muted-foreground mt-1">Configure what users with this role can access and modify.</p>
                </div>
                <Button
                  variant={saveState === 'saved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleSaveRole}
                  disabled={saveState !== 'idle'}
                  className={saveState === 'saved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {saveState === 'saving' ? <><Activity className="h-4 w-4 mr-1 animate-spin" /> Saving</> :
                   saveState === 'saved' ? <><Check className="h-4 w-4 mr-1" /> Saved</> :
                   <><Save className="h-4 w-4 mr-1" /> Save</>}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {MODULE_NAMES.map(mod => {
                    const perms = editedRole?.modules[mod];
                    if (!perms) return null;
                    return (
                      <div key={mod} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium capitalize">{mod}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Control access to {mod} data.</p>
                        </div>
                        <div className="flex items-center bg-muted p-0.5 rounded-lg gap-0.5">
                          <button
                            onClick={() => togglePermission(mod, 'v')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              perms.v ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {perms.v ? <Check className="h-3 w-3" /> : <span>–</span>} View
                          </button>
                          <button
                            onClick={() => togglePermission(mod, 'e')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              perms.e ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {perms.e ? <Check className="h-3 w-3" /> : <span>–</span>} Edit
                          </button>
                          <button
                            onClick={() => togglePermission(mod, 'd')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                              perms.d ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {perms.d ? <Check className="h-3 w-3" /> : <span>–</span>} None
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-muted-foreground" />
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Activity</SelectItem>
                <SelectItem value="updated permissions">Permissions Updated</SelectItem>
                <SelectItem value="invited">Invitations</SelectItem>
                <SelectItem value="logged in">Logins</SelectItem>
                <SelectItem value="changed role">Role Changes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredActivity.length === 0 && (
              <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No recent activity.</CardContent></Card>
            )}
            {filteredActivity.map(a => {
              const member = members.find(m => m.id === a.repId) || MOCK_MEMBERS.find(m => m.id === a.repId);
              if (!member) return null;
              return (
                <Card key={a.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs text-white" style={{ backgroundColor: member.color }}>{member.initials}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <span className="font-medium">{member.name}</span>{' '}
                        <span className="text-muted-foreground">{a.action}</span>{' '}
                        <span className="font-medium">{a.target}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {a.time}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsInviteModalOpen(false)} />
          <div className="bg-card rounded-lg border shadow-xl w-full max-w-md relative z-10">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">Invite New Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
                <Input required placeholder="e.g. John Doe" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Address</label>
                <Input required type="email" placeholder="e.g. john@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm">Send Invite</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingMember(null)} />
          <div className="bg-card rounded-lg border shadow-xl w-full max-w-md relative z-10">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-sm font-semibold">Edit Member</h3>
              <button onClick={() => setEditingMember(null)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
                <Input required placeholder="e.g. John Doe" value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Address</label>
                <Input type="email" placeholder="e.g. john@example.com" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-9" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingMember(null)}>Cancel</Button>
                <Button type="submit" size="sm">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
