import { verifyFirebaseToken } from './lib/auth.js';
import { getDoc, setDoc } from './lib/firestore.js';

const BETA_CODE = process.env.BETA_CODE || 'PIKLIT-VIP';
const BETA_MAX_USERS = 100;
const BETA_DAYS = 7;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let uid;
    try {
        const payload = await verifyFirebaseToken(req);
        uid = payload.sub;
    } catch (err) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { action, code, name, affiliation } = req.body || {};

    // 베타 상태 조회
    if (action === 'status') {
        try {
            const userData = await getDoc('users', uid);
            if (!userData?.betaActivatedAt) {
                return res.status(200).json({ active: false });
            }
            const diffDays = (Date.now() - new Date(userData.betaActivatedAt).getTime()) / (1000 * 60 * 60 * 24);
            const daysLeft = Math.ceil(BETA_DAYS - diffDays);
            if (daysLeft <= 0) {
                // 만료 시 사용 통계 포함
                const usageData = await getDoc('usage', uid);
                return res.status(200).json({
                    active: false,
                    expired: true,
                    betaDays: Math.floor(diffDays),
                    stats: {
                        postsCreated: usageData?.monthlyCount || 0,
                        aiActions: usageData?.totalAiActions || 0,
                    },
                });
            }
            return res.status(200).json({
                active: true,
                plan: userData.betaPlan || 'pro',
                daysLeft,
                activatedAt: userData.betaActivatedAt,
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 베타 코드 활성화
    if (action === 'activate') {
        if (!code || code.trim().toUpperCase() !== BETA_CODE) {
            return res.status(400).json({ error: '유효하지 않은 베타 코드입니다.' });
        }

        try {
            // 이미 활성화된 사용자인지 확인
            const userData = await getDoc('users', uid);
            if (userData?.betaActivatedAt) {
                const diffDays = (Date.now() - new Date(userData.betaActivatedAt).getTime()) / (1000 * 60 * 60 * 24);
                const daysLeft = Math.ceil(BETA_DAYS - diffDays);
                if (daysLeft > 0) {
                    return res.status(200).json({
                        active: true,
                        plan: 'beta',
                        daysLeft,
                        message: '이미 베타 테스터로 활성화되어 있습니다.',
                    });
                }
                // 만료된 경우
                return res.status(400).json({ error: '베타 테스트 기간이 만료되었습니다.' });
            }

            // 현재 베타 활성화 인원 카운트
            const betaMeta = await getDoc('meta', 'beta');
            const currentCount = betaMeta?.activatedCount || 0;

            if (currentCount >= BETA_MAX_USERS) {
                return res.status(400).json({ error: '베타 테스터 모집이 마감되었습니다. (100명 선착순)' });
            }

            // 이름 필수 검증
            if (!name || !name.trim()) {
                return res.status(400).json({ error: '이름을 입력해주세요.' });
            }

            // 활성화 저장
            const now = new Date().toISOString();
            await setDoc('users', uid, {
                betaActivatedAt: now,
                betaPlan: 'beta',
                betaName: name.trim(),
                betaAffiliation: (affiliation || '').trim() || '소속없음',
            });

            // 카운트 증가
            await setDoc('meta', 'beta', {
                activatedCount: currentCount + 1,
                lastActivatedAt: now,
            });

            return res.status(200).json({
                active: true,
                plan: 'beta',
                daysLeft: BETA_DAYS,
                message: `베타 테스터 활성화 완료! ${BETA_DAYS}일간 Beta 기능을 사용할 수 있습니다.`,
            });
        } catch (err) {
            console.error('Beta activation error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(400).json({ error: 'action은 "status" 또는 "activate"만 가능합니다.' });
}
