import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/firebase/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { WorkspaceProvider } from '@/lib/settings/workspace-context';
import { EventBridgeProvider } from '@/components/providers/event-bridge-provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CRM - Intelligent Business Growth',
  description: 'All-in-one CRM platform for managing leads, deals, projects, and team collaboration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <WorkspaceProvider>
              <EventBridgeProvider>
                {children}
              </EventBridgeProvider>
              <Toaster />
            </WorkspaceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
