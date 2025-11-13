
import { NextResponse } from 'next/server';
import { initializeServerApp } from '@/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';

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
    const cutoffTimestamp = Timestamp.fromDate(thirtyDaysAgo);
    
    console.log(`Starting cleanup for workouts older than ${thirtyDaysAgo.toISOString()}`);

    const usersSnapshot = await firestore.collection('users').get();
    
    let totalDeleted = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const workoutsRef = firestore.collection('users').doc(userId).collection('workouts');
      const oldWorkoutsQuery = workoutsRef.where('startTime', '<', cutoffTimestamp);
      
      // Firestore não suporta deleção de subcoleções em massa do lado do servidor diretamente.
      // É preciso buscar e deletar em batches.
      const oldWorkoutsSnapshot = await oldWorkoutsQuery.get();

      if (oldWorkoutsSnapshot.empty) {
        continue;
      }

      console.log(`Found ${oldWorkoutsSnapshot.size} old workouts for user ${userId} to delete.`);

      // Deletar documentos em um batch
      const batch = firestore.batch();
      oldWorkoutsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      totalDeleted += oldWorkoutsSnapshot.size;
      console.log(`Deleted ${oldWorkoutsSnapshot.size} workouts for user ${userId}.`);
    }

    const message = `Cleanup successful. Deleted a total of ${totalDeleted} old workouts.`;
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
