
"use client";

import { useCollection } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Workout } from '@/lib/types';

export function UserWorkoutCount({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const workoutsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users', userId, 'workouts');
  }, [firestore, userId]);

  const { data: workouts, isLoading } = useCollection<Workout>(workoutsQuery);

  if (isLoading) {
    return <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />;
  }

  const count = workouts?.length || 0;

  // Render nothing if count is 0
  if (count === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
      {count}
    </div>
  );
}
