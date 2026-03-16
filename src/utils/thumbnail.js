/**
 * 썸네일 Canvas 렌더링 엔진
 * 9가지 스타일 × 카테고리별 폰트 × 자동 대비
 * 1:1 정사각형 (1080×1080) — 네이버 블로그 대표이미지 최적화
 */

// 출력 사이즈 (1:1 정사각형)
const WIDTH = 1080;
const HEIGHT = 1080;

export const THUMBNAIL_STYLES = [
    { id: 'A', label: '하단 그라데이션', desc: '하단 검정 그라데이션 + 흰 텍스트' },
    { id: 'B', label: '하단 박스', desc: '사진 상단 65% + 하단 흰색 박스 35%' },
    { id: 'C', label: '아웃라인 텍스트', desc: '사진 위 흰색 볼드 + 검정 테두리' },
    { id: 'D', label: '중앙 박스', desc: '반투명 둥근 박스 + 텍스트' },
    { id: 'E', label: '컬러 띠', desc: '위치/색상/두께 커스텀 컬러 띠' },
    { id: 'F', label: '전면 블러', desc: '블러 오버레이 + 흰 텍스트' },
    { id: 'G', label: '원본', desc: '텍스트 없는 원본 사진' },
    { id: 'H', label: '반분할', desc: '사진 2장 + 중앙 텍스트 띠', multi: true },
    { id: 'I', label: '매거진', desc: '사진 2~4장 격자 레이아웃', multi: true },
];

export const CATEGORY_FONT_MAP = {
    restaurant: { label: '맛집', fonts: ['Black Han Sans', 'Jua', 'Do Hyeon', 'Gugi'] },
    cafe:       { label: '카페', fonts: ['Gowun Batang', 'Nanum Myeongjo', 'IBM Plex Sans KR', 'Noto Serif KR'] },
    travel:     { label: '여행', fonts: ['Gaegu', 'Nanum Pen Script', 'Hi Melody', 'Gamja Flower'] },
    daily:      { label: '일상', fonts: ['Jua', 'Gowun Dodum', 'Sunflower', 'Poor Story'] },
    pet:        { label: '반려동물', fonts: ['Jua', 'Cute Font', 'Gamja Flower', 'Hi Melody'] },
};

/**
 * 캔버스 전체 평균 밝기 계산 (0~255)
 */
const detectBrightness = (ctx) => {
    const data = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
    let sum = 0;
    const sampleStep = 16;
    let count = 0;
    for (let i = 0; i < data.length; i += 4 * sampleStep) {
        sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        count++;
    }
    return count > 0 ? sum / count : 128;
};

/**
 * 이미지를 1:1로 캔버스에 채움 (zoom + offset 지원)
 */
const fitImageToCanvas = (ctx, img, zoom = 1, offsetX = 0, offsetY = 0) => {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    // 1:1 crop — 넓으면 좌우 잘라내고, 높으면 상하 잘라냄
    if (imgRatio > 1) {
        sw = img.naturalHeight;
        sx = (img.naturalWidth - sw) / 2;
    } else {
        sh = img.naturalWidth;
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
 * 스타일 B: 하단 박스 (사진 65% + 흰색 박스 35%)
 */
const renderStyleB_box = (ctx) => {
    const boxTop = Math.round(HEIGHT * 0.65); // ~702px
    const boxH = HEIGHT - boxTop;             // ~378px

    // 흰색 박스
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, boxTop, WIDTH, boxH);

    // 구분선 (미세)
    ctx.strokeStyle = '#E3E2E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, boxTop);
    ctx.lineTo(WIDTH, boxTop);
    ctx.stroke();
};

/**
 * 스타일 D: 중앙 박스 (기존 B)
 */
const renderStyleD_centerBox = (ctx, brightness) => {
    const isDark = brightness < 128;
    const boxColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.65)';
    const boxW = WIDTH * 0.78;
    const boxH = 260;
    const boxX = (WIDTH - boxW) / 2;
    const boxY = (HEIGHT - boxH) / 2;

    ctx.fillStyle = boxColor;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 16);
    ctx.fill();

    return isDark; // true → 검정 텍스트, false → 흰 텍스트
};

/**
 * 스타일 E: 컬러 띠 (위치/색상/두께 커스텀)
 */
