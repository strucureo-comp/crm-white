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

interface LeadForm {
  name: string;
  email: string;
  company: string;
  phone: string;
  status: LeadStatus;
  source: string;
  potential_value: number;
  probability: number;
  notes: string;
  lead_score: number;
  intent: string;
  tags: string;
  last_contacted: string;
  next_follow_up: string;
  follow_up_notes: string;
}

const defaultForm: LeadForm = {
  name: '',
  email: '',
  company: '',
  phone: '',
  status: 'new',
  source: '',
  potential_value: 0,
  probability: 0,
  notes: '',
  lead_score: 0,
  intent: '',
  tags: '',
  last_contacted: '',
  next_follow_up: '',
  follow_up_notes: '',
};

function leadToForm(l: Lead): LeadForm {
  return {
    name: l.name,
    email: l.email,
    company: l.company || '',
    phone: l.phone || '',
    status: l.status,
    source: l.source || '',
    potential_value: l.potential_value || 0,
    probability: l.probability || 0,
    notes: l.notes || '',
    lead_score: l.lead_score || 0,
    intent: l.intent || '',
    tags: l.tags?.join(', ') || '',
    last_contacted: l.last_contacted || '',
    next_follow_up: l.next_follow_up || '',
    follow_up_notes: l.follow_up_notes || '',
  };
}

function formToPayload(f: LeadForm) {
  return {
    name: f.name,
    email: f.email,
    company: f.company || null,
    phone: f.phone || null,
    status: f.status,
    source: f.source || null,
    potential_value: f.potential_value || null,
    probability: f.probability || null,
    notes: f.notes || null,
    lead_score: f.lead_score || null,
    intent: f.intent || null,
    tags: f.tags ? f.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
    last_contacted: f.last_contacted || null,
    next_follow_up: f.next_follow_up || null,
    follow_up_notes: f.follow_up_notes || null,
  };
}

export function LeadDialog({ open, onOpenChange, onSaved, lead }: LeadDialogProps) {
  const [form, setForm] = useState<LeadForm>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(lead ? leadToForm(lead) : { ...defaultForm });
  }, [lead]);

  function set<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
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
      const payload = formToPayload(form);
      if (lead) {
        await updateLead(lead.id, payload as any);
        toast.success('Updated successfully');
      } else {
        await createLead(payload as any);
        toast.success('Created successfully');
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm(lead ? leadToForm(lead) : { ...defaultForm });
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
              <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any notes..." rows={2} />
            </div>
            <div>
              <Label htmlFor="lead_score">Lead Score</Label>
              <Input id="lead_score" type="number" min={0} max={100} value={form.lead_score} onChange={(e) => set('lead_score', Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="intent">Intent</Label>
              <Select value={form.intent} onValueChange={(v) => set('intent', v)}>
                <SelectTrigger id="intent"><SelectValue placeholder="Select intent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="exploratory">Exploratory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="hot, vip, follow-up" />
            </div>
            <div>
              <Label htmlFor="last_contacted">Last Contacted</Label>
              <Input id="last_contacted" type="date" value={form.last_contacted} onChange={(e) => set('last_contacted', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="next_follow_up">Next Follow-up</Label>
              <Input id="next_follow_up" type="date" value={form.next_follow_up} onChange={(e) => set('next_follow_up', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="follow_up_notes">Follow-up Notes</Label>
              <Textarea id="follow_up_notes" value={form.follow_up_notes} onChange={(e) => set('follow_up_notes', e.target.value)} placeholder="Follow-up details..." rows={2} />
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
