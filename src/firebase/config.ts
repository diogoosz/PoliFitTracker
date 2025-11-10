
// This file dynamically loads Firebase configuration from environment variables.
// It allows for separate configurations for development and production environments.

const firebaseConfigValues = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// We only build the config object if the essential keys are present.
// Otherwise, Firebase initialization will fail.
const areAllVarsDefined = 
    !!firebaseConfigValues.apiKey &&
    !!firebaseConfigValues.authDomain &&
    !!firebaseConfigValues.projectId;

export const firebaseConfig = areAllVarsDefined ? firebaseConfigValues : undefined;

// Simple validation to ensure that the environment variables are set.
if (areAllVarsDefined && (
  !firebaseConfigValues.apiKey ||
  !firebaseConfigValues.projectId ||
  !firebaseConfigValues.authDomain
)) {
  // This error will be caught during development if the .env.local file is not set up correctly.
  // In production, these variables must be set in the hosting environment.
  console.error("Firebase environment variables are not set. Please check your .env.local file or hosting configuration.");
}
