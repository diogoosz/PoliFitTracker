
import { NextRequest, NextResponse } from 'next/server';
import { initializeServerApp } from '@/firebase/server-init';
import { Timestamp } from 'firebase-admin/firestore';
import type { NotificationTask } from '@/lib/types';

// ====================================================================
// CONFIGURAÇÃO CENTRALIZADA DO TREINO
// ====================================================================
// Primeiro intervalo para foto em minutos (ex: entre 10 e 15 minutos de treino)
const PHOTO_1_INTERVAL_MINUTES = { min: 0.30, max: 0.55 };
// Segundo intervalo para foto em minutos (ex: entre 25 e 35 minutos de treino)
const PHOTO_2_INTERVAL_MINUTES = { min: 0.65, max: 0.85 };
// ====================================================================


function getRandomDelayInSeconds(minMinutes: number, maxMinutes: number): number {
  const minSeconds = minMinutes * 60;
  const maxSeconds = maxMinutes * 60;
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

    // Agendamento da primeira foto
    const delay1Seconds = getRandomDelayInSeconds(PHOTO_1_INTERVAL_MINUTES.min, PHOTO_1_INTERVAL_MINUTES.max);
    const sendAt1 = Timestamp.fromMillis(now + delay1Seconds * 1000);
    const payload1 = {
        token: fcmToken,
        notification: {
            title: 'Poli Fit Tracker - Foto 1',
            body: 'Hora da primeira foto de verificação! Toque para abrir a câmera.',
        },
        data: {
          photoIndex: "0" // Use string as per FCM spec
        },
        webpush: {
            notification: {
                icon: '/icon-192x192.png',
                tag: 'photo-request-1',
                renotify: true,
            },
            fcm_options: {
                link: `/dashboard?photo_prompt=1`
            }
        }
    };
    const task1: NotificationTask = {
      userId,
      fcmToken,
      payload: payload1,
      sendAt: sendAt1,
      status: 'pending',
    };

    // Agendamento da segunda foto
    const delay2Seconds = getRandomDelayInSeconds(PHOTO_2_INTERVAL_MINUTES.min, PHOTO_2_INTERVAL_MINUTES.max);
    const sendAt2 = Timestamp.fromMillis(now + delay2Seconds * 1000);
    const payload2 = {
        token: fcmToken,
        notification: {
            title: 'Poli Fit Tracker - Foto 2',
            body: 'Última verificação! Toque para tirar a segunda foto.',
        },
        data: {
            photoIndex: "1" // Use string as per FCM spec
        },
        webpush: {
            notification: {
                icon: '/icon-192x192.png',
                tag: 'photo-request-2',
                renotify: true,
            },
            fcm_options: {
                link: `/dashboard?photo_prompt=2`
            }
        }
    };
    const task2: NotificationTask = {
      userId,
      fcmToken,
      payload: payload2,
      sendAt: sendAt2,
      status: 'pending',
    };

    // Salva as duas tarefas no Firestore
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

    