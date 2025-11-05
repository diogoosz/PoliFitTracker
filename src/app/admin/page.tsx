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
        <h1 className="text-3xl font-bold tracking-tight font-headline">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage and review user workout history.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 font-headline"><Users className="size-5" /> All Workouts</CardTitle>
                <CardDescription>A log of all submitted workout sessions.</CardDescription>
              </div>
              <Input
                placeholder="Search by name or email..."
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
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>{format(parseISO(workout.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{Math.floor(workout.duration / 60)} mins</TableCell>
                      <TableCell>
                         <Badge variant="default" className="bg-green-500 hover:bg-green-600">Verified</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                           <DialogTrigger asChild>
                             <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> View Photos</Button>
                           </DialogTrigger>
                           <DialogContent>
                             <DialogHeader>
                               <DialogTitle>Verification Photos for {workout.user.name}</DialogTitle>
                               <DialogDescription>
                                 {format(parseISO(workout.date), 'MMMM d, yyyy')} - {Math.floor(workout.duration / 60)} minutes
                               </DialogDescription>
                             </DialogHeader>
                             <div className="grid grid-cols-2 gap-4 mt-4">
                               <Image src={workout.photo1Url} alt="Verification photo 1" width={400} height={300} className="rounded-md" data-ai-hint="workout selfie" />
                               <Image src={workout.photo2Url} alt="Verification photo 2" width={400} height={300} className="rounded-md" data-ai-hint="workout selfie" />
                             </div>
                           </DialogContent>
                         </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No results found.
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
