
// Service Worker

let photoTimers = [];

// Helper para obter um tempo aleatório em segundos
function getRandomTimeInSeconds(minSeconds, maxSeconds) {
    return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

// Função para agendar uma única notificação
function scheduleNotification(index, delay) {
    const timerId = setTimeout(() => {
        self.registration.showNotification('Hora da Foto!', {
            body: `Abra o app para tirar sua ${index === 0 ? 'primeira' : 'segunda'} foto de verificação.`,
            icon: '/icon-192x192.png',
            tag: `photo-notification-${index}-${Date.now()}` // Tag única para evitar sobreposição
        });

        // Informa ao cliente para abrir a câmera
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'REQUEST_PHOTO', index });
            });
        });

    }, delay * 1000); // Converte segundos para milissegundos

    photoTimers.push(timerId);
}

self.addEventListener('message', event => {
    const { type, payload } = event.data;

    if (type === 'START_WORKOUT') {
        // Limpa timers antigos para garantir que não haja agendamentos duplicados
        photoTimers.forEach(clearTimeout);
        photoTimers = [];

        const { photoInterval1, photoInterval2 } = payload;

        // Calcula os tempos de atraso aleatórios
        const delay1 = getRandomTimeInSeconds(photoInterval1.min, photoInterval1.max);
        const delay2 = getRandomTimeInSeconds(photoInterval2.min, photoInterval2.max);
        
        // Agenda as duas notificações
        scheduleNotification(0, delay1);
        scheduleNotification(1, delay2);
    }

    if (type === 'STOP_WORKOUT') {
        photoTimers.forEach(clearTimeout);
        photoTimers = [];
    }

    if (type === 'CHECK_PENDING_NOTIFICATIONS') {
        // Esta funcionalidade não é mais necessária com a abordagem atual,
        // mas pode ser útil para depuração ou lógica futura.
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                // Verifica se o cliente está visível e foca nele.
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // Se nenhum cliente estiver aberto, abre uma nova janela.
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Força o novo service worker a se tornar ativo
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});