const renderStyleE_band = (ctx, bandPosition, bandColor, bandHeight) => {
    const h = bandHeight || 150;
    let y = 0;
    if (bandPosition === 'center') {
        y = (HEIGHT - h) / 2;
    } else if (bandPosition === 'bottom') {
        y = HEIGHT - h;
    }
    // else 'top': y = 0

    ctx.fillStyle = bandColor || '#FF6B35';
    ctx.fillRect(0, y, WIDTH, h);

    return { bandY: y, bandH: h };
};

/**
 * 스타일 F: 전면 블러 + 어두운 오버레이 (기존 D)
 */
const renderStyleF_blur = (ctx, canvas) => {
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
 * @param {string} position - 'bottom'|'center'|'bottomBox'|'outline'|'band'
 * @param {number} mainFontSize - 메인 텍스트 크기 (기본 64)
 * @param {number} subFontSize - 서브 텍스트 크기 (기본 36)
 * @param {object} bandInfo - 컬러 띠 정보 { bandY, bandH } (스타일 E용)
 */
const drawThumbnailText = (ctx, mainText, subText, fontFamily, position, textColor, mainFontSize = 64, subFontSize = 36, bandInfo = null) => {
    if (!mainText && !subText) return;

    const centerX = WIDTH / 2;
    const maxW = WIDTH * 0.85;
    ctx.textAlign = 'center';

    // 아웃라인 스타일은 별도 처리
    if (position === 'outline') {
        drawOutlineText(ctx, mainText, subText, fontFamily, mainFontSize, subFontSize, textColor);
        return;
    }

    // 텍스트 그림자
    const isLight = textColor !== '#000';
    ctx.shadowColor = isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    if (position === 'band' && bandInfo) {
        // 스타일 E: 컬러 띠 안 중앙 정렬
        const bandCenterY = bandInfo.bandY + bandInfo.bandH / 2;
        if (mainText && subText) {
            ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(mainText, centerX, bandCenterY - subFontSize * 0.3, maxW);
            ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(subText, centerX, bandCenterY + mainFontSize * 0.55, maxW);
        } else if (mainText) {
            ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(mainText, centerX, bandCenterY + mainFontSize * 0.35, maxW);
        } else if (subText) {
            ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(subText, centerX, bandCenterY + subFontSize * 0.35, maxW);
        }
    } else if (position === 'bottomBox') {
        // 스타일 B: 하단 박스 영역
        const boxTop = Math.round(HEIGHT * 0.65);
        const boxCenterY = boxTop + (HEIGHT - boxTop) / 2;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        const mainColor = textColor !== '#fff' ? textColor : '#37352F';
        const subColor = textColor !== '#fff' ? textColor : '#787774';
        if (mainText) {
            ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = mainColor;
            ctx.fillText(mainText, centerX, boxCenterY - (subText ? subFontSize * 0.4 : -mainFontSize * 0.2), maxW);
        }
        if (subText) {
            ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = subColor;
            ctx.fillText(subText, centerX, boxCenterY + (mainText ? mainFontSize * 0.5 : subFontSize * 0.2), maxW);
        }
    } else if (position === 'center') {
        // 스타일 D: 중앙 박스
        if (mainText) {
            ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(mainText, centerX, HEIGHT / 2 - (subText ? subFontSize * 0.3 : -mainFontSize * 0.2), maxW * 0.85);
        }
        if (subText) {
            ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(subText, centerX, HEIGHT / 2 + (mainText ? mainFontSize * 0.55 : subFontSize * 0.2), maxW * 0.85);
        }
    } else {
        // 하단 (스타일 A, F)
        const baseY = HEIGHT - 120;
        if (mainText) {
            ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(mainText, centerX, baseY, maxW);
        }
        if (subText) {
            ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
            ctx.fillStyle = textColor;
            ctx.fillText(subText, centerX, baseY + mainFontSize * 0.85, maxW);
        }
    }

    // 그림자 초기화
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};

/**
 * 색상이 밝은지 판단 (아웃라인 테두리 색 결정용)
 */
const isLightColor = (hex) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150;
};

/**
 * 아웃라인 텍스트 (스타일 C)
 * 볼드 텍스트 + strokeText 대비 테두리
 */
