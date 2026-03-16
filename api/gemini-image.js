import { verifyFirebaseToken } from './_lib/auth.js';
import { getDoc, setDoc } from './_lib/firestore.js';

const PROMO_DAYS = 30;
const BETA_DAYS = 7;
const BETA_IMAGE_LIMIT = 5;

function isWithinPromo(createdAt) {
    if (!createdAt) return false;
    const diffDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= PROMO_DAYS;
}

function isActiveBeta(userData) {
    if (!userData?.betaActivatedAt) return false;
    const diffDays = (Date.now() - new Date(userData.betaActivatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= BETA_DAYS;
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let uid;
    try {
        const payload = await verifyFirebaseToken(req);
        uid = payload.sub;
    } catch (err) {
        return res.status(401).json({ error: '인증 실패: ' + err.message });
    }

    try {
        const { body, userApiKey } = req.body;

        // AI 이미지 생성: BYOK 또는 첫 달 프로모션
        if (!userApiKey) {
            let userData = await getDoc('users', uid);

            // 첫 방문: createdAt 기록
            if (!userData) {
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const newUser = {
                    draftCount: 0,
                    lastDraftMonth: currentMonth,
                    createdAt: now.toISOString(),
                };
                await setDoc('users', uid, newUser);
                userData = newUser;
            } else if (!userData.createdAt) {
                await setDoc('users', uid, { createdAt: new Date().toISOString() });
                userData.createdAt = new Date().toISOString();
            }

            // 베타 테스터: 5장 한정
            if (isActiveBeta(userData)) {
                const used = userData.betaImageCount || 0;
                if (used >= BETA_IMAGE_LIMIT) {
                    return res.status(403).json({
                        error: `베타 테스터 AI 이미지 생성 ${BETA_IMAGE_LIMIT}장이 소진되었습니다. Pro 플랜에서 무제한으로 사용할 수 있습니다.`,
                        code: 'BETA_IMAGE_LIMIT',
                    });
                }
                // 카운트 증가 (성공 전 선차감)
                await setDoc('users', uid, { betaImageCount: used + 1 });
            } else if (!isWithinPromo(userData.createdAt)) {
                return res.status(403).json({
                    error: 'AI 이미지 생성은 API 키 등록 후 사용 가능합니다. 설정에서 API 키를 등록해주세요.',
                    code: 'BYOK_REQUIRED',
                });
            }
        }

        const apiKey = userApiKey || process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error('Gemini image proxy error:', err);
        return res.status(500).json({ error: err.message });
    }
}
