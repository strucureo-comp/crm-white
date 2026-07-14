'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { User, Bell, Shield, Palette, Key, Users, Loader2, Save, Copy, Check, Building2 } from 'lucide-react';
import { ThemeSwitcher } from '@/components/dashboard/theme-switcher';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase/config';

import type { CompanySettings } from '@/lib/pdf-engine/types';
import { clearSettingsCache } from '@/lib/pdf-engine/helpers';
import { toast } from 'sonner';

interface NotificationPrefs {
  email_notifications: boolean;
  push_notifications: boolean;
  slack_integration: boolean;
  weekly_digest: boolean;
  mention_alerts: boolean;
}

interface TeamSettings {
  default_role: string;
  allow_invitations: boolean;
}

interface AppSettings {
  sidebar_collapsed: boolean;
  theme: string;
}

interface ApiKey {
  key: string;
  name: string;
  created_at: string;
}

const defaultNotifications: NotificationPrefs = {
  email_notifications: true,
  push_notifications: true,
  slack_integration: false,
  weekly_digest: true,
  mention_alerts: true,
};

const defaultTeam: TeamSettings = {
  default_role: 'Member',
  allow_invitations: true,
};

const defaultAppearance: AppSettings = {
  sidebar_collapsed: false,
  theme: 'system',
};

const defaultBranding: CompanySettings = {
  company_name: '',
  legal_name: '',
  tagline: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo_url: '',
  footer_logo_url: '',
  gst_number: '',
  pan_number: '',
  registration_number: '',
  bank_name: '',
  bank_account: '',
  bank_ifsc: '',
  bank_swift: '',
  upi_id: '',
  qr_code_url: '',
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
  accent_color: '#f59e0b',
  default_currency: 'USD',
  currency_symbol: '$',
  date_format: 'MM/dd/yyyy',
  timezone: 'UTC',
  tax_cgst: 0,
  tax_sgst: 0,
  tax_igst: 0,
  tax_vat: 0,
  tax_tin: '',
  default_terms: '',
  default_notes: '',
  footer_text: '',
  watermark: '',
  invoice_prefix: 'INV',
  quote_prefix: 'QTE',
  report_prefix: 'RPT',
  contract_prefix: 'CNT',
  purchase_order_prefix: 'PO',
  invoice_number_format: '{prefix}-{year}-{num}',
  quote_number_format: '{prefix}-{year}-{num}',
  template_style: 'modern',
  social_links: '',
  support_contact: '',
};

