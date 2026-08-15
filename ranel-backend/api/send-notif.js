const admin = require('firebase-admin');

// Inisialisasi Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            // Ini akan diambil dari Environment Variables Vercel
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { orderId, userName, total, items } = req.body;

        // 1. Ambil semua token FCM Admin yang tersimpan di Firestore
        const tokensSnapshot = await db.collection('admin_tokens').get();
        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

        if (tokens.length === 0) {
            return res.status(200).json({ message: 'Tidak ada admin online (token kosong)' });
        }

        // 2. Susun pesan notifikasi
        let itemsText = items ? items.map(item => item.name).join(', ') : '-';
        if (itemsText.length > 40) itemsText = itemsText.substring(0, 40) + '...';

        const message = {
            notification: {
                title: '🔔 Pesanan Baru RANEL CELL!',
                body: `${userName || 'Pelanggan'} - ${itemsText}\nTotal: Rp ${total.toLocaleString('id-ID')}`
            },
            data: {
                orderId: orderId,
                url: './index.html?orderId=' + orderId
            },
            tokens: tokens
        };

        // 3. Kirim push notification ke semua token Admin
        const response = await admin.messaging().sendMulticast(message);
        
        // Hapus token yang sudah tidak valid (misal admin uninstall aplikasinya)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            // Hapus token error dari Firestore
            const batch = db.batch();
            const validTokensSnapshot = await db.collection('admin_tokens').get();
            validTokensSnapshot.forEach(doc => {
                if (failedTokens.includes(doc.data().token)) {
                    batch.delete(doc.ref);
                }
            });
            await batch.commit();
        }

        return res.status(200).json({ success: true, message: 'Notifikasi terkirim!' });

    } catch (error) {
        console.error("Error sending notification:", error);
        return res.status(500).json({ error: error.message });
    }
}