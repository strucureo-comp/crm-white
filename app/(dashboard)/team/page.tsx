'use client';

import React, { useState, useEffect } from 'react';
import { Users, Shield, Activity, Search, Plus, Edit2, X, Check, Clock, Filter, Save, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { getActivityLogs } from '@/lib/firebase/database';
import { ActivityLog, Role, ModulePermissions } from '@/lib/db/types';
import { subscribeToProjectsData, createMember, updateMember, deleteMember } from '@/lib/db/projects/api';
import { subscribeToRoles, updateRole, createRole, deleteRole, ensureDefaultRoles } from '@/lib/db/roles/api';
import { ensureWorkspaceOwnerMember } from '@/lib/workspace/api';
import { sendInvite } from '@/lib/workspace/invites';

type PermissionType = 'v' | 'e' | 'd';

interface UIMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Pending' | 'Invited' | 'Inactive' | 'Accepted' | 'Expired';
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

const MOCK_MEMBERS: UIMember[] = [];

const MOCK_ACTIVITY: ActivityItem[] = [];

const MODULE_NAMES = ['contracts', 'payments', 'marketing', 'workspace', 'analytics', 'leads'] as const;
type ModuleKey = typeof MODULE_NAMES[number];
const MODULE_LABELS: Record<string, string> = { contracts: 'Contracts', payments: 'Payments', marketing: 'Marketing', workspace: 'Workspace Settings', analytics: 'Analytics', leads: 'Leads' };

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
  const { workspace, user } = useAuth();
  const [searchMember, setSearchMember] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editedRole, setEditedRole] = useState<Role | null>(null);
  const [filterAction, setFilterAction] = useState('All');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (!workspace?.id) return;
    ensureWorkspaceOwnerMember(workspace.id, workspace.owner_id, user).catch(console.error);
    ensureDefaultRoles(workspace.id).catch(console.error);
  }, [workspace?.id, user]);

  useEffect(() => {
    if (!workspace?.id) return;
    getActivityLogs(workspace?.id).then(setActivityLogs).catch(console.error);
  }, [workspace?.id, user]);

  useEffect(() => {
    if (!workspace?.id) return;
    const unsub = subscribeToRoles(workspace.id, (data) => {
      setRoles(data);
      if (data.length > 0 && !selectedRoleId) {
        setSelectedRoleId(data[0].id);
      }
    });
    return () => unsub();
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    const unsub = subscribeToProjectsData(workspace.id, (data) => {
      const mapped: UIMember[] = (data.members || []).map((m, i) => {
        const initials = (m.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        return {
          id: m.id,
          name: m.name,
          email: m.email || '',
          role: m.role || 'Viewer',
          status: (m.status || 'Active') as UIMember['status'],
          lastActive: m.status === 'Pending' || m.status === 'Invited' ? 'Invited' : 'Recently',
          initials,
          color: AVATAR_COLORS[i % AVATAR_COLORS.length]
        };
      });

      // If workspace owner is known and not present in data.members, proactively synthesize at top
      if (workspace?.owner_id) {
        const ownerEmail = (user?.id === workspace.owner_id ? user?.email : '') || '';
        const ownerName = (user?.id === workspace.owner_id ? (user?.full_name || user?.email?.split('@')[0]) : '') || 'Workspace Owner';
        
        const hasOwner = mapped.some(m => 
          (ownerEmail && m.email.toLowerCase() === ownerEmail.toLowerCase()) ||
          (m.role.toLowerCase() === 'owner') ||
          (m.id === workspace.owner_id)
        );

        if (!hasOwner && (ownerEmail || ownerName)) {
          const initials = (ownerName || 'OW').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
          mapped.unshift({
            id: workspace.owner_id,
            name: ownerName,
            email: ownerEmail,
            role: 'Owner',
            status: 'Active',
            lastActive: 'Recently',
            initials,
            color: AVATAR_COLORS[0]
          });
        }
      }

      setMembers(mapped);
    });
    return () => unsub();
  }, [workspace?.id, user]);

  useEffect(() => {
    const role = roles.find(r => r.id === selectedRoleId);
    if (role) setEditedRole(JSON.parse(JSON.stringify(role)));
    setSaveState('idle');
  }, [selectedRoleId, roles]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!workspace?.id) return;
    try { await updateMember(workspace.id, memberId, { role: newRole }); } catch(err) { toast.error('Failed to update member role'); }
  };

  const handleRemoveMember = async (member: UIMember) => {
    if (!workspace?.id) return;
    const isOwner = member.role?.toLowerCase() === 'owner' || 
      (workspace.owner_id && (member.id === workspace.owner_id || (user?.id === workspace.owner_id && member.email?.toLowerCase() === user.email?.toLowerCase())));
    if (isOwner) {
      toast.error('The workspace owner cannot be removed');
      return;
    }
    try { 
      await deleteMember(workspace.id, member.id); 
      toast.success('Member removed');
    } catch(err) { 
      toast.error('Failed to remove member'); 
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !workspace?.id || !editName.trim()) return;
    try {
      await updateMember(workspace.id, editingMember.id, { name: editName.trim(), email: editEmail.trim() });
      setEditingMember(null);
      toast.success('Member updated');
    } catch (err) { toast.error('Failed to update member'); }
  };

  const togglePermission = (mod: ModuleKey, perm: PermissionType) => {
    if (!editedRole) return;
    const newRole = { ...editedRole };
    newRole.permissions[mod] = { view: false, edit: false, delete: false };
    if (perm === 'v') newRole.permissions[mod].view = true;
    if (perm === 'e') { newRole.permissions[mod].view = true; newRole.permissions[mod].edit = true; }
    if (perm === 'd') { newRole.permissions[mod].view = true; newRole.permissions[mod].edit = true; newRole.permissions[mod].delete = true; }
    setEditedRole(newRole);
    setSaveState('idle');
  };

  const handleSaveRole = async () => {
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
    if (!inviteName.trim() || !inviteEmail.trim() || !workspace?.id) return;
    
    const emailLower = inviteEmail.trim().toLowerCase();
    const existingMember = members.find(m => m.email.trim().toLowerCase() === emailLower);
    if (existingMember) {
      toast.error(`A member with email "${inviteEmail.trim()}" already exists in this workspace.`);
      return;
    }

    try {
      if (workspace?.id) {
        await sendInvite(workspace.id, workspace.name || 'Workspace', emailLower, inviteRole, user?.id || '');
      }
      await createMember(workspace?.id, {
        name: inviteName.trim(),
        email: emailLower,
        role: inviteRole,
        status: 'Pending',
        avatar: '',
        projectIds: []
      });
      toast.success('Invitation sent successfully!');
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Viewer');
    } catch(err) { toast.error('Failed to send invite'); }
  };

  const handleResendInvite = async (member: UIMember) => {
    if (!workspace?.id || !member.email) return;
    try {
      await sendInvite(workspace.id, workspace.name || 'Workspace', member.email.trim().toLowerCase(), member.role, user?.id || '');
      toast.success(`Invitation email resent to ${member.email}`);
    } catch (err) {
      toast.error('Failed to resend invitation');
    }
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
                <SelectItem value="Pending">Pending</SelectItem>
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
                    {filteredMembers.map(m => {
                      const isCurrentUser = Boolean(
                        (user?.email && m.email && m.email.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
                        (user?.id && (m.id === user.id || (user.id === workspace?.owner_id && (m.role?.toLowerCase() === 'owner' || m.id === workspace?.owner_id))))
                      );
                      const isOwner = m.role?.toLowerCase() === 'owner' || 
                        Boolean(workspace?.owner_id && (m.id === workspace.owner_id || (user?.id === workspace.owner_id && isCurrentUser)));

                      return (
                        <tr key={m.id} className="hover:bg-muted/50 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs text-white" style={{ backgroundColor: m.color }}>{m.initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-medium truncate">{m.name}</p>
                                  {isCurrentUser && (
                                    <span className="text-xs font-normal text-muted-foreground shrink-0">(You)</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Select 
                              value={m.role} 
                              onValueChange={(val) => handleRoleChange(m.id, val)}
                              disabled={isOwner && user?.id !== workspace?.owner_id}
                            >
                              <SelectTrigger className="h-8 text-xs border-none shadow-none bg-transparent hover:bg-muted w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roles.map(r => <SelectItem key={r.id} value={r.name} className="text-xs">{r.name}</SelectItem>)}
                                {!roles.some(r => r.name.toLowerCase() === 'owner') && (
                                  <SelectItem value="Owner" className="text-xs">Owner</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
                              m.status === 'Active' || m.status === 'Accepted' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                              m.status === 'Pending' || m.status === 'Invited' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                            }`}>
                              {m.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">{m.lastActive}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {(m.status === 'Pending' || m.status === 'Invited') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  title="Resend Invite"
                                  onClick={() => handleResendInvite(m)}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                title="Edit Member"
                                onClick={() => { setEditName(m.name); setEditEmail(m.email); setEditingMember(m); }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {!isOwner && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Delete Member"
                                  onClick={() => handleRemoveMember(m)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

                {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            <Card className="w-full md:w-64 shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Roles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`text-left px-4 py-3 text-sm transition-colors border-l-2 hover:bg-muted/50 ${
                        selectedRoleId === role.id 
                          ? 'border-primary bg-primary/5 font-medium text-primary' 
                          : 'border-transparent text-muted-foreground'
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1">
              {editedRole ? (
                <>
                  <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
                    <div>
                      <CardTitle className="text-lg">{editedRole.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {editedRole.description || 'Configure access levels for this role'}
                      </p>
                    </div>
                    <Button 
                      onClick={handleSaveRole} 
                      disabled={saveState === 'saving' || saveState === 'saved'}
                    >
                      {saveState === 'saving' ? (
                        <Activity className="w-4 h-4 mr-2 animate-spin" />
                      ) : saveState === 'saved' ? (
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {saveState === 'saved' ? 'Saved' : 'Save Changes'}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="p-4 text-sm font-medium">Module</th>
                          <th className="p-4 text-sm font-medium text-center">View</th>
                          <th className="p-4 text-sm font-medium text-center">Edit</th>
                          <th className="p-4 text-sm font-medium text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {MODULE_NAMES.map(mod => {
                          const perms = editedRole.permissions[mod] || { view: false, edit: false, delete: false };
                          const canView = perms.view;
                          const canEdit = perms.edit;
                          const canDelete = perms.delete;

                          return (
                            <tr key={mod} className="hover:bg-muted/30 transition-colors">
                              <td className="p-4 text-sm font-medium capitalize">
                                {MODULE_LABELS[mod] || mod}
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => togglePermission(mod, 'v')}
                                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center border transition-colors ${
                                    canView ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-primary/50'
                                  }`}
                                >
                                  {canView && <Check size={12} />}
                                </button>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => togglePermission(mod, 'e')}
                                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center border transition-colors ${
                                    canEdit ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-primary/50'
                                  }`}
                                >
                                  {canEdit && <Check size={12} />}
                                </button>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => togglePermission(mod, 'd')}
                                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center border transition-colors ${
                                    canDelete ? 'bg-destructive border-destructive text-destructive-foreground' : 'border-input hover:border-destructive/50'
                                  }`}
                                >
                                  {canDelete && <Check size={12} />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </>
              ) : (
                <div className="h-full min-h-[400px] flex items-center justify-center text-muted-foreground">
                  Select a role to edit its permissions
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Activity Log</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Actions</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="create">Created</SelectItem>
                      <SelectItem value="update">Updated</SelectItem>
                      <SelectItem value="delete">Deleted</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No activity recorded yet.</p>
                  </div>
                ) : (
                  activityLogs
                    .filter(log => filterAction === 'All' || log.action.includes(filterAction.toLowerCase()))
                    .map(log => (
                      <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-muted/50 items-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Activity size={14} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium text-foreground">{log.user_name}</span>{' '}
                            <span className="text-muted-foreground">{log.description}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{log.date}</span>
                            <span>•</span>
                            <span>{log.time}</span>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
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
