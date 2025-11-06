
"use client";

import { useCollection } from '@/firebase';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Workout } from '@/lib/types';
import { cn } from '@/lib/utils';

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

  // Filter workouts to count only 'approved' and 'pending'
  const count = workouts?.filter(w => w.status === 'approved' || w.status === 'pending').length || 0;

  return (
    <div className={cn(
        "flex items-center justify-center size-6 rounded-full text-xs font-bold",
        count > 0 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-muted-foreground"
    )}>
      {count}
    </div>
  );
}
