
"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, CheckCircle, Loader2 } from "lucide-react";
import type { Workout } from '@/lib/types';
import { isSameMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkoutCalendarProps {
  userWorkouts: Workout[] | null;
  isLoading: boolean;
}

export function WorkoutCalendar({ userWorkouts, isLoading }: WorkoutCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { approvedDates, pendingDates, rejectedDates } = useMemo(() => {
    const approved: Date[] = [];
    const pending: Date[] = [];
    const rejected: Date[] = [];
    
    if (userWorkouts) {
      userWorkouts.forEach(w => {
        if (w.startTime && typeof w.startTime.toDate === 'function') {
          const date = w.startTime.toDate();
          if (w.status === 'approved') {
            approved.push(date);
          } else if (w.status === 'rejected') {
            rejected.push(date);
          } else { // pending
            pending.push(date);
          }
        }
      });
    }
    return { approvedDates: approved, pendingDates: pending, rejectedDates: rejected };
  }, [userWorkouts]);

  const workoutsThisMonth = useMemo(() => {
    if (!userWorkouts) return 0;
    // We only count approved workouts
    return userWorkouts.filter(w => 
      w.status === 'approved' &&
      w.startTime && 
      typeof w.startTime.toDate === 'function' && 
      isSameMonth(w.startTime.toDate(), currentMonth)
    ).length;
  }, [userWorkouts, currentMonth]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-xl">Meu Progresso</CardTitle>
                <CardDescription>Seu histórico de treinos aprovados.</CardDescription>
            </div>
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isLoading && !userWorkouts ? (
          <div className="flex items-center justify-center h-[335px]">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <Calendar
            locale={ptBR}
            mode="multiple"
            selected={[...approvedDates, ...pendingDates, ...rejectedDates]}
            onMonthChange={setCurrentMonth}
            className="rounded-md"
            modifiers={{
              approved: approvedDates,
              pending: pendingDates,
              rejected: rejectedDates,
            }}
            modifiersClassNames={{
              approved: 'day-approved',
              pending: 'day-pending',
              rejected: 'day-rejected',
            }}
          />
        )}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/50 p-3 text-sm font-medium text-accent-foreground">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Você treinou {workoutsThisMonth} {workoutsThisMonth === 1 ? 'dia' : 'dias'} este mês!</span>
        </div>
      </CardContent>
    </Card>
  );
}
