'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createContract, updateContract } from '@/lib/firebase/database';
import type { Contract, ContractStatus } from '@/lib/db/types';

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  contract?: Contract | null;
}

const defaultForm = {
  title: '',
  type: 'NDA',
  status: 'Draft' as ContractStatus,
  parties: '',
  expiry: '',
  progress: 0,
};

export function ContractDialog({ open, onOpenChange, onSaved, contract }: ContractDialogProps) {
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contract) {
      setForm({
        title: contract.title,
        type: contract.type,
        status: contract.status,
        parties: contract.parties,
        expiry: contract.expiry,
        progress: contract.progress,
      });
    } else {
      setForm({ ...defaultForm });
    }
  }, [contract]);

  function set<K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.parties.trim()) {
      toast.error('Title and parties are required');
      return;
    }
    setSaving(true);
    try {
      if (contract) {
        await updateContract(contract.id, form);
        toast.success('Contract updated');
      } else {
        await createContract(form);
        toast.success('Contract created');
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{contract ? 'Edit Contract' : 'New Contract'}</DialogTitle>
          <DialogDescription>
            {contract ? 'Update the contract details below.' : 'Enter the contract details below.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="NDA - TechCorp Partnership" />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(v) => set('type', v)}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NDA">NDA</SelectItem>
                  <SelectItem value="Service Agreement">Service Agreement</SelectItem>
                  <SelectItem value="SaaS License">SaaS License</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v: ContractStatus) => set('status', v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="parties">Parties *</Label>
              <Input id="parties" value={form.parties} onChange={(e) => set('parties', e.target.value)} placeholder="Tagverse × TechCorp Inc." />
            </div>
            <div>
              <Label htmlFor="expiry">Expiry</Label>
              <Input id="expiry" type="date" value={form.expiry} onChange={(e) => set('expiry', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="progress">Progress (%)</Label>
              <Input id="progress" type="number" min={0} max={100} value={form.progress} onChange={(e) => set('progress', Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : contract ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
