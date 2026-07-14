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
import { createAutomationRule, updateAutomationRule } from '@/lib/firebase/database';
import type { AutomationRule } from '@/lib/db/types';

interface AutomationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  rule?: AutomationRule | null;
}

const defaultForm = {
  trigger: '',
  action: '',
  status: 'Active',
};

export function AutomationRuleDialog({ open, onOpenChange, onSaved, rule }: AutomationRuleDialogProps) {
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rule) {
      setForm({
        trigger: rule.trigger,
        action: rule.action,
        status: rule.status,
      });
    } else {
      setForm({ ...defaultForm });
    }
  }, [rule]);

  function set<K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.trigger.trim() || !form.action.trim()) {
      toast.error('Trigger and action are required');
      return;
    }
    setSaving(true);
    try {
      if (rule) {
        await updateAutomationRule(rule.id, form);
        toast.success('Rule updated');
      } else {
        await createAutomationRule(form);
        toast.success('Rule created');
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Automation Rule' : 'Add Automation Rule'}</DialogTitle>
          <DialogDescription>
            {rule ? 'Update the rule details.' : 'Enter the rule details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="trigger">Trigger *</Label>
              <Input id="trigger" value={form.trigger} onChange={(e) => set('trigger', e.target.value)} placeholder="Lead Created" />
            </div>
            <div>
              <Label htmlFor="action">Action *</Label>
              <Input id="action" value={form.action} onChange={(e) => set('action', e.target.value)} placeholder="Send Slack notification" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : rule ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
