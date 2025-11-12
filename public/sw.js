// /public/sw.js

// Estado para armazenar o tempo de início do treino e os tempos de notificação.
let workoutStartTime = null;
let notificationTimes = [];

// Função para gerar um tempo aleatório em milissegundos dentro de um intervalo.
const getRandomTimeInMs = (minSeconds, maxSeconds) => 
  (Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds) * 1000;

// Função para agendar as notificações.
function scheduleNotifications(startTime) {
  // Cancela quaisquer notificações antigas para garantir que não haja sobreposição.
  self.registration.getNotifications({ tag: 'photo-prompt-0' }).then(notifications => notifications.forEach(n => n.close()));
  self.registration.getNotifications({ tag: 'photo-prompt-1' }).then(notifications => notifications.forEach(n => n.close()));

  const minWorkoutSeconds = 40 * 60;

  // Calcula os tempos de disparo em milissegundos a partir do início do treino.
  const promptTimes = [
    getRandomTimeInMs(1 * 60, 20 * 60), 
    getRandomTimeInMs(21 * 60, minWorkoutSeconds - (1 * 60))
  ].sort((a, b) => a - b); // Garante que os tempos estejam em ordem.

  notificationTimes = promptTimes.map(time => startTime + time);

  // Agenda a primeira notificação.
  setTimeout(() => {
    self.registration.showNotification('Poli Fit Tracker', {
      body: 'Hora da sua 1ª verificação! Clique para tirar a foto.',
      icon: '/icon.svg',
      tag: 'photo-prompt-0'
    });
  }, promptTimes[0]);

  // Agenda a segunda notificação.
  setTimeout(() => {
    self.registration.showNotification('Poli Fit Tracker', {
      body: 'Hora da sua 2ª verificação! Clique para tirar a foto.',
      icon: '/icon.svg',
      tag: 'photo-prompt-1'
    });
  }, promptTimes[1]);
}


self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Limpa estados antigos quando um novo service worker é ativado.
  workoutStartTime = null;
  notificationTimes = [];
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  if (type === 'START_WORKOUT') {
    workoutStartTime = payload.startTime;
    scheduleNotifications(workoutStartTime);
  }

  if (type === 'STOP_WORKOUT') {
    // Limpa o estado quando o treino é interrompido.
    workoutStartTime = null;
    notificationTimes = [];
    // Cancela quaisquer notificações pendentes.
    self.registration.getNotifications({ tag: 'photo-prompt-0' }).then(notifications => notifications.forEach(n => n.close()));
    self.registration.getNotifications({ tag: 'photo-prompt-1' }).then(notifications => notifications.forEach(n => n.close()));
  }
});


self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Se um cliente (aba do app) já estiver aberto, foque nele.
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não houver cliente aberto, abra uma nova janela.
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
