'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updateInviteStatus } from '@/lib/workspace/invites';
import { createWorkspaceMember } from '@/lib/workspace/api';
import { toast } from 'sonner';

export function InvitesModal() {
  const { user, pendingInvites, refreshUser, switchWorkspace } = useAuth();
  const [processing, setProcessing] = useState(false);

  if (!pendingInvites || pendingInvites.length === 0 || !user) {
    return null;
  }

  const handleAccept = async (inviteId: string, workspaceId: string, role: string) => {
    setProcessing(true);
    try {
      await updateInviteStatus(inviteId, 'accepted');
      await createWorkspaceMember(workspaceId, user.id, role as any, undefined);
      toast.success('Invitation accepted! Switching workspace...');
      await refreshUser();
      await switchWorkspace(workspaceId);
    } catch (e) {
      toast.error('Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setProcessing(true);
    try {
      await updateInviteStatus(inviteId, 'declined');
      toast.success('Invitation declined');
      await refreshUser();
    } catch (e) {
      toast.error('Failed to decline invitation');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" closable={false}>
        <DialogHeader>
          <DialogTitle>Workspace Invitations</DialogTitle>
          <DialogDescription>
            You have been invited to join the following workspaces.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {pendingInvites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{invite.workspace_name}</p>
                <p className="text-xs text-muted-foreground">Invited as {invite.role}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={processing} onClick={() => handleDecline(invite.id)}>
                  Decline
                </Button>
                <Button size="sm" disabled={processing} onClick={() => handleAccept(invite.id, invite.workspace_id, invite.role)}>
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
