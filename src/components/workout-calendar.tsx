
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, CheckCircle, Loader2 } from "lucide-react";
import type { Workout } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase';

export function WorkoutCalendar({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const workoutsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'users', user.id, 'workouts'),
      orderBy('startTime', 'desc')
    );
  }, [firestore, user, refreshKey]); // refreshKey is now a dependency

  const { data: userWorkouts, isLoading } = useCollection<Workout>(workoutsQuery);

  const workoutDates = userWorkouts 
    ? userWorkouts.map(w => w.startTime && 'toDate' in w.startTime ? w.startTime.toDate() : new Date()) 
    : [];

  const workoutsThisMonth = userWorkouts?.filter(w => 
    w.startTime && 'toDate' in w.startTime && isSameMonth(w.startTime.toDate(), currentMonth)
  ).length || 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-xl">Meu Progresso</CardTitle>
                <CardDescription>Seu histórico de treinos.</CardDescription>
            </div>
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isLoading ? (
          <div className="flex items-center justify-center h-[335px]">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Calendar
            locale={ptBR}
            mode="multiple"
            selected={workoutDates}
            onMonthChange={setCurrentMonth}
            className="rounded-md"
            modifiers={{
              attended: workoutDates
            }}
            modifiersClassNames={{
              attended: 'day-attended'
            }}
          />
        )}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/50 p-3 text-sm font-medium text-accent-foreground">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Você treinou {workoutsThisMonth} dias este mês!</span>
        </div>
      </CardContent>
    </Card>
  );
}
