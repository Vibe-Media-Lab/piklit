/**
 * API 전송용: 지정 크기로 리사이즈하여 이미지 토큰 절감
 * @param {File} file - 이미지 파일
 * @param {number} maxSize - 최대 가로/세로 픽셀 (기본 512)
 * @returns {Promise<string>} base64 인코딩된 JPEG 문자열
 */
export const fileToBase64 = (file, maxSize = 512) => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl.split(',')[1]);
            URL.revokeObjectURL(img.src);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
};
