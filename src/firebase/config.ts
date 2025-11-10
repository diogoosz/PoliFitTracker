// Este arquivo contém a configuração do Firebase.
// Substitua os valores de exemplo pelos valores do seu projeto no Firebase.

// IMPORTANTE: Este método, com chaves diretamente no código, é mais simples mas menos seguro.
// Funciona, mas o ideal no futuro seria usar variáveis de ambiente.
// Por agora, vamos voltar ao que funcionava para resolver o problema.

const firebaseConfigValues = {
  apiKey: "AIzaSy... (COLE SEU VALOR AQUI)",
  authDomain: "seu-projeto.firebaseapp.com (COLE SEU VALOR AQUI)",
  projectId: "seu-projeto (COLE SEU VALOR AQUI)",
  storageBucket: "seu-projeto.appspot.com (COLE SEU VALOR AQUI)",
  messagingSenderId: "12345... (COLE SEU VALOR AQUI)",
  appId: "1:12345... (COLE SEU VALOR AQUI)",
};


// Verificação simples para garantir que os valores de exemplo foram alterados.
const areAllVarsDefined =
  !!firebaseConfigValues.apiKey &&
  !firebaseConfigValues.apiKey.startsWith("AIzaSy...") &&
  !!firebaseConfigValues.authDomain &&
  !!firebaseConfigValues.projectId;

// Exporta a configuração para ser usada em outros lugares do aplicativo.
export const firebaseConfig = areAllVarsDefined ? firebaseConfigValues : undefined;

if (!areAllVarsDefined) {
  console.error(
    "A configuração do Firebase não foi definida ou ainda está com os valores de exemplo. " +
    "Por favor, edite o arquivo `src/firebase/config.ts` com as chaves do seu projeto."
  );
}
