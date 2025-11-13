
import * as admin from 'firebase-admin';

// Esta função deve ser chamada no código do lado do servidor (por exemplo, Server Actions, rotas de API).
export function initializeServerApp() {
  // Se o app já foi inicializado, retorna as instâncias existentes.
  // Isso evita erros de "app já existe" em ambientes serverless.
  if (admin.apps.length > 0) {
    return {
      app: admin.app(),
      firestore: admin.firestore(),
      storage: admin.storage(),
    };
  }

  // Valida se as variáveis de ambiente necessárias estão presentes.
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error('As variáveis de ambiente do Firebase Admin (PROJECT_ID, PRIVATE_KEY, CLIENT_EMAIL) não estão definidas corretamente.');
  }
  if (!storageBucket) {
    throw new Error('A variável de ambiente NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET não está definida.');
  }

  try {
    // Inicializa o Firebase Admin SDK com as credenciais das variáveis de ambiente.
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
      storageBucket,
    });

    return {
      app,
      firestore: admin.firestore(),
      storage: admin.storage(),
    };
  } catch (error) {
    console.error("Falha ao inicializar o Firebase Admin SDK:", error);
    throw new Error("Não foi possível inicializar o Firebase Admin. Verifique as credenciais da conta de serviço nas variáveis de ambiente.");
  }
}
