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
import { Badge } from '@/components/ui/badge';
import type { Lead, LeadStatus, LeadSource, LeadTag, LeadPriority } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/firebase/auth-context';

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
  source: LeadSource | '';
  estimated_value: number;
  owner_id: string;
  notes: string;
  tags: LeadTag[];
  priority: LeadPriority | '';
  next_follow_up: string;
}

const defaultForm: LeadForm = {
  name: '',
  email: '',
  company: '',
  phone: '',
  status: 'new',
  source: 'Manual',
  estimated_value: 0,
  owner_id: '',
  notes: '',
  tags: [],
  priority: '',
  next_follow_up: '',
};

const AVAILABLE_TAGS: LeadTag[] = [
  'VIP', 'Hot', 'Warm', 'Cold', 'High Value', 'Returning Customer',
  'Decision Maker', 'Follow Up', 'Demo Scheduled', 'Interested',
  'Not Interested', 'Urgent'
];

function leadToForm(l: Lead): LeadForm {
  return {
    name: l.name,
    email: l.email,
    company: l.company || '',
    phone: l.phone || '',
    status: l.status,
    source: l.source || '',
    estimated_value: l.estimated_value || 0,
    owner_id: l.owner_id || '',
    notes: l.notes || '',
    tags: l.tags || [],
    priority: l.priority || '',
    next_follow_up: l.next_follow_up || '',
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
    estimated_value: f.estimated_value || null,
    owner_id: f.owner_id || null,
    notes: f.notes || null,
    tags: f.tags.length > 0 ? f.tags : null,
    priority: f.priority || null,
    next_follow_up: f.next_follow_up || null,
  };
}

export function LeadDialog({ open, onOpenChange, onSaved, lead }: LeadDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<LeadForm>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setForm(leadToForm(lead));
    } else {
      setForm({
        ...defaultForm,
        owner_id: user?.id || '',
      });
    }
  }, [lead, user]);

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
        await createLead({
          ...payload,
          company_id: user?.company_id || '',
        } as any);
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
    setForm(lead ? leadToForm(lead) : { ...defaultForm, owner_id: user?.id || '' });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'New Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Update the lead details.' : 'Enter the lead details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="John Doe" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="john@example.com" />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Inc." />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 234 567 8900" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v: LeadStatus) => set('status', v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
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
              <Select value={form.source} onValueChange={(v: LeadSource) => set('source', v)}>
                <SelectTrigger id="source"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Cold Call">Cold Call</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Google Ads">Google Ads</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={form.priority} onValueChange={(v: LeadPriority) => set('priority', v)}>
                <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="next_follow_up">Next Follow Up</Label>
              <Input id="next_follow_up" type="date" value={form.next_follow_up} onChange={(e) => set('next_follow_up', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="estimated_value">Estimated Value ($)</Label>
              <Input id="estimated_value" type="number" min={0} value={form.estimated_value} onChange={(e) => set('estimated_value', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any notes..." rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = form.tags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn('cursor-pointer select-none', isSelected ? '' : 'text-muted-foreground')}
                      onClick={() => {
                        const newTags = isSelected 
                          ? form.tags.filter(t => t !== tag) 
                          : [...form.tags, tag];
                        set('tags', newTags);
                      }}
                    >
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="col-span-2">
              <Label htmlFor="next_follow_up">Next Follow-up</Label>
              <Input id="next_follow_up" type="date" value={form.next_follow_up} onChange={(e) => set('next_follow_up', e.target.value)} />
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
