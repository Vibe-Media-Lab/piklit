import { verifyFirebaseToken } from './lib/auth.js';
import { listDocs, getDoc, setDoc, removeFields } from './lib/firestore.js';
import { isAdmin } from './lib/adminEmails.js';

const BETA_DAYS = 7;
const BETA_FIELDS = [
    'betaActivatedAt', 'betaPlan', 'betaName', 'betaAffiliation',
    'betaDraftCount', 'betaImageCount',
];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let uid, email;
    try {
        const payload = await verifyFirebaseToken(req);
        uid = payload.sub;
        email = payload.email;
    } catch (err) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    if (!isAdmin(email)) {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { action, userId } = req.body || {};

    // 베타 테스터 삭제
    if (action === 'delete') {
        if (!userId) {
            return res.status(400).json({ error: 'userId가 필요합니다.' });
        }
        try {
            await removeFields('users', userId, BETA_FIELDS);

            // 카운트 차감
            const betaMeta = await getDoc('meta', 'beta');
            const currentCount = betaMeta?.activatedCount || 0;
            if (currentCount > 0) {
                await setDoc('meta', 'beta', {
                    activatedCount: currentCount - 1,
                });
            }

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error('Beta delete error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    // 기본: 목록 조회
    try {
        const users = await listDocs('users');
        const betaMeta = await getDoc('meta', 'beta');

        const betaUsers = users
            .filter(u => u.betaActivatedAt)
            .map(u => {
                const diffDays = (Date.now() - new Date(u.betaActivatedAt).getTime()) / (1000 * 60 * 60 * 24);
                const daysLeft = Math.ceil(BETA_DAYS - diffDays);
                return {
                    id: u.id,
                    name: u.betaName || '(이름 없음)',
                    affiliation: u.betaAffiliation || '-',
                    activatedAt: u.betaActivatedAt,
                    daysLeft: Math.max(daysLeft, 0),
                    active: daysLeft > 0,
                    draftCount: u.betaDraftCount || 0,
                    imageCount: u.betaImageCount || 0,
                    monthlyDraftCount: u.draftCount || 0,
                };
            })
            .sort((a, b) => new Date(b.activatedAt) - new Date(a.activatedAt));

        return res.status(200).json({
            total: betaUsers.length,
            active: betaUsers.filter(u => u.active).length,
            expired: betaUsers.filter(u => !u.active).length,
            maxUsers: 100,
            activatedCount: betaMeta?.activatedCount || 0,
            users: betaUsers,
        });
    } catch (err) {
        console.error('Beta admin error:', err);
        return res.status(500).json({ error: err.message });
    }
}
