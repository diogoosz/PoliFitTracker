
import { NextRequest, NextResponse } from 'next/server';
import { initializeServerApp } from '@/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';
import type { NotificationTask } from '@/lib/types';

// ====================================================================
// CONFIGURAÇÃO CENTRALIZADA DO TREINO
// ====================================================================
const WORKOUT_DURATION_MINUTES = 1;
// Primeiro intervalo para foto em % do tempo total de treino
const PHOTO_1_INTERVAL_PERCENT = { min: 0.30, max: 0.55 };
// Segundo intervalo para foto em % do tempo total de treino
const PHOTO_2_INTERVAL_PERCENT = { min: 0.65, max: 0.85 };
// ====================================================================

function getRandomDelayInSeconds(minPercent: number, maxPercent: number): number {
  const totalSeconds = WORKOUT_DURATION_MINUTES * 60;
  const minSeconds = totalSeconds * minPercent;
  const maxSeconds = totalSeconds * maxPercent;
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}


export async function POST(request: NextRequest) {
  try {
    const { fcmToken, userId } = await request.json();
    
    if (!fcmToken || !userId) {
      return NextResponse.json({ success: false, error: 'fcmToken e userId são obrigatórios' }, { status: 400 });
    }

    const { firestore } = initializeServerApp();
    const now = Date.now();

    // Monta o payload base da mensagem FCM
    const createPayload = (title: string, body: string, photoIndex: string, tag: string, link: string) => ({
      token: fcmToken,
      notification: {
          title,
          body,
      },
      data: {
        photoIndex // Use string as per FCM spec
      },
      webpush: {
          notification: {
              icon: '/icon-192x192.png',
              tag,
              renotify: true,
          },
          fcm_options: {
              link
          }
      }
    });
    
    // Tarefa para a primeira foto
    const delay1Seconds = getRandomDelayInSeconds(PHOTO_1_INTERVAL_PERCENT.min, PHOTO_1_INTERVAL_PERCENT.max);
    const sendAt1 = Timestamp.fromMillis(now + delay1Seconds * 1000);
    const payload1 = createPayload(
        'Poli Fit Tracker - Foto 1',
        'Hora da primeira foto de verificação! Toque para abrir a câmera.',
        '0',
        'photo-request-1',
        '/dashboard?photo_prompt=1'
    );
    const task1: Omit<NotificationTask, 'id'> = {
      userId,
      fcmToken,
      payload: payload1,
      sendAt: sendAt1,
      status: 'pending',
    };

    // Tarefa para a segunda foto
    const delay2Seconds = getRandomDelayInSeconds(PHOTO_2_INTERVAL_PERCENT.min, PHOTO_2_INTERVAL_PERCENT.max);
    const sendAt2 = Timestamp.fromMillis(now + delay2Seconds * 1000);
    const payload2 = createPayload(
        'Poli Fit Tracker - Foto 2',
        'Última verificação! Toque para tirar a segunda foto.',
        '1',
        'photo-request-2',
        '/dashboard?photo_prompt=2'
    );
    const task2: Omit<NotificationTask, 'id'> = {
      userId,
      fcmToken,
      payload: payload2,
      sendAt: sendAt2,
      status: 'pending',
    };

    // Salva as duas tarefas no Firestore em um batch
    const batch = firestore.batch();
    const tasksCollection = firestore.collection('notification_tasks');
    batch.set(tasksCollection.doc(), task1);
    batch.set(tasksCollection.doc(), task2);
    await batch.commit();

    return NextResponse.json({ success: true, message: 'Notificações agendadas com sucesso.' });

  } catch (error) {
    console.error('Erro ao agendar notificações:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
