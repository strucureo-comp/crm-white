'use client';

import React, { useState } from 'react';
import { 
  Search, Plus, FileText, CheckCircle, Clock, AlertTriangle, Shield, 
  Briefcase, Building2, UserPlus, X, PenTool, Trash2, MoreHorizontal, FileSignature, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

// --- Data Schemas ---
interface Contract {
  id: string; 
  template: string;
  client: string; 
  valuePerYear: number;
  currency: string; 
  start: string;
  end: string;
  progress: number; 
  status: 'Active' | 'Pending Signature' | 'Expiring' | 'Terminated';
  [key: string]: any; 
}

const MOCK_CONTRACTS: Contract[] = [
  { id: 'CTR-982XF4', template: 'Service Agreement', client: 'Acme Corp', valuePerYear: 120000, currency: 'USD', start: '2026-01-01', end: '2026-12-31', progress: 45, status: 'Active' },
  { id: 'CTR-45B1X9', template: 'NDA', client: 'Stark Industries', valuePerYear: 0, currency: 'USD', start: '2026-07-15', end: '2027-07-15', progress: 10, status: 'Active' },
  { id: 'CTR-88Y6R2', template: 'Vendor Agreement', client: 'Globex Inc', valuePerYear: 450000, currency: 'EUR', start: '2025-08-01', end: '2026-08-01', progress: 95, status: 'Expiring' },
  { id: 'CTR-29V7M1', template: 'Partnership Agreement', client: 'Wayne Enterprises', valuePerYear: 250000, currency: 'USD', start: '2026-08-01', end: '2028-08-01', progress: 0, status: 'Pending Signature' },
  { id: 'CTR-11P5K3', template: 'Subscription Agreement', client: 'Initech', valuePerYear: 12000, currency: 'USD', start: '2024-05-01', end: '2025-05-01', progress: 100, status: 'Terminated' },
  { id: 'CTR-73F9L5', template: 'Service Agreement', client: 'Umbrella Corp', valuePerYear: 75000, currency: 'USD', start: '2025-09-01', end: '2026-09-01', progress: 85, status: 'Expiring' },
];

const TEMPLATES = [
  { id: 'service', name: 'Service Agreement', icon: Briefcase, desc: 'Standard master service agreement for consulting or B2B services.' },
  { id: 'nda', name: 'Mutual NDA', icon: Shield, desc: 'Non-disclosure agreement protecting both parties.' },
  { id: 'vendor', name: 'Vendor Agreement', icon: Building2, desc: 'Procurement contract for external suppliers.' },
  { id: 'employment', name: 'Employment Contract', icon: UserPlus, desc: 'Standard full-time employment agreement.' },
  { id: 'subscription', name: 'Subscription Agreement', icon: FileText, desc: 'SaaS recurring revenue contract.' },
];

export default function ProposalsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Dynamic Form State
  const [formClient, setFormClient] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formJurisdiction, setFormJurisdiction] = useState(''); // Example dynamic field

  const filteredContracts = MOCK_CONTRACTS.filter(c => {
    const matchesSearch = c.client.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number, cur: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(val);
  };

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedTemplate(null);
    setFormClient('');
    setFormValue('');
    setFormJurisdiction('');
    setIsWizardOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0 bg-background">
      
      {/* 2. Global Layout & Header */}
      <div className="p-6 pb-4 bg-card border-b border-border shrink-0">
        <div className="flex flex-col gap-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl text-foreground tracking-tight mb-1" style={{ fontWeight: 800 }}>Contracts</h1>
              <p className="text-sm text-muted-foreground font-medium">Active agreements, renewal pipeline, and ARR tracking.</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md font-bold px-6" onClick={() => setIsWizardOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Contract
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-sm rounded-xl">
              <CardContent className="p-5 flex flex-col gap-2">
                <span className="text-sm font-black uppercase text-muted-foreground tracking-wider">Active Contracts</span>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-foreground tracking-tighter">142</span>
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center"><CheckCircle className="w-4 h-4" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm rounded-xl">
              <CardContent className="p-5 flex flex-col gap-2">
                <span className="text-sm font-black uppercase text-muted-foreground tracking-wider">Expiring in 30d</span>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-foreground tracking-tighter">18</span>
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center"><AlertTriangle className="w-4 h-4" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm rounded-xl">
              <CardContent className="p-5 flex flex-col gap-2">
                <span className="text-sm font-black uppercase text-muted-foreground tracking-wider">Awaiting Signature</span>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-foreground tracking-tighter">24</span>
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm rounded-xl">
              <CardContent className="p-5 flex flex-col gap-2">
                <span className="text-sm font-black uppercase text-muted-foreground tracking-wider">Total ARR</span>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black text-foreground tracking-tighter">$4.2M</span>
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center"><Briefcase className="w-4 h-4" /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search contracts…" 
                className="pl-9 h-10 bg-background border-border rounded-xl font-medium focus-visible:ring-ring"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-10 bg-background border-border rounded-xl font-bold text-sm shadow-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending Signature">Pending Signature</SelectItem>
                <SelectItem value="Expiring">Expiring</SelectItem>
                <SelectItem value="Terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
        {/* 3. Data Table */}
        <Card className="border-border shadow-sm rounded-xl overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Contract (ID)</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Counterparty</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Value / yr</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Start / End</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground w-48">Progress</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredContracts.map(row => (
                  <tr key={row.id} className="hover:bg-muted/50 transition-colors group">
                    <td className="p-4 text-sm font-bold text-foreground font-mono">{row.id.substring(0, 8)}</td>
                    <td className="p-4 font-bold text-foreground">{row.client}</td>
                    <td className="p-4 text-sm font-medium text-muted-foreground">{row.template}</td>
                    <td className="p-4 text-sm font-black text-foreground text-right">{formatCurrency(row.valuePerYear, row.currency)}</td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">{row.start}</p>
                      <p className="text-xs text-muted-foreground">{row.end}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-foreground w-10 text-right">{row.progress}%</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${row.progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 ${
                        row.status === 'Active' ? 'bg-background text-foreground' : 
                        row.status === 'Pending Signature' ? 'bg-background text-foreground' : 
                        row.status === 'Expiring' ? 'bg-background text-foreground' :
                        'bg-background text-muted-foreground'
                      }`}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"><FileText className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"><PenTool className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 4. Multi-Step Contract Wizard Modal */}
      <Dialog open={isWizardOpen} onOpenChange={(open) => { if(!open) resetWizard() }}>
        <DialogContent className="max-w-[1400px] h-[95vh] p-0 border-0 shadow-2xl rounded-[1.5rem] overflow-hidden flex bg-background backdrop-blur-3xl">
          
          {/* Left Sidebar */}
          <div className="w-64 bg-card border-r border-border shrink-0 flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-black text-foreground tracking-tight">Contract Wizard</h2>
            </div>
            <div className="flex-1 p-6 space-y-4">
              {[
                { step: 1, label: 'Choose Template' },
                { step: 2, label: 'Contract Details' },
                { step: 3, label: 'Review & Finish' }
              ].map(s => (
                <div key={s.step} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${wizardStep === s.step ? 'bg-primary/10 text-primary font-bold' : wizardStep > s.step ? 'text-foreground font-bold' : 'text-muted-foreground font-medium'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${wizardStep === s.step ? 'bg-primary text-primary-foreground' : wizardStep > s.step ? 'bg-primary/80 text-white' : 'bg-muted'}`}>
                    {wizardStep > s.step ? <Check className="w-3 h-3" /> : s.step}
                  </div>
                  {s.label}
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-border">
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground hover:bg-muted font-bold" onClick={resetWizard}>Cancel Draft</Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-foreground">
                {wizardStep === 1 ? 'Step 1: Select a Template' : wizardStep === 2 ? 'Step 2: Define Parameters' : 'Step 3: Final Review'}
              </h3>
              <div className="flex gap-2">
                {wizardStep > 1 && <Button variant="outline" className="font-bold border-border" onClick={() => setWizardStep(prev => prev - 1)}>Back</Button>}
                {wizardStep < 3 ? (
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" onClick={() => setWizardStep(prev => prev + 1)} disabled={wizardStep === 1 && !selectedTemplate}>Continue</Button>
                ) : (
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md" onClick={resetWizard}><FileSignature className="w-4 h-4 mr-2" /> Generate Contract</Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {wizardStep === 1 && (
                <div className="p-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                  {TEMPLATES.map(t => (
                    <Card key={t.id} className={`cursor-pointer transition-all duration-200 border-2 ${selectedTemplate === t.id ? 'border-primary bg-primary/5 shadow-md ring-4 ring-primary/20' : 'border-border hover:border-primary/50 bg-card shadow-sm'}`} onClick={() => setSelectedTemplate(t.id)}>
                      <CardContent className="p-6 flex flex-col gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedTemplate === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <t.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-foreground">{t.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="flex h-full animate-in fade-in slide-in-from-right-8 duration-500">
                  {/* Form Left */}
                  <div className="w-1/2 p-8 overflow-y-auto border-r border-border bg-card">
                    <h4 className="text-xl font-black text-foreground mb-6">Contract Variables</h4>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Counterparty Name</label>
                        <Input className="h-11 bg-background border-border font-medium" placeholder="e.g. Acme Corp" value={formClient} onChange={e => setFormClient(e.target.value)} />
                      </div>
                      
                      {selectedTemplate === 'service' && (
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Total Contract Value ($)</label>
                          <Input type="number" className="h-11 bg-background border-border font-medium" placeholder="120000" value={formValue} onChange={e => setFormValue(e.target.value)} />
                        </div>
                      )}

                      {selectedTemplate === 'nda' && (
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase text-muted-foreground tracking-wider">Jurisdiction (State)</label>
                          <Select value={formJurisdiction} onValueChange={setFormJurisdiction}>
                            <SelectTrigger className="h-11 bg-background border-border font-medium"><SelectValue placeholder="Select state..." /></SelectTrigger>
                            <SelectContent><SelectItem value="Delaware">Delaware</SelectItem><SelectItem value="California">California</SelectItem><SelectItem value="New York">New York</SelectItem></SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Preview Right */}
                  <div className="w-1/2 bg-muted p-8 overflow-y-auto flex justify-center">
                    <div className="w-full max-w-[800px] bg-card shadow-2xl min-h-[1100px] p-12 flex flex-col gap-6 text-sm">
                      <div className="flex justify-between items-start border-b-2 border-foreground pb-6">
                        <div className="w-16 h-16 bg-foreground rounded-lg flex items-center justify-center"><Building2 className="w-8 h-8 text-background" /></div>
                        <div className="text-right">
                          <p className="font-mono text-muted-foreground font-bold mb-1">ID: CTR-{Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
                          <p className="font-bold text-foreground">{new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

                      <h1 className="text-3xl font-black text-foreground mt-4 text-center underline uppercase">
                        {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                      </h1>

                      <p className="leading-relaxed mt-6 text-foreground">
                        This {TEMPLATES.find(t => t.id === selectedTemplate)?.name} (the "Agreement") is entered into as of {new Date().toLocaleDateString()} (the "Effective Date") by and between our company and <span className="bg-muted font-bold px-1">{formClient || '[COUNTERPARTY NAME]'}</span>.
                      </p>

                      {selectedTemplate === 'service' && (
                        <div className="space-y-4">
                          <h3 className="font-bold text-lg text-foreground">1. Payment Terms</h3>
                          <p className="leading-relaxed text-foreground">Client agrees to pay the total sum of <span className="bg-muted font-bold px-1">${formValue || '[VALUE]'}</span> for the services rendered over the duration of this agreement.</p>
                        </div>
                      )}

                      {selectedTemplate === 'nda' && (
                        <div className="space-y-4">
                          <h3 className="font-bold text-lg text-foreground">1. Governing Law</h3>
                          <p className="leading-relaxed text-foreground">This Agreement shall be governed by and construed in accordance with the laws of the State of <span className="bg-muted font-bold px-1">{formJurisdiction || '[JURISDICTION]'}</span>, without regard to its conflict of law principles.</p>
                        </div>
                      )}

                      <div className="mt-auto pt-12 flex justify-between gap-12">
                        <div className="flex-1 border-t-2 border-border pt-2"><p className="font-bold text-muted-foreground uppercase text-xs tracking-widest">Our Company Signature</p></div>
                        <div className="flex-1 border-t-2 border-border pt-2"><p className="font-bold text-muted-foreground uppercase text-xs tracking-widest">{formClient || '[Counterparty]'} Signature</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="p-8 max-w-3xl mx-auto animate-in fade-in duration-500">
                  <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-muted text-foreground rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-10 h-10" /></div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">Review & Generate</h2>
                    <p className="text-muted-foreground font-medium mt-2">Verify the details before finalizing the document.</p>
                  </div>
                  
                  <Card className="border-border shadow-sm rounded-xl overflow-hidden">
                    <div className="divide-y divide-border">
                      <div className="p-4 flex justify-between"><span className="text-muted-foreground font-bold">Template</span><span className="font-black text-foreground">{TEMPLATES.find(t => t.id === selectedTemplate)?.name}</span></div>
                      <div className="p-4 flex justify-between"><span className="text-muted-foreground font-bold">Counterparty</span><span className="font-black text-foreground">{formClient || '-'}</span></div>
                      {selectedTemplate === 'service' && <div className="p-4 flex justify-between"><span className="text-muted-foreground font-bold">Contract Value</span><span className="font-black text-foreground">${formValue || '0'}</span></div>}
                      {selectedTemplate === 'nda' && <div className="p-4 flex justify-between"><span className="text-muted-foreground font-bold">Jurisdiction</span><span className="font-black text-foreground">{formJurisdiction || '-'}</span></div>}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
