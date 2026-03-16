import { verifyFirebaseToken } from './_lib/auth.js';
import { getDoc, setDoc, deleteDoc } from './_lib/firestore.js';
import { isAdmin as checkAdmin } from './_lib/adminEmails.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let uid, email;
    try {
        const payload = await verifyFirebaseToken(req);
        uid = payload.sub;
        email = payload.email || '';
    } catch (err) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { action } = req.body || {};

    // 버그 신고 저장
    if (action === 'submit') {
        const { description, consoleLogs, screenshot, url, userAgent } = req.body;

        const reportId = `${uid}_${Date.now()}`;
        try {
            await setDoc('bug-reports', reportId, {
                uid,
                email,
                description: description || '',
                consoleLogs: consoleLogs || '',
                screenshot: screenshot || '',
                url: url || '',
                userAgent: userAgent || '',
                status: 'new',
                createdAt: new Date().toISOString(),
            });

            // 카운트 업데이트
            const meta = await getDoc('meta', 'bug-reports');
            await setDoc('meta', 'bug-reports', {
                totalCount: (meta?.totalCount || 0) + 1,
                lastReportAt: new Date().toISOString(),
            });

            // 디스코드 알림
            await sendDiscordAlert({ email, description, url, reportId });

            return res.status(200).json({ success: true, reportId });
        } catch (err) {
            console.error('Bug report save error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    // 버그 목록 조회 (관리자 전용)
    if (action === 'list') {
        if (!checkAdmin(email)) {
            return res.status(403).json({ error: '접근 권한이 없습니다.' });
        }

        try {
            const result = await listBugReports();
            return res.status(200).json({ reports: result });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 버그 상태 업데이트 (관리자 전용)
    if (action === 'updateStatus') {
        if (!checkAdmin(email)) {
            return res.status(403).json({ error: '접근 권한이 없습니다.' });
        }

        const { reportId, status } = req.body;
        if (!reportId || !status) {
            return res.status(400).json({ error: 'reportId와 status가 필요합니다.' });
        }

        try {
            await setDoc('bug-reports', reportId, { status });
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 버그 리포트 삭제 (관리자 전용)
    if (action === 'delete') {
        if (!checkAdmin(email)) {
            return res.status(403).json({ error: '접근 권한이 없습니다.' });
        }

        const { reportId } = req.body;
        if (!reportId) {
            return res.status(400).json({ error: 'reportId가 필요합니다.' });
        }

        try {
            await deleteDoc('bug-reports', reportId);
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(400).json({ error: 'action은 "submit", "list", "updateStatus", "delete"만 가능합니다.' });
}

// 디스코드 웹훅으로 버그 알림 전송
async function sendDiscordAlert({ email, description, url, reportId }) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const time = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const desc = (description || '(설명 없음)').slice(0, 200);

    try {
        const resp = await fetch(webhookUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: '🐛 새 버그 리포트',
                    color: 0xFF6B35,
                    fields: [
                        { name: '작성자', value: email || '알 수 없음', inline: true },
                        { name: '시간', value: time, inline: true },
                        { name: '내용', value: desc },
                        { name: '페이지', value: url || '-' },
                    ],
                    footer: { text: `ID: ${reportId}` },
                }],
            }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            console.error('Discord webhook failed:', resp.status, body);
        }
    } catch (e) {
        console.error('Discord webhook error:', e.message);
    }
}

// Firestore REST API로 bug-reports 컬렉션 목록 조회
async function listBugReports() {
    const { SignJWT, importPKCS8 } = await import('jose');

    const clientEmail = process.env.FIREBASE_SA_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_SA_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    const privateKeyPem = rawKey.replace(/\\n/g, '\n');
    const privateKey = await importPKCS8(privateKeyPem, 'RS256');
    const now = Math.floor(Date.now() / 1000);

    const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuer(clientEmail)
        .setSubject(clientEmail)
        .setAudience('https://oauth2.googleapis.com/token')
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(privateKey);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 구조화 쿼리로 최신순 조회 (최대 50개)
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    const queryRes = await fetch(queryUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            structuredQuery: {
                from: [{ collectionId: 'bug-reports' }],
                orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
                limit: 50,
            },
        }),
    });

    const results = await queryRes.json();
    if (!Array.isArray(results)) return [];

    return results
        .filter(r => r.document)
        .map(r => {
            const fields = r.document.fields || {};
            const name = r.document.name || '';
            const id = name.split('/').pop();
            const parsed = {};
            for (const [key, val] of Object.entries(fields)) {
                if ('stringValue' in val) parsed[key] = val.stringValue;
                else if ('integerValue' in val) parsed[key] = parseInt(val.integerValue, 10);
                else if ('booleanValue' in val) parsed[key] = val.booleanValue;
                else parsed[key] = null;
            }
            return { id, ...parsed };
        });
}
