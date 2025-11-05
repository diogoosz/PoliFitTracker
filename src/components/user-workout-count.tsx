
"use client";

import { useCollection } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Workout } from '@/lib/types';
import { Badge } from './ui/badge';

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

  return (
    <Badge variant={count > 0 ? "default" : "secondary"}>
      {count} {count === 1 ? 'treino' : 'treinos'}
    </Badge>
  );
}
