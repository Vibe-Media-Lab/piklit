/**
 * 썸네일 Canvas 렌더링 엔진
 * 5가지 스타일 × 카테고리별 폰트 × 자동 대비
 */

// 출력 사이즈
const WIDTH = 1200;
const HEIGHT = 675;
const SAFE_X = (WIDTH - HEIGHT) / 2; // 262.5 — 세이프존 시작
const SAFE_W = HEIGHT; // 675 — 세이프존 너비

export const THUMBNAIL_STYLES = [
    { id: 'A', label: '하단 그라데이션', desc: '하단 검정 그라데이션 + 흰 텍스트' },
    { id: 'B', label: '중앙 박스', desc: '반투명 둥근 박스 + 텍스트' },
    { id: 'C', label: '상단 띠', desc: '오렌지 배너 + 흰 텍스트' },
    { id: 'D', label: '전면 블러', desc: '블러 오버레이 + 흰 텍스트' },
    { id: 'E', label: '원본', desc: '텍스트 없는 원본 사진' },
];

export const CATEGORY_FONT_MAP = {
    restaurant: { label: '맛집', fonts: ['Black Han Sans', 'Jua', 'Do Hyeon', 'Gugi'] },
    cafe:       { label: '카페', fonts: ['Gowun Batang', 'Nanum Myeongjo', 'IBM Plex Sans KR', 'Noto Serif KR'] },
    travel:     { label: '여행', fonts: ['Gaegu', 'Nanum Pen Script', 'Hi Melody', 'Gamja Flower'] },
    daily:      { label: '일상', fonts: ['Jua', 'Gowun Dodum', 'Sunflower', 'Poor Story'] },
    pet:        { label: '반려동물', fonts: ['Jua', 'Cute Font', 'Gamja Flower', 'Hi Melody'] },
};

/**
 * 중앙 1:1 영역의 평균 밝기 계산 (0~255)
 */
const detectBrightness = (ctx) => {
    const sx = Math.round(SAFE_X);
    const data = ctx.getImageData(sx, 0, SAFE_W, HEIGHT).data;
    let sum = 0;
    const sampleStep = 16; // 성능 위해 샘플링
    let count = 0;
    for (let i = 0; i < data.length; i += 4 * sampleStep) {
        sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        count++;
    }
    return count > 0 ? sum / count : 128;
};

/**
 * 이미지를 16:9로 캔버스에 채움 (zoom + offset 지원)
 * @param {number} zoom - 1.0(기본) ~ 2.5
 * @param {number} offsetX - -1 ~ 1 (좌우 패닝, 0=중앙)
 * @param {number} offsetY - -1 ~ 1 (상하 패닝, 0=중앙)
 */
const fitImageToCanvas = (ctx, img, zoom = 1, offsetX = 0, offsetY = 0) => {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = WIDTH / HEIGHT;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    if (imgRatio > canvasRatio) {
        sw = img.naturalHeight * canvasRatio;
        sx = (img.naturalWidth - sw) / 2;
    } else {
        sh = img.naturalWidth / canvasRatio;
        sy = (img.naturalHeight - sh) / 2;
    }

    // 줌 적용: 소스 영역 축소
    const zSw = sw / zoom;
    const zSh = sh / zoom;
    const maxOx = (sw - zSw) / 2;
    const maxOy = (sh - zSh) / 2;

    ctx.drawImage(
        img,
        sx + (sw - zSw) / 2 + offsetX * maxOx,
        sy + (sh - zSh) / 2 + offsetY * maxOy,
        zSw, zSh,
        0, 0, WIDTH, HEIGHT
    );
};

/**
 * 스타일 A: 하단 그라데이션
 */
const renderStyleA = (ctx, brightness) => {
    const intensity = brightness > 160 ? 0.6 : brightness > 100 ? 0.75 : 0.9;
    const grad = ctx.createLinearGradient(0, HEIGHT * 0.35, 0, HEIGHT);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
};

/**
 * 스타일 B: 중앙 박스
 */
const renderStyleB = (ctx, brightness) => {
    const isDark = brightness < 128;
    const boxColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)';
    const boxW = SAFE_W * 0.82;
    const boxH = 220;
    const boxX = (WIDTH - boxW) / 2;
    const boxY = (HEIGHT - boxH) / 2;

    ctx.fillStyle = boxColor;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 16);
    ctx.fill();

    return isDark; // true → 검정 텍스트, false → 흰 텍스트
};

