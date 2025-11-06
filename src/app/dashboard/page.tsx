
"use client";

import { useState, useMemo } from "react";
import { WorkoutTimer } from "@/components/workout-timer";
import { WorkoutCalendar } from "@/components/workout-calendar";
import { useAuth } from "@/lib/auth";
import type { Workout } from "@/lib/types";
import { useFirestore, useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";

export default function DashboardPage() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  const workoutsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "users", user.id, "workouts"),
      orderBy("startTime", "desc")
    );
  }, [firestore, user, refreshKey]);

  const { data: userWorkouts, isLoading: areWorkoutsLoading } = useCollection<Workout>(workoutsQuery);

  const handleWorkoutLogged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!user) return null;

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Bem-vindo de volta, {user.name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">Pronto para esmagar suas metas hoje?</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WorkoutTimer 
            onWorkoutLogged={handleWorkoutLogged} 
            userWorkouts={userWorkouts || []}
          />
        </div>
        <div className="lg:col-span-2">
          <WorkoutCalendar 
            userWorkouts={userWorkouts} 
            isLoading={areWorkoutsLoading} 
          />
        </div>
      </div>
    </div>
  );
}
