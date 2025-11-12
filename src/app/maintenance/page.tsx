"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { HardHat } from 'lucide-react';
import Image from 'next/image';

export default function MaintenancePage() {

  return (
    <div className="flex min-h-screen w-full font-body">
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-2xl text-center">
          <CardHeader>
            <div className="mb-4 inline-block">
                <HardHat className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="font-headline text-2xl">Em Manutenção</CardTitle>
            <CardDescription>
              O Poli Fit Tracker está passando por melhorias e estará de volta em breve. Agradecemos a sua paciência!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
                Se você é um administrador, o acesso continua normal.
            </p>
          </CardContent>
        </Card>
      </div>
       <div className="relative hidden flex-1 lg:block">
        <Image
          src="https://picsum.photos/seed/maintenance/1200/1800"
          alt="Ferramentas em uma bancada"
          fill
          className="object-cover"
          data-ai-hint="tools construction"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
    </div>
  );
}
