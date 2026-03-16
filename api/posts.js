import { verifyFirebaseToken } from './lib/auth.js';
import { getDoc, setDoc, deleteDoc, listDocs } from './lib/firestore.js';
import { deleteFolder } from './lib/storage.js';

// 복합 필드 (object/array) → JSON 문자열로 직렬화
const COMPLEX_FIELDS = ['keywords'];

function serializePost(post) {
    const data = {};
    for (const [key, val] of Object.entries(post)) {
        if (key === 'id') continue; // id는 문서 ID로 사용
        if (COMPLEX_FIELDS.includes(key) && typeof val === 'object' && val !== null) {
            data[key] = JSON.stringify(val);
        } else if (val !== undefined && val !== null) {
            data[key] = val;
        }
    }
    return data;
}

function deserializePost(doc) {
    const result = { ...doc };
    for (const field of COMPLEX_FIELDS) {
        if (typeof result[field] === 'string') {
            try { result[field] = JSON.parse(result[field]); } catch { /* keep string */ }
        }
    }
    return result;
}

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

    const { action, post, postId } = req.body || {};
    const col = `users/${uid}/posts`;

    // 글 저장
    if (action === 'save') {
        if (!post?.id) return res.status(400).json({ error: 'post.id가 필요합니다.' });
        try {
            const data = serializePost(post);
            await setDoc(col, post.id, data);
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 글 목록
    if (action === 'list') {
        try {
            const docs = await listDocs(col);
            const posts = docs.map(deserializePost);
            // updatedAt 내림차순 정렬
            posts.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
            return res.status(200).json({ posts });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 글 삭제
    if (action === 'delete') {
        if (!postId) return res.status(400).json({ error: 'postId가 필요합니다.' });
        try {
            await deleteDoc(col, postId);
            // Storage 이미지도 삭제
            await deleteFolder(`users/${uid}/posts/${postId}/`);
            return res.status(200).json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // 단일 글 로드
    if (action === 'get') {
        if (!postId) return res.status(400).json({ error: 'postId가 필요합니다.' });
        try {
            const doc = await getDoc(col, postId);
            if (!doc) return res.status(200).json({ post: null });
            return res.status(200).json({ post: deserializePost({ id: postId, ...doc }) });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(400).json({ error: 'action은 "save", "list", "get", "delete"만 가능합니다.' });
}
