/**
 * 클라우드 이미지 저장 서비스
 * - 이미지 압축 (썸네일 1080px/90%, 본문 800px/70%)
 * - Firebase Storage 업로드/삭제
 * - HTML content 내 base64 → Storage URL 치환
 */
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

/**
 * 이미지 압축 (Canvas 리사이즈 + JPEG 변환)
 * @param {string} dataUrl - base64 data URL
 * @param {object} options - { maxSize: px, quality: 0~1 }
 * @returns {Promise<Blob>}
 */
export const compressImage = (dataUrl, { maxSize = 800, quality = 0.7 } = {}) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let w = img.naturalWidth;
            let h = img.naturalHeight;

            // 이미 작으면 리사이즈 안 함
            if (w <= maxSize && h <= maxSize) {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('압축 실패')), 'image/jpeg', quality);
                return;
            }

            // 비율 유지 리사이즈
            if (w > h) {
                h = Math.round(h * (maxSize / w));
                w = maxSize;
            } else {
                w = Math.round(w * (maxSize / h));
                h = maxSize;
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('압축 실패')), 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = dataUrl;
    });
};

/**
 * Firebase Storage에 이미지 업로드
 * @param {string} userId
 * @param {string} postId
 * @param {Blob} blob - 압축된 이미지
 * @param {string} fileName - 파일명 (예: 'img_0.jpg')
 * @returns {Promise<string>} 다운로드 URL
 */
export const uploadImage = async (userId, postId, blob, fileName) => {
    const storageRef = ref(storage, `users/${userId}/posts/${postId}/${fileName}`);
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    return getDownloadURL(storageRef);
};

/**
 * HTML content 내 base64 이미지를 Storage URL로 치환
 * @param {string} userId
 * @param {string} postId
 * @param {string} htmlContent - base64 이미지 포함 HTML
 * @param {object} options - { maxSize, quality }
 * @returns {Promise<{ html: string, uploadedCount: number }>}
 */
export const extractAndUploadImages = async (userId, postId, htmlContent, options = {}) => {
    const { maxSize = 800, quality = 0.7 } = options;

    // base64 이미지 src 추출
    const base64Regex = /src="(data:image\/[^;]+;base64,[^"]+)"/g;
    const matches = [...htmlContent.matchAll(base64Regex)];

    if (matches.length === 0) return { html: htmlContent, uploadedCount: 0 };

    let result = htmlContent;
    let uploadedCount = 0;

    // 병렬 업로드 (최대 5개씩)
    const batchSize = 5;
    for (let i = 0; i < matches.length; i += batchSize) {
        const batch = matches.slice(i, i + batchSize);
        const uploads = batch.map(async (match, batchIdx) => {
            const dataUrl = match[1];
            const idx = i + batchIdx;
            try {
                const blob = await compressImage(dataUrl, { maxSize, quality });
                const url = await uploadImage(userId, postId, blob, `img_${idx}.jpg`);
                return { original: dataUrl, url };
            } catch (err) {
                console.warn(`이미지 ${idx} 업로드 실패:`, err.message);
                return null; // 실패 시 base64 유지
            }
        });

        const results = await Promise.all(uploads);
        results.forEach(r => {
            if (r) {
                result = result.replace(r.original, r.url);
                uploadedCount++;
            }
        });
    }

    return { html: result, uploadedCount };
};

/**
 * 글 삭제 시 Storage 이미지 정리
 */
export const deletePostImages = async (userId, postId) => {
    try {
        const folderRef = ref(storage, `users/${userId}/posts/${postId}`);
        const list = await listAll(folderRef);
        await Promise.all(list.items.map(item => deleteObject(item)));
    } catch (err) {
        console.warn('이미지 삭제 실패:', err.message);
    }
};