const drawOutlineText = (ctx, mainText, subText, fontFamily, mainFontSize, subFontSize, fillColor = '#ffffff') => {
    const centerX = WIDTH / 2;
    const maxW = WIDTH * 0.85;
    ctx.textAlign = 'center';

    // 그림자 끄기
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const baseY = HEIGHT - 160;

    if (mainText) {
        ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        // 테두리 색 (채우기 색이 어두우면 흰 테두리, 밝으면 검정 테두리)
        const isLightFill = isLightColor(fillColor);
        const strokeColor = isLightFill ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';

        ctx.lineWidth = 7;
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(mainText, centerX, baseY, maxW);

        ctx.fillStyle = fillColor;
        ctx.fillText(mainText, centerX, baseY, maxW);
    }

    if (subText) {
        const subY = baseY + mainFontSize * 0.85;
        ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        const isLightFill = isLightColor(fillColor);
        const strokeColor = isLightFill ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';

        ctx.lineWidth = 3;
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(subText, centerX, subY, maxW);

        ctx.fillStyle = fillColor;
        ctx.fillText(subText, centerX, subY, maxW);
    }
};

/**
 * 텍스트 효과 적용: 그림자/윤곽선/배경박스
 */
const applyTextEffects = (ctx, shadow, outlineOpt, bgBoxOpt, mainText, subText, fontFamily, mainFontSize, subFontSize, textColor, textPosition, bandInfo) => {
    const centerX = WIDTH / 2;
    const maxW = WIDTH * 0.85;

    // 텍스트 위치 계산
    let mainY, subY;
    if (textPosition === 'center') {
        mainY = HEIGHT / 2 - (subText ? subFontSize * 0.3 : -mainFontSize * 0.2);
        subY = HEIGHT / 2 + (mainText ? mainFontSize * 0.55 : subFontSize * 0.2);
    } else if (textPosition === 'band' && bandInfo) {
        const bandCenterY = bandInfo.bandY + bandInfo.bandH / 2;
        mainY = bandCenterY - (subText ? subFontSize * 0.3 : -mainFontSize * 0.35);
        subY = bandCenterY + (mainText ? mainFontSize * 0.55 : 0);
    } else if (textPosition === 'bottomBox') {
        const boxTop = Math.round(HEIGHT * 0.65);
        const boxCenterY = boxTop + (HEIGHT - boxTop) / 2;
        mainY = boxCenterY - (subText ? subFontSize * 0.4 : -mainFontSize * 0.2);
        subY = boxCenterY + (mainText ? mainFontSize * 0.5 : subFontSize * 0.2);
    } else {
        mainY = HEIGHT - 120;
        subY = mainY + mainFontSize * 0.85;
    }

    ctx.textAlign = 'center';

    // 배경박스
    if (bgBoxOpt !== '없음' && (mainText || subText)) {
        const paddingY = 24;
        const boxH = (mainText ? mainFontSize : 0) + (subText ? subFontSize * 1.2 : 0) + paddingY * 2;
        const boxY = (mainText ? mainY - mainFontSize * 0.7 : subY - subFontSize * 0.7) - paddingY;
        const boxW = maxW * 0.7;
        const boxX = centerX - boxW / 2;

        if (bgBoxOpt === '검정') ctx.fillStyle = 'rgba(0,0,0,0.55)';
        else if (bgBoxOpt === '흰색') ctx.fillStyle = 'rgba(255,255,255,0.75)';
        else ctx.fillStyle = 'rgba(255,107,53,0.6)';

        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 12);
        ctx.fill();
    }

    // 그림자 설정
    const shadows = {
        '없음': { blur: 0, ox: 0, oy: 0, color: 'transparent' },
        '약하게': { blur: 6, ox: 0, oy: 2, color: 'rgba(0,0,0,0.4)' },
        '보통': { blur: 10, ox: 0, oy: 3, color: 'rgba(0,0,0,0.6)' },
        '강하게': { blur: 16, ox: 0, oy: 4, color: 'rgba(0,0,0,0.8)' },
        '네온': { blur: 20, ox: 0, oy: 0, color: 'rgba(255,107,53,0.7)' },
    };
    const sh = shadows[shadow] || shadows['약하게'];
    ctx.shadowColor = sh.color;
    ctx.shadowBlur = sh.blur;
    ctx.shadowOffsetX = sh.ox;
    ctx.shadowOffsetY = sh.oy;

    const neonColor = shadow === '네온' ? '#FF6B35' : textColor;

    // 윤곽선
    const outlineWidths = { '없음': 0, '얇은': 3, '보통': 5, '두꺼운': 8 };
    const outlineW = outlineWidths[outlineOpt] || 0;

    // 메인 텍스트
    if (mainText) {
        ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
        if (outlineW > 0) {
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.lineWidth = outlineW;
            ctx.strokeStyle = isLightColor(neonColor) ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
            ctx.strokeText(mainText, centerX, mainY, maxW);
        }
        ctx.fillStyle = bgBoxOpt === '흰색' ? '#37352F' : neonColor;
        ctx.fillText(mainText, centerX, mainY, maxW);
    }

    // 서브 텍스트
    if (subText) {
        ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
        if (outlineW > 0) {
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.lineWidth = Math.max(1, outlineW * 0.6);
            ctx.strokeStyle = isLightColor(neonColor) ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
            ctx.strokeText(subText, centerX, subY, maxW);
        }
        ctx.fillStyle = bgBoxOpt === '흰색' ? '#555' : neonColor;
        ctx.fillText(subText, centerX, subY, maxW);
    }

    // 그림자 초기화
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
};

