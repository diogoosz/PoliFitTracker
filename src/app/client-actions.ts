
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
    duration: number, 
    photo1DataUrl: string, 
    photo2DataUrl: string
) {
    if (!firestore) {
        throw new Error("Firestore instance is not available.");
    }
    if (!user) {
        throw new Error("User not authenticated.");
    }

    const startTime = serverTimestamp();
    
    // Note: We can't calculate endTime on the client with serverTimestamp.
    // We will store duration and let the client calculate endTime when reading.
    // Or, use a cloud function trigger if precise server-side endTime is needed.
    // For this app, storing duration is sufficient.

    const workoutData = {
        userId: user.id,
        startTime,
        endTime: startTime, // Placeholder, will be updated by server if needed, or calculated on client
        duration: Math.floor(duration),
        photo1DataUrl,
        photo2DataUrl,
        status: 'pending',
    };

    const workoutCollectionRef = collection(firestore, `users/${user.id}/workouts`);
    return await addDoc(workoutCollectionRef, workoutData);
}
