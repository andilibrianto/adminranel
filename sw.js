const CACHE_NAME = 'ranel-admin-0.0.0.3.5';
const urlsToCache = [
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(cacheNames => Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))));
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('index.html') || event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request));
        return;
    }
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
// Tangkap event saat notifikasi diklik
self.addEventListener('notificationclick', event => {
    event.notification.close(); // Tutup notifikasinya

    const orderId = event.notification.data.orderId;
    const urlToOpen = event.notification.data.url || './index.html';

    // Buka aplikasi Admin dan fokus ke layar
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    // Jika aplikasi sedang terbuka, kirim pesan agar langsung buka modal
                    client.postMessage({ type: 'OPEN_ORDER_DETAIL', orderId: orderId });
                    return client.focus();
                }
            }
            // Jika aplikasi tertutup, buka tab baru dengan URL berparameter
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});