/**
 * 메인 렌더링 함수
 * @param {string} imageUrl - 원본 이미지 URL
 * @param {object} options
 * @returns {Promise<string>} dataURL (PNG)
 */
export const generateThumbnail = (imageUrl, options = {}) => {
    const {
        style = 'A', mainText = '', subText = '',
        fontFamily = 'Pretendard', zoom = 1, offsetX = 0, offsetY = 0,
        mainFontSize = 64, subFontSize = 36, fontColor = '',
        bandPosition = 'top', bandColor = '#FF6B35', bandHeight = 150,
        shadow = '약하게', outline = '없음', bgBox = '없음',
    } = options;

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

            // G 스타일: 원본만
            if (style === 'G') {
                resolve(canvas.toDataURL('image/png'));
                return;
            }

            // 2. 밝기 감지
            const brightness = detectBrightness(ctx);

            // 3. 스타일별 오버레이 + 텍스트
            let textColor = '#fff';
            let textPosition = 'bottom';
            let bandInfo = null;

            if (style === 'A') {
                renderStyleA(ctx, brightness);
            } else if (style === 'B') {
                renderStyleB_box(ctx);
                textPosition = 'bottomBox';
            } else if (style === 'C') {
                // 아웃라인: 오버레이 없음
                textPosition = 'outline';
            } else if (style === 'D') {
                const isDarkBg = renderStyleD_centerBox(ctx, brightness);
                textColor = isDarkBg ? '#000' : '#fff';
                textPosition = 'center';
            } else if (style === 'E') {
                bandInfo = renderStyleE_band(ctx, bandPosition, bandColor, bandHeight);
                textPosition = 'band';
            } else if (style === 'F') {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = WIDTH;
                tempCanvas.height = HEIGHT;
                const tempCtx = tempCanvas.getContext('2d');
                fitImageToCanvas(tempCtx, img, zoom, offsetX, offsetY);
                renderStyleF_blur(ctx, tempCanvas);
            }

            // 4. 텍스트 (fontColor가 있으면 스타일 기본색 오버라이드)
            const finalTextColor = fontColor || textColor;
            const hasCustomEffects = shadow !== '약하게' || outline !== '없음' || bgBox !== '없음';
            if (hasCustomEffects && textPosition !== 'outline') {
                applyTextEffects(ctx, shadow, outline, bgBox, mainText, subText, fontFamily, mainFontSize, subFontSize, finalTextColor, textPosition, bandInfo);
            } else {
                drawThumbnailText(ctx, mainText, subText, fontFamily, textPosition, finalTextColor, mainFontSize, subFontSize, bandInfo);
            }

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = imageUrl;
    });
};

/**
 * 이미지 URL → Image 객체 로드 헬퍼
 */
const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = url;
});

/**
 * 이미지를 지정 영역에 crop-fit으로 그리기 (zoom + offset 지원)
 * @param {number} zoom - 확대 배율 (1 = 기본)
 * @param {number} ox - 수평 오프셋 (-1 ~ 1)
 * @param {number} oy - 수직 오프셋 (-1 ~ 1)
 */
