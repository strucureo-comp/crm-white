'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Trophy, MessageSquare, Phone, Mail, MoreHorizontal, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUsers } from '@/lib/firebase/database';
import type { User } from '@/lib/db/types';
import { toast } from 'sonner';
import { TeamDialog } from '@/components/dialogs/team-dialog';

const roleColors: Record<string, string> = {
  admin: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  dev: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  client: 'bg-muted text-muted-foreground',
};

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'edit' | 'invite'>('invite');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  function openInvite() {
    setEditingUser(null);
    setDialogMode('invite');
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setDialogMode('edit');
    setDialogOpen(true);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading team...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Team</h2>
          <p className="text-sm text-muted-foreground">Manage your team and track performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('Team chat coming soon')} className="text-xs sm:text-sm">
            <MessageSquare size={14} className="mr-1.5" />
            Team Chat
          </Button>
          <Button onClick={openInvite} size="sm" className="text-xs sm:text-sm">
            <Plus size={14} className="mr-1.5" />
            Invite Member
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search team members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {filtered.map((user) => (
              <Card key={user.id} className="hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className={roleColors[user.role] || ''}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Pencil size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy size={18} className="text-amber-500" />
                  Team Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Total Members</span>
                      <span className="font-medium">{users.length}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Admins</span>
                      <span className="font-medium">{users.filter((u) => u.role === 'admin').length}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Developers</span>
                      <span className="font-medium">{users.filter((u) => u.role === 'dev').length}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Clients</span>
                      <span className="font-medium">{users.filter((u) => u.role === 'client').length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">{search ? 'No members match your search' : 'No team members yet'}</p></CardContent></Card>
      )}

      <TeamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        user={editingUser}
        mode={dialogMode}
      />
    </div>
  );
}
