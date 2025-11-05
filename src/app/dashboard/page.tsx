"use client";

import { useState } from "react";
import { WorkoutTimer } from "@/components/workout-timer";
import { WorkoutCalendar } from "@/components/workout-calendar";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleWorkoutLogged = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  if (!user) return null;

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Welcome back, {user.name.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">Ready to crush your goals today?</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WorkoutTimer onWorkoutLogged={handleWorkoutLogged} />
        </div>
        <div className="lg:col-span-2">
          <WorkoutCalendar refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
