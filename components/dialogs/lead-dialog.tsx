'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createLead, updateLead } from '@/lib/firebase/database';
import type { Lead, LeadStatus } from '@/lib/db/types';

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  lead?: Lead | null;
}

const defaultForm = {
  name: '',
  email: '',
  company: '',
  phone: '',
  status: 'new' as LeadStatus,
  source: '',
  potential_value: 0,
  probability: 0,
  notes: '',
};

export function LeadDialog({ open, onOpenChange, onSaved, lead }: LeadDialogProps) {
  const [form, setForm] = useState(() => lead
    ? {
        name: lead.name,
        email: lead.email,
        company: lead.company || '',
        phone: lead.phone || '',
        status: lead.status,
        source: lead.source || '',
        potential_value: lead.potential_value || 0,
        probability: lead.probability || 0,
        notes: lead.notes || '',
      }
    : { ...defaultForm }
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      if (lead) {
        await updateLead(lead.id, form);
        toast.success('Updated successfully');
      } else {
        await createLead(form);
        toast.success('Created successfully');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm(lead ? {
      name: lead.name,
      email: lead.email,
      company: lead.company || '',
      phone: lead.phone || '',
      status: lead.status,
      source: lead.source || '',
      potential_value: lead.potential_value || 0,
      probability: lead.probability || 0,
      notes: lead.notes || '',
    } : { ...defaultForm });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit' : 'Add'} {lead ? 'Lead' : 'Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Update the lead details below.' : 'Enter the lead details below.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="John Doe" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Inc." />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 555-0123" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v: LeadStatus) => set('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select value={form.source} onValueChange={(v) => set('source', v)}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="email">Email Campaign</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="potential_value">Potential Value ($)</Label>
              <Input id="potential_value" type="number" min={0} value={form.potential_value} onChange={(e) => set('potential_value', Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="probability">Probability (%)</Label>
              <Input id="probability" type="number" min={0} max={100} value={form.probability} onChange={(e) => set('probability', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : lead ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
