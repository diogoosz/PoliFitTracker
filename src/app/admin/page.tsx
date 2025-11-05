"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { USERS, WORKOUTS } from '@/lib/data';
import type { User, Workout } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Eye, Users } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

interface WorkoutWithUser extends Workout {
  user: User;
}

export default function AdminPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const workoutsWithUsers: WorkoutWithUser[] = useMemo(() => {
    return WORKOUTS.map(workout => ({
      ...workout,
      user: USERS.find(user => user.id === workout.userId)!,
    })).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, []);

  const filteredWorkouts = useMemo(() => {
    return workoutsWithUsers.filter(workout =>
      workout.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workout.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workoutsWithUsers, searchTerm]);

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
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="size-5" /> Todos os Treinos</CardTitle>
                <CardDescription>Um registro de todas as sessões de treino enviadas.</CardDescription>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Verificação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkouts.length > 0 ? (
                  filteredWorkouts.map((workout) => (
                    <TableRow key={workout.id}>
                      <TableCell>
                        <div className="font-medium">{workout.user.name}</div>
                        <div className="text-sm text-muted-foreground">{workout.user.email}</div>
                      </TableCell>
                      <TableCell>{format(parseISO(workout.date), 'd MMM, yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>{Math.floor(workout.duration / 60)} min</TableCell>
                      <TableCell>
                         <Badge variant="default" className="bg-green-500 hover:bg-green-600">Verificado</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                           <DialogTrigger asChild>
                             <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> Ver Fotos</Button>
                           </DialogTrigger>
                           <DialogContent>
                             <DialogHeader>
                               <DialogTitle>Fotos de Verificação para {workout.user.name}</DialogTitle>
                               <DialogDescription>
                                 {format(parseISO(workout.date), 'd \'de\' MMMM \'de\' yyyy', { locale: ptBR })} - {Math.floor(workout.duration / 60)} minutos
                               </DialogDescription>
                             </DialogHeader>
                             <div className="grid grid-cols-2 gap-4 mt-4">
                               <Image src={workout.photo1Url} alt="Foto de verificação 1" width={400} height={300} className="rounded-md" data-ai-hint="workout selfie" />
                               <Image src={workout.photo2Url} alt="Foto de verificação 2" width={400} height={300} className="rounded-md" data-ai-hint="workout selfie" />
                             </div>
                           </DialogContent>
                         </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Nenhum resultado encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
