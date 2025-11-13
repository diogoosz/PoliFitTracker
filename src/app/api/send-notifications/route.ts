
import { NextResponse } from 'next/server';
import { initializeServerApp } from '@/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';
import type { NotificationTask } from '@/lib/types';
import { GoogleAuth } from 'google-auth-library';

export const dynamic = 'force-dynamic';

// Esta função obtém um token de acesso OAuth2 para a API do FCM v1.
// É mais seguro do que usar a chave de servidor legada, pois usa as credenciais de serviço.
async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }
  });
  const token = await auth.getAccessToken();
  return token;
}

export async function GET(request: Request) {
  // 1. Segurança do endpoint com o segredo do Cron Job
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('CRON de Notificações: NEXT_PUBLIC_FIREBASE_PROJECT_ID não está definida.');
    return new Response('Configuração do servidor incompleta.', { status: 500 });
  }

  try {
    const { firestore } = initializeServerApp();
    const now = Timestamp.now();
    
    // 2. Busca por tarefas pendentes que já deveriam ter sido enviadas
    // Esta é a query que precisava do índice que você criou.
    const tasksSnapshot = await firestore.collection('notification_tasks')
      .where('status', '==', 'pending')
      .where('sendAt', '<=', now)
      .get();

    if (tasksSnapshot.empty) {
      return NextResponse.json({ success: true, message: 'Nenhuma notificação para enviar.' });
    }
    
    console.log(`Encontradas ${tasksSnapshot.size} notificações para enviar.`);

    const accessToken = await getAccessToken();
    const fcmSendUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    const sentTasksIds: string[] = [];
    const promises: Promise<any>[] = [];

    // 3. Itera sobre as tarefas e envia as notificações
    tasksSnapshot.forEach(doc => {
      const task = doc.data() as Omit<NotificationTask, 'id'>;
      
      // O 'payload' salvo no Firestore já está na estrutura correta para a API FCM v1
      const fcmMessage = {
        message: task.payload
      };

      const sendPromise = fetch(fcmSendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(fcmMessage),
      })
      .then(async response => {
        if (!response.ok) {
          const errorBody = await response.json();
          console.error(`Falha ao enviar notificação para ${task.userId}. Status: ${response.status}`, errorBody);
          // Atualiza a tarefa para 'error' para não tentar reenviar
          return firestore.collection('notification_tasks').doc(doc.id).update({ status: 'error' });
        }
        console.log('Notificação enviada com sucesso para o usuário:', task.userId);
        sentTasksIds.push(doc.id);
        return response.json();
      })
      .catch(error => {
        console.error('Erro no fetch da notificação para o token:', task.fcmToken, error);
        // Marca como erro para análise posterior
        return firestore.collection('notification_tasks').doc(doc.id).update({ status: 'error' });
      });
      
      promises.push(sendPromise);
    });

    await Promise.allSettled(promises);

    // 4. Deleta as tarefas que foram enviadas com sucesso
    if (sentTasksIds.length > 0) {
      const batch = firestore.batch();
      sentTasksIds.forEach(id => {
        batch.delete(firestore.collection('notification_tasks').doc(id));
      });
      await batch.commit();
      console.log(`${sentTasksIds.length} tarefas de notificação deletadas com sucesso.`);
    }

    const message = `Processamento de notificações concluído. ${sentTasksIds.length} enviadas.`;
    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Erro durante a execução do cron de notificações:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    // Retorna uma resposta de erro, mas com status 200 para o cron-job.org não marcar como falha
    // O erro real já foi logado no servidor da Vercel para análise.
    return NextResponse.json({ success: false, error: errorMessage });
  }
}
