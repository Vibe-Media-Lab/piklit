import { SignJWT, importPKCS8 } from 'jose';

// Storage용 access token (datastore + storage 스코프)
let cachedToken = null;
let tokenExpiry = 0;

async function getStorageToken() {
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && tokenExpiry > now + 60) return cachedToken;

    const clientEmail = process.env.FIREBASE_SA_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_SA_PRIVATE_KEY;
    if (!clientEmail || !rawKey) throw new Error('Missing service account credentials');

    const privateKey = await importPKCS8(rawKey.replace(/\\n/g, '\n'), 'RS256');
    const jwt = await new SignJWT({
        scope: 'https://www.googleapis.com/auth/devstorage.full_control',
    })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuer(clientEmail)
        .setSubject(clientEmail)
        .setAudience('https://oauth2.googleapis.com/token')
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(privateKey);

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`Storage token error: ${data.error_description || data.error}`);

    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in || 3600);
    return cachedToken;
}

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

/**
 * Firebase Storage에 파일 업로드
 * @param {string} path - 저장 경로 (예: users/uid/posts/postId/img_0.jpg)
 * @param {Buffer} buffer - 파일 데이터
 * @param {string} contentType - MIME 타입
 * @returns {Promise<string>} 다운로드 URL
 */
export async function uploadFile(path, buffer, contentType = 'image/jpeg') {
    const token = await getStorageToken();
    const encodedPath = encodeURIComponent(path);

    const res = await fetch(
        `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodedPath}`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': contentType,
            },
            body: buffer,
        }
    );

    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Storage upload error: ${err.error?.message || res.status}`);
    }

    // 공개 다운로드 URL 생성
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedPath}?alt=media`;
}

/**
 * Firebase Storage 폴더 내 파일 삭제
 */
export async function deleteFolder(folderPath) {
    const token = await getStorageToken();
    const encodedPrefix = encodeURIComponent(folderPath);

    // 폴더 내 파일 목록 조회
    const listRes = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o?prefix=${encodedPrefix}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listRes.ok) return;
    const listData = await listRes.json();
    if (!listData.items?.length) return;

    // 각 파일 삭제
    await Promise.all(listData.items.map(async (item) => {
        const encodedName = encodeURIComponent(item.name);
        await fetch(
            `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodedName}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
        );
    }));
}
