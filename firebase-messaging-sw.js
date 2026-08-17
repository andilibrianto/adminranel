// Import Firebase Compat
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDmDyI5olQ2a0zaxLIASH3EglRfsAmE7-Q",
    authDomain: "ranel-cell.firebaseapp.com",
    projectId: "ranel-cell",
    storageBucket: "ranel-cell.firebasestorage.app",
    messagingSenderId: "267696476787",
    appId: "1:267696476787:web:5fda181cfdaeec413e5006"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Tangani notifikasi saat aplikasi di latar belakang / ditutup
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.data.title || '🔔 Pesanan Baru RANEL CELL!';
    const notificationOptions = {
        body: payload.data.body || '',
        icon: 'Logo_WH_intuls-removebg-preview.png',
        badge: 'Logo_WH_intuls-removebg-preview.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Tangani klik notifikasi
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const orderId = String(event.notification.data?.orderId || '');
    const urlToOpen = event.notification.data?.url || './index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    client.postMessage({ type: 'OPEN_ORDER_DETAIL', orderId: orderId });
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});