const drawImageToRegion = (ctx, img, dx, dy, dw, dh, zoom = 1, ox = 0, oy = 0) => {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const regionRatio = dw / dh;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

    if (imgRatio > regionRatio) {
        sw = img.naturalHeight * regionRatio;
        sx = (img.naturalWidth - sw) / 2;
    } else {
        sh = img.naturalWidth / regionRatio;
        sy = (img.naturalHeight - sh) / 2;
    }

    // 줌 적용: 소스 영역 축소
    const zSw = sw / zoom;
    const zSh = sh / zoom;
    const maxOx = (sw - zSw) / 2;
    const maxOy = (sh - zSh) / 2;

    ctx.drawImage(
        img,
        sx + (sw - zSw) / 2 + ox * maxOx,
        sy + (sh - zSh) / 2 + oy * maxOy,
        zSw, zSh,
        dx, dy, dw, dh
    );
};

/**
 * 스타일 H: 반분할 콜라주
 * 사진 2~3장 (상하/좌우/상중하) + 컬러 띠 + 텍스트
 * @param {Array} photoZooms - [{zoom, ox, oy}, ...] 사진별 확대/오프셋
 */
const renderStyleH = (ctx, imgs, direction, bandColor, bandH, photoZooms = []) => {
    const gap = bandH;
    const z = (i) => photoZooms[i] || { zoom: 1, ox: 0, oy: 0 };

    if (imgs.length === 3 && direction === 'vertical') {
        // 3분할 상중하
        const sectionH = (HEIGHT - gap * 2) / 3;
        drawImageToRegion(ctx, imgs[0], 0, 0, WIDTH, sectionH, z(0).zoom, z(0).ox, z(0).oy);
        drawImageToRegion(ctx, imgs[1], 0, sectionH + gap, WIDTH, sectionH, z(1).zoom, z(1).ox, z(1).oy);
        drawImageToRegion(ctx, imgs[2], 0, sectionH * 2 + gap * 2, WIDTH, sectionH, z(2).zoom, z(2).ox, z(2).oy);
        ctx.fillStyle = bandColor;
        ctx.fillRect(0, sectionH, WIDTH, gap);
        ctx.fillRect(0, sectionH * 2 + gap, WIDTH, gap);
    } else if (imgs.length === 3 && direction === 'horizontal') {
        // 3분할 좌중우
        const sectionW = (WIDTH - gap * 2) / 3;
        drawImageToRegion(ctx, imgs[0], 0, 0, sectionW, HEIGHT, z(0).zoom, z(0).ox, z(0).oy);
        drawImageToRegion(ctx, imgs[1], sectionW + gap, 0, sectionW, HEIGHT, z(1).zoom, z(1).ox, z(1).oy);
        drawImageToRegion(ctx, imgs[2], sectionW * 2 + gap * 2, 0, sectionW, HEIGHT, z(2).zoom, z(2).ox, z(2).oy);
        ctx.fillStyle = bandColor;
        ctx.fillRect(sectionW, 0, gap, HEIGHT);
        ctx.fillRect(sectionW * 2 + gap, 0, gap, HEIGHT);
    } else if (direction === 'horizontal') {
        const halfW = (WIDTH - gap) / 2;
        drawImageToRegion(ctx, imgs[0], 0, 0, halfW, HEIGHT, z(0).zoom, z(0).ox, z(0).oy);
        drawImageToRegion(ctx, imgs[1], halfW + gap, 0, halfW, HEIGHT, z(1).zoom, z(1).ox, z(1).oy);
        ctx.fillStyle = bandColor;
        ctx.fillRect(halfW, 0, gap, HEIGHT);
    } else {
        const halfH = (HEIGHT - gap) / 2;
        drawImageToRegion(ctx, imgs[0], 0, 0, WIDTH, halfH, z(0).zoom, z(0).ox, z(0).oy);
        drawImageToRegion(ctx, imgs[1], 0, halfH + gap, WIDTH, halfH, z(1).zoom, z(1).ox, z(1).oy);
        ctx.fillStyle = bandColor;
        ctx.fillRect(0, halfH, WIDTH, gap);
    }
};

/**
 * 스타일 I: 매거진 그리드
 * 사진 2~4장 격자 + 흰색 간격
 * @param {Array} photoZooms - [{zoom, ox, oy}, ...] 사진별 확대/오프셋
 */
