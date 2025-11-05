import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  isAdmin: boolean;
}

export interface Workout {
  id: string;
  userId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: number; // in seconds
  photo1Url: string;
  photo2Url: string;
}
