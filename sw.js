const CACHE_NAME = 'ranel-admin-0.0.0.2.1';
const urlsToCache = [
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    // Jangan cache admin.html, selalu ambil dari network agar update langsung terbaca
    if (event.request.url.includes('index.html') || event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => caches.match('./index.html'));
        })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) return caches.delete(cacheName);
                })
            );
        })
    );
    self.clients.claim();
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