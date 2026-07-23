'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, MapPin, User, FileText, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { updateWorkspace } from '@/lib/workspace/api';
import { updateGeneralSettings, updateBrandingSettings } from '@/lib/settings/api';

const STEPS = [
  { id: 0, title: 'Company Info', icon: Building2, description: 'Tell us about your business' },
  { id: 1, title: 'Location', icon: MapPin, description: 'Where are you based?' },
  { id: 2, title: 'Admin Profile', icon: User, description: 'Set up your admin profile' },
  { id: 3, title: 'Documents', icon: FileText, description: 'Configure documents & branding' },
  { id: 4, title: 'Finish', icon: CheckCircle2, description: 'You\'re all set!' },
];

export default function SetupPage() {
  const { user, loading: authLoading, workspace, workspaceLoading, refreshWorkspace } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2: Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Step 3: Admin Profile
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Owner');

  // Step 4: Documents
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (workspace?.setup_completed) {
      router.replace('/dashboard');
      return;
    }
    // Pre-fill from user data
    if (user.full_name) setFullName(user.full_name);
    if (workspace?.name) setCompanyName(workspace.name);
  }, [user, authLoading, workspace, workspaceLoading, router]);

  if (authLoading || workspaceLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No workspace found. Please register first.</p>
            <Button className="mt-4" onClick={() => router.push('/register')}>
              Go to Register
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleNext = async () => {
    if (currentStep === 0 && !companyName) {
      toast.error('Company name is required');
      return;
    }
    if (currentStep === 2 && !fullName) {
      toast.error('Your name is required');
      return;
    }

    // Save progress on each step
    setSubmitting(true);
    try {
      if (currentStep === 0) {
        // Update workspace name
        await updateWorkspace(workspace.id, { name: companyName });
        // Save general settings
        await updateGeneralSettings({
          company_name: companyName,
          default_currency: currency,
          currency_symbol: currencySymbol,
          timezone,
        });
      } else if (currentStep === 1) {
        await updateGeneralSettings({
          company_name: companyName,
          timezone,
        });
      } else if (currentStep === 3) {
        await updateGeneralSettings({
          company_name: companyName,
          default_currency: currency,
          currency_symbol: currencySymbol,
          timezone,
        });
        await updateBrandingSettings({
          gst_number: gstNumber,
          pan_number: panNumber,
        });
      }

      // Update workspace setup step
      await updateWorkspace(workspace.id, { setup_step: currentStep + 1 });
    } catch (error) {
      console.error('Error saving setup:', error);
    } finally {
      setSubmitting(false);
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await updateWorkspace(workspace.id, { setup_completed: true, setup_step: 5 });
      await refreshWorkspace();
      toast.success('Workspace setup complete!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to complete setup');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Your Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="e.g., Technology, Marketing, Design"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://yourcompany.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Business Street"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="India"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Asia/Kolkata">India (GMT+5:30)</option>
                <option value="America/New_York">US Eastern (GMT-5)</option>
                <option value="America/Los_Angeles">US Pacific (GMT-8)</option>
                <option value="Europe/London">UK (GMT)</option>
                <option value="Asia/Dubai">UAE (GMT+4)</option>
                <option value="Asia/Singapore">Singapore (GMT+8)</option>
              </select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Your Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Your Role</Label>
              <select
                id="role"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Owner">Owner</option>
                <option value="Director">Director</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                As the workspace creator, you&apos;ll have <strong>Owner</strong> role with full access to all features.
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    const symbols: Record<string, string> = {
                      INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$',
                    };
                    setCurrencySymbol(symbols[e.target.value] || '$');
                  }}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SGD">SGD (S$)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input value={currencySymbol} disabled className="text-center text-lg font-bold" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number (optional)</Label>
              <Input
                id="gstNumber"
                placeholder="22AAAAA0000A1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number (optional)</Label>
              <Input
                id="panNumber"
                placeholder="AAAAA0000A"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">You&apos;re All Set!</h3>
              <p className="text-muted-foreground mt-1">
                Your workspace <strong>{companyName}</strong> is ready to use.
              </p>
            </div>
            <div className="text-left p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm"><strong>Workspace:</strong> {companyName}</p>
              <p className="text-sm"><strong>Owner:</strong> {fullName}</p>
              <p className="text-sm"><strong>Currency:</strong> {currency} ({currencySymbol})</p>
              {industry && <p className="text-sm"><strong>Industry:</strong> {industry}</p>}
            </div>
            <p className="text-sm text-muted-foreground">
              You can customize more settings later from the Settings page.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">T</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Workspace Setup</h1>
          <p className="text-sm text-muted-foreground">Let&apos;s get your workspace configured</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                      ? 'bg-primary/10 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Title */}
        <div className="text-center">
          <h2 className="font-semibold">{STEPS[currentStep].title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || submitting}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button onClick={handleComplete} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Launch Workspace
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