const renderStyleI = (ctx, imgs, gridGap = 8, photoZooms = []) => {
    const g = gridGap;
    const z = (i) => photoZooms[i] || { zoom: 1, ox: 0, oy: 0 };

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const count = imgs.length;

    if (count === 2) {
        const w = (WIDTH - g) / 2;
        drawImageToRegion(ctx, imgs[0], 0, 0, w, HEIGHT, z(0).zoom, z(0).ox, z(0).oy);
        drawImageToRegion(ctx, imgs[1], w + g, 0, w, HEIGHT, z(1).zoom, z(1).ox, z(1).oy);
    } else if (count === 3) {
        const leftW = Math.round(WIDTH * 0.55);
        const rightW = WIDTH - leftW - g;
        const rightH = (HEIGHT - g) / 2;
        drawImageToRegion(ctx, imgs[0], 0, 0, leftW, HEIGHT, z(0).zoom, z(0).ox, z(0).oy);
        drawImageToRegion(ctx, imgs[1], leftW + g, 0, rightW, rightH, z(1).zoom, z(1).ox, z(1).oy);
        drawImageToRegion(ctx, imgs[2], leftW + g, rightH + g, rightW, rightH, z(2).zoom, z(2).ox, z(2).oy);
    } else {
        const cellW = (WIDTH - g) / 2;
        const cellH = (HEIGHT - g) / 2;
        drawImageToRegion(ctx, imgs[0], 0, 0, cellW, cellH, z(0).zoom, z(0).ox, z(0).oy);
        drawImageToRegion(ctx, imgs[1], cellW + g, 0, cellW, cellH, z(1).zoom, z(1).ox, z(1).oy);
        drawImageToRegion(ctx, imgs[2], 0, cellH + g, cellW, cellH, z(2).zoom, z(2).ox, z(2).oy);
        drawImageToRegion(ctx, imgs[3], cellW + g, cellH + g, cellW, cellH, z(3).zoom, z(3).ox, z(3).oy);
    }
};

/**
 * 다중 사진 썸네일 렌더링 (Style H, I용)
 * @param {string[]} imageUrls - 이미지 URL 배열 (2~4장)
 * @param {object} options
 * @returns {Promise<string>} dataURL (PNG)
 */
export const generateMultiThumbnail = async (imageUrls, options = {}) => {
    const {
        style = 'H', mainText = '', subText = '',
        fontFamily = 'Pretendard', mainFontSize = 64, subFontSize = 36,
        fontColor = '', bandColor = '#FF6B35', bandHeight = 80,
        splitDirection = 'vertical', gridGap = 8,
        shadow = '약하게', outline = '없음', bgBox = '없음',
        photoZooms = [],
    } = options;

    const imgs = await Promise.all(imageUrls.map(loadImage));

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    if (style === 'H') {
        renderStyleH(ctx, imgs, splitDirection, bandColor, bandHeight, photoZooms);

        // 텍스트: 띠 중앙에 배치
        const finalColor = fontColor || '#fff';
        if (imgs.length === 3) {
            // 3분할: 중앙 띠(두 번째 띠)에 텍스트
            if (splitDirection === 'vertical') {
                const sectionH = (HEIGHT - bandHeight * 2) / 3;
                const bandY = sectionH; // 첫 번째 띠 위치
                const bandInfo = { bandY, bandH: bandHeight };
                applyTextEffects(ctx, shadow, outline, bgBox, mainText, subText, fontFamily, mainFontSize, subFontSize, finalColor, 'band', bandInfo);
            } else {
                const sectionW = (WIDTH - bandHeight * 2) / 3;
                const centerX = sectionW + bandHeight / 2;
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetY = 2;
                if (mainText) {
                    ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
                    ctx.fillStyle = finalColor;
                    ctx.fillText(mainText, centerX, HEIGHT / 2 - (subText ? subFontSize * 0.3 : 0), bandHeight * 0.9);
                }
                if (subText) {
                    ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
                    ctx.fillStyle = finalColor;
                    ctx.fillText(subText, centerX, HEIGHT / 2 + mainFontSize * 0.5, bandHeight * 0.9);
                }
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }
        } else if (splitDirection === 'horizontal') {
            // 2분할 좌우: 세로 띠
            const halfW = (WIDTH - bandHeight) / 2;
            const centerX = halfW + bandHeight / 2;
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;
            if (mainText) {
                ctx.font = `bold ${mainFontSize}px "${fontFamily}", Pretendard, sans-serif`;
                ctx.fillStyle = finalColor;
                ctx.fillText(mainText, centerX, HEIGHT / 2 - (subText ? subFontSize * 0.3 : 0), bandHeight * 0.9);
            }
            if (subText) {
                ctx.font = `600 ${subFontSize}px "${fontFamily}", Pretendard, sans-serif`;
                ctx.fillStyle = finalColor;
                ctx.fillText(subText, centerX, HEIGHT / 2 + mainFontSize * 0.5, bandHeight * 0.9);
            }
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        } else {
            // 2분할 상하: 가로 띠
            const halfH = (HEIGHT - bandHeight) / 2;
            const bandInfo = { bandY: halfH, bandH: bandHeight };
            applyTextEffects(ctx, shadow, outline, bgBox, mainText, subText, fontFamily, mainFontSize, subFontSize, finalColor, 'band', bandInfo);
        }
    } else if (style === 'I') {
        renderStyleI(ctx, imgs, gridGap, photoZooms);

        // 하단 그라데이션 + 텍스트
        if (mainText || subText) {
            const grad = ctx.createLinearGradient(0, HEIGHT * 0.6, 0, HEIGHT);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.7)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            const finalColor = fontColor || '#fff';
            applyTextEffects(ctx, shadow, outline, bgBox, mainText, subText, fontFamily, mainFontSize, subFontSize, finalColor, 'bottom', null);
        }
    }

    return canvas.toDataURL('image/png');
};

