
'use client';

import { doc, updateDoc, Firestore, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';

export async function updateWorkoutStatus(
  firestore: Firestore,
  userId: string,
  workoutId: string,
  status: 'approved' | 'rejected',
  reviewerName: string
) {
  if (!firestore) {
    throw new Error('Firestore instance is not available');
  }

  const workoutRef = doc(firestore, `users/${userId}/workouts/${workoutId}`);
  
  // This will use the logged-in user's (admin) credentials.
  // Firestore security rules will check if this user is an admin.
  await updateDoc(workoutRef, { 
    status,
    reviewerName,
    reviewedAt: serverTimestamp()
  });
}

export async function logWorkoutClient(
    firestore: Firestore, 
    user: User, 
    startTime: Date,
    duration: number, 
    photo1DataUrl: string, 
    photo2DataUrl: string,
    photo1Timestamp: Date,
    photo2Timestamp: Date
) {
    if (!firestore) {
        throw new Error("Firestore instance is not available.");
    }
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const endTime = new Date(startTime.getTime() + duration * 1000);

    const workoutData = {
        userId: user.id,
        startTime,
        endTime, 
        duration: Math.floor(duration),
        photo1DataUrl,
        photo2DataUrl,
        photo1Timestamp,
        photo2Timestamp,
        status: 'pending',
    };

    const workoutCollectionRef = collection(firestore, `users/${user.id}/workouts`);
    return await addDoc(workoutCollectionRef, workoutData);
}
