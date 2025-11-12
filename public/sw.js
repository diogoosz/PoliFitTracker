
// Use um nome de cache exclusivo para evitar conflitos
const CACHE_NAME = 'poli-fit-tracker-cache-v1';

// Arquivos para fazer cache offline
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon.svg',
  // Adicione outros recursos estáticos que você deseja armazenar em cache
  // ex: /styles/main.css, /scripts/main.js
];

self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Arquivos em cache com sucesso');
        return self.skipWaiting(); // Força a ativação do novo SW
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  // Remove caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Ativado e pronto para controlar a página');
        return self.clients.claim(); // Torna-se o SW ativo para todas as abas abertas
    })
  );
});

self.addEventListener('fetch', event => {
    // Estratégia "cache first" para recursos cacheados
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o recurso estiver no cache, retorna do cache
        if (response) {
          return response;
        }
        // Caso contrário, busca na rede
        return fetch(event.request);
      })
  );
});

// ====================================================================
// LÓGICA DE NOTIFICAÇÃO DE TREINO
// ====================================================================

let workoutState = {
  startTime: null,
  photoTimers: [],
  photoInterval1: null,
  photoInterval2: null
};

// Função para gerar um tempo aleatório dentro de um intervalo em segundos
function getRandomTimeInMs(minSeconds, maxSeconds) {
    const minMs = minSeconds * 1000;
    const maxMs = maxSeconds * 1000;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Função para agendar uma notificação
function scheduleNotification(delay, title, body, tag) {
    const timerId = setTimeout(() => {
        self.registration.showNotification(title, {
            body: body,
            icon: '/apple-icon.png',
            badge: '/icon.svg',
            tag: tag
        });
        // Comunica à página que é hora de tirar a foto
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'REQUEST_PHOTO', index: tag === 'photo-1' ? 0 : 1 });
            });
        });
    }, delay);
    return timerId;
}

// Limpa todos os agendamentos pendentes
function clearAllTimers() {
    workoutState.photoTimers.forEach(timerId => clearTimeout(timerId));
    workoutState.photoTimers = [];
    workoutState.startTime = null;
    workoutState.photoInterval1 = null;
    workoutState.photoInterval2 = null;
}

self.addEventListener('message', event => {
    const { type, payload } = event.data;

    if (type === 'START_WORKOUT') {
        console.log('SW: Início do treino recebido', payload);
        clearAllTimers(); // Garante que não há agendamentos antigos
        
        workoutState.startTime = payload.startTime;
        workoutState.photoInterval1 = payload.photoInterval1;
        workoutState.photoInterval2 = payload.photoInterval2;

        const photoTime1 = getRandomTimeInMs(payload.photoInterval1.min, payload.photoInterval1.max);
        const photoTime2 = getRandomTimeInMs(payload.photoInterval2.min, payload.photoInterval2.max);
        
        console.log(`SW: Agendando foto 1 para ${photoTime1 / 1000 / 60} min`);
        console.log(`SW: Agendando foto 2 para ${photoTime2 / 1000 / 60} min`);

        const timer1 = scheduleNotification(photoTime1, 'Poli Fit Tracker', 'Hora da primeira foto de verificação!', 'photo-1');
        const timer2 = scheduleNotification(photoTime2, 'Poli Fit Tracker', 'Hora da segunda foto de verificação!', 'photo-2');
        
        workoutState.photoTimers.push(timer1, timer2);
    }

    if (type === 'STOP_WORKOUT') {
        console.log('SW: Parada do treino recebida');
        clearAllTimers();
    }
    
    // Este caso pode ser usado para depuração ou re-sincronização
    if (type === 'CHECK_PENDING_NOTIFICATIONS') {
       // A lógica de `setTimeout` já lida com isso. 
       // Se o SW foi "morto" e reiniciado, o tempo já passou e as notificações não serão disparadas.
       // Uma lógica mais avançada poderia recalcular, mas por agora, mantemos simples.
       console.log('SW: Verificação de notificações pendentes solicitada.');
    }
});

    