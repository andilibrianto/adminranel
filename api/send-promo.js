const admin = require('firebase-admin');

if (!admin.apps.length) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }
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

    try {
        const { title, body, imageUrl } = req.body;

        // Asumsi: Anda menyimpan token FCM pengguna di koleksi 'user_tokens'
        const tokensSnapshot = await db.collection('user_tokens').get();
        const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

        if (tokens.length === 0) {
            return res.status(200).json({ message: 'Tidak ada pengguna online (token kosong)' });
        }

        // Buat payload notifikasi (Hanya menggunakan Step 1, 2, dan 3)
        const message = {
            notification: {
                title: title,
                body: body,
                ...(imageUrl && { image: imageUrl }) // Hanya tambahkan image jika diisi
            },
            tokens: tokens
        };

        // Kirim menggunakan multicast
        const response = await admin.messaging().sendEachForMulticast(message);

        // Hapus token yang tidak valid (unregistered)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            const batch = db.batch();
            const validTokensSnapshot = await db.collection('user_tokens').get();
            validTokensSnapshot.forEach(doc => {
                if (failedTokens.includes(doc.data().token)) {
                    batch.delete(doc.ref);
                }
            });
            await batch.commit();
        }

        return res.status(200).json({ success: true, message: `Notifikasi terkirim ke ${response.successCount} pengguna!` });

    } catch (error) {
        console.error("Error sending promo:", error);
        return res.status(500).json({ error: error.message });
    }
};