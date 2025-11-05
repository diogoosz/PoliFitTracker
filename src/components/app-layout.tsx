"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
  admin?: boolean;
}

export function AppLayout({ children, admin = false }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (admin && !user.isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router, admin]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (admin && !user.isAdmin) {
     return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p>You are not authorized to view this page.</p>
        <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
           <SidebarTrigger className="md:hidden"/>
           <div className="flex-1" />
           <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
