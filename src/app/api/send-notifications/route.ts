
import { NextResponse } from 'next/server';
import { initializeServerApp } from '@/firebase/server-init';
import * as admin from 'firebase-admin';
import type { NotificationTask } from '@/lib/types';

// This ensures the route is treated as dynamic, which is best practice for cron jobs.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Secure the endpoint (important for production)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { firestore, app } = initializeServerApp();
    const messaging = admin.messaging(app);
    const now = admin.firestore.Timestamp.now();
    
    // 2. Query for pending tasks that are due
    const tasksSnapshot = await firestore.collection('notification_tasks')
      .where('status', '==', 'pending')
      .where('sendAt', '<=', now)
      .get();

    if (tasksSnapshot.empty) {
      return NextResponse.json({ success: true, message: 'Nenhuma notificação para enviar.' });
    }

    const promises: Promise<any>[] = [];
    const sentTasksIds: string[] = [];

    // 3. Send notifications
    tasksSnapshot.forEach(doc => {
      const task = doc.data() as Omit<NotificationTask, 'id'>;
      
      const message: admin.messaging.Message = {
          token: task.fcmToken,
          notification: task.payload.notification,
          webpush: task.payload.webpush,
          data: task.payload.data,
      };

      const sendPromise = messaging.send(message)
        .then(response => {
          console.log('Notificação enviada com sucesso:', response, 'para o usuário:', task.userId);
          sentTasksIds.push(doc.id);
        })
        .catch(error => {
          console.error('Erro ao enviar notificação para o token:', task.fcmToken, error);
          // Optionally update the task status to 'error'
          return doc.ref.update({ status: 'error' });
        });
      
      promises.push(sendPromise);
    });

    await Promise.all(promises);

    // 4. Delete sent tasks in a batch
    if (sentTasksIds.length > 0) {
      const batch = firestore.batch();
      sentTasksIds.forEach(id => {
        batch.delete(firestore.collection('notification_tasks').doc(id));
      });
      await batch.commit();
    }

    const message = `Processamento de notificações concluído. ${sentTasksIds.length} enviadas.`;
    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Erro durante a execução do cron de notificações:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return new Response(errorMessage, { status: 500 });
  }
}
