
'use client';

import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { initializeFirebase } from "@/firebase";

// A chave VAPID agora é lida das variáveis de ambiente
const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;

/**
 * Gets the Firebase Cloud Messaging (FCM) token for the user.
 * This function will prompt the user for notification permission if not already granted.
 * @returns {Promise<string | null>} The FCM token, or null if permission is denied or unsupported.
 */
export async function getFCMToken(): Promise<string | null> {
  const isMessagingSupported = await isSupported();
  if (!isMessagingSupported) {
    console.warn("Firebase Messaging is not supported in this browser.");
    return null;
  }

  // Verifica se a chave VAPID foi configurada corretamente.
  if (!VAPID_KEY) {
      console.error("VAPID key is not configured. Check NEXT_PUBLIC_VAPID_KEY environment variable.");
      return null;
  }
  
  const { firebaseApp } = initializeFirebase();
  if (!firebaseApp) {
    console.error("Firebase app not initialized.");
    return null;
  }
  
  const messaging = getMessaging(firebaseApp);
  
  // 1. Pede a permissão primeiro, se necessário.
  // A biblioteca do Firebase lida com a verificação se já foi negado ou concedido.
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permission not granted for Notification');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission', error);
    return null;
  }

  // 2. Se a permissão for concedida, obtém o token.
  try {
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
}
