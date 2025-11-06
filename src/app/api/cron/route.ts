import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// This ensures the route is treated as dynamic, which is best practice for cron jobs.
export const dynamic = 'force-dynamic';

// Helper function to initialize Firebase Admin SDK in a serverless environment
function initializeFirebaseAdmin() {
    // Check if the app is already initialized
    if (admin.apps.length) {
        return admin.app();
    }

    // Vercel stores the JSON content directly in the environment variable.
    // We need to parse it and use it to initialize the SDK.
    const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountString) {
        throw new Error('The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        
        return admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Failed to parse or initialize Firebase Admin SDK:", error);
        throw new Error("Could not initialize Firebase Admin. Please check the GOOGLE_APPLICATION_CREDENTIALS environment variable format.");
    }
}

// Initialize the app
const app = initializeFirebaseAdmin();
const db = admin.firestore();


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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);
    let deletedCount = 0;

    console.log(`Starting cleanup for workouts older than ${thirtyDaysAgo.toISOString()}`);

    const usersSnapshot = await db.collection('users').get();
    
    // Use Promise.all to process all users in parallel
    await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const workoutsRef = db.collection('users').doc(userId).collection('workouts');
        const oldWorkoutsSnapshot = await workoutsRef.where('startTime', '<', cutoffTimestamp).get();

        if (oldWorkoutsSnapshot.empty) {
            return; // No old workouts for this user
        }

        console.log(`Found ${oldWorkoutsSnapshot.size} old workouts for user ${userId}`);

        // Process deletions for each old workout
        await Promise.all(oldWorkoutsSnapshot.docs.map(async (workoutDoc) => {
            // Since photos are stored as Data URLs in Firestore, we only need to delete the document.
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