/**
 * 다중 사진 영역 좌표 반환 (드래그 영역 감지용)
 * 반환: [{x, y, w, h}, ...] 비율 (0~1) 기준
 */
export const getMultiPhotoRegions = (style, photoCount, splitDirection, bandHeight, gridGap) => {
    if (style === 'H') {
        const gap = bandHeight / HEIGHT;
        if (photoCount === 3 && splitDirection === 'vertical') {
            const sH = (1 - gap * 2) / 3;
            return [
                { x: 0, y: 0, w: 1, h: sH },
                { x: 0, y: sH + gap, w: 1, h: sH },
                { x: 0, y: sH * 2 + gap * 2, w: 1, h: sH },
            ];
        }
        if (photoCount === 3 && splitDirection === 'horizontal') {
            const sW = (1 - gap * 2) / 3;
            return [
                { x: 0, y: 0, w: sW, h: 1 },
                { x: sW + gap, y: 0, w: sW, h: 1 },
                { x: sW * 2 + gap * 2, y: 0, w: sW, h: 1 },
            ];
        }
        if (splitDirection === 'horizontal') {
            const halfW = (1 - gap) / 2;
            return [
                { x: 0, y: 0, w: halfW, h: 1 },
                { x: halfW + gap, y: 0, w: halfW, h: 1 },
            ];
        }
        const halfH = (1 - gap) / 2;
        return [
            { x: 0, y: 0, w: 1, h: halfH },
            { x: 0, y: halfH + gap, w: 1, h: halfH },
        ];
    }

    if (style === 'I') {
        const g = gridGap / WIDTH;
        if (photoCount === 2) {
            const w = (1 - g) / 2;
            return [
                { x: 0, y: 0, w, h: 1 },
                { x: w + g, y: 0, w, h: 1 },
            ];
        }
        if (photoCount === 3) {
            const leftW = 0.55;
            const rightW = 1 - leftW - g;
            const rightH = (1 - g) / 2;
            return [
                { x: 0, y: 0, w: leftW, h: 1 },
                { x: leftW + g, y: 0, w: rightW, h: rightH },
                { x: leftW + g, y: rightH + g, w: rightW, h: rightH },
            ];
        }
        // 4장
        const cellW = (1 - g) / 2;
        const cellH = (1 - g) / 2;
        return [
            { x: 0, y: 0, w: cellW, h: cellH },
            { x: cellW + g, y: 0, w: cellW, h: cellH },
            { x: 0, y: cellH + g, w: cellW, h: cellH },
            { x: cellW + g, y: cellH + g, w: cellW, h: cellH },
        ];
    }

    return [];
};
