
'use client';

import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { initializeFirebase } from "@/firebase";

const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // This is a placeholder

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
  
  const { firebaseApp } = initializeFirebase();
  if (!firebaseApp) {
    console.error("Firebase app not initialized.");
    return null;
  }
  
  const messaging = getMessaging(firebaseApp);
  
  // 1. Check current permission status
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    console.log('Notification permission has been denied.');
    return null;
  }
  
  // 2. Request permission if not granted (this will prompt the user)
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
          console.log('Permission not granted for Notification');
          return null;
      }
  }

  // 3. Get the token
  try {
    // IMPORTANT: You need to generate a VAPID key in your Firebase project settings
    // and replace the placeholder above.
    // Go to Firebase Console > Project Settings > Cloud Messaging > Web configuration > Generate key pair.
    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (currentToken) {
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      // This case is rare if permission is already granted.
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
}
