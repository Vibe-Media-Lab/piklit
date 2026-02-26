import { verifyFirebaseToken } from './lib/auth.js';
import { getDoc, setDoc } from './lib/firestore.js';

const MONTHLY_LIMIT = 3;
const PROMO_DAYS = 30;

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let uid;
    try {
        const payload = await verifyFirebaseToken(req);
        uid = payload.sub;
    } catch (err) {
        return res.status(401).json({ error: '인증 실패: ' + err.message });
    }

    try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let userData = await getDoc('users', uid);

        // 첫 방문: createdAt 기록
        if (!userData) {
            const newUser = {
                draftCount: 0,
                lastDraftMonth: currentMonth,
                createdAt: now.toISOString(),
            };
            await setDoc('users', uid, newUser);
            userData = newUser;
        } else if (!userData.createdAt) {
            await setDoc('users', uid, { createdAt: now.toISOString() });
            userData.createdAt = now.toISOString();
        }

        let used = 0;
        if (userData.lastDraftMonth === currentMonth) {
            used = userData.draftCount || 0;
        }

        // 프로모션 상태 계산
        let isPromo = false;
        let promoDaysLeft = 0;
        if (userData.createdAt) {
            const diffDays = (Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays <= PROMO_DAYS) {
                isPromo = true;
                promoDaysLeft = Math.ceil(PROMO_DAYS - diffDays);
            }
        }

        return res.status(200).json({
            used,
            limit: MONTHLY_LIMIT,
            isPromo,
            promoDaysLeft,
        });
    } catch (err) {
        console.error('Usage API error:', err);
        return res.status(500).json({ error: err.message });
    }
}
