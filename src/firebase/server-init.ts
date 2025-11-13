import * as admin from 'firebase-admin';

// This function should be called in server-side code (e.g., Server Actions, API routes).
export function initializeServerApp() {
  // Check if the default app is already initialized
  if (admin.apps.length > 0) {
    return {
      app: admin.app(),
      firestore: admin.firestore(),
      storage: admin.storage(),
    };
  }
  
  const serviceAccountStringOrObject = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!serviceAccountStringOrObject) {
      throw new Error('The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
  }
  if (!storageBucket) {
    throw new Error('The NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not set.')
  }

  try {
      // Vercel can provide the env var as a string or a pre-parsed object.
      // This handles both cases gracefully.
      const serviceAccount = typeof serviceAccountStringOrObject === 'string'
        ? JSON.parse(serviceAccountStringOrObject)
        : serviceAccountStringOrObject;
      
      const app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: storageBucket
      });
      
      return {
          app,
          firestore: admin.firestore(),
          storage: admin.storage()
      };
  } catch (error) {
      console.error("Failed to parse or initialize Firebase Admin SDK from environment variable:", error);
      throw new Error("Could not initialize Firebase Admin. Check the GOOGLE_APPLICATION_CREDENTIALS format.");
  }
}
