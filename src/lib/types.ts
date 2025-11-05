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
  date: string; // ISO string
  duration: number; // in seconds
  photo1Url: string;
  photo2Url:string;
}
