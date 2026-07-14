'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Globe, 
  Calendar, 
  DollarSign, 
  Building2, 
  FileText, 
  Shield,
  Check
} from 'lucide-react';
import type { 
  FinanceConfiguration, 
  TaxRegime, 
  AccountingStandard,
  DateFormat,
  CurrencyCode,
  FiscalYearConfig
} from '@/lib/finance-config';
import { 
  DEFAULT_CONFIG_INDIA, 
  DEFAULT_CONFIG_EU, 
  DEFAULT_CONFIG_US,
  GST_INDIA_RATES,
  VAT_EU_RATES,
  US_SALES_TAX_RATES
} from '@/lib/finance-config';
import { COA_DESCRIPTIONS, type COATemplate } from '@/lib/coa-templates';
import { toast } from 'sonner';

interface FinanceConfiguratorProps {
  currentConfig?: Partial<FinanceConfiguration>;
  onSave: (config: Partial<FinanceConfiguration>) => void;
}

export function FinanceConfigurator({ currentConfig, onSave }: FinanceConfiguratorProps) {
  const [config, setConfig] = useState<Partial<FinanceConfiguration>>(
    currentConfig || {
      company_name: '',
      company_id: '',
      accounting_standard: 'IFRS',
      date_format: 'ISO',
      fiscal_year: {
        start_month: 1,
        start_day: 1,
        label: '2024',
      },
      tax_config: {
        regime: 'NONE',
        rates: [],
        enable_tax_tracking: false,
        tax_id: '',
      },
      currency_config: {
        base_currency: 'USD',
        enable_multi_currency: false,
        exchange_rates: [],
      },
      enable_multi_entity: false,
      entities: [],
      enable_statutory_reports: false,
      statutory_reports: [],
      features: {
        enable_tax_tracking: false,
        enable_multi_currency: false,
        enable_multi_entity: false,
        enable_branch_accounting: false,
        enable_cost_centers: false,
        enable_budget_tracking: false,
      },
    }
  );

  const applyRegionalTemplate = (region: 'INDIA' | 'EU' | 'US') => {
    let template: Partial<FinanceConfiguration>;
    switch (region) {
      case 'INDIA':
        template = DEFAULT_CONFIG_INDIA;
        break;
      case 'EU':
        template = DEFAULT_CONFIG_EU;
        break;
      case 'US':
        template = DEFAULT_CONFIG_US;
        break;
    }
    
    setConfig({ ...config, ...template });
    toast.success(`Applied ${region} regional settings`);
  };

  const handleSave = () => {
    onSave(config);
    toast.success('Finance configuration saved successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Finance Configuration</h2>
          <p className="text-muted-foreground">
            Configure accounting standards, tax compliance, and regional settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => applyRegionalTemplate('INDIA')}>
            🇮🇳 India Setup
          </Button>
          <Button variant="outline" onClick={() => applyRegionalTemplate('EU')}>
            🇪🇺 EU Setup
          </Button>
          <Button variant="outline" onClick={() => applyRegionalTemplate('US')}>
            🇺🇸 US Setup
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="tax">
            <Shield className="h-4 w-4 mr-2" />
            Tax & Compliance
          </TabsTrigger>
          <TabsTrigger value="currency">
            <DollarSign className="h-4 w-4 mr-2" />
            Currency
          </TabsTrigger>
          <TabsTrigger value="entity">
            <Building2 className="h-4 w-4 mr-2" />
            Multi-Entity
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic company details and accounting standards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={config.company_name}
                    onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_id">Company ID / Registration Number</Label>
                  <Input
                    id="company_id"
                    value={config.company_id}
                    onChange={(e) => setConfig({ ...config, company_id: e.target.value })}
                    placeholder="12345678"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="accounting_standard">Accounting Standard</Label>
                <Select
                  value={config.accounting_standard}
                  onValueChange={(val: AccountingStandard) =>
                    setConfig({ ...config, accounting_standard: val })
                  }
                >
                  <SelectTrigger id="accounting_standard">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IFRS">
                      IFRS - International Financial Reporting Standards
                    </SelectItem>
                    <SelectItem value="INDIA_AS">
                      India AS - Indian Accounting Standards
                    </SelectItem>
                    <SelectItem value="US_GAAP">
                      US GAAP - Generally Accepted Accounting Principles
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {COA_DESCRIPTIONS[config.accounting_standard as COATemplate] ||
                    'Select your accounting standard'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_format">Date Format</Label>
                <Select
                  value={config.date_format}
                  onValueChange={(val: DateFormat) => setConfig({ ...config, date_format: val })}
                >
                  <SelectTrigger id="date_format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISO">ISO (YYYY-MM-DD)</SelectItem>
                    <SelectItem value="US">US (MM/DD/YYYY)</SelectItem>
                    <SelectItem value="EU">EU (DD/MM/YYYY)</SelectItem>
                    <SelectItem value="INDIA">India (DD/MM/YYYY)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Fiscal Year Configuration</Label>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="fiscal_month">Start Month</Label>
                    <Select
                      value={config.fiscal_year?.start_month?.toString()}
                      onValueChange={(val) =>
                        setConfig({
                          ...config,
                          fiscal_year: { ...config.fiscal_year!, start_month: parseInt(val) },
                        })
                      }
                    >
                      <SelectTrigger id="fiscal_month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fiscal_day">Start Day</Label>
                    <Input
                      id="fiscal_day"
                      type="number"
                      min="1"
                      max="31"
                      value={config.fiscal_year?.start_day}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          fiscal_year: {
                            ...config.fiscal_year!,
                            start_day: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fiscal_label">Year Label</Label>
                    <Input
                      id="fiscal_label"
                      value={config.fiscal_year?.label}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          fiscal_year: { ...config.fiscal_year!, label: e.target.value },
                        })
                      }
                      placeholder="FY 2024-25"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Configuration */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
              <CardDescription>Configure tax regime and compliance settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Tax Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track GST/VAT/Sales Tax on transactions
                  </p>
                </div>
                <Switch
                  checked={config.features?.enable_tax_tracking}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      features: { ...config.features!, enable_tax_tracking: checked },
                      tax_config: {
                        ...config.tax_config!,
                        enable_tax_tracking: checked,
                      },
                    })
                  }
                />
              </div>

              {config.features?.enable_tax_tracking && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="tax_regime">Tax Regime</Label>
                    <Select
                      value={config.tax_config?.regime}
                      onValueChange={(val: TaxRegime) => {
                        let rates: typeof GST_INDIA_RATES = [];
                        switch (val) {
                          case 'GST_INDIA':
                            rates = GST_INDIA_RATES;
                            break;
                          case 'VAT_EU':
                            rates = VAT_EU_RATES;
                            break;
                          case 'SALES_TAX_US':
                            rates = US_SALES_TAX_RATES;
                            break;
                        }
                        setConfig({
                          ...config,
                          tax_config: { ...config.tax_config!, regime: val, rates },
                        });
                      }}
                    >
                      <SelectTrigger id="tax_regime">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GST_INDIA">🇮🇳 GST (India)</SelectItem>
                        <SelectItem value="VAT_EU">🇪🇺 VAT (EU)</SelectItem>
                        <SelectItem value="SALES_TAX_US">🇺🇸 Sales Tax (US)</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_id">Tax ID / Registration Number</Label>
                    <Input
                      id="tax_id"
                      value={config.tax_config?.tax_id}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tax_config: { ...config.tax_config!, tax_id: e.target.value },
                        })
                      }
                      placeholder={
                        config.tax_config?.regime === 'GST_INDIA'
                          ? 'GSTIN: 27AABCU9603R1ZS'
                          : config.tax_config?.regime === 'VAT_EU'
                          ? 'VAT Number: GB123456789'
                          : 'Tax ID'
                      }
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label>Configured Tax Rates</Label>
                    <div className="mt-2 space-y-2">
                      {config.tax_config?.rates?.map((rate) => (
                        <div
                          key={rate.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div>
                            <p className="font-medium">{rate.name}</p>
                            <p className="text-sm text-muted-foreground">{rate.type}</p>
                          </div>
                          <Badge>{rate.rate}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currency Configuration */}
        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currency Configuration</CardTitle>
              <CardDescription>Configure base currency and multi-currency support</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="base_currency">Base Currency</Label>
                <Select
                  value={config.currency_config?.base_currency}
                  onValueChange={(val: CurrencyCode) =>
                    setConfig({
                      ...config,
                      currency_config: { ...config.currency_config!, base_currency: val },
                    })
                  }
                >
                  <SelectTrigger id="base_currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">🇺🇸 USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">🇪🇺 EUR - Euro</SelectItem>
                    <SelectItem value="INR">🇮🇳 INR - Indian Rupee</SelectItem>
                    <SelectItem value="GBP">🇬🇧 GBP - British Pound</SelectItem>
                    <SelectItem value="AUD">🇦🇺 AUD - Australian Dollar</SelectItem>
                    <SelectItem value="CAD">🇨🇦 CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="JPY">🇯🇵 JPY - Japanese Yen</SelectItem>
                    <SelectItem value="CNY">🇨🇳 CNY - Chinese Yuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Multi-Currency</Label>
                  <p className="text-sm text-muted-foreground">
                    Track transactions in multiple currencies
                  </p>
                </div>
                <Switch
                  checked={config.features?.enable_multi_currency}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      features: { ...config.features!, enable_multi_currency: checked },
                      currency_config: {
                        ...config.currency_config!,
                        enable_multi_currency: checked,
                      },
                    })
                  }
                />
              </div>

              {config.features?.enable_multi_currency && (
                <div className="p-4 border rounded bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <Check className="h-4 w-4 inline mr-1 text-green-600" />
                    Multi-currency enabled. Exchange rates can be configured in the transaction
                    form.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-Entity Configuration */}
        <TabsContent value="entity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Entity & Branch Support</CardTitle>
              <CardDescription>
                Configure multiple entities, branches, or subsidiaries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Multi-Entity Accounting</Label>
                  <p className="text-sm text-muted-foreground">
                    Track financials for multiple entities or branches
                  </p>
                </div>
                <Switch
                  checked={config.features?.enable_multi_entity}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      features: { ...config.features!, enable_multi_entity: checked },
                      enable_multi_entity: checked,
                    })
                  }
                />
              </div>

              {config.features?.enable_multi_entity && (
                <div className="p-4 border rounded bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <Check className="h-4 w-4 inline mr-1 text-green-600" />
                    Multi-entity enabled. You can create entities in the admin panel.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statutory Reports */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statutory Reports</CardTitle>
              <CardDescription>Configure compliance and statutory reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Statutory Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate compliance reports for tax authorities
                  </p>
                </div>
                <Switch
                  checked={config.enable_statutory_reports}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, enable_statutory_reports: checked })
                  }
                />
              </div>

              {config.enable_statutory_reports && (
                <>
                  <Separator />
                  <div>
                    <Label>Available Reports</Label>
                    <div className="mt-2 space-y-2">
                      {config.statutory_reports?.map((report) => (
                        <div key={report} className="flex items-center p-2 border rounded">
                          <Check className="h-4 w-4 mr-2 text-green-600" />
                          <span className="font-medium">{report}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave}>Save Configuration</Button>
      </div>
    </div>
  );
}
