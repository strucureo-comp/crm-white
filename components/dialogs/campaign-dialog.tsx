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
import { createCampaign, updateCampaign } from '@/lib/firebase/database';
import type { Campaign, CampaignChannel, CampaignStatus } from '@/lib/db/types';

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  campaign?: Campaign | null;
}

const defaultForm = {
  name: '',
  description: '',
  channel: 'email' as CampaignChannel,
  status: 'draft' as CampaignStatus,
  budget: 0,
  target_audience: '',
  start_date: '',
  end_date: '',
  created_by: '',
};

export function CampaignDialog({ open, onOpenChange, onSaved, campaign }: CampaignDialogProps) {
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name,
        description: campaign.description || '',
        channel: campaign.channel,
        status: campaign.status,
        budget: campaign.budget || 0,
        target_audience: campaign.target_audience || '',
        start_date: campaign.start_date || '',
        end_date: campaign.end_date || '',
        created_by: campaign.created_by,
      });
    } else {
      setForm({ ...defaultForm });
    }
  }, [campaign]);

  function set<K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }
    if (!form.start_date) {
      toast.error('Start date is required');
      return;
    }
    if (!form.end_date) {
      toast.error('End date is required');
      return;
    }
    setSaving(true);
    try {
      if (campaign) {
        await updateCampaign(campaign.id, form);
        toast.success('Campaign updated successfully');
      } else {
        await createCampaign(form);
        toast.success('Campaign created successfully');
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
    setForm(campaign ? {
      name: campaign.name,
      description: campaign.description || '',
      channel: campaign.channel,
      status: campaign.status,
      budget: campaign.budget || 0,
      target_audience: campaign.target_audience || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      created_by: campaign.created_by,
    } : { ...defaultForm });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{campaign ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
          <DialogDescription>
            {campaign ? 'Update the campaign details below.' : 'Enter the campaign details below.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Summer Sale 2025" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="channel">Channel *</Label>
              <Select value={form.channel} onValueChange={(v: CampaignChannel) => set('channel', v)}>
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v: CampaignStatus) => set('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="budget">Budget ($)</Label>
              <Input id="budget" type="number" min={0} value={form.budget} onChange={(e) => set('budget', Number(e.target.value))} placeholder="5000" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Input id="target_audience" value={form.target_audience} onChange={(e) => set('target_audience', e.target.value)} placeholder="Small business owners" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input id="start_date" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="end_date">End Date *</Label>
              <Input id="end_date" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Campaign description..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : campaign ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
