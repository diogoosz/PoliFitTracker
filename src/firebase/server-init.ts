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
  
  const serviceAccountString = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!serviceAccountString) {
      throw new Error('The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
  }
  if (!storageBucket) {
    throw new Error('The NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not set.')
  }

  try {
      // If the service account is a stringified JSON, parse it.
      // Otherwise, assume it's a file path (for non-Vercel environments).
      const serviceAccount = JSON.parse(serviceAccountString);
      
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
      // This catch block handles cases where the env var is not a valid JSON string.
      // We can add logic here to try loading from a file path if needed.
      console.error("Failed to parse or initialize Firebase Admin SDK from environment variable:", error);
      throw new Error("Could not initialize Firebase Admin. Check the GOOGLE_APPLICATION_CREDENTIALS format.");
  }
}
