
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  isAdmin: boolean;
}

export type WorkoutStatus = 'pending' | 'approved' | 'rejected';

export interface Workout {
  id: string;
  userId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: number; // in seconds
  photo1Url: string;
  photo2Url: string;
  photo1Timestamp?: Timestamp;
  photo2Timestamp?: Timestamp;
  status: WorkoutStatus;
  reviewerName?: string;
  reviewedAt?: Timestamp;
}

export interface AppSettings {
  isMaintenanceMode: boolean;
}
