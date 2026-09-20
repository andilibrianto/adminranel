const admin = require('firebase-admin');

// PERBAIKAN: Cek aman untuk mencegah server crash (TypeError)
try {
    if (!admin.apps || !admin.apps.length) {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        if (privateKey) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey
                })
            });
        } else {
            console.error("Firebase Admin Environment Variables belum disetting di Vercel!");
        }
    }
} catch (error) {
    console.error("Gagal inisialisasi Firebase Admin:", error);
}

// Ambil db hanya jika Firebase berhasil jalan, jika tidak biarkan null
const db = (admin.apps && admin.apps.length > 0) ? admin.firestore() : null;

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Jika Firebase gagal jalan, kirim pesan error yang rapi tanpa crash
    if (!db) {
        return res.status(500).json({ error: "Server Admin belum siap. Cek Environment Variables Firebase di Vercel." });
    }

    try {
        const { orderId, userName, total, items } = req.body;

        const tokensSnapshot = await db.collection('admin_tokens').get();
        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

        if (tokens.length === 0) {
            return res.status(200).json({ message: 'Tidak ada admin online (token kosong)' });
        }

        let itemsText = items ? items.map(item => item.name).join(', ') : '-';
        if (itemsText.length > 40) itemsText = itemsText.substring(0, 40) + '...';

        const message = {
            data: {
                title: '🔔 Pesanan Baru RANEL CELL!',
                body: `${userName || 'Pelanggan'} - ${itemsText}\nTotal: Rp ${total.toLocaleString('id-ID')}`,
                orderId: String(orderId),
                url: './index.html?orderId=' + orderId,
                userName: String(userName || ''),
                total: String(total || 0),
                items: JSON.stringify(items || [])
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
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
};