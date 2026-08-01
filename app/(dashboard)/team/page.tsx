'use client';

import React, { useState, useEffect } from 'react';
import { Users, Shield, Activity, Search, Plus, MoreHorizontal, Edit2, X, Check, SearchIcon, Clock, Filter, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { useAuth } from '@/lib/firebase/auth-context';
import { subscribeToProjectsData, createMember, updateMember, deleteMember, Member as DBMember } from '@/lib/db/projects/api';

// --- Data Schemas ---
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

// --- Mock Data ---
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

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<'Members' | 'Roles' | 'Activity'>('Members');
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  
  // Edit Modal State
  const [editingMember, setEditingMember] = useState<UIMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  
  // Members Tab State
  const [members, setMembers] = useState<UIMember[]>([]);
  const { user } = useAuth();
  
  const [searchMember, setSearchMember] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    if (!user?.company_id) return;
    const unsub = subscribeToProjectsData(user.company_id, (data) => {
      const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
      const mapped: UIMember[] = (data.members || []).map((m, i) => {
        const initials = m.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        return {
          id: m.id,
          name: m.name,
          email: m.email || '',
          role: m.role || 'Viewer',
          status: 'Active', // Mocked for now
          lastActive: 'Recently', // Mocked for now
          initials,
          color: colors[i % colors.length]
        };
      });
      setMembers(mapped);
    });
    return () => unsub();
  }, [user]);

  // Roles Tab State
  const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('r3'); // Sales Rep default
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editedRole, setEditedRole] = useState<Role | null>(null);

  // Activity Tab State
  const [filterAction, setFilterAction] = useState('All');

  // Sync editedRole when selected role changes
  useEffect(() => {
    const role = roles.find(r => r.id === selectedRoleId);
    if (role) setEditedRole(JSON.parse(JSON.stringify(role)));
    setSaveState('idle');
  }, [selectedRoleId, roles]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!user?.company_id) return;
    try {
      await updateMember(user.company_id, memberId, { role: newRole });
    } catch(err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user?.company_id) return;
    try {
      await deleteMember(user.company_id, memberId);
    } catch(err) {
      console.error(err);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !user?.company_id || !editName.trim()) return;
    
    try {
      await updateMember(user.company_id, editingMember.id, {
        name: editName.trim(),
        email: editEmail.trim(),
      });
      setEditingMember(null);
    } catch (err) {
      console.error('Failed to update member:', err);
    }
  };

  const togglePermission = (mod: ModuleKey, perm: PermissionType) => {
    if (!editedRole) return;
    const newRole = { ...editedRole };
    
    // Reset all to false for this module
    newRole.modules[mod] = { v: false, e: false, d: false };
    // Set the selected one to true
    newRole.modules[mod][perm] = true;
    
    setEditedRole(newRole);
    setSaveState('idle'); // Need to save changes
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

  // Filtered Data
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
      await createMember(user.company_id, {
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        avatar: '',
        projectIds: []
      });
      
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Viewer');
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0 bg-[#f8fafc] dark:bg-background text-slate-900 dark:text-slate-100">
      
      {/* 2. Global Layout & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-card border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight">Team</h1>
          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-slate-200 dark:border-slate-700">
            {members.length} Members
          </Badge>
        </div>
        <Button 
          className="bg-[#1e1a4f] hover:bg-[#2d2770] text-white rounded-xl shadow-md font-bold px-5"
          onClick={() => setIsInviteModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Invite Member
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* 3. Sidebar Navigation */}
        <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-card flex flex-col p-4 shrink-0 z-10">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 px-2">Management</div>
          
          <nav className="flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('Members')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'Members' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-bold border-l-4 border-l-purple-600 dark:border-l-purple-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-semibold border-l-4 border-l-transparent'}`}
            >
              <Users className="w-4 h-4" /> Members
            </button>
            <button 
              onClick={() => setActiveTab('Roles')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'Roles' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-bold border-l-4 border-l-purple-600 dark:border-l-purple-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-semibold border-l-4 border-l-transparent'}`}
            >
              <Shield className="w-4 h-4" /> Roles & Permissions
            </button>
            <button 
              onClick={() => setActiveTab('Activity')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeTab === 'Activity' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-bold border-l-4 border-l-purple-600 dark:border-l-purple-500' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-semibold border-l-4 border-l-transparent'}`}
            >
              <Activity className="w-4 h-4" /> Activity Log
            </button>
          </nav>
        </div>

        {/* 4. Tab Views (Content Area) */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc] dark:bg-muted/5">
          
          {/* A. Members Tab */}
          {activeTab === 'Members' && (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search members..." 
                    className="pl-9 h-11 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm rounded-xl font-medium focus-visible:ring-purple-500" 
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[160px] h-11 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    {roles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] h-11 bg-white dark:bg-card border-slate-200 dark:border-slate-800 shadow-sm rounded-xl font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Invited">Invited</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 w-[40%]">Member</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 w-[20%]">Role</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 w-[15%]">Status</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 w-[15%]">Last Active</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 w-[10%] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMembers.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium italic">No members found matching your filters.</td></tr>
                      )}
                      {filteredMembers.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10 border-2 border-white dark:border-card shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                                <AvatarFallback className="text-white font-bold text-xs" style={{ backgroundColor: m.color }}>{m.initials}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate leading-tight mb-0.5">{m.name}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Select value={m.role} onValueChange={(val) => handleRoleChange(m.id, val)}>
                              <SelectTrigger className="h-8 text-xs font-bold border-slate-200 dark:border-slate-800 shadow-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 w-[130px]">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {roles.map(r => <SelectItem key={r.id} value={r.name} className="text-xs font-bold">{r.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 border-transparent ${
                              m.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 
                              m.status === 'Invited' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {m.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-500">{m.lastActive}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setEditName(m.name);
                                  setEditEmail(m.email);
                                  setEditingMember(m);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveMember(m.id)}><X className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* B. Roles & Permissions Tab */}
          {activeTab === 'Roles' && (
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
              
              {/* Left - Roles List */}
              <Card className="w-full lg:w-72 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-card shrink-0 self-start">
                <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between pb-3">
                  <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight">Roles</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"><Plus className="w-3 h-3 mr-1" /> Add</Button>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {roles.map(r => (
                    <button 
                      key={r.id}
                      onClick={() => setSelectedRoleId(r.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all font-bold text-sm flex items-center justify-between ${
                        selectedRoleId === r.id ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      {r.name}
                      {selectedRoleId === r.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Right - Permission Matrix */}
              <Card className="flex-1 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-card overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{editedRole?.name} Permissions</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Configure what users with this role can access and modify.</p>
                  </div>
                  <Button 
                    className={`rounded-xl font-bold shadow-md transition-all ${
                      saveState === 'saved' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 
                      saveState === 'saving' ? 'bg-slate-200 text-slate-500 cursor-not-allowed' :
                      'bg-[#1e1a4f] hover:bg-[#2d2770] text-white'
                    }`}
                    onClick={handleSaveRole}
                    disabled={saveState !== 'idle'}
                  >
                    {saveState === 'saving' ? <><Activity className="w-4 h-4 mr-2 animate-spin" /> Saving...</> :
                     saveState === 'saved' ? <><Check className="w-4 h-4 mr-2" /> Saved</> :
                     <><Save className="w-4 h-4 mr-2" /> Save changes</>}
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {MODULE_NAMES.map(mod => {
                      const perms = editedRole?.modules[mod];
                      if(!perms) return null;
                      
                      return (
                        <div key={mod} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">{mod}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Control access to {mod} data.</span>
                          </div>
                          
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                            <button 
                              onClick={() => togglePermission(mod, 'v')}
                              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${perms.v ? 'bg-white dark:bg-card text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                              {perms.v ? <Check className="w-3 h-3" /> : <span>–</span>} View
                            </button>
                            <button 
                              onClick={() => togglePermission(mod, 'e')}
                              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${perms.e ? 'bg-white dark:bg-card text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-900/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                              {perms.e ? <Check className="w-3 h-3" /> : <span>–</span>} Edit
                            </button>
                            <button 
                              onClick={() => togglePermission(mod, 'd')}
                              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${perms.d ? 'bg-white dark:bg-card text-rose-700 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900/50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                              {perms.d ? <Check className="w-3 h-3" /> : <span>–</span>} None
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {/* C. Activity Log Tab */}
          {activeTab === 'Activity' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-card p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 px-2">
                  <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Filter Feed:</span>
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-[200px] h-9 bg-slate-50 dark:bg-slate-800 border-transparent shadow-none font-bold text-sm"><SelectValue /></SelectTrigger>
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
                  <div className="p-8 text-center text-slate-500 font-medium italic bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">No recent activity matches your filter.</div>
                )}
                
                {filteredActivity.map(a => {
                  const member = members.find(m => m.id === a.repId) || MOCK_MEMBERS.find(m => m.id === a.repId);
                  if(!member) return null;
                  
                  return (
                    <Card key={a.id} className="border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-card hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                      <CardContent className="p-4 flex items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-10 h-10 border ring-1 ring-slate-100 dark:ring-slate-800 shadow-sm">
                            <AvatarFallback className="text-white font-bold text-xs" style={{ backgroundColor: member.color }}>{member.initials}</AvatarFallback>
                          </Avatar>
                          <div className="text-sm">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{member.name}</span>{' '}
                            <span className="text-slate-500 dark:text-slate-400 font-medium">{a.action}</span>{' '}
                            <span className="font-bold text-purple-700 dark:text-purple-400">{a.target}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 shrink-0">
                          <Clock className="w-3 h-3" />
                          {a.time}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsInviteModalOpen(false)}></div>
          <div className="bg-white dark:bg-card rounded-2xl border shadow-xl w-full max-w-md relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black tracking-tight">Invite New Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <Input 
                  required
                  placeholder="e.g. John Doe" 
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="h-11 bg-slate-50 dark:bg-slate-900/50"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <Input 
                  required
                  type="email"
                  placeholder="e.g. john@example.com" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-11 bg-slate-50 dark:bg-slate-900/50"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Assign Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-slate-900/50 font-bold">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-6">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 shadow-sm"
                >
                  Send Invite
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingMember(null)}></div>
          <div className="bg-white dark:bg-card rounded-2xl border shadow-xl w-full max-w-md relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black tracking-tight">Edit Member</h3>
              <button onClick={() => setEditingMember(null)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                <Input 
                  required
                  placeholder="e.g. John Doe" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-11 bg-slate-50 dark:bg-slate-900/50"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                <Input 
                  type="email"
                  placeholder="e.g. john@example.com" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-11 bg-slate-50 dark:bg-slate-900/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-6">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => setEditingMember(null)}
                  className="font-bold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
