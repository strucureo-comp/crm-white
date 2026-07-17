'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Package,
  X,
  Calendar,
  User,
  MapPin,
  Phone,
  Loader2,
} from 'lucide-react';
import { getDeliveries, createDelivery, updateDelivery, deleteDelivery } from '@/lib/firebase/database';
import type { Delivery, DeliveryItem, DeliveryStage } from '@/lib/db/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const stageLabels: Record<DeliveryStage, string> = {
  pending: 'Pending',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  returned: 'Returned',
  issue: 'Issue',
};

const stageColors: Record<DeliveryStage, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  out_for_delivery: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  delivered: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  returned: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  issue: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
};

const stages: DeliveryStage[] = ['pending', 'out_for_delivery', 'delivered', 'returned', 'issue'];

const defaultItem: DeliveryItem = { id: '', name: '', quantity: 1, description: '' };

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  async function load() {
    setLoading(true);
    try {
      const data = await getDeliveries();
      setDeliveries(data);
    } catch {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const grouped = stages.reduce((acc, stage) => {
    acc[stage] = deliveries.filter((d) => d.stage === stage);
    return acc;
  }, {} as Record<DeliveryStage, Delivery[]>);

  async function handleStageChange(delivery: Delivery, newStage: DeliveryStage) {
    try {
      await updateDelivery(delivery.id, { stage: newStage });
      toast.success(`Moved to ${stageLabels[newStage]}`);
      load();
    } catch {
      toast.error('Failed to update stage');
    }
  }

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteDelivery(confirmState.id);
      toast.success('Delivery deleted');
      load();
    } catch {
      toast.error('Failed to delete delivery');
    } finally {
      setConfirmState({ open: false, loading: false });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Deliveries</h2>
          <p className="text-sm text-muted-foreground">Track and manage client deliveries</p>
        </div>
        <Button onClick={() => { setEditingDelivery(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          New Delivery
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const items = grouped[stage];
          return (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold">{stageLabels[stage]}</h3>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-3 min-h-[200px]">
                {items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-xs text-muted-foreground">No deliveries</p>
                  </div>
                ) : (
                  items.map((delivery) => (
                    <Card
                      key={delivery.id}
                      className="cursor-pointer hover:shadow-sm transition-shadow"
                      onClick={() => { setEditingDelivery(delivery); setDialogOpen(true); }}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate">{delivery.client_name}</p>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 shrink-0 ${stageColors[delivery.stage]}`}>
                            {stageLabels[delivery.stage]}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Package size={12} />
                          <span>{delivery.items.length} item{delivery.items.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar size={12} />
                          <span>{delivery.scheduled_date ? new Date(delivery.scheduled_date).toLocaleDateString() : 'No date'}</span>
                        </div>

                        {delivery.assigned_agent && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User size={12} />
                            <span className="truncate">{delivery.assigned_agent}</span>
                          </div>
                        )}

                        <div className="pt-2">
                          <Select
                            value={delivery.stage}
                            onValueChange={(v: DeliveryStage) => handleStageChange(delivery, v)}
                            onOpenChange={(open) => { if (open) event?.stopPropagation(); }}
                          >
                            <SelectTrigger className="h-7 text-xs border-0 bg-muted/50" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((s) => (
                                <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DeliveryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        delivery={editingDelivery}
      />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Delivery"
        description="Are you sure you want to delete this delivery? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}

function DeliveryDialog({
  open,
  onOpenChange,
  onSaved,
  delivery,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  delivery?: Delivery | null;
}) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [stage, setStage] = useState<DeliveryStage>('pending');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedAgent, setAssignedAgent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (delivery) {
      setClientName(delivery.client_name);
      setClientPhone(delivery.client_phone || '');
      setClientAddress(delivery.client_address || '');
      setItems(delivery.items.map((i) => ({ ...i })));
      setStage(delivery.stage);
      setScheduledDate(delivery.scheduled_date ? delivery.scheduled_date.split('T')[0] : '');
      setNotes(delivery.notes || '');
      setAssignedAgent(delivery.assigned_agent || '');
    } else {
      setClientName('');
      setClientPhone('');
      setClientAddress('');
      setItems([{ ...defaultItem, id: crypto.randomUUID() }]);
      setStage('pending');
      setScheduledDate('');
      setNotes('');
      setAssignedAgent('');
    }
  }, [delivery]);

  function addItem() {
    setItems([...items, { ...defaultItem, id: crypto.randomUUID() }]);
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  function updateItem(id: string, field: keyof DeliveryItem, value: string | number) {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    const validItems = items.filter((i) => i.name.trim());
    if (validItems.length === 0) {
      toast.error('At least one item with a name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || undefined,
        client_address: clientAddress.trim() || undefined,
        items: validItems.map((i) => ({
          ...i,
          name: i.name.trim(),
          quantity: Number(i.quantity) || 1,
          description: i.description?.trim() || undefined,
        })),
        stage,
        scheduled_date: scheduledDate || undefined,
        notes: notes.trim() || undefined,
        assigned_agent: assignedAgent.trim() || undefined,
        created_by: 'user',
      };

      if (delivery) {
        await updateDelivery(delivery.id, payload);
        toast.success('Delivery updated');
      } else {
        await createDelivery(payload);
        toast.success('Delivery created');
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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{delivery ? 'Edit Delivery' : 'New Delivery'}</DialogTitle>
          <DialogDescription>
            {delivery ? 'Update the delivery details.' : 'Enter the delivery details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="client_name">Client Name *</Label>
                <Input id="client_name" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="client_phone">Phone</Label>
                <Input id="client_phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+1 555-0123" />
              </div>
              <div>
                <Label htmlFor="assigned_agent">Assigned Agent</Label>
                <Input id="assigned_agent" value={assignedAgent} onChange={(e) => setAssignedAgent(e.target.value)} placeholder="Alice" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="client_address">Address</Label>
                <Input id="client_address" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="123 Main St, City" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Input id="scheduled_date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="stage">Stage</Label>
                <Select value={stage} onValueChange={(v: DeliveryStage) => setStage(v)}>
                  <SelectTrigger id="stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus size={14} className="mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-2 p-3 border rounded-md">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder="Item name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 mt-5"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : delivery ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
