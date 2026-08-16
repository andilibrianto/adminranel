// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyDmDyI5olQ2a0zaxLIASH3EglRfsAmE7-Q",
    authDomain: "ranel-cell.firebaseapp.com",
    projectId: "ranel-cell",
    storageBucket: "ranel-cell.firebasestorage.app",
    messagingSenderId: "267696476787",
    appId: "1:267696476787:web:5fda181cfdaeec413e5006"
};

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

// Tangani notifikasi saat aplikasi di latar belakang / ditutup
    messaging.onBackgroundMessage((payload) => {
    console.log('Notifikasi diterima di background: ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'Logo_WH_intuls-removebg-preview.png',
        badge: 'Logo_WH_intuls-removebg-preview.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Tangani klik notifikasi
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const urlToOpen = event.notification.data.url || './index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    client.postMessage({ type: 'OPEN_ORDER_DETAIL', orderId: event.notification.data.orderId });
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});
// Tangkap event push secara eksplisit agar PWABuilder mendeteksinya
self.addEventListener('push', event => {
    // Biarkan Firebase SDK yang menangani notifikasinya
    event.waitUntil(
        self.registration.showNotification('RANEL CELL', {
            body: 'Memuat data pesanan...'
        })
    );
});