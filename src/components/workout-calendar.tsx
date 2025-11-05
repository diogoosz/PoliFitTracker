"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, CheckCircle } from "lucide-react";
import type { Workout } from '@/lib/types';
import { USERS, WORKOUTS } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { isSameMonth, parseISO } from 'date-fns';

export function WorkoutCalendar({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth();
  const [userWorkouts, setUserWorkouts] = useState<Workout[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    // In a real app, this would be an API call to fetch user's workouts
    if (user) {
      const workouts = WORKOUTS.filter(w => w.userId === user.id);
      setUserWorkouts(workouts);
    }
  }, [user, refreshKey]);

  const workoutDates = userWorkouts.map(w => parseISO(w.date));

  const workoutsThisMonth = userWorkouts.filter(w => 
    isSameMonth(parseISO(w.date), currentMonth)
  ).length;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="font-headline text-xl">My Progress</CardTitle>
                <CardDescription>Your workout history at a glance.</CardDescription>
            </div>
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <Calendar
          mode="multiple"
          selected={workoutDates}
          onMonthChange={setCurrentMonth}
          className="rounded-md"
          classNames={{
             day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
          }}
          modifiers={{
            attended: workoutDates
          }}
          modifiersStyles={{
            attended: { 
                backgroundColor: 'hsl(var(--primary))', 
                color: 'hsl(var(--primary-foreground))',
                borderRadius: '50%',
             }
          }}
        />
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/50 p-3 text-sm font-medium text-accent-foreground">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>You've attended {workoutsThisMonth} days this month!</span>
        </div>
      </CardContent>
    </Card>
  );
}
