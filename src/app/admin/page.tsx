
"use client";

import { useState, useMemo, useActionState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { User, Workout, WorkoutStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Users, Loader2, Check, X, Clock, MoreHorizontal } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { useCollection } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy } from 'firebase/firestore';
import { UserWorkoutCount } from '@/components/user-workout-count';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateWorkoutStatus } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserWithWorkouts extends User {
  workouts: Workout[];
}

function StatusBadge({ status }: { status: WorkoutStatus }) {
    const statusConfig = {
        pending: { icon: Clock, label: 'Pendente', className: 'bg-blue-500 hover:bg-blue-500/80' },
        approved: { icon: Check, label: 'Aprovado', className: 'bg-green-500 hover:bg-green-500/80' },
        rejected: { icon: X, label: 'Rejeitado', className: 'bg-red-500 hover:bg-red-500/80' },
    };
    const { icon: Icon, label, className } = statusConfig[status];
    return (
        <Badge className={cn("text-xs", className)}>
            <Icon className="mr-1 h-3 w-3" />
            {label}
        </Badge>
    );
}

function AdminWorkoutActions({ workout, userId }: { workout: Workout, userId: string }) {
    const [state, formAction, isPending] = useActionState(updateWorkoutStatus, { message: "", type: "" });
    const { toast } = useToast();

    useEffect(() => {
        if (state.type === 'error' && state.message) {
            toast({ title: "Erro", description: state.message, variant: 'destructive' });
        }
        if (state.type === 'success' && state.message) {
            toast({ title: "Sucesso", description: state.message });
        }
    }, [state, toast]);

    const handleAction = (status: 'approved' | 'rejected') => {
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('workoutId', workout.id);
        formData.append('status', status);
        formAction(formData);
    };

    return (
        <div className="flex items-center gap-2">
            <StatusBadge status={workout.status} />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
                        <span className="sr-only">Ações</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {workout.status !== 'approved' && (
                        <DropdownMenuItem onClick={() => handleAction('approved')}>
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                            <span>Aprovar</span>
                        </DropdownMenuItem>
                    )}
                    {workout.status !== 'rejected' && (
                        <DropdownMenuItem onClick={() => handleAction('rejected')}>
                            <X className="mr-2 h-4 w-4 text-red-500" />
                            <span>Rejeitar</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}


function UserWorkouts({ user }: { user: User }) {
  const firestore = useFirestore();
  const workoutsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users', user.id, 'workouts'), orderBy('startTime', 'desc'));
  }, [firestore, user.id]);

  const { data: workouts, isLoading } = useCollection<Workout>(workoutsQuery);

  if (isLoading) {
    return <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin" /> Carregando treinos...</div>;
  }
  
  if (!workouts || workouts.length === 0) {
      return <div className="p-4">Nenhum treino encontrado para este usuário.</div>
  }

  return (
    <div className="space-y-6">
      {workouts.map(workout => (
        <div key={workout.id} className="p-4 border rounded-lg bg-background">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="font-medium">{format(workout.startTime.toDate(), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <p className="text-sm text-muted-foreground">Duração: {Math.floor(workout.duration / 60)} minutos</p>
                </div>
                 <AdminWorkoutActions workout={workout} userId={user.id} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workout.photo1DataUrl && <Image src={workout.photo1DataUrl} alt="Foto de verificação 1" width={400} height={300} className="rounded-md object-cover" data-ai-hint="workout selfie" />}
                {workout.photo2DataUrl && <Image src={workout.photo2DataUrl} alt="Foto de verificação 2" width={400} height={300} className="rounded-md object-cover" data-ai-hint="workout selfie" />}
            </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

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
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="size-5" /> Usuários</CardTitle>
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
          {usersLoading ? (
             <div className="h-24 text-center flex items-center justify-center">
                <Loader2 className="animate-spin mr-2" />
                <p>Carregando usuários...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {filteredUsers.map(user => (
                <AccordionItem value={user.id} key={user.id}>
                  <AccordionTrigger className="hover:bg-accent/50 px-4 rounded-md">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <UserWorkoutCount userId={user.id} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-muted/40">
                    <h4 className="font-semibold mb-4">Histórico de Treinos</h4>
                    <UserWorkouts user={user} />
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
