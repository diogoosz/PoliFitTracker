import * as admin from 'firebase-admin';

// This function should be called in server-side code (e.g., Server Actions, API routes).
export function initializeServerApp() {
  // Check if the default app is already initialized
  if (admin.apps.length > 0) {
    return {
      app: admin.app(),
      firestore: admin.firestore(),
    };
  }
  
  const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountString) {
      throw new Error('The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
  }

  try {
      const serviceAccount = JSON.parse(serviceAccountString);
      
      const app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: 'studio-4662689289-857d9.appspot.com'
      });
      
      return {
          app,
          firestore: admin.firestore(),
      };
  } catch (error) {
      console.error("Failed to parse or initialize Firebase Admin SDK:", error);
      throw new Error("Could not initialize Firebase Admin. Please check the GOOGLE_APPLICATION_CREDENTIALS environment variable format.");
  }
}
