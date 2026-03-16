import { verifyFirebaseToken } from './_lib/auth.js';
import { uploadFile } from './_lib/storage.js';

export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let uid;
    try {
        const payload = await verifyFirebaseToken(req);
        uid = payload.sub;
    } catch {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { postId, fileName, base64Data, contentType = 'image/jpeg' } = req.body || {};

    if (!postId || !fileName || !base64Data) {
        return res.status(400).json({ error: 'postId, fileName, base64Data가 필요합니다.' });
    }

    try {
        const buffer = Buffer.from(base64Data, 'base64');
        const path = `users/${uid}/posts/${postId}/${fileName}`;
        const url = await uploadFile(path, buffer, contentType);
        return res.status(200).json({ url });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
