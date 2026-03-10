import { verifyFirebaseToken } from './lib/auth.js';
import { listDocs, getDoc } from './lib/firestore.js';
import { isAdmin } from './lib/adminEmails.js';

const BETA_DAYS = 7;

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

    try {
        const users = await listDocs('users');
        const betaMeta = await getDoc('meta', 'beta');

        // 베타 활성화된 사용자만 필터
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
