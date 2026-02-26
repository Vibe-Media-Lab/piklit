import { SignJWT, importPKCS8 } from 'jose';

// Google access token 캐시
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && tokenExpiry > now + 60) {
        return cachedToken;
    }

    const clientEmail = process.env.FIREBASE_SA_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_SA_PRIVATE_KEY;
    if (!clientEmail || !rawKey) {
        throw new Error('Missing FIREBASE_SA_CLIENT_EMAIL or FIREBASE_SA_PRIVATE_KEY');
    }

    const privateKeyPem = rawKey.replace(/\\n/g, '\n');
    const privateKey = await importPKCS8(privateKeyPem, 'RS256');

    const jwt = await new SignJWT({
        scope: 'https://www.googleapis.com/auth/datastore',
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
    if (!res.ok) {
        throw new Error(`Google token error: ${data.error_description || data.error}`);
    }

    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in || 3600);
    return cachedToken;
}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

function docUrl(collection, docId) {
    return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
}

// Firestore 문서 읽기 (없으면 null)
export async function getDoc(collection, docId) {
    const token = await getAccessToken();
    const res = await fetch(docUrl(collection, docId), {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) return null;
    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Firestore read error: ${err.error?.message || res.status}`);
    }

    const doc = await res.json();
    return parseFields(doc.fields || {});
}

// Firestore 문서 쓰기 (upsert)
export async function setDoc(collection, docId, data) {
    const token = await getAccessToken();
    const fields = toFirestoreFields(data);

    const params = new URLSearchParams();
    Object.keys(data).forEach(key => params.append('updateMask.fieldPaths', key));

    const res = await fetch(`${docUrl(collection, docId)}?${params.toString()}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(`Firestore write error: ${err.error?.message || res.status}`);
    }
    return await res.json();
}

// Firestore value → JS value
function parseFields(fields) {
    const result = {};
    for (const [key, val] of Object.entries(fields)) {
        if ('integerValue' in val) result[key] = parseInt(val.integerValue, 10);
        else if ('stringValue' in val) result[key] = val.stringValue;
        else if ('booleanValue' in val) result[key] = val.booleanValue;
        else if ('doubleValue' in val) result[key] = val.doubleValue;
        else result[key] = null;
    }
    return result;
}

// JS value → Firestore value
function toFirestoreFields(data) {
    const fields = {};
    for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'number' && Number.isInteger(val)) {
            fields[key] = { integerValue: String(val) };
        } else if (typeof val === 'number') {
            fields[key] = { doubleValue: val };
        } else if (typeof val === 'string') {
            fields[key] = { stringValue: val };
        } else if (typeof val === 'boolean') {
            fields[key] = { booleanValue: val };
        }
    }
    return fields;
}
