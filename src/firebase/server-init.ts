import * as admin from 'firebase-admin';

// Esta função deve ser chamada no código do lado do servidor (por exemplo, Server Actions, rotas de API).
export function initializeServerApp() {
  // Verifica se o aplicativo padrão já foi inicializado
  if (admin.apps.length > 0) {
    return {
      app: admin.app(),
      firestore: admin.firestore(),
      storage: admin.storage(),
    };
  }

  // Utiliza as variáveis de ambiente para construir as credenciais
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('As variáveis de ambiente do Firebase (PROJECT_ID, PRIVATE_KEY, CLIENT_EMAIL) não estão definidas corretamente.');
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    throw new Error('A variável de ambiente NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET não está definida.');
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    return {
      app,
      firestore: admin.firestore(),
      storage: admin.storage(),
    };
  } catch (error) {
    console.error("Falha ao inicializar o Firebase Admin SDK:", error);
    throw new Error("Não foi possível inicializar o Firebase Admin. Verifique as variáveis de ambiente do Firebase.");
  }
}
