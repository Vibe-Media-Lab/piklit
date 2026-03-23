import { verifyFirebaseToken } from './_lib/auth.js';
import { getDoc, setDoc, listDocs } from './_lib/firestore.js';

const MONTHLY_LIMIT = 3;
const PROMO_DAYS = 30;
const BETA_DAYS = 7;
const BETA_DRAFT_LIMIT = 21;

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

        // 첫 방문: createdAt 기록 + 디스코드 알림
        if (!userData) {
            const newUser = {
                draftCount: 0,
                lastDraftMonth: currentMonth,
                createdAt: now.toISOString(),
            };
            await setDoc('users', uid, newUser);
            userData = newUser;
            // 신규 가입 디스코드 알림 (비동기, 실패해도 무시)
            sendSignupAlert(uid, req).catch(() => {});
        } else if (!userData.createdAt) {
            await setDoc('users', uid, { createdAt: now.toISOString() });
            userData.createdAt = now.toISOString();
        }

        let used = 0;
        if (userData.lastDraftMonth === currentMonth) {
            used = userData.draftCount || 0;
        }

        // 베타 테스터 상태 계산
        let isBeta = false;
        let betaUsed = 0;
        let betaDaysLeft = 0;
        if (userData.betaActivatedAt) {
            const betaDiff = (Date.now() - new Date(userData.betaActivatedAt).getTime()) / (1000 * 60 * 60 * 24);
            if (betaDiff <= BETA_DAYS) {
                isBeta = true;
                betaUsed = userData.betaDraftCount || 0;
                betaDaysLeft = Math.ceil(BETA_DAYS - betaDiff);
            }
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
            isBeta,
            betaUsed,
            betaLimit: BETA_DRAFT_LIMIT,
            betaDaysLeft,
        });
    } catch (err) {
        console.error('Usage API error:', err);
        return res.status(500).json({ error: err.message });
    }
}

async function sendSignupAlert(uid, req) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    // 총 가입자 수 집계
    let totalUsers = '?';
    try {
        const allUsers = await listDocs('users');
        totalUsers = allUsers.length;
    } catch { /* ignore */ }

    const time = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    try {
        await fetch(webhookUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: '👋 새 회원 가입',
                    color: 0x3B82F6,
                    fields: [
                        { name: '가입 시간', value: time },
                        { name: '누적 가입', value: `${totalUsers}명`, inline: true },
                    ],
                }],
            }),
        });
    } catch (e) {
        console.error('Discord signup webhook error:', e.message);
    }
}
