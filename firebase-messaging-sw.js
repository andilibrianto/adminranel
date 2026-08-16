// Import Firebase Compat (Wajib pakai -compat.js untuk Service Worker)
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

// Force Service Worker untuk langsung aktif
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

// Tangani klik notifikasi
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    // Pastikan orderId selalu berupa String
    const orderId = String(event.notification.data?.orderId || '');
    const urlToOpen = event.notification.data?.url || './index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                // Cek apakah ini adalah aplikasi admin kita
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    // Kirim pesan ke aplikasi agar langsung buka modal detail
                    client.postMessage({ type: 'OPEN_ORDER_DETAIL', orderId: orderId });
                    return client.focus();
                }
            }
            // Jika aplikasi tertutup, buka tab baru dengan URL berparameter
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});