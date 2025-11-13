
import { NextResponse } from 'next/server';
import { initializeServerApp } from '@/firebase/server-init';
import * as admin from 'firebase-admin';
import type { NotificationTask } from '@/lib/types';

export const dynamic = 'force-dynamic';

// URL da API REST do Firebase Cloud Messaging
const FCM_SEND_URL = 'https://fcm.googleapis.com/fcm/send';

export async function GET(request: Request) {
  // 1. Segurança do endpoint
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Validação da chave do servidor FCM
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    console.error('FCM_SERVER_KEY não está definida nas variáveis de ambiente.');
    return new Response('Configuração do servidor incompleta.', { status: 500 });
  }

  try {
    const { firestore } = initializeServerApp();
    const now = admin.firestore.Timestamp.now();
    
    // 3. Busca por tarefas pendentes
    const tasksSnapshot = await firestore.collection('notification_tasks')
      .where('status', '==', 'pending')
      .where('sendAt', '<=', now)
      .get();

    if (tasksSnapshot.empty) {
      return NextResponse.json({ success: true, message: 'Nenhuma notificação para enviar.' });
    }
    
    const sentTasksIds: string[] = [];
    const promises: Promise<any>[] = [];

    // 4. Envia as notificações usando a API REST
    tasksSnapshot.forEach(doc => {
      const task = doc.data() as Omit<NotificationTask, 'id'>;
      
      // A API REST legada usa uma estrutura ligeiramente diferente do payload do SDK Admin.
      // O 'token' vira 'to'.
      const fcmMessage = {
        to: task.fcmToken,
        notification: task.payload.notification,
        data: task.payload.data,
      };

      const sendPromise = fetch(FCM_SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${serverKey}`,
        },
        body: JSON.stringify(fcmMessage),
      })
      .then(async response => {
        const responseBody = await response.json();
        if (!response.ok || responseBody.failure > 0) {
          console.error(`Falha ao enviar notificação para ${task.userId}. Resposta:`, responseBody.results);
          throw new Error(`FCM API Error: ${response.status} - ${JSON.stringify(responseBody)}`);
        }
        console.log('Notificação enviada com sucesso para o usuário:', task.userId);
        sentTasksIds.push(doc.id);
        return responseBody;
      })
      .catch(error => {
        console.error('Erro no fetch da notificação para o token:', task.fcmToken, error);
        return doc.ref.update({ status: 'error' });
      });
      
      promises.push(sendPromise);
    });

    await Promise.all(promises);

    // 5. Deleta as tarefas enviadas com sucesso
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
