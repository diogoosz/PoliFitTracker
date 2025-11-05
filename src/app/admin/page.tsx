"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { USERS, WORKOUTS } from '@/lib/data';
import type { User, Workout } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Users } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

interface UserWithWorkouts extends User {
  workouts: Workout[];
}

export default function AdminPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const usersWithWorkouts: UserWithWorkouts[] = useMemo(() => {
    return USERS
      .map(user => ({
        ...user,
        workouts: WORKOUTS
          .filter(workout => workout.userId === user.id)
          .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
      }))
      .filter(user => user.workouts.length > 0);
  }, []);

  const filteredUsers = useMemo(() => {
    return usersWithWorkouts.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [usersWithWorkouts, searchTerm]);

  const getUserInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Painel do Administrador</h1>
        <p className="text-muted-foreground">Gerencie e revise o histórico de treinos dos usuários.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="size-5" /> Usuários com Treinos</CardTitle>
                <CardDescription>Visualize o histórico de treinos de cada usuário.</CardDescription>
              </div>
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:max-w-sm"
              />
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {filteredUsers.map(user => (
                <AccordionItem value={user.id} key={user.id}>
                  <AccordionTrigger className="hover:bg-accent/50 px-4 rounded-md">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-muted/40">
                    <h4 className="font-semibold mb-4">Histórico de Treinos ({user.workouts.length})</h4>
                    <div className="space-y-6">
                      {user.workouts.map(workout => (
                        <div key={workout.id} className="p-4 border rounded-lg bg-background">
                           <p className="font-medium">{format(parseISO(workout.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                           <p className="text-sm text-muted-foreground mb-4">Duração: {Math.floor(workout.duration / 60)} minutos</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <Image src={workout.photo1Url} alt="Foto de verificação 1" width={400} height={300} className="rounded-md" data-ai-hint="workout selfie" />
                             <Image src={workout.photo2Url} alt="Foto de verificação 2" width={400} height={300} className="rounded-md" data-ai-hint="workout selfie" />
                           </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
             <div className="h-24 text-center flex items-center justify-center">
                <p>Nenhum resultado encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
