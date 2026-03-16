/**
 * 클라우드 이미지 저장 서비스
 * - 이미지 압축 (썸네일 1080px/90%, 본문 800px/70%)
 * - Vercel Functions 경유 Firebase Storage 업로드/삭제
 * - HTML content 내 base64 → Storage URL 치환
 */
import { callUploadImage } from './firebase';

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

            if (w <= maxSize && h <= maxSize) {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('압축 실패')), 'image/jpeg', quality);
                return;
            }

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
 * Blob → base64 문자열 변환
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // data:image/jpeg;base64,XXXX → XXXX 부분만 추출
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * HTML content 내 base64 이미지를 Storage URL로 치환
 */
export const extractAndUploadImages = async (userId, postId, htmlContent, options = {}) => {
    const { maxSize = 800, quality = 0.7 } = options;

    const base64Regex = /src="(data:image\/[^;]+;base64,[^"]+)"/g;
    const matches = [...htmlContent.matchAll(base64Regex)];

    if (matches.length === 0) return { html: htmlContent, uploadedCount: 0 };

    let result = htmlContent;
    let uploadedCount = 0;

    const batchSize = 5;
    for (let i = 0; i < matches.length; i += batchSize) {
        const batch = matches.slice(i, i + batchSize);
        const uploads = batch.map(async (match, batchIdx) => {
            const dataUrl = match[1];
            const idx = i + batchIdx;
            try {
                const blob = await compressImage(dataUrl, { maxSize, quality });
                const base64Data = await blobToBase64(blob);
                const { data } = await callUploadImage(postId, `img_${idx}.jpg`, base64Data);
                return { original: dataUrl, url: data.url };
            } catch (err) {
                // Storage 미활성 시 base64 유지 (fallback)
                console.warn(`이미지 ${idx} 업로드 실패, base64 유지:`, err.message);
                return null;
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
 * 글 삭제 시 Storage 이미지 정리 (서버에서 처리)
 * api/posts.js의 delete 액션에서 deleteFolder 호출하므로 클라이언트에서는 불필요
 */
export const deletePostImages = async () => {
    // 서버(api/posts.js)에서 deleteFolder로 처리
};
