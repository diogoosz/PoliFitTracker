
// This file dynamically loads Firebase configuration from a separate, untracked file.
// This ensures the main logic works while keeping credentials separate.
import { firebaseConfigValues } from './firebase-config-real';

// We only build the config object if the essential keys are present.
// Otherwise, Firebase initialization will fail.
const areAllVarsDefined = 
    !!firebaseConfigValues &&
    !!firebaseConfigValues.apiKey &&
    !!firebaseConfigValues.authDomain &&
    !!firebaseConfigValues.projectId;

// The export will be `undefined` if the config is incomplete, preventing Firebase from initializing.
export const firebaseConfig = areAllVarsDefined ? firebaseConfigValues : undefined;

if (!areAllVarsDefined) {
  // This warning will appear in the browser console if the config file is missing or incomplete.
  console.error(
    "A configuração do Firebase não foi encontrada ou está incompleta. " +
    "Verifique se o arquivo `src/firebase/firebase-config-real.ts` existe e contém os valores corretos."
  );
}