/**
 * 스타일 C: 상단 오렌지 띠
 */
const renderStyleC = (ctx) => {
    const bandH = 150;
    ctx.fillStyle = '#FF6B35';
    ctx.fillRect(0, 0, WIDTH, bandH);
};

/**
 * 스타일 D: 전면 블러 + 어두운 오버레이
 */
const renderStyleD = (ctx, canvas) => {
    // OffscreenCanvas로 블러 효과
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = WIDTH;
    blurCanvas.height = HEIGHT;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.filter = 'blur(12px)';
    blurCtx.drawImage(canvas, 0, 0);

    ctx.drawImage(blurCanvas, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
};

/**
 * 텍스트 렌더링 (메인 + 서브)
 */
const drawThumbnailText = (ctx, mainText, subText, fontFamily, position, textColor) => {
    if (!mainText && !subText) return;

    const centerX = WIDTH / 2;
    ctx.textAlign = 'center';

    // 텍스트 그림자 (모바일 가독성 강화)
    const isLight = textColor !== '#000';
    ctx.shadowColor = isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    if (position === 'top') {
        // 스타일 C: 상단 오렌지 띠 (150px 높이)
        if (mainText) {
            ctx.font = `bold 60px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(mainText, centerX, 78, SAFE_W * 0.9);
        }
        if (subText) {
            ctx.font = `600 34px Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(subText, centerX, 126, SAFE_W * 0.9);
        }
    } else if (position === 'center') {
        // 스타일 B: 중앙 박스 (220px 높이)
        if (mainText) {
            ctx.font = `bold 64px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(mainText, centerX, HEIGHT / 2 - 10, SAFE_W * 0.7);
        }
        if (subText) {
            ctx.font = `600 36px Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(subText, centerX, HEIGHT / 2 + 46, SAFE_W * 0.7);
        }
    } else {
        // 하단 (스타일 A, D)
        const baseY = HEIGHT - 100;
        if (mainText) {
            ctx.font = `bold 68px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(mainText, centerX, baseY, SAFE_W * 0.9);
        }
        if (subText) {
            ctx.font = `600 38px Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(subText, centerX, baseY + 56, SAFE_W * 0.9);
        }
    }

    // 그림자 초기화
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};

/**
 * 메인 렌더링 함수
 * @param {string} imageUrl - 원본 이미지 URL (objectURL 또는 dataURL)
 * @param {object} options
 * @param {string} options.style - 'A'|'B'|'C'|'D'|'E'
 * @param {string} options.mainText
 * @param {string} options.subText
 * @param {string} options.fontFamily
 * @returns {Promise<string>} dataURL (PNG)
 */
export const generateThumbnail = (imageUrl, options = {}) => {
    const { style = 'A', mainText = '', subText = '', fontFamily = 'Pretendard', zoom = 1, offsetX = 0, offsetY = 0 } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = WIDTH;
            canvas.height = HEIGHT;
            const ctx = canvas.getContext('2d');

            // 1. 이미지 채우기
            fitImageToCanvas(ctx, img, zoom, offsetX, offsetY);

            // E 스타일: 원본만
            if (style === 'E') {
                resolve(canvas.toDataURL('image/png'));
                return;
            }

            // 2. 밝기 감지
            const brightness = detectBrightness(ctx);

            // 3. 스타일별 오버레이
            let textColor = '#fff';
            let textPosition = 'bottom';

            if (style === 'A') {
                renderStyleA(ctx, brightness);
            } else if (style === 'B') {
                const isDarkBg = renderStyleB(ctx, brightness);
                textColor = isDarkBg ? '#000' : '#fff';
                textPosition = 'center';
            } else if (style === 'C') {
                renderStyleC(ctx);
                textPosition = 'top';
            } else if (style === 'D') {
                // D는 블러를 위해 원본 위에 다시 그림
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = WIDTH;
                tempCanvas.height = HEIGHT;
                const tempCtx = tempCanvas.getContext('2d');
                fitImageToCanvas(tempCtx, img, zoom, offsetX, offsetY);
                renderStyleD(ctx, tempCanvas);
            }

            // 4. 텍스트
            drawThumbnailText(ctx, mainText, subText, fontFamily, textPosition, textColor);

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = imageUrl;
    });
};
