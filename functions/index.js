const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const MONTHLY_FREE_LIMIT = 10;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function checkAndIncrementUsage(uid) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageRef = db.collection('usage').doc(`${uid}_${monthKey}`);

    return db.runTransaction(async (tx) => {
        const doc = await tx.get(usageRef);
        const current = doc.exists ? doc.data().count || 0 : 0;

        if (current >= MONTHLY_FREE_LIMIT) {
            return { allowed: false, used: current, limit: MONTHLY_FREE_LIMIT };
        }

        if (doc.exists) {
            tx.update(usageRef, { count: admin.firestore.FieldValue.increment(1), lastUsed: now });
        } else {
            tx.set(usageRef, { uid, month: monthKey, count: 1, lastUsed: now });
        }

        return { allowed: true, used: current + 1, limit: MONTHLY_FREE_LIMIT };
    });
}

async function getUsage(uid) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const doc = await db.collection('usage').doc(`${uid}_${monthKey}`).get();
    const used = doc.exists ? doc.data().count || 0 : 0;
    return { used, limit: MONTHLY_FREE_LIMIT };
}

// Gemini API 프록시
exports.geminiProxy = functions
    .region('asia-northeast3')
    .runWith({ secrets: ['GEMINI_API_KEY'], memory: '256MB', timeoutSeconds: 120, maxInstances: 10 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
        }

        const { body, model, userApiKey } = data;
        if (!body) {
            throw new functions.https.HttpsError('invalid-argument', 'body가 필요합니다.');
        }

        let apiKey;
        if (userApiKey) {
            apiKey = userApiKey;
        } else {
            const usage = await checkAndIncrementUsage(context.auth.uid);
            if (!usage.allowed) {
                throw new functions.https.HttpsError(
                    'resource-exhausted',
                    `무료 체험 ${usage.limit}회를 모두 사용했습니다. 설정에서 직접 API 키를 등록하면 무제한으로 사용할 수 있습니다.`
                );
            }
            apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new functions.https.HttpsError('internal', '서버 API 키가 설정되지 않았습니다.');
            }
        }

        const modelName = model || 'gemini-2.5-flash';
        const url = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new functions.https.HttpsError('internal', errorData.error?.message || `Gemini API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError('internal', error.message || 'Gemini API 호출 실패');
        }
    });

// Gemini 이미지 생성 프록시
exports.geminiImageProxy = functions
    .region('asia-northeast3')
    .runWith({ secrets: ['GEMINI_API_KEY'], memory: '512MB', timeoutSeconds: 120, maxInstances: 5 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
        }

        const { body, userApiKey } = data;
        if (!body) {
            throw new functions.https.HttpsError('invalid-argument', 'body가 필요합니다.');
        }

        let apiKey;
        if (userApiKey) {
            apiKey = userApiKey;
        } else {
            const usage = await checkAndIncrementUsage(context.auth.uid);
            if (!usage.allowed) {
                throw new functions.https.HttpsError('resource-exhausted', '무료 체험 소진');
            }
            apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new functions.https.HttpsError('internal', '서버 API 키가 설정되지 않았습니다.');
            }
        }

        const url = `${GEMINI_API_BASE}/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new functions.https.HttpsError('internal', errorData.error?.message || `Image API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError('internal', error.message || '이미지 생성 실패');
        }
    });

// 사용량 조회
exports.getUsageInfo = functions
    .region('asia-northeast3')
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
        }
        return getUsage(context.auth.uid);
    });
