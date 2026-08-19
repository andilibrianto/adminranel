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
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { title, body, imageUrl, scheduleType, scheduleOption, scheduledTime, frequency, recurringTime, startDate, endDate } = req.body;

        // Skenario 1: Kirim Langsung (Now)
        if (scheduleType === 'one_time' && scheduleOption === 'now') {
            const tokensSnapshot = await db.collection('user_tokens').get();
            const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

            if (tokens.length === 0) {
                return res.status(200).json({ message: 'Tidak ada pengguna online (token kosong)' });
            }

            const message = {
                notification: { title, body, ...(imageUrl && { image: imageUrl }) },
                tokens: tokens
            };

            await admin.messaging().sendEachForMulticast(message);
            return res.status(200).json({ success: true, message: 'Notifikasi promosi berhasil dikirim ke semua user!' });
        }

        // Skenario 2: Simpan Jadwal ke Firestore (Scheduled / Recurring)
        const promoRef = db.collection('scheduled_promotions').doc();
        const scheduleData = {
            id: promoRef.id,
            title,
            body,
            imageUrl: imageUrl || '',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (scheduleType === 'one_time' && scheduleOption === 'scheduled') {
            scheduleData.type = 'one_time';
            scheduleData.scheduledTime = new Date(scheduledTime).toISOString();
        } else if (scheduleType === 'recurring') {
            scheduleData.type = 'recurring';
            scheduleData.frequency = frequency;
            scheduleData.recurringTime = recurringTime;
            scheduleData.startDate = startDate;
            scheduleData.endDate = endDate || null;
            scheduleData.lastSent = null;
        }

        await promoRef.set(scheduleData);
        return res.status(200).json({ success: true, message: 'Jadwal promosi berhasil disimpan! Akan dikirim otomatis oleh sistem.' });

    } catch (error) {
        console.error("Error sending promo:", error);
        return res.status(500).json({ error: error.message });
    }
};