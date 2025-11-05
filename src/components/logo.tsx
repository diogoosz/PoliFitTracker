import { Dumbbell } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Dumbbell className="size-6 text-primary" />
      <h1 className="text-xl font-bold text-primary-dark font-headline">
        Poli Fit Tracker
      </h1>
    </div>
  );
}
