import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

// This function should be called in server-side code (e.g., Server Actions, API routes).
export function initializeServerApp() {
  // Check if the default app is already initialized
  if (!getApps().length) {
    // If not, initialize it with the config from your project
    const app = initializeApp(firebaseConfig);
    return getSdks(app);
  } else {
    // If it is initialized, just get the app and the SDKs
    const app = getApp();
    return getSdks(app);
  }
}

// Helper to get all the SDK instances
function getSdks(app: FirebaseApp) {
  const firestore = getFirestore(app);
  const storage = getStorage(app);
  return { app, firestore, storage };
}
