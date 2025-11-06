
'use client';

import { doc, updateDoc, Firestore, serverTimestamp } from 'firebase/firestore';

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
