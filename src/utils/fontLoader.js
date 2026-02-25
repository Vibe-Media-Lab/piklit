/**
 * Google Fonts 동적 로더
 * 카테고리별 한글 폰트를 온디맨드로 로딩
 */

const loadedFonts = new Set();

/**
 * Google Font를 동적으로 로드
 * @param {string} fontFamily - 폰트 이름 (예: 'Black Han Sans')
 * @returns {Promise<void>}
 */
export const loadGoogleFont = async (fontFamily) => {
    if (loadedFonts.has(fontFamily)) return;

    const familyParam = fontFamily.replace(/ /g, '+');
    const linkId = `gfont-${familyParam}`;

    if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;
        document.head.appendChild(link);
    }

    try {
        await document.fonts.load(`16px "${fontFamily}"`);
        loadedFonts.add(fontFamily);
    } catch {
        console.warn(`[폰트 로더] ${fontFamily} 로딩 실패, Pretendard 폴백`);
    }
};

/**
 * 여러 폰트를 동시 로드
 * @param {string[]} fontFamilies
 */
export const loadGoogleFonts = (fontFamilies) => {
    return Promise.all(fontFamilies.map(loadGoogleFont));
};
