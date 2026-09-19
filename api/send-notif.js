const admin = require('firebase-admin');

// Inisialisasi Firebase Admin SDK
if (!admin.apps.length) {
    // Ambil Private Key dari Vercel
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Hapus tanda kutip ganda di awal dan akhir jika tidak sengaja terbawa
    if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }
    // Ganti tulisan \n literal menjadi baris baru (enter) yang asli
    if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
        })
    });
}

const db = admin.firestore();

// Fungsi bantu untuk mengirim Header CORS
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
    // Set header CORS untuk semua respons
    setCorsHeaders(res);

    // Tangani preflight request dari browser (Wajib untuk POST request)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

        // 3. Kirim push notification ke semua token Admin
        const response = await admin.messaging().sendEachForMulticast(message);
        
        // Hapus token yang tidak valid
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