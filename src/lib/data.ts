import type { User, Workout } from './types';
import { subDays, formatISO } from 'date-fns';

export const USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@poli.digital', avatarUrl: 'https://picsum.photos/seed/101/40/40', isAdmin: true },
  { id: '2', name: 'Jane Doe', email: 'jane.doe@poli.digital', avatarUrl: 'https://picsum.photos/seed/102/40/40', isAdmin: false },
  { id: '3', name: 'John Smith', email: 'john.smith@poli.digital', avatarUrl: 'https://picsum.photos/seed/103/40/40', isAdmin: false },
];

const today = new Date();
export const WORKOUTS: Workout[] = [
  // Workouts for Jane Doe (user 2)
  { id: 'w1', userId: '2', date: formatISO(subDays(today, 2)), duration: 2700, photo1Url: 'https://picsum.photos/seed/201/400/300', photo2Url: 'https://picsum.photos/seed/202/400/300' },
  { id: 'w2', userId: '2', date: formatISO(subDays(today, 5)), duration: 3000, photo1Url: 'https://picsum.photos/seed/203/400/300', photo2Url: 'https://picsum.photos/seed/204/400/300' },
  { id: 'w3', userId: '2', date: formatISO(subDays(today, 10)), duration: 2400, photo1Url: 'https://picsum.photos/seed/205/400/300', photo2Url: 'https://picsum.photos/seed/206/400/300' },
   // Workouts for John Smith (user 3)
  { id: 'w4', userId: '3', date: formatISO(subDays(today, 3)), duration: 4500, photo1Url: 'https://picsum.photos/seed/301/400/300', photo2Url: 'https://picsum.photos/seed/302/400/300' },
  { id: 'w5', userId: '3', date: formatISO(subDays(today, 7)), duration: 3600, photo1Url: 'https://picsum.photos/seed/303/400/300', photo2Url: 'https://picsum.photos/seed/304/400/300' },
];
