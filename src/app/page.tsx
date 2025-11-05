"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { Loader2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInAsAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full font-body">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-2xl">
          <CardHeader className="text-center">
            <div className="mb-4 inline-block">
              <Logo />
            </div>
            <CardTitle className="font-headline text-2xl">Bem-vindo!</CardTitle>
            <CardDescription>
              Acesse sua conta para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={signInWithGoogle}
              className="w-full"
              size="lg"
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 56.5l-63.6 61.8C330.3 93.3 292.3 78 248 78c-84.3 0-152.3 68.3-152.3 153s68 153 152.3 153c92.1 0 132.8-62.8 136.7-94.6H248v-73.3h235.3c4.7 26.5 7.7 54.1 7.7 85.8z"></path></svg>
              Entrar como Usuário
            </Button>
            <Button
              onClick={signInAsAdmin}
              className="w-full"
              variant="secondary"
              size="lg"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Entrar como Admin
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="relative hidden flex-1 lg:block">
        <Image
          src="https://picsum.photos/seed/fitness/1200/1800"
          alt="Homem se exercitando"
          fill
          className="object-cover"
          data-ai-hint="fitness workout"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
    </div>
  );
}