export default function SettingsPage() {
  const { user, resetPassword } = useAuth();
  const [saving, setSaving] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('Tagverse CRM');
  const [workspaceUrl, setWorkspaceUrl] = useState('tagverse-crm');
  const [defaultCurrency, setDefaultCurrency] = useState('USD ($)');
  const [timezone, setTimezone] = useState('America/New_York');
  const [notifications, setNotifications] = useState<NotificationPrefs>(defaultNotifications);
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(defaultTeam);
  const [appearance, setAppearance] = useState<AppSettings>(defaultAppearance);
  const [sessionTimeout, setSessionTimeout] = useState('30 minutes');
  const [twoFactor, setTwoFactor] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [copiedKey, setCopiedKey] = useState('');
  const [branding, setBranding] = useState<CompanySettings>(defaultBranding);

  useEffect(() => {
    if (!user?.id) return;
    const loadSettings = async () => {
      try {
        const settingsRef = ref(database, `workspace/${user.id}/settings`);
        const snap = await get(settingsRef);
        if (snap.exists()) {
          const data = snap.val();
          if (data.workspace_name) setWorkspaceName(data.workspace_name);
          if (data.workspace_url) setWorkspaceUrl(data.workspace_url);
          if (data.default_currency) setDefaultCurrency(data.default_currency);
          if (data.timezone) setTimezone(data.timezone);
          if (data.notifications) setNotifications({ ...defaultNotifications, ...data.notifications });
          if (data.team) setTeamSettings({ ...defaultTeam, ...data.team });
          if (data.appearance) setAppearance({ ...defaultAppearance, ...data.appearance });
          if (data.session_timeout) setSessionTimeout(data.session_timeout);
          if (typeof data.two_factor === 'boolean') setTwoFactor(data.two_factor);
          if (data.api_keys) setApiKeys(data.api_keys);
        }
      } catch {
        console.warn('Could not load settings');
      }
      try {
        const brandingRef = ref(database, 'system_settings/company_branding');
        const brandingSnap = await get(brandingRef);
        if (brandingSnap.exists()) {
          setBranding((prev) => ({ ...prev, ...brandingSnap.val() }));
        }
      } catch {
        console.warn('Could not load branding');
      }
    };
    loadSettings();
  }, [user?.id]);

  const saveSettings = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await set(ref(database, `workspace/${user.id}/settings`), {
        workspace_name: workspaceName,
        workspace_url: workspaceUrl,
        default_currency: defaultCurrency,
        timezone,
        notifications,
        team: teamSettings,
        appearance,
        session_timeout: sessionTimeout,
        two_factor: twoFactor,
        api_keys: apiKeys,
        updated_at: new Date().toISOString(),
      });
      await set(ref(database, 'system_settings/company_branding'), {
        ...branding,
        updated_at: new Date().toISOString(),
      });
      clearSettingsCache();
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  function toggleNotification(key: keyof NotificationPrefs) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function generateApiKey() {
    const key = `tv_${Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')}`;
    const newKey: ApiKey = {
      key,
      name: `API Key ${apiKeys.length + 1}`,
      created_at: new Date().toISOString(),
    };
    setApiKeys((prev) => [...prev, newKey]);
    saveSettings();
    toast.success('API key generated');
  }

  function copyToClipboard(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your workspace settings</p>
        </div>
        <Button onClick={() => saveSettings()} disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
          <Save size={16} className="mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general">
        <div className="overflow-x-auto pb-1">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2"><User size={14} />General</TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2"><Bell size={14} />Notifications</TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2"><Shield size={14} />Security</TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2"><Palette size={14} />Appearance</TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2"><Building2 size={14} />Branding</TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2"><Users size={14} />Team</TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2"><Key size={14} />API</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={saveSettings}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Workspace Name</Label>
                    <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Workspace URL</Label>
                    <Input value={workspaceUrl} onChange={(e) => setWorkspaceUrl(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Default Currency</Label>
                    <Input value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notification Preferences</CardTitle>
                <Button variant="outline" size="sm" onClick={() => saveSettings()}>Save</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'email_notifications' as const, label: 'Email Notifications', desc: 'Receive email updates' },
                { key: 'push_notifications' as const, label: 'Push Notifications', desc: 'Receive push notifications' },
                { key: 'slack_integration' as const, label: 'Slack Integration', desc: 'Send notifications to Slack' },
                { key: 'weekly_digest' as const, label: 'Weekly Digest', desc: 'Receive weekly summary' },
                { key: 'mention_alerts' as const, label: 'Mention Alerts', desc: 'Notify when you\'re mentioned' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={notifications[item.key]} onCheckedChange={() => toggleNotification(item.key)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Two-Factor Authentication</Label>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Session Timeout</Label>
                <Input value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Password</Label>
                <Button variant="outline" onClick={async () => { if (user?.email) { const r = await resetPassword(user.email); if (r.success) toast.success('Password reset email sent'); else toast.error('Failed to send reset email'); } }}>Change Password</Button>
                <p className="text-xs text-muted-foreground mt-1">A reset link will be sent to your email</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Appearance</CardTitle>
                <Button variant="outline" size="sm" onClick={() => saveSettings()}>Save</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
                </div>
                <ThemeSwitcher />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Sidebar Collapsed</Label>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Keep sidebar collapsed by default</p>
                  <Switch checked={appearance.sidebar_collapsed} onCheckedChange={(v) => setAppearance((prev) => ({ ...prev, sidebar_collapsed: v }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Company Branding</CardTitle>
                <Button variant="outline" size="sm" onClick={() => saveSettings()}>Save</Button>
              </div>
              <p className="text-sm text-muted-foreground">These details appear on all PDF documents</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Company Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Company Name</Label><Input value={branding.company_name} onChange={(e) => setBranding((p) => ({ ...p, company_name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Legal Name</Label><Input value={branding.legal_name} onChange={(e) => setBranding((p) => ({ ...p, legal_name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Tagline</Label><Input value={branding.tagline} onChange={(e) => setBranding((p) => ({ ...p, tagline: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Website</Label><Input value={branding.website} onChange={(e) => setBranding((p) => ({ ...p, website: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={branding.email} onChange={(e) => setBranding((p) => ({ ...p, email: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={branding.phone} onChange={(e) => setBranding((p) => ({ ...p, phone: e.target.value }))} /></div>
                  <div className="space-y-2 col-span-2"><Label>Address</Label><Input value={branding.address} onChange={(e) => setBranding((p) => ({ ...p, address: e.target.value }))} /></div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Logo</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Logo URL</Label><Input value={branding.logo_url} onChange={(e) => setBranding((p) => ({ ...p, logo_url: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Footer Logo URL</Label><Input value={branding.footer_logo_url} onChange={(e) => setBranding((p) => ({ ...p, footer_logo_url: e.target.value }))} /></div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Color Scheme</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Primary Color</Label><div className="flex gap-2"><Input value={branding.primary_color} onChange={(e) => setBranding((p) => ({ ...p, primary_color: e.target.value }))} /><input type="color" value={branding.primary_color} onChange={(e) => setBranding((p) => ({ ...p, primary_color: e.target.value }))} className="w-9 h-9 rounded border cursor-pointer" /></div></div>
                  <div className="space-y-2"><Label>Secondary Color</Label><div className="flex gap-2"><Input value={branding.secondary_color} onChange={(e) => setBranding((p) => ({ ...p, secondary_color: e.target.value }))} /><input type="color" value={branding.secondary_color} onChange={(e) => setBranding((p) => ({ ...p, secondary_color: e.target.value }))} className="w-9 h-9 rounded border cursor-pointer" /></div></div>
                  <div className="space-y-2"><Label>Accent Color</Label><div className="flex gap-2"><Input value={branding.accent_color} onChange={(e) => setBranding((p) => ({ ...p, accent_color: e.target.value }))} /><input type="color" value={branding.accent_color} onChange={(e) => setBranding((p) => ({ ...p, accent_color: e.target.value }))} className="w-9 h-9 rounded border cursor-pointer" /></div></div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Tax Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>GST Number</Label><Input value={branding.gst_number} onChange={(e) => setBranding((p) => ({ ...p, gst_number: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>PAN Number</Label><Input value={branding.pan_number} onChange={(e) => setBranding((p) => ({ ...p, pan_number: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Registration No.</Label><Input value={branding.registration_number} onChange={(e) => setBranding((p) => ({ ...p, registration_number: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>CGST (%)</Label><Input type="number" value={branding.tax_cgst} onChange={(e) => setBranding((p) => ({ ...p, tax_cgst: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>SGST (%)</Label><Input type="number" value={branding.tax_sgst} onChange={(e) => setBranding((p) => ({ ...p, tax_sgst: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>IGST (%)</Label><Input type="number" value={branding.tax_igst} onChange={(e) => setBranding((p) => ({ ...p, tax_igst: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>VAT (%)</Label><Input type="number" value={branding.tax_vat} onChange={(e) => setBranding((p) => ({ ...p, tax_vat: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>TIN</Label><Input value={branding.tax_tin} onChange={(e) => setBranding((p) => ({ ...p, tax_tin: e.target.value }))} /></div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Bank Name</Label><Input value={branding.bank_name} onChange={(e) => setBranding((p) => ({ ...p, bank_name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Account Number</Label><Input value={branding.bank_account} onChange={(e) => setBranding((p) => ({ ...p, bank_account: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>IFSC Code</Label><Input value={branding.bank_ifsc} onChange={(e) => setBranding((p) => ({ ...p, bank_ifsc: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>SWIFT Code</Label><Input value={branding.bank_swift} onChange={(e) => setBranding((p) => ({ ...p, bank_swift: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>UPI ID</Label><Input value={branding.upi_id} onChange={(e) => setBranding((p) => ({ ...p, upi_id: e.target.value }))} /></div>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Document Settings</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Quote Prefix</Label><Input value={branding.quote_prefix} onChange={(e) => setBranding((p) => ({ ...p, quote_prefix: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Invoice Prefix</Label><Input value={branding.invoice_prefix} onChange={(e) => setBranding((p) => ({ ...p, invoice_prefix: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Contract Prefix</Label><Input value={branding.contract_prefix} onChange={(e) => setBranding((p) => ({ ...p, contract_prefix: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Report Prefix</Label><Input value={branding.report_prefix} onChange={(e) => setBranding((p) => ({ ...p, report_prefix: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Currency</Label><Input value={branding.default_currency} onChange={(e) => setBranding((p) => ({ ...p, default_currency: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Currency Symbol</Label><Input value={branding.currency_symbol} onChange={(e) => setBranding((p) => ({ ...p, currency_symbol: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2"><Label>Date Format</Label><Input value={branding.date_format} onChange={(e) => setBranding((p) => ({ ...p, date_format: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Footer Text</Label><Input value={branding.footer_text} onChange={(e) => setBranding((p) => ({ ...p, footer_text: e.target.value }))} /></div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Default Notes (appears on all documents)</Label>
                  <textarea className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm" value={branding.default_notes} onChange={(e) => setBranding((p) => ({ ...p, default_notes: e.target.value }))} />
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Default Terms & Conditions</Label>
                  <textarea className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm" value={branding.default_terms} onChange={(e) => setBranding((p) => ({ ...p, default_terms: e.target.value }))} />
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-3">Template Style</h4>
                <div className="flex gap-3">
                  {(['modern', 'corporate', 'minimal'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      className={`flex-1 p-3 rounded-lg border text-center text-sm font-medium transition-all ${branding.template_style === style ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-muted-foreground/30'}`}
                      onClick={() => setBranding((p) => ({ ...p, template_style: style }))}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Team Management</CardTitle>
                <Button variant="outline" size="sm" onClick={() => saveSettings()}>Save</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Role for New Members</Label>
                <Input value={teamSettings.default_role} onChange={(e) => setTeamSettings((prev) => ({ ...prev, default_role: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Allow Invitations</Label>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Let members invite new users</p>
                  <Switch checked={teamSettings.allow_invitations} onCheckedChange={(v) => setTeamSettings((prev) => ({ ...prev, allow_invitations: v }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">API Keys</CardTitle>
                <Button onClick={generateApiKey}>
                  <Key size={16} className="mr-2" />
                  Generate New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Manage your API keys for integrations</p>
              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No API keys generated yet.</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((k, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono truncate">{k.key}</p>
                        <p className="text-xs text-muted-foreground">{k.name} · Created {new Date(k.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(k.key)}>
                        {copiedKey === k.key ? <Check size={14} /> : <Copy size={14} />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
