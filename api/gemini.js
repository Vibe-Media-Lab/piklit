import { verifyFirebaseToken } from './lib/auth.js';
import { getDoc, setDoc } from './lib/firestore.js';

const DRAFT_ACTIONS = ['본문 생성', '맛집 본문 생성'];
const MONTHLY_LIMIT = 3;
const PROMO_DAYS = 30;
const BETA_DAYS = 7;
const BETA_DRAFT_LIMIT = 21;

function isWithinPromo(createdAt) {
    if (!createdAt) return false;
    const diffDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= PROMO_DAYS;
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
        const { body, model, userApiKey, action } = req.body;
        const apiKey = userApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // 글 생성 quota 체크 (서버 키 사용 시에만)
        const isDraftAction = DRAFT_ACTIONS.includes(action);
        let draftCount = 0;
        let currentMonth = '';

        if (isDraftAction && !userApiKey) {
            const now = new Date();
            currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

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

            // 베타 테스터: 7일간 21회 제한
            const isBeta = userData.betaActivatedAt &&
                (Date.now() - new Date(userData.betaActivatedAt).getTime()) / (1000 * 60 * 60 * 24) <= BETA_DAYS;

            if (isBeta) {
                const betaDraftCount = userData.betaDraftCount || 0;
                if (betaDraftCount >= BETA_DRAFT_LIMIT) {
                    return res.status(429).json({
                        error: `베타 테스터 글 생성 ${BETA_DRAFT_LIMIT}회를 모두 사용했습니다. 정식 출시 시 무제한 플랜을 이용해주세요.`,
                        code: 'BETA_QUOTA_EXCEEDED',
                    });
                }
            } else if (!isWithinPromo(userData.createdAt)) {
                // 무료 체험: 월 3회 제한
                if (userData.lastDraftMonth === currentMonth) {
                    draftCount = userData.draftCount || 0;
                }

                if (draftCount >= MONTHLY_LIMIT) {
                    return res.status(429).json({
                        error: `무료 체험 ${MONTHLY_LIMIT}회를 모두 사용했습니다. 설정에서 API 키를 등록하면 무제한 사용 가능합니다.`,
                        code: 'QUOTA_EXCEEDED',
                    });
                }
            }
        }

        const modelId = model || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
        }

        // 글 생성 성공 → count 기록 (프로모션 중에도 집계)
        if (isDraftAction && !userApiKey) {
            const now = new Date();
            if (!currentMonth) {
                currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }
            const userData = await getDoc('users', uid);

            // 베타 테스터 카운트
            const isBeta = userData?.betaActivatedAt &&
                (Date.now() - new Date(userData.betaActivatedAt).getTime()) / (1000 * 60 * 60 * 24) <= BETA_DAYS;
            if (isBeta) {
                await setDoc('users', uid, {
                    betaDraftCount: (userData.betaDraftCount || 0) + 1,
                });
            }

            // 월별 카운트 (항상 기록)
            let count = 0;
            if (userData && userData.lastDraftMonth === currentMonth) {
                count = userData.draftCount || 0;
            }
            await setDoc('users', uid, {
                draftCount: count + 1,
                lastDraftMonth: currentMonth,
            });
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error('Gemini proxy error:', err);
        return res.status(500).json({ error: err.message });
    }
}
