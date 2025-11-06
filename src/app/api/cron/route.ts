import { NextResponse } from 'next/server';
import { initializeServerApp } from '@/firebase/server-init';
import * as admin from 'firebase-admin';

// This ensures the route is treated as dynamic, which is best practice for cron jobs.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Secure the endpoint
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  // 2. Define the cleanup logic
  try {
    const { firestore } = initializeServerApp();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);
    let deletedCount = 0;

    console.log(`Starting cleanup for workouts older than ${thirtyDaysAgo.toISOString()}`);

    const usersSnapshot = await firestore.collection('users').get();
    
    await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const workoutsRef = firestore.collection('users').doc(userId).collection('workouts');
        const oldWorkoutsSnapshot = await workoutsRef.where('startTime', '<', cutoffTimestamp).get();

        if (oldWorkoutsSnapshot.empty) {
            return; 
        }

        console.log(`Found ${oldWorkoutsSnapshot.size} old workouts for user ${userId}`);

        await Promise.all(oldWorkoutsSnapshot.docs.map(async (workoutDoc) => {
            await workoutDoc.ref.delete();
            deletedCount++;
            console.log(`Deleted workout ${workoutDoc.id} from user ${userId}`);
        }));
    }));

    const message = `Cleanup successful. Deleted ${deletedCount} old workouts.`;
    console.log(message);
    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Error during cron job execution:', error);
    if (error instanceof Error) {
        return new Response(error.message, { status: 500 });
    }
    return new Response('An unknown error occurred', { status: 500 });
  }
}
