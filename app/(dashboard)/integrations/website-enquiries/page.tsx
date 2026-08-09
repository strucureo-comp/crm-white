'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  Shield,
  Webhook as WebhookIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { getConnectedApps, connectApp } from '@/lib/db/automation/api';

export default function WebsiteEnquiriesPage() {
  const { workspace, user } = useAuth();
  const workspaceId = workspace?.id || '';
  const companyId = workspace?.id || '';

  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      try {
        const apps = await getConnectedApps(workspaceId);
        const whApp = apps.find((a) => a.platform === 'website_enquiries');
        setApp(whApp || null);
        if (whApp?.api_key) setApiKey(whApp.api_key);
      } catch (e) {
        toast.error('Failed to load integration data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId]);

  const handleEnable = async () => {
    setConnecting(true);
    try {
      // Generate a simple API key for webhook authentication
      const generatedKey = `whk_${workspaceId.slice(0, 8)}_${Date.now().toString(36)}`;
      await connectApp(workspaceId, {
        id: 'website-enquiries',
        platform: 'website_enquiries',
        name: 'Website Enquiries',
        status: 'connected',
        config: {
          endpoint: '/api/enquiries',
          protocol: 'HTTPS',
          authType: 'api_key',
        },
        api_key: generatedKey,
      });
      setApiKey(generatedKey);
      setApp({ status: 'connected' });
    } catch (e) {
      toast.error('Failed to enable webhook');
    } finally {
      setConnecting(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/enquiries`
    : '/api/enquiries';

  const sampleCurl = `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "workspace_id": "${companyId}",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91 98765 43210",
    "subject": "Product Inquiry",
    "message": "I would like to know more about your services."
  }'`;

  const sampleHtml = `<form action="${webhookUrl}" method="POST">
  <input type="hidden" name="workspace_id" value="${companyId}" />
  <input name="name" placeholder="Your Name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" placeholder="Phone (optional)" />
  <input name="subject" placeholder="Subject" />
  <textarea name="message" placeholder="Your Message" required></textarea>
  <button type="submit">Send Enquiry</button>
</form>`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/integrations">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center">
              <Globe size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Website Enquiries</h1>
              <p className="text-muted-foreground">HTTPS Webhook for Website Form Submissions</p>
            </div>
          </div>
        </div>
        {app ? (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle size={12} className="mr-1" />
            Active
          </Badge>
        ) : (
          <Badge variant="outline">
            <XCircle size={12} className="mr-1" />
            Inactive
          </Badge>
        )}
      </div>

      <Tabs defaultValue={app ? 'setup' : 'enable'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="enable">Setup</TabsTrigger>
          <TabsTrigger value="setup">Integration</TabsTrigger>
          <TabsTrigger value="code">Code Examples</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        {/* Enable Tab */}
        <TabsContent value="enable" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enable Website Enquiries Webhook</CardTitle>
              <CardDescription>
                Activate the HTTPS endpoint that receives website form submissions and creates CRM leads automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {app ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Webhook Active</p>
                    <p className="text-sm text-muted-foreground">
                      Your website enquiries endpoint is live and ready to receive submissions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">What this enables:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• HTTPS POST endpoint at <code className="bg-background px-1 rounded">/api/enquiries</code></li>
                      <li>• Automatic input validation and sanitization</li>
                      <li>• CRM lead creation from form submissions</li>
                      <li>• Support for name, email, phone, subject, and message fields</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleEnable}
                    disabled={connecting}
                    className="bg-[#1e1a4f] hover:bg-[#2d2770] text-white dark:bg-purple-600 dark:hover:bg-purple-700"
                  >
                    {connecting ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Globe size={16} className="mr-2" />
                    )}
                    {connecting ? 'Enabling...' : 'Enable Webhook'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoint</CardTitle>
              <CardDescription>
                Configure your website forms to POST data to this endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint URL (HTTPS)</label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(webhookUrl)}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Request Format</label>
                <div className="p-3 bg-muted rounded-lg font-mono text-xs">
                  <p className="text-muted-foreground">POST /api/enquiries</p>
                  <p className="text-muted-foreground">Content-Type: application/json</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Accepted Fields</label>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Field</th>
                        <th className="text-left py-2 font-medium">Type</th>
                        <th className="text-left py-2 font-medium">Required</th>
                        <th className="text-left py-2 font-medium">Max Length</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-1.5 font-mono">workspace_id</td><td>string</td><td>Yes</td><td>—</td></tr>
                      <tr className="border-b"><td className="py-1.5 font-mono">name</td><td>string</td><td>Yes</td><td>100</td></tr>
                      <tr className="border-b"><td className="py-1.5 font-mono">email</td><td>string</td><td>Yes</td><td>254</td></tr>
                      <tr className="border-b"><td className="py-1.5 font-mono">phone</td><td>string</td><td>No</td><td>30</td></tr>
                      <tr className="border-b"><td className="py-1.5 font-mono">subject</td><td>string</td><td>No</td><td>200</td></tr>
                      <tr><td className="py-1.5 font-mono">message</td><td>string</td><td>Yes</td><td>5000</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={14} className="text-blue-600" />
                  <p className="font-medium text-blue-800 dark:text-blue-400">Security</p>
                </div>
                <p className="text-blue-700 dark:text-blue-300">
                  All submissions are validated, sanitized, and served over HTTPS. 
                  Input is stripped of HTML tags and dangerous characters.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Examples Tab */}
        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>
                Copy these examples to integrate your website forms with the CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">cURL</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(sampleCurl)}
                  >
                    <Copy size={14} className="mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                  {sampleCurl}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">HTML Form</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(sampleHtml)}
                  >
                    <Copy size={14} className="mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                  {sampleHtml}
                </pre>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">JavaScript (fetch)</label>
                <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">{`async function submitEnquiry(data) {
  const res = await fetch('${webhookUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workspace_id: '${companyId}',
      ...data,
    }),
  });
  return res.json();
}

// Usage
submitEnquiry({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+91 98765 43210',
  subject: 'Product Inquiry',
  message: 'Tell me more about your services.',
});`}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Docs Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
              <CardDescription>
                How website enquiries flow into your CRM pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Website Form Submission</p>
                    <p className="text-sm text-muted-foreground">
                      User fills out a contact form on your website and submits it.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">HTTPS POST to CRM</p>
                    <p className="text-sm text-muted-foreground">
                      Form data is sent via HTTPS POST to the webhook endpoint with validation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Validation & Sanitization</p>
                    <p className="text-sm text-muted-foreground">
                      Input is validated (email format, field lengths) and sanitized (HTML stripped).
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">4</span>
                  </div>
                  <div>
                    <p className="font-medium">CRM Lead Created</p>
                    <p className="text-sm text-muted-foreground">
                      Enquiry is stored in Firebase and appears in your CRM pipeline as a new lead.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
