/**
 * 클라우드 글 동기화 서비스
 * - CRUD: Vercel Functions 경유 Firestore 저장/불러오기/삭제
 * - 마이그레이션: localStorage → Firestore
 */
import { callSavePost, callLoadPosts, callDeletePost } from './firebase';
import { extractAndUploadImages } from './cloudStorage';

/**
 * 클라우드에 글 저장
 * content 내 base64 이미지 → Storage URL 치환 후 저장
 */
export const savePostToCloud = async (userId, post) => {
    let cloudContent = post.content || '';
    let uploadedCount = 0;

    if (cloudContent.includes('data:image/')) {
        try {
            const result = await extractAndUploadImages(userId, post.id, cloudContent);
            cloudContent = result.html;
            uploadedCount = result.uploadedCount;
        } catch (err) {
            // Storage 미활성 시 base64 유지 (fallback)
            console.warn('이미지 업로드 실패, base64 유지:', err.message);
        }
    }

    const docData = {
        id: post.id,
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

    await callSavePost(docData);
    return { uploadedCount };
};

/**
 * 클라우드에서 전체 글 목록 로드
 */
export const loadPostsFromCloud = async () => {
    const { data } = await callLoadPosts();
    return data.posts || [];
};

/**
 * 클라우드에서 글 삭제
 */
export const deletePostFromCloud = async (userId, postId) => {
    await callDeletePost(postId);
};

/**
 * localStorage → 클라우드 마이그레이션
 * @param {string} userId
 * @param {Array} localPosts - localStorage의 글 배열
 * @param {function} onProgress - (current, total) 진행률 콜백
 * @returns {Promise<{ migrated: number, failed: number }>}
 */
export const migrateLocalToCloud = async (userId, localPosts, onProgress) => {
    const cloudPosts = await loadPostsFromCloud();
    const cloudIds = new Set(cloudPosts.map(p => p.id));

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
