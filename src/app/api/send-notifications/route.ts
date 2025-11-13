
import { NextResponse } from 'next/server';
import { initializeServerApp } from '@/firebase/server-init';
import * as admin from 'firebase-admin';
import type { NotificationTask } from '@/lib/types';

export const dynamic = 'force-dynamic';

// URL da API REST do Firebase Cloud Messaging
const FCM_API_URL = `https://fcm.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/messages:send`;

/**
 * Função para obter o token de acesso OAuth2 para autenticar na API FCM.
 */
async function getAccessToken() {
  const { credential } = admin.app();
  const accessToken = await credential.getAccessToken();
  return accessToken.access_token;
}

export async function GET(request: Request) {
  // 1. Segurança do endpoint
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { firestore, app } = initializeServerApp();
    const now = admin.firestore.Timestamp.now();
    
    // 2. Busca por tarefas pendentes
    const tasksSnapshot = await firestore.collection('notification_tasks')
      .where('status', '==', 'pending')
      .where('sendAt', '<=', now)
      .get();

    if (tasksSnapshot.empty) {
      return NextResponse.json({ success: true, message: 'Nenhuma notificação para enviar.' });
    }

    const accessToken = await getAccessToken();
    const sentTasksIds: string[] = [];
    const promises: Promise<any>[] = [];

    // 3. Envia as notificações usando a API REST
    tasksSnapshot.forEach(doc => {
      const task = doc.data() as Omit<NotificationTask, 'id'>;
      
      // O `task.payload` já contém a estrutura da mensagem
      const fcmMessage = {
        message: task.payload,
      };

      const sendPromise = fetch(FCM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(fcmMessage),
      })
      .then(async response => {
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`FCM API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        console.log('Notificação enviada com sucesso para o usuário:', task.userId);
        sentTasksIds.push(doc.id);
        return response.json();
      })
      .catch(error => {
        console.error('Erro ao enviar notificação para o token:', task.fcmToken, error);
        return doc.ref.update({ status: 'error' });
      });
      
      promises.push(sendPromise);
    });

    await Promise.all(promises);

    // 4. Deleta as tarefas enviadas
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
