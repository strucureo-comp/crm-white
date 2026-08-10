'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getWorkspaceSettings } from '@/lib/settings/api';
import { getUser } from '@/lib/firebase/database';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaVerified, setTwoFaVerified] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [checking2FA, setChecking2FA] = useState(false);
  const { signIn, user, loading, workspace, workspaceLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || workspaceLoading || checking2FA) return;
    
    if (user && workspace?.id) {
      if (!requires2FA && !twoFaVerified) {
        setChecking2FA(true);
        // Check 2FA
        Promise.all([
          getWorkspaceSettings(workspace.id),
          getUser(user.id)
        ]).then(([wsSettings, dbUser]) => {
          if (wsSettings?.security?.two_factor_enabled && (dbUser as any)?.totp_secret) {
            setTotpSecret((dbUser as any).totp_secret);
            setRequires2FA(true);
          } else {
            setTwoFaVerified(true);
          }
          setChecking2FA(false);
        }).catch(err => {
          console.error('Error checking 2FA', err);
          setTwoFaVerified(true);
          setChecking2FA(false);
        });
        return;
      }
      
      if (twoFaVerified) {
        if (workspace?.setup_completed) {
          router.replace('/dashboard');
        } else {
          router.replace('/setup');
        }
      }
    }
  }, [user, loading, workspace, workspaceLoading, router, requires2FA, twoFaVerified, checking2FA]);

  if (loading || workspaceLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  
  const handleVerify2FA = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: twoFaCode, secret: totpSecret })
      });
      const data = await res.json();
      if (data.success) {
        setTwoFaVerified(true);
        setRequires2FA(false);
      } else {
        toast.error('Invalid 2FA code');
      }
    } catch (err) {
      toast.error('Failed to verify code');
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed in successfully');
      // Navigation will happen via useEffect once workspace is loaded
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">T</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Tagverse CRM</h1>
          <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            
              {requires2FA ? (
                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div className="space-y-2 text-center pb-4">
                     <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twoFaCode">Verification Code</Label>
                    <Input id="twoFaCode" type="text" placeholder="123456" maxLength={6} className="text-center text-xl tracking-widest" value={twoFaCode} onChange={(e) => setTwoFaCode(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting || twoFaCode.length < 6}>
                    {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                    Verify Code
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-muted-foreground/30" />
                  Remember me
                </label>
                <a href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</a>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
              )}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-primary hover:underline">Sign up</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
