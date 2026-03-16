/**
 * Firestore 글 동기화 서비스
 * - CRUD: 저장/불러오기/삭제
 * - 마이그레이션: localStorage → Firestore
 */
import { db } from './firebase';
import {
    collection, doc, setDoc, getDoc, getDocs,
    deleteDoc, query, orderBy
} from 'firebase/firestore';
import { extractAndUploadImages, deletePostImages } from './cloudStorage';

const postsCollection = (userId) => collection(db, 'users', userId, 'posts');

/**
 * Firestore에 글 저장
 * content 내 base64 이미지 → Storage URL 치환 후 저장
 */
export const savePostToCloud = async (userId, post) => {
    // base64 이미지를 Storage URL로 치환
    let cloudContent = post.content || '';
    let uploadedCount = 0;

    if (cloudContent.includes('data:image/')) {
        const result = await extractAndUploadImages(userId, post.id, cloudContent);
        cloudContent = result.html;
        uploadedCount = result.uploadedCount;
    }

    const docData = {
        title: post.title || '',
        content: cloudContent,
        keywords: post.keywords || { main: '', sub: [] },
        categoryId: post.categoryId || 'daily',
        tone: post.tone || 'friendly',
        mode: post.mode || 'direct',
        seoScore: post.seoScore || 0,
        charCount: post.charCount || 0,
        imageCount: post.imageCount || 0,
        headingCount: post.headingCount || 0,
        createdAt: post.createdAt || new Date().toISOString(),
        updatedAt: post.updatedAt || new Date().toISOString(),
    };

    await setDoc(doc(postsCollection(userId), post.id), docData);
    return { uploadedCount };
};

/**
 * Firestore에서 전체 글 목록 로드
 */
export const loadPostsFromCloud = async (userId) => {
    const q = query(postsCollection(userId), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Firestore에서 단일 글 로드
 */
export const loadPostFromCloud = async (userId, postId) => {
    const snap = await getDoc(doc(postsCollection(userId), postId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
};

/**
 * Firestore + Storage에서 글 삭제
 */
export const deletePostFromCloud = async (userId, postId) => {
    await deleteDoc(doc(postsCollection(userId), postId));
    await deletePostImages(userId, postId);
};

/**
 * localStorage → Firestore 마이그레이션
 * @param {string} userId
 * @param {Array} localPosts - localStorage의 글 배열
 * @param {function} onProgress - (current, total) 진행률 콜백
 * @returns {Promise<{ migrated: number, failed: number }>}
 */
export const migrateLocalToCloud = async (userId, localPosts, onProgress) => {
    // 이미 클라우드에 있는 글 ID 조회
    const cloudPosts = await loadPostsFromCloud(userId);
    const cloudIds = new Set(cloudPosts.map(p => p.id));

    // 로컬에만 있는 글 필터
    const toMigrate = localPosts.filter(p => !cloudIds.has(p.id));

    if (toMigrate.length === 0) return { migrated: 0, failed: 0 };

    let migrated = 0;
    let failed = 0;

    for (let i = 0; i < toMigrate.length; i++) {
        try {
            await savePostToCloud(userId, toMigrate[i]);
            migrated++;
        } catch (err) {
            console.warn(`마이그레이션 실패 (${toMigrate[i].id}):`, err.message);
            failed++;
        }
        if (onProgress) onProgress(i + 1, toMigrate.length);
    }

    return { migrated, failed };
};
